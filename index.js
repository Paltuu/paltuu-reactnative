// Custom entry point (package.json "main" points here instead of directly at
// "expo-router/entry") so the Android FCM background-message handler for the Vets at
// Home dispatcher ringing-call alert can be registered before the RN bridge/JS app even
// starts. This is a hard requirement of @react-native-firebase/messaging — a handler
// registered later (e.g. inside a React component) will not fire for messages received
// while the app is fully killed, which defeats the entire "ring even when killed" goal.
//
// iOS needs no equivalent here: PushKit VoIP delivery is wired natively (see
// plugins/withVoipPushAppDelegate.js) and reaches JS through
// src/services/dispatcherVoipPush.ts once the app is running, not through this file.
import { Platform } from 'react-native';

if (Platform.OS === 'android') {
  const messaging = require('@react-native-firebase/messaging').default;

  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    if (remoteMessage?.data?.type !== 'express_vet_incoming_call') return;

    // Lazy require: this file runs before any RN module registry setup a normal
    // `import` at the top could rely on, so requiring inline here (after RN's own
    // bridge is up, which it is by the time this handler fires) is the safe order.
    const { displayIncomingExpressVetCall } = require('./src/services/callkeep');
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
}

require('expo-router/entry');
