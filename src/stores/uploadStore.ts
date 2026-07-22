// src/stores/uploadStore.ts
// Background job queue for composer submissions, plus the state behind the
// upload banner in MainHeader.
//
// Every composer hands its work here and dismisses immediately — the user is
// never made to watch a spinner while bytes move. Media itself is uploaded
// eagerly at pick time by useMediaDraft, so a job's `settle()` has usually
// already resolved by the time it runs; what's left is creating the post and
// wiring the result into the feed cache.
import { create } from 'zustand';
import { socialApi } from '../api/social';
import { queryClient } from '../api/queryClient';
import { confirmVideos, type SettledMedia } from '../hooks/useMediaDraft';

export type UploadStage = 'idle' | 'preparing' | 'uploading' | 'finalizing' | 'success' | 'error';

interface BaseJob {
  /** Resolves with the already-uploaded media payloads. Supplied by useMediaDraft. */
  settle: (onProgress?: (p: number) => void) => Promise<SettledMedia>;
  /** Local URI shown as the banner's thumbnail. */
  thumbnailUri?: string | null;
  caption: string;
  selectedPets: number[];
}

interface CreatePostJob extends BaseJob {
  kind: 'post';
  postType: string;
  user: any;
}

interface EditPostJob {
  kind: 'edit';
  editId: string;
  caption: string;
  selectedPets: number[];
  postType: string;
}

interface QuoteJob extends BaseJob {
  kind: 'quote';
  /** The post being quoted. */
  targetPostId: string;
}

export type UploadJob = CreatePostJob | EditPostJob | QuoteJob;

interface UploadState {
  isUploading: boolean;
  progress: number;
  stage: UploadStage;
  error: string | null;
  thumbnailUri: string | null;
  /** Queue a submission and return immediately — the caller should navigate away. */
  enqueue: (job: UploadJob) => void;
  resetUploadState: () => void;
}

const IDLE = {
  isUploading: false,
  progress: 0,
  stage: 'idle' as UploadStage,
  error: null,
  thumbnailUri: null,
};

export const useUploadStore = create<UploadState>((set, get) => {
  // Jobs run one at a time, in order. A second Post tapped while the first is
  // still finalizing queues behind it rather than being dropped on the floor,
  // which is what the old single-flight `if (isUploading) return` did.
  const queue: UploadJob[] = [];
  let draining = false;

  // Bumped by every job start and every clear. The delayed "hide the banner"
  // timers below check it before firing, so a job enqueued during the 4s
  // success dwell of the previous one doesn't get its banner yanked away.
  let generation = 0;
  const scheduleClear = (ms: number) => {
    const mine = generation;
    setTimeout(() => {
      if (generation === mine) get().resetUploadState();
    }, ms);
  };

  const drain = async () => {
    if (draining) return;
    draining = true;
    try {
      while (queue.length) {
        const job = queue.shift()!;
        try {
          await runJob(job);
          set({ stage: 'success', progress: 1 });
          // Let the banner sit on "live" for a beat, but only if this was the
          // last job — otherwise the next one takes the banner over immediately.
          if (!queue.length) scheduleClear(4000);
        } catch (err: any) {
          console.error('[uploadStore] Job failed:', err);
          set({ stage: 'error', error: err?.message || 'Something went wrong', progress: 0 });
          if (!queue.length) scheduleClear(6000);
        }
      }
    } finally {
      draining = false;
    }
  };

  const runJob = async (job: UploadJob) => {
    generation++;
    set({
      isUploading: true,
      progress: 0,
      error: null,
      stage: job.kind === 'edit' ? 'finalizing' : 'preparing',
      thumbnailUri: job.kind === 'edit' ? null : job.thumbnailUri ?? null,
    });

    if (job.kind === 'edit') {
      await socialApi.updatePost(job.editId, {
        content: job.caption,
        pet_profile_tags: job.selectedPets,
        post_type: job.postType,
      });
      queryClient.invalidateQueries({ queryKey: ['social-feed'] });
      queryClient.invalidateQueries({ queryKey: ['post', String(job.editId)] });
      return;
    }

    // Usually a no-op: uploads started when the media was picked, and the user
    // has been composing since. Only a just-attached (or retried) item makes
    // this actually wait.
    set({ stage: 'uploading' });
    const settled = await job.settle((p) => set({ progress: p }));
    set({ stage: 'finalizing', progress: 1 });

    if (job.kind === 'quote') {
      const res = await socialApi.toggleRepost(String(job.targetPostId), job.caption.trim(), {
        media: settled.media,
        petProfileTags: job.selectedPets,
      });
      await confirmVideos(res?.post?.media ?? [], settled.videoKeys);

      // Matches what SocialActionsContext's repost mutation does on settle for
      // the quote path — it defers entirely to a refetch rather than an
      // inline flip, since a quote creates a distinct post.
      queryClient.invalidateQueries({ queryKey: ['social-feed'] });
      queryClient.invalidateQueries({ queryKey: ['post', String(job.targetPostId)] });
      queryClient.invalidateQueries({ queryKey: ['social-profile'] });
      return;
    }

    // ── Create post ──
    const postTypeValue =
      settled.media.some((m) => m.media_type === 'video')
        ? 'video'
        : settled.media.length === 0
        ? 'text'
        : 'image';

    const post = await socialApi.createPost({
      content: job.caption,
      media: settled.media,
      pet_profile_tags: job.selectedPets,
      post_type: postTypeValue,
    });

    await confirmVideos(post.media ?? [], settled.videoKeys);

    // Show the fresh post at the top of the feed instantly rather than waiting
    // for a refetch round trip.
    const optimisticPost: any = {
      ...post,
      author_name: post.author_name ?? job.user?.name,
      author_image: post.author_image ?? job.user?.profile_image_url,
      social_username:
        post.social_username ?? job.user?.social_username ?? job.user?.username,
      like_count: post.like_count ?? 0,
      comment_count: post.comment_count ?? 0,
      repost_count: post.repost_count ?? 0,
      is_liked: false,
      created_at: post.created_at ?? new Date().toISOString(),
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
  };

  return {
    ...IDLE,

    resetUploadState: () => {
      generation++;
      set({ ...IDLE });
    },

    enqueue: (job) => {
      queue.push(job);
      // Reflect the new job in the banner right away, before drain gets to it.
      set({ isUploading: true, error: null });
      void drain();
    },
  };
});
