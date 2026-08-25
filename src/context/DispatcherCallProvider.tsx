import { useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '../stores/authStore';
import { setupCallKeep, attachCallKeepListeners, endCallKeepCall } from '../services/callkeep';
import { setupDispatcherVoipPush } from '../services/dispatcherVoipPush';
import {
  displayAndroidIncomingAlert,
  isExpressVetAlertOpenEvent,
  parseExpressVetAlertData,
} from '../services/androidDispatchAlert';
import { useIncomingCallStore } from '../stores/incomingCallStore';
import { expressVetDispatchApi } from '../api/expressVetDispatch';
import type { IncomingExpressVetCallPayload } from '../stores/incomingCallStore';

/**
 * Mounts the Vets at Home dispatcher ringing-call alert for dispatcher accounts only —
 * everyone else pays no setup cost here (see app size note in src/services/callkeep.ts
 * for the caveat that the native binary itself is still larger for all installs once
 * these dependencies are compiled in, regardless of this role gate).
 *
 * iOS and Android are two genuinely different mechanisms here, not just different config:
 *   - iOS: react-native-callkeep -> CallKit, a real incoming-call screen. This is the only
 *     way to ring over a locked/killed screen on iOS, so it's untouched (see callkeep.ts).
 *   - Android: a notifee full-screen notification (src/services/androidDispatchAlert.ts),
 *     no CallKeep/telecom involved. Opening it (tap, or the OS auto-launching it over the
 *     lock screen) navigates to /express-vet-dispatch/incoming-alert, which owns the
 *     accept/dismiss decision — there's no native "answerCall" event to listen for the way
 *     CallKeep has, since this isn't pretending to be a real call.
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
    let cleanupNotifeeForeground: (() => void) | undefined;
    let active = true;

    const openAlertScreen = (alertId: string) => {
      if (!useIncomingCallStore.getState().get(alertId)) return;
      router.push({
        pathname: '/express-vet-dispatch/incoming-alert',
        params: { alertId },
      } as any);
    };

    (async () => {
      if (Platform.OS === 'ios') {
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

        cleanupVoip = setupDispatcherVoipPush();
      } else if (Platform.OS === 'android') {
        const messaging = require('@react-native-firebase/messaging').default;
        const notifee = require('@notifee/react-native').default;

        messaging()
          .getToken()
          .then((fcmToken: string) =>
            expressVetDispatchApi
              .registerPushToken({ platform: 'android', fcm_token: fcmToken })
              .catch((err: any) => {
                expressVetDispatchApi
                  .reportClientLog({
                    context: 'android_register_push_token_post_failed',
                    message: String(err?.message ?? err),
                    extra: { status: err?.response?.status, data: err?.response?.data },
                  })
                  .catch(() => {});
              })
          )
          .catch((err: any) => {
            // messaging().getToken() itself failed — the more interesting case, since it
            // means the device never even got a token (Google Play Services missing/stale,
            // Firebase native init failed, etc.). Previously this was a bare `.catch(() =>
            // {})` with zero trace anywhere, which is why this path stayed a mystery despite
            // dispatcher_status never showing a single successful Android FCM registration.
            expressVetDispatchApi
              .reportClientLog({
                context: 'android_fcm_get_token_failed',
                message: String(err?.message ?? err),
                extra: { code: err?.code, name: err?.name },
              })
              .catch(() => {});
          });

        // Foreground counterpart to index.js's setBackgroundMessageHandler — that one
        // only fires while backgrounded/killed, this one covers the app-open case.
        cleanupForegroundFcm = messaging().onMessage(async (remoteMessage: any) => {
          if (remoteMessage?.data?.type !== 'express_vet_incoming_call') return;
          await displayAndroidIncomingAlert(parseExpressVetAlertData(remoteMessage.data));
        });

        // Cold start: app was fully killed and got launched by the dispatcher tapping the
        // alert (or its full-screen auto-launch). Handles the equivalent of what
        // notifee.onBackgroundEvent (index.js) can't do — that fires before JS/navigation
        // is ready, this runs once this provider (and the router) is mounted.
        notifee.getInitialNotification().then((initial: any) => {
          if (active && initial && isExpressVetAlertOpenEvent({ detail: initial })) {
            openAlertScreen(initial.notification.id);
          }
        });

        // App backgrounded (not killed) when the dispatcher taps the alert.
        cleanupNotifeeForeground = notifee.onForegroundEvent(({ detail }: any) => {
          if (isExpressVetAlertOpenEvent({ detail }) && detail.notification?.id) {
            openAlertScreen(detail.notification.id);
          }
        });
      }
    })();

    return () => {
      active = false;
      cleanupVoip?.();
      cleanupCallKeepListeners?.();
      cleanupForegroundFcm?.();
      cleanupNotifeeForeground?.();
    };
  }, [isDispatcher, router]);

  return <>{children}</>;
}
