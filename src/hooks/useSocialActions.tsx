import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { socialApi, SocialPost } from '../api/social';

export const useSocialActions = () => {
  const queryClient = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: (postId: string | number) => socialApi.toggleLike(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['social-feed'] });
      await queryClient.cancelQueries({ queryKey: ['social-trending'] });
      await queryClient.cancelQueries({ queryKey: ['social-search'] });
      await queryClient.cancelQueries({ queryKey: ['post', String(postId)] });

      const previousFeedEntries = queryClient.getQueriesData<any>({ queryKey: ['social-feed'] });
      const previousPost = queryClient.getQueryData(['post', String(postId)]);

      queryClient.setQueriesData({ queryKey: ['social-feed'] }, (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((p: SocialPost) => {
              if (p.post_id === String(postId)) {
                const newLiked = !p.is_liked;
                return {
                  ...p,
                  is_liked: newLiked,
                  like_count: newLiked ? p.like_count + 1 : Math.max(0, p.like_count - 1),
                };
              }
              return p;
            }),
          })),
        };
      });

      queryClient.setQueryData(['post', String(postId)], (old: any) => {
        if (!old) return old;
        const newLiked = !old.is_liked;
        return {
          ...old,
          is_liked: newLiked,
          like_count: newLiked ? (old.like_count || 0) + 1 : Math.max(0, (old.like_count || 0) - 1),
        };
      });

      return { previousFeedEntries, previousPost, postId };
    },
    onError: (err, postId, context) => {
      context?.previousFeedEntries?.forEach(([key, data]: [any, any]) => {
        queryClient.setQueryData(key, data);
      });
      if (context?.previousPost) {
        queryClient.setQueryData(['post', String(postId)], context.previousPost);
      }
    },
    onSettled: (data, err, postId) => {
      queryClient.invalidateQueries({ queryKey: ['post', String(postId)] });
    },
  });

  // Shared tri-state transition (Follow / Request to Follow -> Requested / Following),
  // same rule the profile page's own local mutation uses: private + not-yet-related
  // targets go to "pending", not straight to "following". Any cache entry lacking
  // is_following/has_pending_request/is_private fields (e.g. feed posts) is left
  // untouched by callers rather than guessed at.
  const nextFollowState = (current: { is_following?: boolean; has_pending_request?: boolean; is_private?: boolean }) => {
    if (current.is_following) return { is_following: false, has_pending_request: false, countDelta: -1 };
    if (current.has_pending_request) return { is_following: false, has_pending_request: false, countDelta: 0 };
    if (current.is_private) return { is_following: false, has_pending_request: true, countDelta: 0 };
    return { is_following: true, has_pending_request: false, countDelta: 1 };
  };

  const followMutation = useMutation({
    mutationFn: (userId: string | number) => socialApi.toggleFollow(userId),
    onMutate: async (userId: string | number) => {
      await queryClient.cancelQueries({ queryKey: ['social-feed'] });
      await queryClient.cancelQueries({ queryKey: ['social-profile', String(userId)] });
      await queryClient.cancelQueries({ queryKey: ['social-followers'] });
      await queryClient.cancelQueries({ queryKey: ['social-following'] });
      await queryClient.cancelQueries({ queryKey: ['social-search'] });
      await queryClient.cancelQueries({ queryKey: ['explore', 'suggested-accounts'] });
      await queryClient.cancelQueries({ queryKey: ['post-likes'] });

      const previousFeedEntries = queryClient.getQueriesData<any>({ queryKey: ['social-feed'] });
      const previousProfile = queryClient.getQueryData(['social-profile', String(userId)]);
      const previousFollowersEntries = queryClient.getQueriesData<any>({ queryKey: ['social-followers'] });
      const previousFollowingEntries = queryClient.getQueriesData<any>({ queryKey: ['social-following'] });
      const previousSearchEntries = queryClient.getQueriesData<any>({ queryKey: ['social-search'] });
      const previousSuggested = queryClient.getQueryData(['explore', 'suggested-accounts']);
      const previousPostLikesEntries = queryClient.getQueriesData<any>({ queryKey: ['post-likes'] });

      // Followers/following list rows use `is_followed_by_me` (not `is_following`)
      // as their accepted-follow field, but the same pending/private transition
      // rule applies.
      const flipInList = (list: any[]) =>
        list.map((u) => {
          if (String(u.user_id) !== String(userId)) return u;
          const next = nextFollowState({
            is_following: u.is_followed_by_me,
            has_pending_request: u.has_pending_request,
            is_private: u.is_private,
          });
          return { ...u, is_followed_by_me: next.is_following, has_pending_request: next.has_pending_request };
        });

      // Search results and suggested-accounts both carry `is_following` (same
      // field as feed posts), and search's `results` shape depends on the
      // active tab: an object with `.users`/`.posts` arrays for "all", or a
      // bare array for "users"/"posts". Rows with no `is_private` field
      // (search doesn't return one yet) fall through nextFollowState's default
      // branch and just follow immediately, same as before this existed.
      const flipIsFollowing = (list: any[]) =>
        list.map((it) => {
          if (String(it.user_id) !== String(userId) || !('is_following' in it)) return it;
          const next = nextFollowState({
            is_following: it.is_following,
            has_pending_request: it.has_pending_request,
            is_private: it.is_private,
          });
          return { ...it, is_following: next.is_following, has_pending_request: next.has_pending_request };
        });

      queryClient.setQueriesData({ queryKey: ['social-followers'] }, (old: any) => {
        if (!old?.followers) return old;
        return { ...old, followers: flipInList(old.followers) };
      });

      queryClient.setQueriesData({ queryKey: ['social-following'] }, (old: any) => {
        if (!old?.following) return old;
        return { ...old, following: flipInList(old.following) };
      });

      queryClient.setQueriesData({ queryKey: ['social-search'] }, (old: any) => {
        if (!old?.results) return old;
        if (Array.isArray(old.results)) {
          return { ...old, results: flipIsFollowing(old.results) };
        }
        return {
          ...old,
          results: {
            ...old.results,
            users: old.results.users ? flipIsFollowing(old.results.users) : old.results.users,
            posts: old.results.posts ? flipIsFollowing(old.results.posts) : old.results.posts,
          },
        };
      });

      queryClient.setQueryData(['explore', 'suggested-accounts'], (old: any) => {
        if (!old?.accounts) return old;
        return { ...old, accounts: flipIsFollowing(old.accounts) };
      });

      queryClient.setQueriesData({ queryKey: ['social-feed'] }, (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((p: SocialPost) => {
              if (String(p.user_id) === String(userId)) {
                return { ...p, is_following: !p.is_following };
              }
              return p;
            }),
          })),
        };
      });

      queryClient.setQueriesData({ queryKey: ['post-likes'] }, (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            likes: page.likes ? flipInList(page.likes) : page.likes,
          })),
        };
      });

      queryClient.setQueryData(['social-profile-quick', userId], (old: any) => {
        if (!old) return old;
        const next = nextFollowState(old.profile);
        return {
          ...old,
          profile: {
            ...old.profile,
            is_following: next.is_following,
            has_pending_request: next.has_pending_request,
            follower_count: Math.max(0, old.profile.follower_count + next.countDelta),
          }
        };
      });

      queryClient.setQueryData(['social-profile', String(userId)], (old: any) => {
        if (!old || !old.profile) return old;
        const next = nextFollowState(old.profile);
        return {
          ...old,
          profile: {
            ...old.profile,
            is_following: next.is_following,
            has_pending_request: next.has_pending_request,
            follower_count: Math.max(0, old.profile.follower_count + next.countDelta),
          }
        };
      });

      return {
        previousFeedEntries,
        previousProfile,
        previousFollowersEntries,
        previousFollowingEntries,
        previousSearchEntries,
        previousSuggested,
        previousPostLikesEntries,
      };
    },
    onError: (err, userId, context) => {
      context?.previousFeedEntries?.forEach(([key, data]: [any, any]) => {
        queryClient.setQueryData(key, data);
      });
      if (context?.previousProfile) {
        queryClient.setQueryData(['social-profile', String(userId)], context.previousProfile);
      }
      context?.previousFollowersEntries?.forEach(([key, data]: [any, any]) => {
        queryClient.setQueryData(key, data);
      });
      context?.previousFollowingEntries?.forEach(([key, data]: [any, any]) => {
        queryClient.setQueryData(key, data);
      });
      context?.previousSearchEntries?.forEach(([key, data]: [any, any]) => {
        queryClient.setQueryData(key, data);
      });
      if (context?.previousSuggested !== undefined) {
        queryClient.setQueryData(['explore', 'suggested-accounts'], context.previousSuggested);
      }
      context?.previousPostLikesEntries?.forEach(([key, data]: [any, any]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: (data, err, userId) => {
      queryClient.invalidateQueries({ queryKey: ['social-feed'] });
      queryClient.invalidateQueries({ queryKey: ['social-profile', String(userId)] });
      queryClient.invalidateQueries({ queryKey: ['social-profile-quick', userId] });
      queryClient.invalidateQueries({ queryKey: ['social-followers'] });
      queryClient.invalidateQueries({ queryKey: ['social-following'] });
      queryClient.invalidateQueries({ queryKey: ['social-search'] });
      queryClient.invalidateQueries({ queryKey: ['explore', 'suggested-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['post-likes'] });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: (postId: string | number) => socialApi.deletePost(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['social-feed'] });
      const previousFeedEntries = queryClient.getQueriesData<any>({ queryKey: ['social-feed'] });

      queryClient.setQueriesData({ queryKey: ['social-feed'] }, (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.filter((p: SocialPost) => p.post_id !== String(postId)),
          })),
        };
      });

      return { previousFeedEntries };
    },
    onError: (err, postId, context) => {
      context?.previousFeedEntries?.forEach(([key, data]: [any, any]) => {
        queryClient.setQueryData(key, data);
      });
      Alert.alert('Error', 'Failed to delete post');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['social-feed'] });
      queryClient.invalidateQueries({ queryKey: ['social-profile'] });
    },
  });

  const updatePostMutation = useMutation({
    mutationFn: ({ postId, payload }: { postId: string | number; payload: any }) =>
      socialApi.updatePost(postId, payload),
    onSettled: (data, err, variables) => {
      queryClient.invalidateQueries({ queryKey: ['social-feed'] });
      queryClient.invalidateQueries({ queryKey: ['social-profile'] });
      queryClient.invalidateQueries({ queryKey: ['social-trending'] });
      queryClient.invalidateQueries({ queryKey: ['post', String(variables.postId)] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ postId, isSaved }: { postId: string | number; isSaved: boolean }) => {
      if (isSaved) {
        return socialApi.unsavePost(postId);
      } else {
        return socialApi.savePost(postId);
      }
    },
    onMutate: async ({ postId, isSaved }) => {
      await queryClient.cancelQueries({ queryKey: ['social-feed'] });
      await queryClient.cancelQueries({ queryKey: ['social-profile'] });
      await queryClient.cancelQueries({ queryKey: ['social-trending'] });

      const previousFeedEntries = queryClient.getQueriesData<any>({ queryKey: ['social-feed'] });

      const updatePostsArray = (posts: SocialPost[]) =>
        posts.map((p) =>
          String(p.post_id) === String(postId) ? { ...p, is_saved: !isSaved } : p
        );

      queryClient.setQueriesData({ queryKey: ['social-feed'] }, (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: updatePostsArray(page.posts),
          })),
        };
      });

      queryClient.setQueryData(['social-profile'], (old: any) => {
        if (!old || !old.posts) return old;
        return { ...old, posts: updatePostsArray(old.posts) };
      });

      return { previousFeedEntries };
    },
    onError: (err, variables, context) => {
      context?.previousFeedEntries?.forEach(([key, data]: [any, any]) => {
        queryClient.setQueryData(key, data);
      });
      Alert.alert('Error', 'Failed to update bookmark status');
    },
    onSettled: (data, err, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['social-feed'] });
      queryClient.invalidateQueries({ queryKey: ['social-profile'] });
      // refetchType: 'none' — this quick-save can race with SaveBottomSheet's
      // own toggleCollectionMutation, which also writes ['save-status', postId]
      // optimistically. A forced active refetch here can resolve after that
      // optimistic write and clobber a checkbox the user just toggled. Marking
      // stale (without refetching) still keeps the cache correct for the next
      // real read, without fighting the sheet's own reconciliation.
      queryClient.invalidateQueries({ queryKey: ['save-status', postId], refetchType: 'none' });
      queryClient.invalidateQueries({ queryKey: ['social-collections'] });
      // Invalidate all open collection-posts caches so unsaved posts
      // are not shown as stale data when navigating back into a collection.
      queryClient.invalidateQueries({ queryKey: ['collection-posts'] });
    },
  });

  const toggleLike = (postId: string | number) => { likeMutation.mutate(postId); };
  const toggleFollow = (userId: string | number) => { followMutation.mutate(userId); };
  const deletePost = (postId: string | number) => { deletePostMutation.mutate(postId); };
  const updatePost = (postId: string | number, payload: any) => updatePostMutation.mutateAsync({ postId, payload });
  const toggleSave = (postId: string | number, isSaved: boolean) => saveMutation.mutateAsync({ postId, isSaved });

  return {
    toggleLike,
    toggleFollow,
    deletePost,
    updatePost,
    toggleSave,
    isFollowing: followMutation.isPending,
    isLiking: likeMutation.isPending,
    isDeleting: deletePostMutation.isPending,
    isUpdating: updatePostMutation.isPending,
    isSaving: saveMutation.isPending,
  };
};
