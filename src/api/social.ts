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
    return data as any[]; // Array of comments
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
  }
};
