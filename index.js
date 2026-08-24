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
  // Guarded: this runs before expo-router/entry, so a missing/misconfigured native
  // module here (e.g. a build whose autolinking didn't pick up notifee/firebase-messaging)
  // would otherwise throw synchronously and stop the bundle from ever finishing
  // evaluation — expo-router/entry, _layout.tsx, and SplashScreen.hideAsync() would
  // never run, which reads as the app being stuck on the splash screen forever with no
  // visible crash. Losing dispatcher alerts on a broken build is recoverable; a
  // permanent splash hang for every Android user is not.
  try {
    const messaging = require('@react-native-firebase/messaging').default;
    const notifee = require('@notifee/react-native').default;

    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      if (remoteMessage?.data?.type !== 'express_vet_incoming_call') return;

      // Lazy require: this file runs before any RN module registry setup a normal
      // `import` at the top could rely on, so requiring inline here (after RN's own
      // bridge is up, which it is by the time this handler fires) is the safe order.
      const { displayAndroidIncomingAlert, parseExpressVetAlertData } = require('./src/services/androidDispatchAlert');
      await displayAndroidIncomingAlert(parseExpressVetAlertData(remoteMessage.data));
    });

    // notifee requires a background-event handler to be registered even when there's
    // nothing to do with it — the full-screen action itself is what opens the app; once
    // open, DispatcherCallProvider.tsx picks up the launch via getInitialNotification()/
    // onForegroundEvent and navigates to the alert screen.
    notifee.onBackgroundEvent(async () => {});
  } catch (e) {
    console.log('[Paltuu] Android dispatcher background handlers failed to register:', e?.message);
  }
}

require('expo-router/entry');
