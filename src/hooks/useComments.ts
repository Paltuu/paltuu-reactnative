// src/hooks/useComments.ts
// Cursor-paginated comment loading shared by the post detail page, the re-rooted
// thread page and the comments bottom sheet. The server returns comments +
// replies in pages of 20 ordered by comment_id (so a parent always arrives
// before its replies — the client tree never orphans). Pages are pulled on
// demand via fetchNextPage as the list scrolls (infinite loading).
import { useInfiniteQuery } from '@tanstack/react-query';
import { socialApi } from '../api/social';

export interface CommentsPage {
  comments: any[];
  has_more: boolean;
  next_cursor: string | null;
}

export const commentsQueryKey = (postId: string | number | null) =>
  ['comments', postId != null ? String(postId) : null] as const;

/**
 * Infinite comments query. Pages are fetched on demand (call `loadMore` from a
 * list's onEndReached). Returns the flattened, de-duped `comments` array plus
 * the paging flags/helpers.
 */
export function useCommentsQuery(postId: string | number | null, enabled = true) {
  const normalizedId = postId != null ? String(postId) : null;

  const query = useInfiniteQuery({
    queryKey: commentsQueryKey(normalizedId),
    queryFn: ({ pageParam }) => socialApi.getComments(normalizedId!, pageParam as string | null),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: CommentsPage) =>
      lastPage.has_more ? lastPage.next_cursor : undefined,
    enabled: !!normalizedId && enabled,
    staleTime: 10000,
    retry: false,
  });

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  // Advance one page — safe to call repeatedly (no-ops while already fetching or
  // when the last page is reached), so it can be wired straight to onEndReached.
  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  // Flatten pages and dedupe by comment_id. Pagination is stable server-side,
  // but deduping here guarantees the list keys stay unique even if pages ever
  // overlap (e.g. a comment posted between page fetches), which otherwise
  // crashes FlatList with duplicate-key errors.
  const seen = new Set<string>();
  const comments: any[] = [];
  for (const page of query.data?.pages ?? []) {
    for (const c of page.comments) {
      const key = String(c.comment_id);
      if (seen.has(key)) continue;
      seen.add(key);
      comments.push(c);
    }
  }

  return { ...query, comments, loadMore };
}

/* ── Cache helpers for the paginated (pages[]) shape ── */

/** Map an updater over the one matching comment across every loaded page. */
export function updateCommentInPages(
  old: any,
  commentId: string | number,
  updater: (c: any) => any,
) {
  if (!old?.pages) return old;
  return {
    ...old,
    pages: old.pages.map((page: CommentsPage) => ({
      ...page,
      comments: page.comments.map((c: any) =>
        String(c.comment_id) === String(commentId) ? updater(c) : c,
      ),
    })),
  };
}

/** Drop every comment authored by `userId` across all loaded pages (used on block). */
export function removeCommentsByUserInPages(old: any, userId: number) {
  if (!old?.pages) return old;
  return {
    ...old,
    pages: old.pages.map((page: CommentsPage) => ({
      ...page,
      comments: page.comments.filter((c: any) => c.user_id !== userId),
    })),
  };
}
