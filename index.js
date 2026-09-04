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
    // v26 dropped the old `messaging()` default-export API — see
    // DispatcherCallProvider.tsx for the full story (that `.default` call was resolving
    // to undefined on every real device, not just here).
    const { getMessaging, setBackgroundMessageHandler } = require('@react-native-firebase/messaging');
    const notifee = require('@notifee/react-native').default;

    setBackgroundMessageHandler(getMessaging(), async (remoteMessage) => {
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

// react-native-screens wraps every off-screen route in <react-freeze>, which
// unmounts screen B's subtree while you're on C and re-mounts it when you swipe
// back. On iOS + New Architecture (screens 4.16) a fast interactive back-swipe
// through more than one screen races that thaw against the native pop: you land
// on A, B re-mounts a frame late, the stack "corrects" by sliding B in and then
// back out to A on its own. Disabling freeze keeps B mounted the whole time, so
// there is nothing to re-mount mid-gesture and the bounce goes away. Cost is
// that backgrounded screens keep their React tree in memory (no re-render while
// blurred — they're still detached from the view hierarchy by screens itself).
// Must run before any screen mounts, hence here rather than in _layout.tsx.
const { enableFreeze } = require('react-native-screens');
enableFreeze(false);

require('expo-router/entry');
