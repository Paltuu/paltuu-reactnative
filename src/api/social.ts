import client from './client';

export interface SocialProfile {
  user_id: number;
  name: string;
  username: string;
  social_username: string | null;
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
  post_type: 'original' | 'repost' | 'image' | 'video' | 'text';
  media: SocialPostMedia[];
  author_name?: string;
  author_image?: string;
  social_username?: string;
  is_liked?: boolean;
  is_reposted?: boolean;
  is_following?: boolean;
  is_saved?: boolean;
  pet_name?: string;
  pet_id?: number;
  // Repost fields (flat structure from backend)
  original_post_id?: string;
  original_content?: string;
  original_author_name?: string;
  original_author_image?: string;
  original_media?: SocialPostMedia[];
  original_post?: SocialPost;
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

export const socialApi = {
  async search(query: string, type: 'all' | 'posts' | 'users' = 'all') {
    const { data } = await client.get(`/explore/search?q=${encodeURIComponent(query)}&type=${type}`);
    return data as { results: any };
  },

  async getFeed(cursor: string | null = null, limit: number = 20, mode: 'global' | 'following' | 'chronological' = 'following') {
    const url = `/social/posts?limit=${limit}&mode=${mode}${cursor ? `&cursor=${cursor}` : ''}`;
    const { data } = await client.get(url);
    return data as { posts: SocialPost[]; next_cursor: string | null; has_more: boolean };
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

  async getReposts(userId: string | number, page: number = 1) {
    const { data } = await client.get(`/social/profile/${userId}/reposts?page=${page}`);
    return data as { reposts: SocialPost[]; meta: { page: number; limit: number } };
  },

  async getPets(userId: string | number) {
    const { data } = await client.get(`/social/profile/${userId}/pets`);
    return data as { pets: SocialPet[] };
  },

  async getComments(postId: string | number) {
    const { data } = await client.get(`/social/posts/${postId}/comments`);
    return data as { comments: any[]; has_more: boolean; next_cursor: string | null };
  },

  async postComment(postId: string | number, content: string, parentId?: string | number) {
    const { data } = await client.post(`/social/posts/${postId}/comments`, {
      content,
      parent_comment_id: parentId
    });
    return data;
  },

  async toggleLike(postId: string | number) {
    const { data } = await client.post(`/social/posts/${postId}/like`);
    return data as { liked: boolean };
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
    return data as { upload_url: string; video_key: string; expires_in: number };
  },

  async uploadVideoToS3(
    presignedUrl: string,
    fileUri: string,
    mimeType: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
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
      xhr.send({ uri: fileUri } as any);
    });
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
    pet_id?: number;
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

  async toggleRepost(postId: string | number, quote?: string) {
    const { data } = await client.post(`/social/posts/${postId}/repost`, { content: quote });
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
    pet_id?: number;
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
};
