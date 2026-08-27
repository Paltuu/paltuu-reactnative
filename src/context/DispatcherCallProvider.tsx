import { useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
// @react-native-firebase/messaging v26 dropped the old `messaging()` default-export /
// namespaced-instance API in favor of Firebase's "modular" API (free functions taking a
// Messaging instance) — confirmed by its type declarations having no default export at
// all. The rest of this codebase (including index.js and NotificationContext.tsx) was
// still written against the old API, which is why `require(...).default` resolved to
// undefined on every real device, every attempt, including retries with backoff —
// there was never a race to retry past, the old API simply doesn't exist in this
// package version.
import { getMessaging, getToken, onMessage } from '@react-native-firebase/messaging';
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

    const openAlertScreen = (notification: { id?: string; data?: Record<string, any> }) => {
      const alertId = notification?.id;
      if (!alertId) return;

      if (!useIncomingCallStore.getState().get(alertId)) {
        // Not in the store — most likely because this notification was created by
        // index.js's background handler running in a separate headless JS task (killed-app
        // cold start), whose in-memory store never reaches the main app. Rehydrate from the
        // notification's own data instead, which does survive that boundary.
        const raw = notification?.data?.payload;
        if (typeof raw !== 'string') return;
        try {
          useIncomingCallStore.getState().register(alertId, JSON.parse(raw));
        } catch {
          return;
        }
      }

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
        let notifee: any;
        let messagingInstance: any;
        try {
          notifee = require('@notifee/react-native').default;
        } catch (err: any) {
          expressVetDispatchApi
            .reportClientLog({
              context: 'android_messaging_init_failed',
              message: String(err?.message ?? err),
              extra: { name: err?.name, module: 'notifee' },
            })
            .catch(() => {});
          return;
        }

        try {
          messagingInstance = getMessaging();
        } catch (err: any) {
          expressVetDispatchApi
            .reportClientLog({
              context: 'android_messaging_init_failed',
              message: String(err?.message ?? err),
              extra: { name: err?.name },
            })
            .catch(() => {});
          return;
        }

        getToken(messagingInstance)
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
            // getToken() itself failed — the more interesting case, since it means the
            // device never even got a token (Google Play Services missing/stale, Firebase
            // native init failed, etc.). Previously this was a bare `.catch(() => {})`
            // with zero trace anywhere, which is why this path stayed a mystery despite
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
        cleanupForegroundFcm = onMessage(messagingInstance, async (remoteMessage: any) => {
          if (remoteMessage?.data?.type !== 'express_vet_incoming_call') return;
          await displayAndroidIncomingAlert(parseExpressVetAlertData(remoteMessage.data));
        });

        // Cold start (app fully killed, launched by the alert) is handled earlier, in
        // app/_layout.tsx's navigation-protection effect — before its own first redirect
        // decision, so the app lands directly on the call screen instead of landing on the
        // dispatch console first and hopping to the call screen a beat later once this
        // provider got around to checking. Checking it again here would just re-navigate to
        // a route the user's already on. This provider only needs the backgrounded case.

        // App backgrounded (not killed) when the dispatcher taps the alert.
        cleanupNotifeeForeground = notifee.onForegroundEvent(({ detail }: any) => {
          if (isExpressVetAlertOpenEvent({ detail }) && detail.notification?.id) {
            openAlertScreen(detail.notification);
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
