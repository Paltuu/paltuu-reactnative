import { Platform } from 'react-native';
import { displayIncomingExpressVetCall } from './callkeep';
import { expressVetDispatchApi } from '../api/expressVetDispatch';
import type { IncomingExpressVetCallPayload } from '../stores/incomingCallStore';

/**
 * iOS side of the ringing-call alert: registers the raw PushKit VoIP token (NOT an Expo
 * push token, NOT the normal APNs device token — a third, separate token type) and turns
 * each incoming VoIP push into a CallKeep incoming-call display.
 *
 * Apple requires `RNCallKeep.displayIncomingCall` (called inside displayIncomingExpressVetCall)
 * to happen SYNCHRONOUSLY in response to the VoIP push, or iOS may terminate the app for
 * violating the PushKit contract — this listener must stay minimal, no awaited network
 * calls before that display call.
 */
export function setupDispatcherVoipPush(): () => void {
  if (Platform.OS !== 'ios') return () => {};

  const VoipPushNotification = require('react-native-voip-push-notification').default;

  const onRegister = (token: string) => {
    expressVetDispatchApi.registerPushToken({ platform: 'ios', voip_token: token }).catch((err) => {
      if (__DEV__) console.log('[Paltuu Dispatcher] VoIP token registration failed:', err?.message);
    });
  };

  const onNotification = (notification: any) => {
    const data = (notification?.expressVet ?? notification) as Partial<IncomingExpressVetCallPayload> & {
      starting_price_pkr?: string | number;
    };

    if (data?.request_id) {
      displayIncomingExpressVetCall({
        request_id: String(data.request_id),
        category: String(data.category ?? 'express_vet'),
        client_name: String(data.client_name ?? 'Paltuu client'),
        client_photo_url: (data.client_photo_url as string) || null,
        address_line: String(data.address_line ?? ''),
        starting_price_pkr: Number(data.starting_price_pkr ?? 0),
        contact_phone: String(data.contact_phone ?? ''),
      }).catch(() => {});
    }

    // Required by the library — tells PushKit this notification finished processing.
    if (notification?.uuid) {
      VoipPushNotification.onVoipNotificationCompleted(notification.uuid);
    }
  };

  VoipPushNotification.addEventListener('register', onRegister);
  VoipPushNotification.addEventListener('notification', onNotification);
  VoipPushNotification.registerVoipToken();

  return () => {
    VoipPushNotification.removeEventListener('register');
    VoipPushNotification.removeEventListener('notification');
  };
}
