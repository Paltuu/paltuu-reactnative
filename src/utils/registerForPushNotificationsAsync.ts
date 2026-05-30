import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Pattern 1 (Debug Version)
 * Registers the device for Expo push notifications.
 * - Sets up Android notification channel
 * - Guards against non-physical devices
 * - Requests permission if not already granted
 * - Resolves projectId from EAS config
 * - Logs the raw token for dev debugging
 */
export async function registerForPushNotificationsAsync(): Promise<string> {
  // Android channel setup
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  // Guard: physical device only
  if (!Device.isDevice) {
    throw new Error(
      '[Paltuu Notifications] Must use a physical device for Push Notifications'
    );
  }

  // Check & request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    throw new Error(
      '[Paltuu Notifications] Permission not granted for push notifications'
    );
  }

  // Resolve EAS projectId
  const projectId: string | undefined =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    (Constants as any)?.easConfig?.projectId;

  if (!projectId) {
    throw new Error(
      '[Paltuu Notifications] No EAS projectId found in app config. Check app.config.ts extra.eas.projectId'
    );
  }

  // Get Expo push token
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

  // Dev debugging — intentional
  console.log('[Paltuu Notifications] 📬 Expo Push Token:', token);

  return token;
}
