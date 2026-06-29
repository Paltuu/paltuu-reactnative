import React, { createContext, useContext, useMemo } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSocialActions } from '../hooks/useSocialActions';
import { socialApi } from '../api/social';

export interface SocialActionsContextValue {
  toggleLike: (postId: string | number) => void;
  toggleSave: (postId: string | number, isSaved: boolean) => void;
  toggleFollow: (userId: string | number) => void;
  deletePost: (postId: string | number) => void;
  updatePost: (postId: string | number, payload: any) => Promise<any>;
  repost: (postId: string, isReposted: boolean, quote?: string) => Promise<any>;
  confirmBlock: (userId: number, authorName: string) => void;
}

const SocialActionsContext = createContext<SocialActionsContextValue | null>(null);

export function SocialActionsProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { toggleLike, toggleSave, toggleFollow, deletePost, updatePost } = useSocialActions();

  const repostMutation = useMutation({
    mutationFn: ({ postId, isReposted, quote }: { postId: string; isReposted: boolean; quote?: string }) =>
      isReposted && !quote
        ? socialApi.undoRepost(postId)
        : socialApi.toggleRepost(postId, quote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-feed'] });
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
    repost: (postId, isReposted, quote) =>
      repostMutation.mutateAsync({ postId, isReposted, quote }),
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
  }), [toggleLike, toggleSave, toggleFollow, deletePost, updatePost, repostMutation, blockMutation]);

  return (
    <SocialActionsContext.Provider value={value}>
      {children}
    </SocialActionsContext.Provider>
  );
}

export function useSocialActionsContext(): SocialActionsContextValue | null {
  return useContext(SocialActionsContext);
}
