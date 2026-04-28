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
  followers_count?: number; // Mapping from API response
  posts_count?: number; // Mapping from API response
  is_following?: boolean;
  is_own_profile?: boolean;
}

export interface SocialPostMedia {
  media_id: string;
  post_id: string;
  media_type: 'image' | 'video';
  url: string;
  thumbnail_url?: string;
  ordering: number;
}

export interface SocialPost {
  post_id: string;
  user_id: number;
  content: string;
  like_count: number;
  comment_count: number;
  repost_count: number;
  created_at: string;
  post_type: 'original' | 'repost';
  media: SocialPostMedia[];
  author_name?: string;
  author_image?: string;
  social_username?: string;
  is_liked?: boolean;
  is_reposted?: boolean;
  is_following?: boolean;
  pet_name?: string;
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

export const socialApi = {
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
  }
};
