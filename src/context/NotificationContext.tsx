// src/context/NotificationContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from '../utils/registerForPushNotificationsAsync';
import { notificationsApi } from '../api/notifications';
import { useAuthStore } from '../stores/authStore';
import { useBadgeSync } from '../hooks/useBadgeSync';

// ─── Types ───────────────────────────────────────────────────────────────────

interface NotificationContextType {
  expoPushToken: string | null;
  devicePushToken: string | null;
  notification: Notifications.Notification | null;
  error: Error | null;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const NotificationContext = createContext<NotificationContextType | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [devicePushToken, setDevicePushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Mirror the bell's unread count onto the home-screen app icon badge.
  useBadgeSync();

  useEffect(() => {
    // 1. Register for Expo push token (permission + token retrieval, no auth required)
    registerForPushNotificationsAsync()
      .then((token) => setExpoPushToken(token))
      .catch((err: Error) => {
        console.log('[Paltuu Notifications] ⚠️ Registration error:', err.message);
        setError(err);
      });

    // 2. Get native device push token (APNs / FCM)
    Notifications.getDevicePushTokenAsync()
      .then((deviceToken) => {
        console.log('[Paltuu Notifications] 📱 Device Push Token:', deviceToken.data);
        setDevicePushToken(String(deviceToken.data));
      })
      .catch((err: Error) => {
        console.log('[Paltuu Notifications] ⚠️ Device token error:', err.message);
      });

    // 3. Foreground notification listener
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notif) => {
        console.log('[Paltuu Notifications] 🔔 Foreground notification received:', JSON.stringify(notif, null, 2));
        setNotification(notif);
      }
    );

    // 4. Notification tap/response listener
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('[Paltuu Notifications] 👆 Notification response (tapped):', JSON.stringify(response, null, 2));
      }
    );

    // 5. Android foreground FCM listener — general (non-dispatcher) notifications only.
    // @react-native-firebase/messaging's native Android service now receives every FCM
    // push (see below), which starves expo-notifications' own receiver, so
    // addNotificationReceivedListener above never fires for these on Android any more —
    // this listener is what actually displays them while the app is foregrounded.
    // Filtered on `.notification` presence rather than a `data.type` check: the Vets at
    // Home dispatcher alert is deliberately sent data-only (see
    // lib/expressVet/dispatcherCallPush.ts) specifically so it never has this field, and
    // is displayed instead by DispatcherCallProvider.tsx's own onMessage listener.
    let cleanupAndroidForegroundFcm: (() => void) | undefined;
    if (Platform.OS === 'android') {
      const messaging = require('@react-native-firebase/messaging').default;
      const sub = messaging().onMessage(async (remoteMessage: any) => {
        if (!remoteMessage?.notification) return;
        await Notifications.scheduleNotificationAsync({
          content: {
            title: remoteMessage.notification.title,
            body: remoteMessage.notification.body,
            data: remoteMessage.data ?? {},
            sound: 'default',
          },
          trigger: null,
        });
      });
      cleanupAndroidForegroundFcm = sub;
    }

    // 6. Cleanup
    return () => {
      notificationListener.remove();
      responseListener.remove();
      cleanupAndroidForegroundFcm?.();
    };
  }, []);

  // Register the token with the backend once we have both a token and an
  // authenticated session. Re-runs on login (the token is usually obtained
  // before the user is authenticated on a fresh install, so the initial
  // registration attempt would otherwise 401 and never be retried).
  //
  // Android registers the native FCM device token, not the Expo push token: adding
  // @react-native-firebase/messaging (for the Vets at Home dispatcher alert) put a second
  // native FCM receiver service in the manifest, and Android FCM only invokes the
  // highest-priority one — RNFB's, at default priority, over expo-notifications' own
  // (explicit priority -1). Expo's push service therefore never receives anything on
  // Android any more, so sending to an Expo push token silently goes nowhere; the backend
  // already has a working native-FCM send path (NotificationService.ts classifyTokens),
  // previously only exercised by the dispatcher-specific token registration below. iOS is
  // unaffected by this particular conflict and keeps using the Expo token.
  useEffect(() => {
    const tokenToRegister = Platform.OS === 'android' ? devicePushToken : expoPushToken;
    if (!tokenToRegister || !isAuthenticated) return;

    notificationsApi
      .registerDevice({ fcm_token: tokenToRegister, platform: Platform.OS as 'ios' | 'android' })
      .then(() => {
        console.log('[Paltuu Notifications] ✅ Device token registered with backend successfully');
      })
      .catch((apiErr: any) => {
        console.log('[Paltuu Notifications] ⚠️ Backend token registration failed:', apiErr.message);
      });
  }, [expoPushToken, devicePushToken, isAuthenticated]);

  const value = useMemo(
    () => ({ expoPushToken, devicePushToken, notification, error }),
    [expoPushToken, devicePushToken, notification, error]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useNotification(): NotificationContextType {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotification must be used inside <NotificationProvider>');
  }
  return ctx;
}
