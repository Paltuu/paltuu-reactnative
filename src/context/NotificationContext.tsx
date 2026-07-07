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

    // 5. Cleanup
    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  // Register the token with the backend once we have both a token and an
  // authenticated session. Re-runs on login (the token is usually obtained
  // before the user is authenticated on a fresh install, so the initial
  // registration attempt would otherwise 401 and never be retried).
  useEffect(() => {
    if (!expoPushToken || !isAuthenticated) return;

    notificationsApi
      .registerDevice({ fcm_token: expoPushToken, platform: Platform.OS as 'ios' | 'android' })
      .then(() => {
        console.log('[Paltuu Notifications] ✅ Device token registered with backend successfully');
      })
      .catch((apiErr: any) => {
        console.log('[Paltuu Notifications] ⚠️ Backend token registration failed:', apiErr.message);
      });
  }, [expoPushToken, isAuthenticated]);

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
