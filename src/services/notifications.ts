import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { notificationsApi } from '../api/notifications';

let Notifications: any = null;
try {
  Notifications = require('expo-notifications');

  // Must be called at root level before any notification arrives
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (e) {
  if (__DEV__) console.log('Failed to initialize expo-notifications (expected on some simulator configurations)');
}

export const registerForPushNotifications = async (): Promise<string | null> => {
  if (!Notifications) return null;

  if (!Device.isDevice) {
    if (__DEV__) console.log('Must use physical device for Push Notifications');
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    if (__DEV__) console.log('Failed to get push token for push notification!');
    return null;
  }

  // Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('paltuu_default', {
      name: 'Paltuu',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  const token = await Notifications.getExpoPushTokenAsync();

  // Register with backend
  await notificationsApi.registerDevice({
    fcm_token: token.data,
    platform: Platform.OS as 'ios' | 'android',
  });

  return token.data;
};
