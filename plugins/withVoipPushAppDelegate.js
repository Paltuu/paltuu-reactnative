/**
 * Config plugin: wire PushKit VoIP registration + CallKit reporting into the generated
 * Swift AppDelegate.
 *
 * react-native-voip-push-notification's JS side (`registerVoipToken()`) never receives a
 * token unless the native AppDelegate (a) triggers voip registration at launch and
 * (b) forwards PKPushRegistryDelegate's two callbacks to the library's native manager —
 * neither is optional, and Expo's managed config has no typed field for it, so this has
 * to patch generated source directly.
 *
 * ⚠️ THE PUSHKIT CONTRACT IS THE WHOLE POINT OF THIS FILE ⚠️
 * Since iOS 13, an app that receives a VoIP push MUST report an incoming call to CallKit
 * *before* the `completion` handler of
 * `pushRegistry(_:didReceiveIncomingPushWith:for:completion:)` returns. iOS terminates the
 * app when it doesn't — and after repeated violations it stops delivering VoIP pushes to
 * the app altogether, which reads exactly like "push notifications suddenly stopped
 * working". A previous version of this plugin handed the payload to JS and called
 * `completion()` immediately, which violated the contract on *every single push*:
 * `didReceiveIncomingPush` only emits a JS event, and the JS that eventually calls
 * `RNCallKeep.displayIncomingCall` is asynchronous (and isn't running at all when the app
 * was killed). The CallKit report therefore has to happen HERE, natively, synchronously.
 *
 * `completion` is handed to `reportNewIncomingCall`'s own completion handler rather than
 * being called inline or stored for JS to call via `onVoipNotificationCompleted`: that
 * fires the moment CallKit has actually accepted the call, which is both the correct
 * moment and independent of whether JS ever wakes up. Storing it for JS
 * (`addCompletionHandler`) is the library's documented alternative, but it means a JS
 * crash or a slow cold start leaves the push permanently uncompleted.
 *
 * The full VoIP payload is passed to `reportNewIncomingCall(payload:)`, so CallKeep's
 * `didDisplayIncomingCall` event carries both the callUUID and the job data to JS in one
 * go — see src/services/dispatcherVoipPush.ts. JS must NOT call `displayIncomingCall`
 * itself any more; that would report a second, duplicate call to CallKit.
 *
 * ⚠️ This is still a best-effort STRING patch of Expo's current Swift AppDelegate
 * template. After `npx expo prebuild --clean`, open `ios/<App>/AppDelegate.swift` and
 * confirm that `import PushKit`, `import RNVoipPushNotification` and `import RNCallKeep`
 * are all present (the latter two are the pods' own CocoaPods module names — without them
 * Swift fails with "cannot find 'RNVoipPushNotificationManager' in scope"), and that
 * `voipSetup()` is called in `application(_:didFinishLaunchingWithOptions:)`.
 * If an anchor isn't found this throws at prebuild time rather than silently no-op'ing.
 */
const { withAppDelegate } = require('@expo/config-plugins');

const REQUIRED_IMPORTS = ['import PushKit', 'import RNVoipPushNotification', 'import RNCallKeep'];

// The managed block is fence-delimited so it can be replaced wholesale on every prebuild.
// The previous version of this plugin bailed out early whenever it saw
// `PKPushRegistryDelegate` already in the file, which meant a corrected plugin could never
// repair an AppDelegate a previous version had already patched — and since `ios/` is
// gitignored but persists locally, developers' machines kept the old broken block forever
// while clean EAS builds silently got the new one. Replace, don't skip.
const BLOCK_START = '// <paltuu-voip-pushkit> — managed by plugins/withVoipPushAppDelegate.js, do not edit by hand';
const BLOCK_END = '// </paltuu-voip-pushkit>';

// Legacy marker from the pre-fence version, so the first run after this change can find
// and remove the old block instead of appending a second, conflicting extension.
const LEGACY_MARKER = '// Vets at Home dispatcher ringing-call alert — VoIP push registration + delivery.';

