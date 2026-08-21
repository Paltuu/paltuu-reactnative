import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useIncomingCallStore, IncomingExpressVetCallPayload } from '../stores/incomingCallStore';

/**
 * Native ringing-call UI for the Vets at Home / Express Vet dispatcher alert, via
 * react-native-callkeep (CallKit on iOS, telecom ConnectionService on Android). The OS
 * itself owns the ringing/vibration/lock-screen behavior once a call is displayed — there
 * is no ringtone-loop or "keep ringing" code to write here, that's the whole point of
 * using the real call APIs instead of a custom full-screen modal + expo-av loop.
 *
 * NOTE on app size: unlike the account/role-gated JS *screens* elsewhere in this feature,
 * react-native-callkeep and react-native-voip-push-notification are native modules that
 * get compiled into the app binary for EVERY install once added as dependencies — lazily
 * `require()`-ing the JS wrapper (done below) avoids running its setup code for non-
 * dispatcher users, but does not reduce native binary size the way lazy-loading a
 * JS-only dependency (e.g. expo-location) does. There is no way to make CallKit/
 * ConnectionService support "binary-optional" in a single build.
 */

let isSetUp = false;

export async function setupCallKeep(): Promise<void> {
  if (isSetUp) return;
  const RNCallKeep = require('react-native-callkeep').default;

  await RNCallKeep.setup({
    ios: {
      appName: 'Paltuu Dispatcher',
      supportsVideo: false,
      includesCallsInRecents: false,
    },
    android: {
      alertTitle: 'Phone account permission',
      alertDescription: 'Paltuu Dispatcher needs access to your phone accounts to show incoming job alerts as calls.',
      cancelButton: 'Cancel',
      okButton: 'Allow',
      foregroundService: {
        channelId: 'com.paltuu.app.dispatchcall',
        channelName: 'Incoming job alerts',
        notificationTitle: 'Listening for incoming Vets at Home requests',
        notificationIcon: 'ic_notification',
      },
    },
  });

  if (Platform.OS === 'android') {
    RNCallKeep.setAvailable(true);
  }

  isSetUp = true;
}

/**
 * Show the native incoming-call screen for a new Vets at Home request. `payload` is
 * stashed in the incoming-call store keyed by the generated call UUID so the answer/end
 * handlers (wired in DispatcherRealtimeContext-adjacent setup, see
 * src/context/DispatcherCallProvider.tsx) can look up which request this call was for.
 */
export async function displayIncomingExpressVetCall(
  payload: IncomingExpressVetCallPayload
): Promise<string> {
  await setupCallKeep();
  const RNCallKeep = require('react-native-callkeep').default;

  const callUUID = Crypto.randomUUID();
  useIncomingCallStore.getState().register(callUUID, payload);

  RNCallKeep.displayIncomingCall(
    callUUID,
    payload.client_name || 'Paltuu client',
    `${payload.category.replace(/_/g, ' ')} — ${payload.address_line}`,
    'generic',
    false
  );

  return callUUID;
}

export function endCallKeepCall(callUUID: string): void {
  try {
    const RNCallKeep = require('react-native-callkeep').default;
    RNCallKeep.endCall(callUUID);
  } catch {
    // CallKeep not set up yet (e.g. app cold-started straight into this from a killed
    // state race) — nothing to end, safe to ignore.
  }
  useIncomingCallStore.getState().clear(callUUID);
}

/**
 * Wires the two events that matter for this feature: answering navigates into the
 * request + attempts the claim, ending just tears down local state (declining a call the
 * dispatcher was never assigned doesn't need a server call — the request just stays
 * `pending_dispatch` for the next dispatcher). Call once, high in the tree (see
 * DispatcherCallProvider) — safe to call multiple times, CallKeep dedupes by handler
 * identity is NOT guaranteed, so the caller is responsible for only calling this once.
 */
export function attachCallKeepListeners(handlers: {
  onAnswer: (payload: IncomingExpressVetCallPayload, callUUID: string) => void;
  onEnd?: (callUUID: string) => void;
}): () => void {
  const RNCallKeep = require('react-native-callkeep').default;

  const onAnswerCall = ({ callUUID }: { callUUID: string }) => {
    const payload = useIncomingCallStore.getState().get(callUUID);
    if (payload) {
      handlers.onAnswer(payload, callUUID);
    }
  };

  const onEndCall = ({ callUUID }: { callUUID: string }) => {
    handlers.onEnd?.(callUUID);
    useIncomingCallStore.getState().clear(callUUID);
  };

  RNCallKeep.addEventListener('answerCall', onAnswerCall);
  RNCallKeep.addEventListener('endCall', onEndCall);

  return () => {
    RNCallKeep.removeEventListener('answerCall', onAnswerCall);
    RNCallKeep.removeEventListener('endCall', onEndCall);
  };
}
