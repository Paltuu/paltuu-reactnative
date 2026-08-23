/**
 * Config plugin: opt react-native-firebase out of Swift Package Manager on iOS.
 *
 * firebase-ios-sdk's SPM products are automatic (not `.dynamic`) libraries, so under
 * `use_frameworks! :linkage => :static` (set via expo-build-properties, needed for
 * @react-native-google-signin — see withModularHeaders) every react-native-firebase pod
 * that resolves Firebase via SPM embeds its own copy, and those collide at link time as
 * duplicate-symbol errors. react-native-firebase's own Podfile hook detects this and
 * fails `pod install` with two options: switch to dynamic linkage, or opt out of SPM.
 * Switching linkage isn't viable here (would break the Google Sign-In modular-headers
 * fix), so this sets `$RNFirebaseDisableSPM = true`, which makes react-native-firebase
 * fall back to its traditional CocoaPods-based Firebase SDK integration instead.
 *
 * Runs on every prebuild, so the fix survives `expo run:ios`.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withDisableFirebaseSPM = (config) =>
  withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');

      if (!contents.includes('$RNFirebaseDisableSPM')) {
        // Must land before the first `target` block per react-native-firebase's own docs.
        contents = contents.replace(
          /^(target ')/m,
          '$RNFirebaseDisableSPM = true\n\n$1'
        );
        fs.writeFileSync(podfilePath, contents);
      }

      return cfg;
    },
  ]);

module.exports = withDisableFirebaseSPM;
