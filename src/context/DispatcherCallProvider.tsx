import { useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '../stores/authStore';
import { setupCallKeep, attachCallKeepListeners, endCallKeepCall } from '../services/callkeep';
import { setupDispatcherVoipPush } from '../services/dispatcherVoipPush';
import { expressVetDispatchApi } from '../api/expressVetDispatch';
import type { IncomingExpressVetCallPayload } from '../stores/incomingCallStore';

/**
 * Mounts the Vets at Home dispatcher ringing-call alert for dispatcher accounts only —
 * everyone else pays no setup cost here (see app size note in src/services/callkeep.ts
 * for the caveat that the native binary itself is still larger for all installs once
 * these dependencies are compiled in, regardless of this role gate).
 *
 * This is deliberately separate from the on-duty toggle in the dispatcher console
 * (POST /dispatcher/duty) — a dispatcher who is authenticated but has gone off-duty
 * should still register a token (so calls resume the moment they flip back on), but the
 * backend already only alerts on-duty dispatchers (see requests/route.ts), so there's no
 * double-gating to worry about here.
 */
export function DispatcherCallProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isDispatcher = user?.role === 'dispatcher' || user?.role === 'admin';

  useEffect(() => {
    if (!isDispatcher) return;

    let cleanupVoip: (() => void) | undefined;
    let cleanupCallKeepListeners: (() => void) | undefined;
    let cleanupForegroundFcm: (() => void) | undefined;
    let active = true;

    (async () => {
      await setupCallKeep();
      if (!active) return;

      cleanupCallKeepListeners = attachCallKeepListeners({
        onAnswer: (payload: IncomingExpressVetCallPayload, callUUID: string) => {
          router.push({
            pathname: '/(app)/express-vet-dispatch/requests/[id]',
            params: { id: payload.request_id },
          } as any);

          expressVetDispatchApi
            .claim(payload.request_id)
            .catch((err) => {
              // 409 = another dispatcher answered first — normal race outcome, not a bug.
              if (err?.response?.status === 409) {
                Toast.show({ type: 'info', text1: 'Already claimed by another dispatcher' });
              }
            })
            .finally(() => endCallKeepCall(callUUID));
        },
      });

      if (Platform.OS === 'ios') {
        cleanupVoip = setupDispatcherVoipPush();
      } else if (Platform.OS === 'android') {
        const messaging = require('@react-native-firebase/messaging').default;
        const { displayIncomingExpressVetCall } = require('../services/callkeep');

        messaging()
          .getToken()
          .then((fcmToken: string) =>
            expressVetDispatchApi.registerPushToken({ platform: 'android', fcm_token: fcmToken })
          )
          .catch(() => {});

        // Foreground counterpart to index.js's setBackgroundMessageHandler — that one
        // only fires while backgrounded/killed, this one covers the app-open case.
        const unsubscribe = messaging().onMessage(async (remoteMessage: any) => {
          if (remoteMessage?.data?.type !== 'express_vet_incoming_call') return;
          const data = remoteMessage.data;
          await displayIncomingExpressVetCall({
            request_id: String(data.request_id),
            category: String(data.category ?? 'express_vet'),
            client_name: String(data.client_name ?? 'Paltuu client'),
            client_photo_url: data.client_photo_url || null,
            address_line: String(data.address_line ?? ''),
            starting_price_pkr: Number(data.starting_price_pkr ?? 0),
            contact_phone: String(data.contact_phone ?? ''),
          });
        });
        cleanupForegroundFcm = unsubscribe;
      }
    })();

    return () => {
      active = false;
      cleanupVoip?.();
      cleanupCallKeepListeners?.();
      cleanupForegroundFcm?.();
    };
  }, [isDispatcher, router]);

  return <>{children}</>;
}
