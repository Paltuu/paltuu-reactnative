import client from './client';

export interface SocialProfile {
  user_id: number;
  name: string;
  username: string;
  social_username: string | null;
  verified?: boolean;
  bio: string | null;
  follower_count: number;
  following_count: number;
  post_count: number;
  profile_image_url: string | null;
  cover_photo_url: string | null;
  followers_count?: number;
  posts_count?: number;
  is_following?: boolean;
  is_own_profile?: boolean;
  is_private?: boolean;
  is_blocked_by_me?: boolean;
  is_blocking_me?: boolean;
  is_private_locked?: boolean;
}

export interface SocialPostMedia {
  media_id: string;
  post_id: string;
  media_type: 'image' | 'video';
  url: string;
  thumbnail_url?: string;
  ordering: number;
  // Video-specific fields
  hls_url?: string;
  video_status?: 'pending' | 'processing' | 'ready' | 'failed';
  duration_seconds?: number;
}

export interface SocialPost {
  post_id: string;
  user_id: number;
  content: string;
  like_count: number;
  comment_count: number;
  repost_count?: number;
  created_at: string;
  updated_at?: string;
  post_type: 'original' | 'repost' | 'image' | 'video' | 'text';
  media: SocialPostMedia[];
  author_name?: string;
  author_image?: string;
  social_username?: string;
  author_verified?: boolean;
  is_liked?: boolean;
  is_reposted?: boolean;
  is_following?: boolean;
  is_saved?: boolean;
  is_commented?: boolean;
  is_shared?: boolean;
  pet_name?: string;
  pet_id?: number;
  // Repost fields (flat structure from backend)
  original_post_id?: string;
  original_content?: string;
  original_user_id?: number;
  original_author_name?: string;
  original_social_username?: string;
  original_author_image?: string;
  original_author_verified?: boolean;
  original_media?: SocialPostMedia[];
  original_post?: SocialPost;
  pet_profile_tags?: number[];
  tagged_pets?: { pet_profile_id: number; name: string; avatar_url: string | null; species: string }[];
}

export interface SocialPet {
  pet_id: number;
  pet_name: string;
  pet_breed: string | null;
  listing_type: string;
  adoption_status: string;
  age_months: number | null;
  sex: string | null;
  main_image: string | null;
}

export interface Collection {
  collection_id: number;
  name: string;
  owner_id: number;
  post_count: number;
  is_default?: boolean;
}

export interface MentionSuggestionPet {
  type: 'pet';
  pet_profile_id: number;
  name: string;
  species: string;
  avatar_url: string | null;
}

export interface MentionSuggestionUser {
  type: 'user';
  user_id: number;
  name: string;
  social_username: string;
  profile_image_url: string | null;
  is_following: boolean;
}

