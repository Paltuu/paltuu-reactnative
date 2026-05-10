export interface TrendingHashtag {
  tag: string;
  post_count: number;
}

export interface SuggestedUser {
  user_id: number;
  name: string;
  social_username: string | null;
  profile_image_url: string | null;
  follower_count: number;
  bio: string | null;
  mutual_follows: number;
  is_following: boolean;
}

export interface DiscoveryResponse {
  trending_hashtags: TrendingHashtag[];
  suggested_users: SuggestedUser[];
}

export type SearchEntityType = 'user' | 'pet' | 'post' | 'product' | 'adoption' | 'lost_found' | 'hashtag' | 'vet';

export interface SearchResultBase {
  entity_type: SearchEntityType;
}

export interface UserSearchResult extends SearchResultBase {
  entity_type: 'user';
  user_id: number;
  name: string;
  social_username: string | null;
  profile_image_url: string | null;
  bio: string | null;
  follower_count: number;
  is_following: boolean;
}

export interface PostSearchResult extends SearchResultBase {
  entity_type: 'post';
  post_id: string;
  content: string;
  like_count: number;
  comment_count: number;
  created_at: string;
  author_name: string;
  author_image: string | null;
  author_id: number;
  media: any[];
}

export interface HashtagSearchResult extends SearchResultBase {
  entity_type: 'hashtag';
  tag: string;
  post_count: number;
}

export interface AllSearchResults {
  users: UserSearchResult[];
  pets: any[];
  posts: PostSearchResult[];
  products: any[];
  adoptions: any[];
  lost_found: any[];
  hashtags: HashtagSearchResult[];
  vets: any[];
}

export interface SearchResponse {
  query: string;
  type: string;
  results: AllSearchResults | any[];
  next_cursor: string | null;
}
