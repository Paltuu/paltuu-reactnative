import * as Crypto from 'expo-crypto';
import { useIncomingCallStore, IncomingExpressVetCallPayload } from '../stores/incomingCallStore';

/**
 * Android side of the Vets at Home dispatcher ringing-call alert — a full-screen, looping
 * notifee notification, NOT react-native-callkeep. iOS keeps using callkeep/CallKit (see
 * src/services/callkeep.ts) because Apple has no other way to ring over a locked/killed
 * screen; Android's own `fullScreenAction` + `loopSound` notification primitive gets the
 * same "impossible to miss" result without needing CallKeep's telecom permissions
 * (CALL_PHONE, READ_PHONE_STATE, BIND_TELECOM_CONNECTION_SERVICE, FOREGROUND_SERVICE_*),
 * which is what a Play Console review flagged.
 *
 * Reuses `useIncomingCallStore` from the callkeep-era design unchanged — same "stash the
 * payload behind a generated id, look it up on answer" shape.
 */

const CHANNEL_ID = 'express_vet_dispatch_alert';
const FULL_SCREEN_ACTION_ID = 'open_express_vet_alert';

/** Shared FCM data-message -> payload mapping, used by both index.js's background handler
 * and DispatcherCallProvider's foreground `onMessage` handler. */
export function parseExpressVetAlertData(data: Record<string, any>): IncomingExpressVetCallPayload {
  return {
    request_id: String(data.request_id),
    category: String(data.category ?? 'express_vet'),
    client_name: String(data.client_name ?? 'Paltuu client'),
    client_photo_url: data.client_photo_url || null,
    address_line: String(data.address_line ?? ''),
    starting_price_pkr: Number(data.starting_price_pkr ?? 0),
    contact_phone: String(data.contact_phone ?? ''),
  };
}

let channelReady: Promise<void> | null = null;

async function ensureChannel(): Promise<void> {
  if (!channelReady) {
    channelReady = (async () => {
      const notifee = require('@notifee/react-native').default;
      const { AndroidImportance, AndroidVisibility } = require('@notifee/react-native');
      await notifee.createChannel({
        id: CHANNEL_ID,
        name: 'Incoming job alerts',
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        sound: 'default',
        vibration: true,
        vibrationPattern: [300, 600, 300, 600],
        bypassDnd: true,
      });
    })();
  }
  return channelReady;
}

/**
 * Displays the full-screen alert for a new Vets at Home request. Mirrors
 * the iOS CallKit path (see callkeep.ts / dispatcherVoipPush.ts): derives an id, stashes the payload in
 * the shared store, then triggers the platform-native "ring" UI — here, a notifee
 * notification with `fullScreenAction` (takes over the lock screen, same as CallKeep did)
 * and `loopSound` (repeats until the dispatcher acts, same as a real ringtone).
 */
export async function displayAndroidIncomingAlert(
  payload: IncomingExpressVetCallPayload
): Promise<string> {
  const notifee = require('@notifee/react-native').default;
  const { AndroidCategory, AndroidVisibility } = require('@notifee/react-native');

  await ensureChannel();
  await notifee.requestPermission();

  const alertId = Crypto.randomUUID();
  useIncomingCallStore.getState().register(alertId, payload);

  await notifee.displayNotification({
    id: alertId,
    title: payload.client_name || 'Paltuu client',
    body: `${payload.category.replace(/_/g, ' ')} — ${payload.address_line}`,
    data: { type: 'express_vet_incoming_call', alertId },
    android: {
      channelId: CHANNEL_ID,
      category: AndroidCategory.CALL,
      visibility: AndroidVisibility.PUBLIC,
      loopSound: true,
      ongoing: true,
      autoCancel: false,
      onlyAlertOnce: false,
      pressAction: { id: FULL_SCREEN_ACTION_ID },
      fullScreenAction: { id: FULL_SCREEN_ACTION_ID },
    },
  });

  return alertId;
}

/** Cancels the notification (stops the loop sound) and clears its stashed payload. */
export async function dismissAndroidIncomingAlert(alertId: string): Promise<void> {
  try {
    const notifee = require('@notifee/react-native').default;
    await notifee.cancelNotification(alertId);
  } catch {
    // Already dismissed / notifee not initialized — safe to ignore.
  }
  useIncomingCallStore.getState().clear(alertId);
}

/**
 * True if this notifee event is our full-screen alert being opened. Checked two ways since
 * a manual tap populates `pressAction` while the OS auto-launching the full-screen intent
 * (screen locked/off) surfaces it via the notification's own `fullScreenAction` field —
 * matching either is fine since this id is only ever used for this one notification.
 */
export function isExpressVetAlertOpenEvent(event: {
  detail?: {
    pressAction?: { id?: string };
    notification?: { android?: { fullScreenAction?: { id?: string } } };
  };
}): boolean {
  const detail = event.detail;
  return (
    detail?.pressAction?.id === FULL_SCREEN_ACTION_ID ||
    detail?.notification?.android?.fullScreenAction?.id === FULL_SCREEN_ACTION_ID
  );
}