export const socialApi = {
  async search(query: string, type: 'all' | 'posts' | 'users' | 'pets' | 'adoptions' | 'lost_found' | 'hashtags' | 'vets' = 'all') {
    const { data } = await client.get(`/explore/search?q=${encodeURIComponent(query)}&type=${type}`);
    return data as { results: any };
  },

  async suggestMentions(query: string) {
    const { data } = await client.get(`/social/mentions/suggest?q=${encodeURIComponent(query)}`);
    return data as { pets: MentionSuggestionPet[]; users: MentionSuggestionUser[] };
  },

  async getFeed(cursor: string | null = null, limit: number = 20, mode: 'global' | 'following' | 'chronological' | 'personalized' = 'following') {
    const url = `/social/posts?limit=${limit}&mode=${mode}${cursor ? `&cursor=${cursor}` : ''}`;
    const { data } = await client.get(url);
    return data as { posts: SocialPost[]; next_cursor: string | null; has_more: boolean };
  },

  async getInterests() {
    const { data } = await client.get('/social/interests');
    return data as { tag_ids: number[]; has_picks: boolean };
  },

  async getPostById(postId: string | number) {
    const { data } = await client.get(`/social/posts/${postId}`);
    return data as SocialPost;
  },

  async getProfile(userId: string | number) {
    const { data } = await client.get(`/social/profile/${userId}`);
    return data as { profile: SocialProfile; posts: SocialPost[] };
  },

  async togglePrivacy(isPrivate: boolean) {
    const { data } = await client.patch('/social/profile/privacy', { is_private: isPrivate });
    return data;
  },

  async updateProfile(payload: Partial<SocialProfile & { email: string, phone_number: string }>) {
    const { data } = await client.patch('/social/profile/update', payload);
    return data as { success: boolean; user: any };
  },

  async checkUsername(handle: string) {
    const { data } = await client.get('/social/username/check', {
      params: { q: handle },
      timeout: 5000,
    });
    return data as { valid: boolean; available: boolean; error?: string };
  },

  async getReposts(userId: string | number, page: number = 1) {
    const { data } = await client.get(`/social/profile/${userId}/reposts?page=${page}`);
    return data as { reposts: SocialPost[]; meta: { page: number; limit: number } };
  },

  async getPets(userId: string | number) {
    const { data } = await client.get(`/social/profile/${userId}/pets`);
    return data as { pets: SocialPet[] };
  },

  async getComments(postId: string | number, cursor?: string | null) {
    const { data } = await client.get(`/social/posts/${postId}/comments`, {
      params: cursor ? { cursor } : undefined,
    });
    return data as { comments: any[]; has_more: boolean; next_cursor: string | null };
  },

  async postComment(
    postId: string | number,
    content: string,
    parentId?: string | number,
    extras?: { media?: any[]; petProfileTags?: number[] }
  ) {
    const { data } = await client.post(`/social/posts/${postId}/comments`, {
      content,
      parent_comment_id: parentId,
      // Only include optional fields when present so older backends ignore them gracefully.
      ...(extras?.media?.length ? { media: extras.media } : {}),
      ...(extras?.petProfileTags?.length ? { pet_profile_tags: extras.petProfileTags } : {}),
    });
    return data;
  },

  async toggleLike(postId: string | number) {
    const { data } = await client.post(`/social/posts/${postId}/like`);
    return data as { liked: boolean };
  },

  async toggleCommentLike(commentId: string | number) {
    const { data } = await client.post(`/social/comments/${commentId}/like`);
    return data as { liked: boolean; like_count: number };
  },

  async deleteComment(commentId: string | number) {
    const { data } = await client.delete(`/social/comments/${commentId}`);
    return data as { deleted: boolean; deleted_comment_ids: (string | number)[] };
  },

  async uploadMedia(files: string[]) {
    const formData = new FormData();
    files.forEach((uri) => {
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const type = match ? `image/${match[1]}` : `image`;

      formData.append('files', {
        uri,
        name: filename,
        type,
      } as any);
    });

    const { data } = await client.post('/social/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data as { media: any[] };
  },

  async getVideoUploadUrl(ext: string = 'mp4') {
    const { data } = await client.get(`/social/video-upload-url?ext=${ext}`);
    return data as { upload_url: string; video_key: string; raw_url: string; expires_in: number };
  },


  async uploadVideoToS3(
    presignedUrl: string,
    fileUri: string,
    mimeType: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    try {
      // Use expo-file-system native upload task if available.
      // This runs uploads in a native background thread (iOS NSURLSession / Android WorkManager)
      // which keeps uploads alive even if the app goes to the background or screen locks.
      const FileSystem = require('expo-file-system');
      console.log('[socialApi] Launching native background S3 upload task...');

      const uploadTask = FileSystem.createUploadTask(
        presignedUrl,
        fileUri,
        {
          headers: {
            'Content-Type': mimeType,
          },
          httpMethod: 'PUT',
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        },
        (data) => {
          if (onProgress && data.totalBytesExpectedToSend > 0) {
            onProgress(data.totalBytesSent / data.totalBytesExpectedToSend);
          }
        }
      );

      const result = await uploadTask.uploadAsync();
      if (result && result.status >= 200 && result.status < 300) {
        console.log('[socialApi] Native background S3 upload task completed successfully');
        return;
      } else {
        throw new Error(`S3 native upload failed: HTTP ${result?.status}`);
      }
    } catch (fsErr) {
      console.warn('[socialApi] Native background upload task unavailable/failed, using XHR fallback:', fsErr);

      // Fallback: XMLHttpRequest PUT (JS-thread based)
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && onProgress) {
            onProgress(e.loaded / e.total);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`S3 upload failed: HTTP ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('S3 upload network error')));
        xhr.addEventListener('abort', () => reject(new Error('S3 upload aborted')));

        xhr.open('PUT', presignedUrl);
        xhr.setRequestHeader('Content-Type', mimeType);

        // React Native streams the binary file content when passed { uri }
        xhr.send({ uri: fileUri } as any);
      });
    }
  },


  async confirmVideoUpload(videoKey: string, mediaId: string) {
    const { data } = await client.post('/social/video-upload-url', {
      video_key: videoKey,
      media_id: mediaId,
    });
    return data as { job_id: string; status: string };
  },

  async getVideoStatus(mediaId: string) {
    const { data } = await client.get(`/social/video-status?media_id=${mediaId}`);
    return data as {
      media_id: string;
      video_status: 'pending' | 'processing' | 'ready' | 'failed';
      hls_url: string | null;
      thumbnail_url: string | null;
    };
  },

  async createPost(payload: {
    content: string;
    media: any[];
    pet_profile_tags?: number[];
    post_type: string;
  }) {
    const { data } = await client.post('/social/posts', payload);
    return data;
  },

  async toggleFollow(userId: string | number) {
    const { data } = await client.post(`/social/follow/${userId}`);
    return data as { following: boolean };
  },

  async checkFollowStatus(userId: string | number) {
    const { data } = await client.get(`/social/follow/${userId}`);
    return data as { following: boolean };
  },

  async toggleRepost(
    postId: string | number,
    quote?: string,
    extras?: { media?: any[]; petProfileTags?: number[] }
  ) {
    const { data } = await client.post(`/social/posts/${postId}/repost`, {
      content: quote,
      // Only include when present so a plain repost stays a plain repost.
      ...(extras?.media?.length ? { media: extras.media } : {}),
      ...(extras?.petProfileTags?.length ? { pet_profile_tags: extras.petProfileTags } : {}),
    });
    return data;
  },

  async undoRepost(postId: string | number) {
    const { data } = await client.delete(`/social/posts/${postId}/repost`);
    return data;
  },

  async deletePost(postId: string | number) {
    const { data } = await client.delete(`/social/posts/${postId}`);
    return data;
  },

  async updatePost(postId: string | number, payload: {
    content?: string;
    pet_profile_tags?: number[];
    post_type?: string;
  }) {
    const { data } = await client.patch(`/social/posts/${postId}`, payload);
    return data;
  },

  async getFollowers(userId: string | number) {
    const { data } = await client.get(`/social/users/${userId}/followers`);
    return data as { followers: any[]; next_cursor: string | null; has_more: boolean };
  },

  async getFollowing(userId: string | number) {
    const { data } = await client.get(`/social/users/${userId}/following`);
    return data as { following: any[]; next_cursor: string | null; has_more: boolean };
  },

  async removeFollower(userId: string | number, followerId: string | number) {
    const { data } = await client.delete(`/social/users/${userId}/followers?followerId=${followerId}`);
    return data;
  },

  async getCollections() {
    const { data } = await client.get('/collections');
    return data as { collections: Collection[] };
  },

  async getSaveStatus(postId: string | number) {
    const { data } = await client.get(`/posts/${postId}/save-status`);
    return data as { is_saved: boolean; save_id?: string | number; collections: { collection_id: number; name: string }[] };
  },

  async createCollection(name: string) {
    const { data } = await client.post('/collections', { name });
    return data as Collection;
  },

  async savePost(postId: string | number, collectionIds: number[] = []) {
    const { data } = await client.post(`/posts/${postId}/save`, { collection_ids: collectionIds });
    return data as { saved: boolean; save_id: string | number };
  },

  async unsavePost(postId: string | number) {
    const { data } = await client.delete(`/posts/${postId}/save`);
    return data as { unsaved: boolean };
  },

  async addPostToCollection(collectionId: number, postId: string | number) {
    const { data } = await client.post(`/collections/${collectionId}/posts`, { post_id: postId });
    return data;
  },

  async removePostFromCollection(collectionId: number, postId: string | number) {
    const { data } = await client.delete(`/collections/${collectionId}/posts/${postId}`);
    return data;
  },

  async getCollectionPosts(collectionId: number, cursor?: string) {
    const url = `/collections/${collectionId}/posts${cursor ? `?cursor=${cursor}` : ''}`;
    const { data } = await client.get(url);
    return data as { posts: SocialPost[]; next_cursor: string | null };
  },

  async reportPost(postId: string | number, payload: { reason_code: string; additional_note?: string }) {
    const { data } = await client.post(`/posts/${postId}/report`, payload);
    return data;
  },

  async reportUser(userId: string | number, payload: { reason_code: string; additional_note?: string }) {
    const { data } = await client.post(`/users/${userId}/report`, payload);
    return data;
  },

  async reportComment(commentId: string | number, payload: { reason_code: string; additional_note?: string }) {
    const { data } = await client.post(`/comments/${commentId}/report`, payload);
    return data;
  },

  async hidePost(postId: string | number) {
    const { data } = await client.post(`/posts/${postId}/hide`);
    return data as { hidden: boolean };
  },

  async unhidePost(postId: string | number) {
    const { data } = await client.delete(`/posts/${postId}/hide`);
    return data as { hidden: boolean };
  },

  async blockUser(userId: string | number) {
    const { data } = await client.post(`/users/${userId}/block`);
    return data as { blocked: boolean };
  },

  async unblockUser(userId: string | number) {
    const { data } = await client.delete(`/users/${userId}/block`);
    return data as { unblocked: boolean };
  },

  async getBlockedUsers(cursor?: string, limit: number = 20) {
    const url = `/users/me/blocked?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`;
    const { data } = await client.get(url);
    return data as { blocked_users: any[]; next_cursor: string | null; has_more: boolean };
  },

  async getExploreDiscovery() {
    const { data } = await client.get('/explore/discovery');
    return data as {
      trending_keywords: { keyword: string; post_count: number; engagement_score: number }[];
      media_posts: SocialPost[];
      trending_breeds: { breed: string; pet_count: number; adoption_count: number }[];
    };
  },

  async getHashtagFeed(tag: string, cursor: string | null = null) {
    const url = `/explore/hashtag/${encodeURIComponent(tag)}${cursor ? `?cursor=${cursor}` : ''}`;
    const { data } = await client.get(url);
    return data as { tag: string; post_count: number; posts: SocialPost[]; next_cursor: string | null };
  },

  async getKeywordFeed(keyword: string, cursor: string | null = null) {
    const url = `/explore/keyword/${encodeURIComponent(keyword)}${cursor ? `?cursor=${cursor}` : ''}`;
    const { data } = await client.get(url);
    return data as { keyword: string; post_count: number | null; posts: SocialPost[]; next_cursor: string | null };
  },

  async getTopicFeed(slug: string, cursor: string | null = null, limit: number = 20) {
    const url = `/explore/topic/${encodeURIComponent(slug)}?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`;
    const { data } = await client.get(url);
    return data as { slug: string; label: string; posts: SocialPost[]; next_cursor: string | null };
  },

  async getSuggestedAccounts(limit: number = 10) {
    const { data } = await client.get(`/explore/suggested-accounts?limit=${limit}`);
    return data as {
      accounts: {
        user_id: number;
        name: string;
        social_username: string | null;
        profile_image_url: string | null;
        bio: string | null;
        follower_count: number;
        mutual_follows: number;
        interactions_with_me: number;
        recent_engagement: number;
        is_following: boolean;
      }[];
    };
  },

  async getVetsNearby(coords: { lat: number; lng: number } | null, limit: number = 10) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (coords) {
      params.set('lat', String(coords.lat));
      params.set('lng', String(coords.lng));
    }
    const { data } = await client.get(`/explore/vets-nearby?${params.toString()}`);
    return data as {
      clinics: {
        clinic_id: number;
        name: string;
        address: string | null;
        city: string | null;
        logo_url: string | null;
        rating: number | null;
        total_reviews: number | null;
        is_paltuu_partner: boolean;
        distance_km: number | null;
      }[];
    };
  },
};
