/**
 * Config plugin: wire PushKit VoIP registration into the generated Swift AppDelegate.
 *
 * react-native-voip-push-notification's JS side (`registerVoipToken()`) never receives a
 * token unless the native AppDelegate (a) triggers voip registration at launch and
 * (b) forwards PKPushRegistryDelegate's two callbacks to the library's native manager —
 * neither is optional, and Expo's managed config has no typed field for it, so this has
 * to patch generated source directly.
 *
 * ⚠️ THIS IS THE RISKIEST PLUGIN IN THIS FEATURE — unlike the Info.plist/AndroidManifest
 * plugins alongside it (typed AST edits via @expo/config-plugins, low-risk), this is a
 * best-effort STRING patch of Expo's current Swift AppDelegate template. After
 * `npx expo prebuild --clean`, open `ios/<App>/AppDelegate.swift` in Xcode and confirm by
 * hand that:
 *   1. `import PushKit` and `import RNVoipPushNotification` are both present — the latter
 *      is react-native-voip-push-notification's own CocoaPods module name (its podspec's
 *      `s.name`), required for `RNVoipPushNotificationManager` to be visible in Swift at
 *      all; omitting it fails with "cannot find 'RNVoipPushNotificationManager' in scope"
 *      (caught by a real local Xcode build — the class itself compiles fine as plain
 *      Objective-C, Swift just never saw it without this import),
 *   2. `RNVoipPushNotificationManager.voipRegistration()` is called somewhere in
 *      `application(_:didFinishLaunchingWithOptions:)`,
 *   3. the two PKPushRegistryDelegate methods below actually compile against whatever
 *      react-native-voip-push-notification's current Swift/ObjC bridging header exposes.
 * If the marker-based insertion below doesn't find its anchor (e.g. a future Expo SDK
 * changes the template), it throws loudly at prebuild time rather than silently no-op'ing
 * — treat that as a signal to patch AppDelegate.swift by hand instead of fighting this file.
 */
const { withAppDelegate } = require('@expo/config-plugins');

const IMPORT_MARKER = 'import PushKit\nimport RNVoipPushNotification';
const DELEGATE_CONFORMANCE_MARKER = 'PKPushRegistryDelegate';

const PUSHKIT_EXTENSION = `
// Vets at Home dispatcher ringing-call alert — VoIP push registration + delivery.
extension AppDelegate: PKPushRegistryDelegate {
  func voipSetup() {
    let registry = PKPushRegistry(queue: DispatchQueue.main)
    registry.delegate = self
    registry.desiredPushTypes = [.voIP]
  }

  public func pushRegistry(_ registry: PKPushRegistry, didUpdate pushCredentials: PKPushCredentials, for type: PKPushType) {
    RNVoipPushNotificationManager.didUpdate(pushCredentials, forType: type.rawValue)
  }

  public func pushRegistry(_ registry: PKPushRegistry, didReceiveIncomingPushWith payload: PKPushPayload, for type: PKPushType, completion: @escaping () -> Void) {
    RNVoipPushNotificationManager.didReceiveIncomingPush(with: payload, forType: type.rawValue)
    completion()
  }
}
`;

const withVoipPushAppDelegate = (config) =>
  withAppDelegate(config, (cfg) => {
    let contents = cfg.modResults.contents;

    if (contents.includes(DELEGATE_CONFORMANCE_MARKER)) {
      // Already patched (e.g. re-running prebuild) — leave as-is.
      return cfg;
    }

    if (!contents.includes(IMPORT_MARKER)) {
      contents = contents.replace(/^import Expo/m, `import Expo\n${IMPORT_MARKER}`);
    }

    if (!/class AppDelegate:\s*ExpoAppDelegate\s*\{/.test(contents)) {
      throw new Error(
        '[withVoipPushAppDelegate] Could not find the expected `class AppDelegate: ExpoAppDelegate {` ' +
        'anchor in the generated AppDelegate.swift — the Expo template likely changed. Patch VoIP push ' +
        'registration into ios/<App>/AppDelegate.swift by hand instead (see comments in this plugin file ' +
        'for what needs to be added), then remove this plugin from app.config.ts to stop it erroring.'
      );
    }

    // Call voipSetup() from didFinishLaunchingWithOptions — inserted right after the
    // `public override func application(...) -> Bool {` opening brace. The parameter
    // list's tail varies across Expo SDK versions (e.g. a `= nil` default value got added
    // at some point), so this matches loosely up to the closing `-> Bool {` rather than
    // pinning the exact parameter signature.
    const funcSignaturePattern = /(public override func application\(\s*_ application: UIApplication,\s*didFinishLaunchingWithOptions launchOptions:[\s\S]*?\)\s*->\s*Bool\s*\{)/;
    if (!funcSignaturePattern.test(contents)) {
      throw new Error(
        '[withVoipPushAppDelegate] Could not find `didFinishLaunchingWithOptions` in the generated ' +
        'AppDelegate.swift to insert voipSetup() into. Add `voipSetup()` by hand at the top of that ' +
        'method body instead, then remove this plugin from app.config.ts to stop it erroring.'
      );
    }
    contents = contents.replace(funcSignaturePattern, `$1\n    voipSetup()`);

    contents += PUSHKIT_EXTENSION;

    cfg.modResults.contents = contents;
    return cfg;
  });

module.exports = withVoipPushAppDelegate;
