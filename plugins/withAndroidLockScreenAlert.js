/**
 * Config plugin: mark MainActivity so it can render over a locked screen and turn the
 * screen on.
 *
 * The Vets at Home dispatcher ringing alert (src/services/androidDispatchAlert.ts) uses a
 * notifee full-screen notification to launch MainActivity as the "incoming call" UI, the
 * same way a real phone dialer wakes the screen for a call. Without `showWhenLocked` +
 * `turnScreenOn` on the activity itself, Android will still deliver the full-screen intent
 * but MainActivity won't actually draw over the lock screen or wake the display — it just
 * queues behind the lock screen until the dispatcher unlocks the phone some other way,
 * which defeats the "impossible to miss" point of a full-screen alert.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

const withAndroidLockScreenAlert = (config) =>
  withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    const activity = app?.activity?.find((a) => a.$['android:name'] === '.MainActivity');
    if (activity) {
      activity.$['android:showWhenLocked'] = 'true';
      activity.$['android:turnScreenOn'] = 'true';
    }
    return cfg;
  });

module.exports = withAndroidLockScreenAlert;
