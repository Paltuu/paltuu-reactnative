import React, { createContext, useContext, useMemo } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSocialActions } from '../hooks/useSocialActions';
import { socialApi } from '../api/social';

export interface SocialActionsContextValue {
  toggleLike: (postId: string | number) => void;
  toggleSave: (postId: string | number, isSaved: boolean) => void;
  toggleFollow: (userId: string | number) => void;
  deletePost: (postId: string | number) => void;
  updatePost: (postId: string | number, payload: any) => Promise<any>;
  repost: (
    postId: string,
    isReposted: boolean,
    quote?: string,
    extras?: { media?: any[]; petProfileTags?: number[] }
  ) => Promise<any>;
  confirmBlock: (userId: number, authorName: string) => void;
  // True once the user has created at least one collection beyond the
  // default "All Posts" one — used to decide whether saving a post should
  // prompt for a collection instead of silently going to the default.
  hasCustomCollections: boolean;
}

const SocialActionsContext = createContext<SocialActionsContextValue | null>(null);

export function SocialActionsProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { toggleLike, toggleSave, toggleFollow, deletePost, updatePost } = useSocialActions();

  // Kept warm here (rather than only inside SaveBottomSheet) so PostCard can
  // read collection count synchronously the moment the bookmark is tapped.
  const { data: collectionsData } = useQuery({
    queryKey: ['social-collections'],
    queryFn: () => socialApi.getCollections(),
    staleTime: 5 * 60 * 1000,
  });
  const hasCustomCollections = (collectionsData?.collections?.length ?? 0) > 1;

  const repostMutation = useMutation({
    mutationFn: ({ postId, isReposted, quote, extras }: {
      postId: string;
      isReposted: boolean;
      quote?: string;
      extras?: { media?: any[]; petProfileTags?: number[] };
    }) =>
      // `quote === undefined` marks a quick repost/undo; a quote submission
      // always passes a (possibly empty) string, so a media-only quote isn't
      // mistaken for an undo.
      isReposted && quote === undefined
        ? socialApi.undoRepost(postId)
        : socialApi.toggleRepost(postId, quote, extras),
    // Optimistic toggle for the quick repost / undo-repost action. The quote
    // path opens a composer and creates a distinct post, so it's left to the
    // onSettled refetch rather than an inline flip.
    onMutate: async ({ postId, isReposted, quote }) => {
      if (quote !== undefined) return {};

      await queryClient.cancelQueries({ queryKey: ['social-feed'] });
      await queryClient.cancelQueries({ queryKey: ['post', String(postId)] });
      await queryClient.cancelQueries({ queryKey: ['social-profile'] });

      const previousFeedEntries = queryClient.getQueriesData<any>({ queryKey: ['social-feed'] });
      const previousPost = queryClient.getQueryData(['post', String(postId)]);
      const previousProfile = queryClient.getQueryData(['social-profile']);

      const newReposted = !isReposted;
      const applyToPost = (p: any) => {
        if (String(p.post_id) !== String(postId)) return p;
        return {
          ...p,
          is_reposted: newReposted,
          repost_count: newReposted
            ? (p.repost_count ?? 0) + 1
            : Math.max(0, (p.repost_count ?? 0) - 1),
        };
      };

      queryClient.setQueriesData({ queryKey: ['social-feed'] }, (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map(applyToPost),
          })),
        };
      });

      queryClient.setQueryData(['post', String(postId)], (old: any) => (old ? applyToPost(old) : old));

      queryClient.setQueryData(['social-profile'], (old: any) => {
        if (!old?.posts) return old;
        return { ...old, posts: old.posts.map(applyToPost) };
      });

      return { previousFeedEntries, previousPost, previousProfile, postId };
    },
    onError: (_err, _vars, context: any) => {
      context?.previousFeedEntries?.forEach(([key, data]: [any, any]) => {
        queryClient.setQueryData(key, data);
      });
      if (context?.previousPost !== undefined) {
        queryClient.setQueryData(['post', String(context.postId)], context.previousPost);
      }
      if (context?.previousProfile !== undefined) {
        queryClient.setQueryData(['social-profile'], context.previousProfile);
      }
    },
    onSettled: (_data, _err, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['social-feed'] });
      queryClient.invalidateQueries({ queryKey: ['post', String(postId)] });
      queryClient.invalidateQueries({ queryKey: ['social-profile'] });
    },
  });

  const blockMutation = useMutation({
    mutationFn: (userId: number) => socialApi.blockUser(userId),
    onSuccess: (_, userId) => {
      import('react-native-toast-message').then((mod) => {
        mod.default.show({ type: 'success', text1: 'User blocked' });
      });
      queryClient.setQueriesData({ queryKey: ['social-feed'] }, (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.filter((p: any) => p.user_id !== userId),
          })),
        };
      });
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      queryClient.invalidateQueries({ queryKey: ['social-profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['social-search'] });
      queryClient.invalidateQueries({ queryKey: ['social-explore'] });
    },
    onError: () => {
      import('react-native-toast-message').then((mod) => {
        mod.default.show({ type: 'error', text1: 'Could not block user' });
      });
    },
  });

  const value = useMemo<SocialActionsContextValue>(() => ({
    toggleLike,
    toggleSave,
    toggleFollow,
    deletePost,
    updatePost,
    repost: (postId, isReposted, quote, extras) =>
      repostMutation.mutateAsync({ postId, isReposted, quote, extras }),
    confirmBlock: (userId, authorName) => {
      Alert.alert(
        'Block User',
        `Are you sure you want to block ${authorName || 'this user'}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Block', style: 'destructive', onPress: () => blockMutation.mutate(userId) },
        ]
      );
    },
    hasCustomCollections,
  }), [toggleLike, toggleSave, toggleFollow, deletePost, updatePost, repostMutation, blockMutation, hasCustomCollections]);

  return (
    <SocialActionsContext.Provider value={value}>
      {children}
    </SocialActionsContext.Provider>
  );
}

export function useSocialActionsContext(): SocialActionsContextValue | null {
  return useContext(SocialActionsContext);
}
