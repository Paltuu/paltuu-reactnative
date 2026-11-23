import { getPostItemType, getPostRootId } from './PostCard';
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

const isPostItem = (item: FeedItem): boolean =>
  (item as any).item_type !== 'surfaced_comment' &&
  (item as any).feed_item_type !== 'adoption_listing' &&
  (item as any).feed_item_type !== 'lost_found';

// One card per post (PALTU-178). The server already folds a post and its
// plain reposts into one card, but the feed pages by offset: when new posts
// arrive while someone scrolls, cards near a page edge slide onto the next
// page and would show twice. Keeps the first (newest) card for each post, and
// the first of any other item whose key repeats.
export const dedupeFeedItems = (items: FeedItem[]): FeedItem[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = isPostItem(item) ? `post-${getPostRootId(item as any)}` : feedItemKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
