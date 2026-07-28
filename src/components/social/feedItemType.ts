import { getPostItemType } from './PostCard';
import type { FeedItem } from '../../api/social';

// FlashList recycles cells by "item type" — a surfaced-comment card has a
// completely different shape from a post, so it needs its own bucket
// alongside the existing post-shape buckets from getPostItemType.
export const getFeedItemType = (item: FeedItem): string =>
  (item as any).item_type === 'surfaced_comment' ? 'surfaced_comment' : getPostItemType(item as any);

export const feedItemKey = (item: FeedItem): string =>
  (item as any).item_type === 'surfaced_comment' ? `sc-${(item as any).comment_id}` : (item as any).post_id;
