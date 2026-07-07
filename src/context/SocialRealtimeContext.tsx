import React, { ReactNode, useEffect } from 'react';
import { usePathname } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { disconnectRealtimeSocket, getRealtimeSocket } from '../services/realtime';

const NON_SOCIAL_PROFILE_PATHS = [
  '/profile/settings',
  '/profile/edit',
  '/profile/help',
  '/profile/about',
  '/profile/privacy',
  '/profile/blocked',
  '/profile/personal-info',
];

function isSocialRoute(pathname: string): boolean {
  const path = pathname || '';

  if (!path) return false;
  if (NON_SOCIAL_PROFILE_PATHS.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return false;
  }

  return (
    path === '/' ||
    path === '/search' ||
    path === '/notifications' ||
    path === '/follow-list' ||
    path === '/profile' ||
    path.startsWith('/profile/saved') ||
    path.startsWith('/profile/') ||
    path.startsWith('/post/') ||
    path.startsWith('/comment/') ||
    path.startsWith('/pet-profile/')
  );
}

function invalidateSocialQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['social-feed'] });
  queryClient.invalidateQueries({ queryKey: ['social-profile'] });
  queryClient.invalidateQueries({ queryKey: ['social-reposts'] });
  queryClient.invalidateQueries({ queryKey: ['social-pets'] });
  queryClient.invalidateQueries({ queryKey: ['social-search'] });
  queryClient.invalidateQueries({ queryKey: ['social-explore'] });
  queryClient.invalidateQueries({ queryKey: ['social-trending'] });
  queryClient.invalidateQueries({ queryKey: ['social-followers'] });
  queryClient.invalidateQueries({ queryKey: ['social-following'] });
  queryClient.invalidateQueries({ queryKey: ['social-collections'] });
  queryClient.invalidateQueries({ queryKey: ['collection-posts'] });
}

function invalidateNotificationQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['notifications'] });
  queryClient.invalidateQueries({ queryKey: ['unread-count'] });
}

export function SocialRealtimeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  useEffect(() => {
    const shouldConnect = isSocialRoute(pathname) && !!accessToken;
    let socket: any = null;
    let active = true;

    if (!shouldConnect) {
      disconnectRealtimeSocket();
      return undefined;
    }

    const onPostActivity = () => {
      invalidateSocialQueries(queryClient);
    };

    const onFollowActivity = () => {
      queryClient.invalidateQueries({ queryKey: ['social-followers'] });
      queryClient.invalidateQueries({ queryKey: ['social-following'] });
      queryClient.invalidateQueries({ queryKey: ['social-profile'] });
      queryClient.invalidateQueries({ queryKey: ['social-search'] });
      queryClient.invalidateQueries({ queryKey: ['social-explore'] });
      queryClient.invalidateQueries({ queryKey: ['social-feed'] });
    };

    const onNotificationActivity = () => {
      invalidateNotificationQueries(queryClient);
    };

    (async () => {
      socket = await getRealtimeSocket();
      if (!active || !socket) return;

      socket.on('post:liked', onPostActivity);
      socket.on('post:commented', onPostActivity);
      socket.on('post:reposted', onPostActivity);
      socket.on('follow:new', onFollowActivity);
      socket.on('notification:new', onNotificationActivity);
    })();

    return () => {
      active = false;
      if (socket) {
        socket.off('post:liked', onPostActivity);
        socket.off('post:commented', onPostActivity);
        socket.off('post:reposted', onPostActivity);
        socket.off('follow:new', onFollowActivity);
        socket.off('notification:new', onNotificationActivity);
      }
      disconnectRealtimeSocket();
    };
  }, [pathname, accessToken, queryClient]);

  return <>{children}</>;
}
