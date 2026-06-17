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
      await queryClient.cancelQueries({ queryKey: ['post', String(postId)] });

      // 2. Snapshot previous values
      const previousFeed = queryClient.getQueryData(['social-feed']);
      const previousPost = queryClient.getQueryData(['post', String(postId)]);

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

      // Also update the post-detail cache so the like reflects instantly there.
      queryClient.setQueryData(['post', String(postId)], (old: any) => {
        if (!old) return old;
        const newLiked = !old.is_liked;
        return {
          ...old,
          is_liked: newLiked,
          like_count: newLiked ? (old.like_count || 0) + 1 : Math.max(0, (old.like_count || 0) - 1),
        };
      });

      return { previousFeed, previousPost, postId };
    },
    onError: (err, postId, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData(['social-feed'], context.previousFeed);
      }
      if (context?.previousPost) {
        queryClient.setQueryData(['post', String(postId)], context.previousPost);
      }
    },
    onSettled: (data, err, postId) => {
      queryClient.invalidateQueries({ queryKey: ['social-feed'] });
      queryClient.invalidateQueries({ queryKey: ['post', String(postId)] });
    },
  });

  const followMutation = useMutation({
    mutationFn: (userId: string | number) => socialApi.toggleFollow(userId),
    onMutate: async (userId: string | number) => {
      await queryClient.cancelQueries({ queryKey: ['social-feed'] });
      await queryClient.cancelQueries({ queryKey: ['social-profile', String(userId)] });

      const previousFeed = queryClient.getQueryData(['social-feed']);
      const previousProfile = queryClient.getQueryData(['social-profile', String(userId)]);

      queryClient.setQueryData(['social-feed'], (old: any) => {
        if (!old) return old;
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

      // Also update quick profile if it exists
      queryClient.setQueryData(['social-profile-quick', userId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          profile: {
            ...old.profile,
            is_following: !old.profile.is_following,
            follower_count: old.profile.is_following 
              ? Math.max(0, old.profile.follower_count - 1)
              : old.profile.follower_count + 1
          }
        };
      });

      // Also update full profile if it exists
      queryClient.setQueryData(['social-profile', String(userId)], (old: any) => {
        if (!old || !old.profile) return old;
        return {
          ...old,
          profile: {
            ...old.profile,
            is_following: !old.profile.is_following,
            follower_count: old.profile.is_following 
              ? Math.max(0, old.profile.follower_count - 1)
              : old.profile.follower_count + 1
          }
        };
      });

      return { previousFeed, previousProfile };
    },
    onError: (err, userId, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData(['social-feed'], context.previousFeed);
      }
      if (context?.previousProfile) {
        queryClient.setQueryData(['social-profile', String(userId)], context.previousProfile);
      }
    },
    onSettled: (data, err, userId) => {
      queryClient.invalidateQueries({ queryKey: ['social-feed'] });
      queryClient.invalidateQueries({ queryKey: ['social-profile', String(userId)] });
      queryClient.invalidateQueries({ queryKey: ['social-profile-quick', userId] });
      queryClient.invalidateQueries({ queryKey: ['social-followers'] });
      queryClient.invalidateQueries({ queryKey: ['social-following'] });
      queryClient.invalidateQueries({ queryKey: ['social-search'] });
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

  const updatePostMutation = useMutation({
    mutationFn: ({ postId, payload }: { postId: string | number; payload: any }) => 
      socialApi.updatePost(postId, payload),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['social-feed'] });
      queryClient.invalidateQueries({ queryKey: ['social-profile'] });
      queryClient.invalidateQueries({ queryKey: ['social-trending'] });
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
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['social-feed'] });
      await queryClient.cancelQueries({ queryKey: ['social-profile'] });
      await queryClient.cancelQueries({ queryKey: ['social-trending'] });

      // Save snapshots
      const previousFeed = queryClient.getQueryData(['social-feed']);

      // Helper function to update posts array
      const updatePostsArray = (posts: SocialPost[]) => {
        return posts.map((p) => {
          if (String(p.post_id) === String(postId)) {
            return { ...p, is_saved: !isSaved };
          }
          return p;
        });
      };

      // Optimistic updates
      queryClient.setQueryData(['social-feed'], (old: any) => {
        if (!old) return old;
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
        return {
          ...old,
          posts: updatePostsArray(old.posts),
        };
      });

      return { previousFeed };
    },
    onError: (err, variables, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData(['social-feed'], context.previousFeed);
      }
      Alert.alert('Error', 'Failed to update bookmark status');
    },
    onSettled: (data, err, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['social-feed'] });
      queryClient.invalidateQueries({ queryKey: ['social-profile'] });
      queryClient.invalidateQueries({ queryKey: ['save-status', postId] });
      queryClient.invalidateQueries({ queryKey: ['social-collections'] });
    },
  });

  const toggleLike = (postId: string | number) => {
    likeMutation.mutate(postId);
  };

  const toggleFollow = (userId: string | number) => {
    followMutation.mutate(userId);
  };

  const deletePost = (postId: string | number) => {
    deletePostMutation.mutate(postId);
  };

  const updatePost = (postId: string | number, payload: any) => {
    return updatePostMutation.mutateAsync({ postId, payload });
  };

  const toggleSave = (postId: string | number, isSaved: boolean) => {
    saveMutation.mutate({ postId, isSaved });
  };

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
