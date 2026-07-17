import { create } from 'zustand';
import { socialApi } from '../api/social';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { queryClient } from '../api/queryClient';
import Toast from 'react-native-toast-message';

export type UploadStage = 'idle' | 'preparing' | 'uploading' | 'finalizing' | 'success' | 'error';

interface MediaItem {
  uri: string;
  type: 'image' | 'video';
  mime?: string;
  thumbnailUri?: string;
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  stage: UploadStage;
  error: string | null;
  thumbnailUri: string | null;
  startUpload: (params: {
    caption: string;
    mediaItems: MediaItem[];
    selectedPets: number[];
    postType: string;
    user: any;
    editId?: string;
    isEditMode: boolean;
  }) => Promise<void>;
  resetUploadState: () => void;
}

export const useUploadStore = create<UploadState>((set, get) => ({
  isUploading: false,
  progress: 0,
  stage: 'idle',
  error: null,
  thumbnailUri: null,

  resetUploadState: () => {
    set({
      isUploading: false,
      progress: 0,
      stage: 'idle',
      error: null,
      thumbnailUri: null,
    });
  },

  startUpload: async ({ caption, mediaItems, selectedPets, postType, user, editId, isEditMode }) => {
    if (get().isUploading) return;

    set({
      isUploading: true,
      progress: 0,
      stage: isEditMode ? 'finalizing' : 'preparing',
      error: null,
      thumbnailUri: mediaItems[0]?.thumbnailUri || mediaItems[0]?.uri || null,
    });

    try {
      if (isEditMode) {
        if (!editId) throw new Error('Edit ID is missing');
        await socialApi.updatePost(editId, {
          content: caption,
          pet_profile_tags: selectedPets,
          post_type: postType,
        });

        // Trigger refetch of social-feed so the updated post shows up
        queryClient.invalidateQueries({ queryKey: ['social-feed'] });

        set({ stage: 'success', progress: 1 });
        setTimeout(() => {
          get().resetUploadState();
        }, 4000);
        return;
      }

      set({ stage: 'uploading' });

      const progresses = new Array(mediaItems.length).fill(0);
      const updateOverallProgress = (idx: number, p: number) => {
        progresses[idx] = p;
        const avg = progresses.reduce((sum, val) => sum + val, 0) / (mediaItems.length || 1);
        set({ progress: avg });
      };

      const uploadPromises = mediaItems.map(async (item, index) => {
        if (item.type === 'video') {
          const mime = item.mime || 'video/mp4';
          const ext  = mime === 'video/quicktime' ? 'mov' : 'mp4';

          // Step 1: Get presigned PUT URL
          const { upload_url, video_key, raw_url } = await socialApi.getVideoUploadUrl(ext);

          // Step 1.5: Upload pre-generated video thumbnail if available
          let thumbnailRemoteUrl: string | null = null;
          try {
            const localThumbUri = item.thumbnailUri;
            if (localThumbUri) {
              console.log(`[UploadStore] Uploading pre-generated video thumbnail: ${localThumbUri}`);
              const thumbUploadRes = await socialApi.uploadMedia([localThumbUri]);
              thumbnailRemoteUrl = thumbUploadRes.media[0]?.url || null;
            }
          } catch (thumbErr) {
            console.warn('[UploadStore] Failed to upload local video thumbnail:', thumbErr);
          }

          // Step 2: Upload raw video directly to S3 with progress tracking
          await socialApi.uploadVideoToS3(upload_url, item.uri, mime, (p) => {
            updateOverallProgress(index, p);
          });

          console.log(`[UploadStore] Parallel video upload complete: key=${video_key}`);

          return {
            media_type:    'video',
            url:           raw_url || item.uri,
            thumbnail_url: thumbnailRemoteUrl, // Instant thumbnail preview
            video_status:  'pending',
            _video_key:    video_key,
            ordering:      index,
          };

        } else {
          // Process image
          const processed = await manipulateAsync(
            item.uri,
            [{ resize: { width: 1200 } }],
            { compress: 0.8, format: SaveFormat.JPEG }
          );
          updateOverallProgress(index, 0.2); // Start image upload progress indicator
          const uploadRes = await socialApi.uploadMedia([processed.uri]);
          updateOverallProgress(index, 1);   // Image upload done
          return {
            ...uploadRes.media[0],
            ordering: index,
          };
        }
      });

      const uploadedMediaResults = await Promise.all(uploadPromises);
      // Sort results by original ordering to maintain user choice sequence
      uploadedMediaResults.sort((a, b) => (a.ordering ?? 0) - (b.ordering ?? 0));
      const uploadedMedia = uploadedMediaResults.map(({ ordering, ...m }) => m);

      // ── Stage 3: Create post + trigger MediaConvert ───────────────────────
      set({ stage: 'finalizing' });

      const postTypeValue =
        uploadedMedia.some((m) => m.media_type === 'video')
          ? 'video'
          : caption.trim().length > 0 && uploadedMedia.length === 0
          ? 'text'
          : 'image';

      const payload = {
        content:   caption,
        media:     uploadedMedia.map(({ _video_key, ...m }) => m),
        pet_profile_tags: selectedPets,
        post_type: postTypeValue,
      };

      console.log('[UploadStore] Sending payload to server:', JSON.stringify(payload, null, 2));

      const post = await socialApi.createPost(payload);

      // Kick off MediaConvert transcoding for each uploaded video.
      const videoItems = post.media?.filter((m: any) => m.media_type === 'video') ?? [];
      const videoUploadItems = uploadedMedia.filter((m) => m._video_key); // same order as videoItems
      for (let i = 0; i < videoItems.length; i++) {
        const vKey   = videoUploadItems[i]?._video_key;   // index-matched — NOT .find()
        const mId    = videoItems[i]?.media_id;
        if (vKey && mId) {
          try {
            await socialApi.confirmVideoUpload(vKey, String(mId));
          } catch (confirmErr) {
            console.error(`[UploadStore] confirmVideoUpload failed for video ${i}:`, confirmErr);
          }
        }
      }

      // ── Show the fresh post at the very top of the feed, instantly ────────
      const optimisticPost: any = {
        ...post,
        author_name:     post.author_name ?? user?.name,
        author_image:    post.author_image ?? user?.profile_image_url,
        social_username: post.social_username ?? (user as any)?.social_username ?? (user as any)?.username,
        like_count:      post.like_count ?? 0,
        comment_count:   post.comment_count ?? 0,
        repost_count:    post.repost_count ?? 0,
        is_liked:        false,
        created_at:      post.created_at ?? new Date().toISOString(),
      };

      if (optimisticPost.post_id) {
        queryClient.setQueriesData({ queryKey: ['social-feed'] }, (old: any) => {
          if (!old?.pages?.length) return old;
          const already = old.pages.some((pg: any) =>
            pg.posts?.some((p: any) => p.post_id === optimisticPost.post_id)
          );
          if (already) return old;
          const [first, ...rest] = old.pages;
          return {
            ...old,
            pages: [{ ...first, posts: [optimisticPost, ...(first.posts ?? [])] }, ...rest],
          };
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ['social-feed'] });
      }

      set({ stage: 'success', progress: 1 });
      setTimeout(() => {
        get().resetUploadState();
      }, 4000);

    } catch (err: any) {
      console.error('[UploadStore] Error posting:', err);
      set({ stage: 'error', error: err.message || 'Failed to create post', progress: 0 });
      setTimeout(() => {
        get().resetUploadState();
      }, 6000);
    }
  },
}));
