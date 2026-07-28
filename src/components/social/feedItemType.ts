import { getPostItemType } from './PostCard';
import type { FeedItem } from '../../api/social';

// FlashList recycles cells by "item type" — a surfaced-comment card has a
// completely different shape from a post, so it needs its own bucket
// alongside the existing post-shape buckets from getPostItemType.
export const getFeedItemType = (item: FeedItem): string => {
  if ((item as any).item_type === 'surfaced_comment') return 'surfaced_comment';
  if ((item as any).feed_item_type === 'adoption_listing' || (item as any).feed_item_type === 'lost_found') {
    return (item as any).feed_item_type;
  }
  return getPostItemType(item as any);
};

export const feedItemKey = (item: FeedItem): string => {
  if ((item as any).item_type === 'surfaced_comment') return `sc-${(item as any).comment_id}`;
  if ((item as any).feed_item_type === 'adoption_listing' || (item as any).feed_item_type === 'lost_found') {
    return `${(item as any).feed_item_type}-${(item as any).id}`;
  }
  return (item as any).post_id;
};
