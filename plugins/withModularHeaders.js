/**
 * Config plugin: enable `use_modular_headers!` in the iOS Podfile.
 *
 * @react-native-google-signin pulls in the Swift pod `AppCheckCore`, which
 * depends on `GoogleUtilities` and `RecaptchaInterop`. Under
 * `use_frameworks! :linkage => :static` (set via expo-build-properties) those
 * ObjC pods don't define modules, so CocoaPods refuses to integrate them:
 *
 *   "The Swift pod `AppCheckCore` depends upon `GoogleUtilities` and
 *    `RecaptchaInterop`, which do not define modules."
 *
 * Enabling modular headers globally generates the module maps they need.
 * This runs on every prebuild, so the fix survives `expo run:ios`.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withModularHeaders = (config) =>
  withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');

      if (!contents.includes('use_modular_headers!')) {
        // Insert right after the `platform :ios, ...` line.
        contents = contents.replace(
          /^(platform :ios.*$)/m,
          '$1\nuse_modular_headers!'
        );
        fs.writeFileSync(podfilePath, contents);
      }

      return cfg;
    },
  ]);

module.exports = withModularHeaders;