const PUSHKIT_BLOCK = `${BLOCK_START}
// Vets at Home dispatcher ringing-call alert — VoIP push registration + delivery.
extension AppDelegate: PKPushRegistryDelegate {
  func voipSetup() {
    // CallKeep must be configured NATIVELY, at launch, not from JS.
    // RNCallKeep only builds its CXProvider when settings already exist in NSUserDefaults,
    // and those are written by setup(). On a first-ever cold start woken by a VoIP push,
    // JS has never run, so there would be no provider: reportNewIncomingCall would
    // silently do nothing, the ring would never happen, AND the completion handler below
    // would never fire — putting us right back in violation of the PushKit contract.
    // The class-level setup: sets isSetupNatively, which makes the later JS
    // RNCallKeep.setup() call in src/services/callkeep.ts a harmless no-op.
    RNCallKeep.setup([
      "appName": "Paltuu Dispatcher",
      "supportsVideo": false,
      "includesCallsInRecents": false,
    ])

    let registry = PKPushRegistry(queue: DispatchQueue.main)
    registry.delegate = self
    registry.desiredPushTypes = [.voIP]
  }

  public func pushRegistry(_ registry: PKPushRegistry, didUpdate pushCredentials: PKPushCredentials, for type: PKPushType) {
    RNVoipPushNotificationManager.didUpdate(pushCredentials, forType: type.rawValue)
  }

  public func pushRegistry(_ registry: PKPushRegistry, didReceiveIncomingPushWith payload: PKPushPayload, for type: PKPushType, completion: @escaping () -> Void) {
    let dict = payload.dictionaryPayload
    let job = dict["expressVet"] as? [String: Any] ?? [:]

    // The server sends a stable uuid so the same job always maps to the same CallKit call
    // (a retried push must not ring twice). Falling back to a fresh uuid keeps older
    // server builds ringing rather than dropping the push entirely.
    let uuid = (dict["uuid"] as? String) ?? UUID().uuidString

    let callerName = (job["client_name"] as? String) ?? "Paltuu client"
    let category = ((job["category"] as? String) ?? "express_vet").replacingOccurrences(of: "_", with: " ")
    let addressLine = (job["address_line"] as? String) ?? ""
    let handle = addressLine.isEmpty ? category : "\\(category) — \\(addressLine)"

    // Wake JS with the payload. This only posts an event — it is NOT the CallKit report,
    // and on a cold start there may be no JS listener at all yet.
    RNVoipPushNotificationManager.didReceiveIncomingPush(with: payload, forType: type.rawValue)

    // The CallKit report. Must happen before \`completion\` runs, hence completion being
    // passed straight into it. \`payload: dict\` is what lets JS correlate the call with
    // the job via CallKeep's didDisplayIncomingCall event.
    RNCallKeep.reportNewIncomingCall(
      uuid,
      handle: handle,
      handleType: "generic",
      hasVideo: false,
      localizedCallerName: callerName,
      supportsHolding: false,
      supportsDTMF: false,
      supportsGrouping: false,
      supportsUngrouping: false,
      fromPushKit: true,
      payload: dict,
      withCompletionHandler: completion
    )
  }
}
${BLOCK_END}
`;

/** Remove whatever version of the managed block is currently in the file. */
function stripExistingBlock(contents) {
  const startIdx = contents.indexOf(BLOCK_START);
  if (startIdx !== -1) {
    const endIdx = contents.indexOf(BLOCK_END, startIdx);
    if (endIdx !== -1) {
      return contents.slice(0, startIdx) + contents.slice(endIdx + BLOCK_END.length);
    }
    // Fence opened but never closed (hand-edited) — drop everything from the marker on,
    // since the block is always appended last.
    return contents.slice(0, startIdx);
  }

  // Pre-fence layout: the extension was appended at the end of the file after this
  // comment, so cutting from the marker to EOF removes exactly it.
  const legacyIdx = contents.indexOf(LEGACY_MARKER);
  if (legacyIdx !== -1) {
    return contents.slice(0, legacyIdx);
  }

  return contents;
}

const withVoipPushAppDelegate = (config) =>
  withAppDelegate(config, (cfg) => {
    let contents = stripExistingBlock(cfg.modResults.contents);

    // Imports are repaired on every run, independently of the block — an AppDelegate
    // patched by an older plugin version can be missing some of them.
    const missingImports = REQUIRED_IMPORTS.filter((imp) => !new RegExp(`^${imp}\\s*$`, 'm').test(contents));
    if (missingImports.length > 0) {
      if (!/^import Expo\s*$/m.test(contents)) {
        throw new Error(
          '[withVoipPushAppDelegate] Could not find `import Expo` in the generated AppDelegate.swift ' +
            `to anchor imports to. Add ${missingImports.join(', ')} by hand.`
        );
      }
      contents = contents.replace(/^import Expo\s*$/m, `import Expo\n${missingImports.join('\n')}`);
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
    if (!/\bvoipSetup\(\)/.test(contents)) {
      const funcSignaturePattern = /(public override func application\(\s*_ application: UIApplication,\s*didFinishLaunchingWithOptions launchOptions:[\s\S]*?\)\s*->\s*Bool\s*\{)/;
      if (!funcSignaturePattern.test(contents)) {
        throw new Error(
          '[withVoipPushAppDelegate] Could not find `didFinishLaunchingWithOptions` in the generated ' +
            'AppDelegate.swift to insert voipSetup() into. Add `voipSetup()` by hand at the top of that ' +
            'method body instead, then remove this plugin from app.config.ts to stop it erroring.'
        );
      }
      contents = contents.replace(funcSignaturePattern, `$1\n    voipSetup()`);
    }

    cfg.modResults.contents = `${contents.trimEnd()}\n\n${PUSHKIT_BLOCK}`;
    return cfg;
  });

module.exports = withVoipPushAppDelegate;
