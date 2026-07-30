import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api/notifications';
import { useAuthReady } from './useAuthReady';

/**
 * Keeps the home-screen app icon badge in sync with the unread count shown on
 * the bell in <MainHeader> / the notifications screen.
 *
 * Without this the badge is write-only from the server: it's stamped into each
 * push payload from the unread count at send time and nothing ever lowers it,
 * so reading notifications in-app cleared the bell but left the icon stuck on
 * the last-pushed number until another notification happened to arrive.
 *
 * Shares the ['unread-count'] query key with the bell, so every optimistic
 * update from mark-read / mark-all-read and every invalidation on a foreground
 * push flows straight through to the OS badge — one source of truth.
 */
export function useBadgeSync(): void {
  const authReady = useAuthReady();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    staleTime: 5 * 60 * 1000,
    enabled: authReady,
  });

  const unreadCount = data?.unread_count;

  useEffect(() => {
    if (unreadCount === undefined) return;
    Notifications.setBadgeCountAsync(unreadCount).catch((err: Error) => {
      console.log('[Paltuu Notifications] ⚠️ Failed to set app icon badge:', err.message);
    });
  }, [unreadCount]);

  // A push that lands while the app is backgrounded sets the badge from its own
  // payload, and the user may have read those notifications on another device.
  // Refetch on every foreground so the badge is reconciled against the server.
  useEffect(() => {
    if (!authReady) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      }
    });
    return () => sub.remove();
  }, [authReady, queryClient]);

  // Clear the badge on logout — but only on a real authenticated → logged-out
  // transition. authReady is also false during cold-start hydration, and
  // zeroing there would wipe a legitimate badge before the count loads.
  const wasAuthenticated = useRef(false);
  useEffect(() => {
    if (authReady) {
      wasAuthenticated.current = true;
      return;
    }
    if (wasAuthenticated.current) {
      wasAuthenticated.current = false;
      Notifications.setBadgeCountAsync(0).catch(() => { });
    }
  }, [authReady]);
}
