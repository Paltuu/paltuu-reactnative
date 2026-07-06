// react-native-reanimated-skeleton's "shiver" animation imports the
// non-Expo `react-native-linear-gradient` package, which isn't installed
// (and can't be, in a managed/prebuilt Expo app without extra config).
// This patches its installed source to use `expo-linear-gradient` instead
// (already a project dependency), matching the fix the library's own README
// documents for Expo projects. Runs as a postinstall step since it edits
// node_modules, which npm/yarn wipe and reinstall from scratch.
const fs = require('fs');
const path = require('path');

const targets = [
  'node_modules/react-native-reanimated-skeleton/src/ShiverBone.tsx',
  'node_modules/react-native-reanimated-skeleton/lib/module/ShiverBone.js',
  'node_modules/react-native-reanimated-skeleton/lib/commonjs/ShiverBone.js',
];

const FROM_DEFAULT = `import LinearGradient from "react-native-linear-gradient";`;
const FROM_DEFAULT_REQUIRE = /var _reactNativeLinearGradient = _interopRequireDefault\(require\("react-native-linear-gradient"\)\);/;
const TO_IMPORT = `import { LinearGradient } from "expo-linear-gradient";`;

for (const rel of targets) {
  const file = path.join(__dirname, '..', rel);
  if (!fs.existsSync(file)) continue;

  let src = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (src.includes(FROM_DEFAULT)) {
    src = src.replace(FROM_DEFAULT, TO_IMPORT);
    changed = true;
  }
  if (FROM_DEFAULT_REQUIRE.test(src)) {
    src = src.replace(FROM_DEFAULT_REQUIRE, `var _expoLinearGradient = require("expo-linear-gradient");`);
    src = src.replace(/_reactNativeLinearGradient\.default/g, '_expoLinearGradient.LinearGradient');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, src);
    console.log(`[patch-reanimated-skeleton] patched ${rel}`);
  }
}
