import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { setupCallKeep } from './callkeep';
import { expressVetDispatchApi } from '../api/expressVetDispatch';
import { useIncomingCallStore } from '../stores/incomingCallStore';
import type { IncomingExpressVetCallPayload } from '../stores/incomingCallStore';

/**
 * iOS side of the ringing-call alert: registers the raw PushKit VoIP token (NOT an Expo
 * push token, NOT the normal APNs device token — a third, separate token type) and picks
 * up the job data for calls that the NATIVE layer has already reported to CallKit.
 *
 * ⚠️ This file deliberately does NOT display the incoming call any more.
 *
 * Apple requires the CallKit report to happen before the PushKit completion handler
 * returns, and JS fundamentally cannot meet that deadline: `didReceiveIncomingPush` only
 * posts a JS event, that event is asynchronous, and on a cold start (app killed — the
 * case this whole feature exists for) there is no JS running to receive it at all. The
 * old implementation called `RNCallKeep.displayIncomingCall` from here, which meant every
 * VoIP push violated the PushKit contract: iOS killed the app on arrival, and after
 * enough of those it stopped delivering VoIP pushes altogether.
 *
 * The report now happens natively in AppDelegate.swift (see
 * plugins/withVoipPushAppDelegate.js), which passes the whole VoIP payload to
 * `reportNewIncomingCall`. CallKeep echoes that back through its `didDisplayIncomingCall`
 * event with the callUUID it used — so JS gets the call identity and the job data
 * together, with no UUID correlation to maintain, and calling `displayIncomingCall` here
 * would now report a *second*, duplicate call.
 */

/** Shape of the `expressVet` object the server puts in the VoIP payload. */
type RawJob = Partial<IncomingExpressVetCallPayload> & { starting_price_pkr?: string | number };

function normalizeJob(raw: RawJob): IncomingExpressVetCallPayload {
  return {
    request_id: String(raw.request_id),
    category: String(raw.category ?? 'express_vet'),
    client_name: String(raw.client_name ?? 'Paltuu client'),
    client_photo_url: (raw.client_photo_url as string) || null,
    address_line: String(raw.address_line ?? ''),
    starting_price_pkr: Number(raw.starting_price_pkr ?? 0),
    contact_phone: String(raw.contact_phone ?? ''),
  };
}

/**
 * CallKeep hands `payload` back exactly as it was given to `reportNewIncomingCall` — the
 * raw VoIP dictionary — but the bridge stringifies an empty payload to `""`, so this
 * tolerates both shapes rather than assuming an object.
 */
function extractJob(payload: any): RawJob | null {
  if (!payload || typeof payload !== 'object') return null;
  const job = payload.expressVet ?? payload;
  if (!job || typeof job !== 'object' || job.request_id == null) return null;
  return job as RawJob;
}

export function setupDispatcherVoipPush(): () => void {
  if (Platform.OS !== 'ios') return () => {};

  const VoipPushNotification = require('react-native-voip-push-notification').default;
  const RNCallKeep = require('react-native-callkeep').default;

  const onRegister = (token: string) => {
    // Sent so the server can address the push to THIS build's VoIP topic — dev, preview
    // and production have different bundle ids and a token is only valid for its own.
    const bundleId = Constants.expoConfig?.ios?.bundleIdentifier ?? undefined;

    expressVetDispatchApi
      .registerPushToken({ platform: 'ios', voip_token: token, bundle_id: bundleId })
      .catch((err) => {
        if (__DEV__) console.log('[Paltuu Dispatcher] VoIP token registration failed:', err?.message);
      });
  };

  /**
   * Fired once the native layer's `reportNewIncomingCall` has been accepted by CallKit —
   * i.e. the phone is already ringing by the time this runs. All that's left is to stash
   * the job against the callUUID so the answer/end handlers in DispatcherCallProvider can
   * look up which request the dispatcher just picked up.
   */
  const onDidDisplayIncomingCall = ({ callUUID, payload }: { callUUID: string; payload: any }) => {
    const job = extractJob(payload);
    if (!callUUID || !job) return;
    useIncomingCallStore.getState().register(callUUID, normalizeJob(job));
  };

  // Still worth listening to: this is the only place the raw payload arrives when the push
  // reached a JS context that was already running, and it keeps the CallKeep setup warm.
  // It must not display anything.
  const onNotification = () => {
    setupCallKeep().catch(() => {});
  };

  RNCallKeep.addEventListener('didDisplayIncomingCall', onDidDisplayIncomingCall);

  // Cold start: the app was killed, the VoIP push launched it, and the native layer
  // reported the call to CallKit long before this JS ever ran — so the
  // didDisplayIncomingCall event above fired into a bridge with no listeners and was
  // buffered, not delivered. Without draining that buffer the phone rings but the store
  // is empty, and answering does nothing because the answerCall handler can't find the
  // job. This is the exact path the whole feature exists for, so it must be replayed.
  RNCallKeep.getInitialEvents()
    .then((events: { name: string; data: any }[] | null) => {
      for (const event of events ?? []) {
        if (event?.name !== 'RNCallKeepDidDisplayIncomingCall') continue;
        // Buffered events skip actions.js's handler wrapper, which is what parses a
        // string payload into an object on Android — so do it here too.
        const data = { ...event.data };
        if (typeof data.payload === 'string') {
          try {
            data.payload = JSON.parse(data.payload);
          } catch {
            // Leave it as-is; extractJob rejects non-objects.
          }
        }
        onDidDisplayIncomingCall(data);
      }
    })
    .catch(() => {});

  VoipPushNotification.addEventListener('register', onRegister);
  VoipPushNotification.addEventListener('notification', onNotification);
  VoipPushNotification.registerVoipToken();

  return () => {
    RNCallKeep.removeEventListener('didDisplayIncomingCall', onDidDisplayIncomingCall);
    VoipPushNotification.removeEventListener('register');
    VoipPushNotification.removeEventListener('notification');
  };
}
