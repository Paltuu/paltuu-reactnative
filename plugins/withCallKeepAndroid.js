/**
 * Config plugin: register react-native-callkeep's VoiceConnectionService in
 * AndroidManifest.xml.
 *
 * This is the piece of Android's telecom framework that lets the dispatcher-alert
 * ringing call (Vets at Home / Express Vet) show as a native full-screen incoming-call
 * UI even when the app is backgrounded or killed — Expo's managed config has no field for
 * declaring a <service>, so this has to be a manifest-level plugin. The required
 * permissions themselves are declared in app.config.ts's `android.permissions` array
 * (that part Expo's plain config already supports).
 *
 * Source: react-native-callkeep's Android install docs (VoiceConnectionService element).
 * `foregroundServiceType="camera|microphone"` matches Android 11+; the package's own
 * manifest merge should reconcile this correctly if it also declares the service —
 * if `expo prebuild` reports a manifest merge conflict here, keep this one (it's the
 * more specific/current variant) and drop the duplicate.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

const SERVICE_NAME = 'io.wazo.callkeep.VoiceConnectionService';

const withCallKeepAndroid = (config) =>
  withAndroidManifest(config, (cfg) => {
    const application = cfg.modResults.manifest.application?.[0];
    if (!application) return cfg;

    application.service = application.service || [];
    const alreadyDeclared = application.service.some(
      (s) => s.$?.['android:name'] === SERVICE_NAME
    );
    if (alreadyDeclared) return cfg;

    application.service.push({
      $: {
        'android:name': SERVICE_NAME,
        'android:label': 'Paltuu',
        'android:permission': 'android.permission.BIND_TELECOM_CONNECTION_SERVICE',
        'android:foregroundServiceType': 'camera|microphone',
        'android:exported': 'true',
      },
      'intent-filter': [
        {
          action: [{ $: { 'android:name': 'android.telecom.ConnectionService' } }],
        },
      ],
    });

    return cfg;
  });

module.exports = withCallKeepAndroid;
