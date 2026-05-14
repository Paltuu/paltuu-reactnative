import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { socialApi, SocialPost } from '../api/social';

export const useSocialActions = () => {
  const queryClient = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: (postId: string | number) => socialApi.toggleLike(postId),
    onMutate: async (postId) => {
      // 1. Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['social-feed'] });
      await queryClient.cancelQueries({ queryKey: ['social-trending'] });
      await queryClient.cancelQueries({ queryKey: ['social-search'] });

      // 2. Snapshot previous values
      const previousFeed = queryClient.getQueryData(['social-feed']);

      // 3. Optimistically update
      queryClient.setQueryData(['social-feed'], (old: any) => {
        if (!old) return old;
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

      return { previousFeed };
    },
    onError: (err, postId, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData(['social-feed'], context.previousFeed);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['social-feed'] });
    },
  });

  const followMutation = useMutation({
    mutationFn: (userId: number) => socialApi.toggleFollow(userId),
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: ['social-feed'] });
      const previousFeed = queryClient.getQueryData(['social-feed']);

      queryClient.setQueryData(['social-feed'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((p: SocialPost) => {
              if (p.user_id === userId) {
                return { ...p, is_following: !p.is_following };
              }
              return p;
            }),
          })),
        };
      });

      // Also update quick profile if it exists
      queryClient.setQueryData(['social-profile-quick', userId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          profile: {
            ...old.profile,
            is_following: !old.profile.is_following,
            follower_count: old.profile.is_following 
              ? old.profile.follower_count - 1 
              : old.profile.follower_count + 1
          }
        };
      });

      return { previousFeed };
    },
    onError: (err, userId, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData(['social-feed'], context.previousFeed);
      }
    },
    onSettled: (data, err, userId) => {
      queryClient.invalidateQueries({ queryKey: ['social-feed'] });
      queryClient.invalidateQueries({ queryKey: ['social-profile-quick', userId] });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: (postId: string | number) => socialApi.deletePost(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['social-feed'] });
      const previousFeed = queryClient.getQueryData(['social-feed']);

      queryClient.setQueryData(['social-feed'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.filter((p: SocialPost) => p.post_id !== String(postId)),
          })),
        };
      });

      return { previousFeed };
    },
    onError: (err, postId, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData(['social-feed'], context.previousFeed);
      }
      Alert.alert('Error', 'Failed to delete post');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['social-feed'] });
      queryClient.invalidateQueries({ queryKey: ['social-profile'] });
    },
  });

  const toggleLike = (postId: string | number) => {
    likeMutation.mutate(postId);
  };

  const toggleFollow = (userId: number) => {
    followMutation.mutate(userId);
  };

  const deletePost = (postId: string | number) => {
    deletePostMutation.mutate(postId);
  };

  return {
    toggleLike,
    toggleFollow,
    deletePost,
    isFollowing: followMutation.isPending,
    isLiking: likeMutation.isPending,
    isDeleting: deletePostMutation.isPending,
  };
};
