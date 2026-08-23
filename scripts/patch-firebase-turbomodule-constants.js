// @react-native-firebase packages (app, messaging, ...) at 26.3.1 ship their iOS
// TurboModule codegen output pre-generated and checked into each package (the podspecs
// compile ios/generated/**/*.h directly instead of letting the consuming app's own RN
// codegen regenerate it). Those bundled headers are stale: they declare
// getConstants/constantsToExport returning `ModuleConstants<JS::NativeRNFBTurboXxx::Constants>`,
// but the bundled .mm implementations (also shipped in the same packages) already return
// the newer `ModuleConstants<JS::NativeRNFBTurboXxx::Constants::Builder>` variant that RN
// 0.81's RCTTypedModuleConstants convention expects — a mismatch between two files in the
// same release, causing an Xcode compile error ("cannot initialize return object of type
// ... with an rvalue of type ..."). Confirmed on both @react-native-firebase/app
// (NativeRNFBTurboUtils) and @react-native-firebase/messaging (NativeRNFBTurboMessaging),
// so this scans every installed @react-native-firebase/* package's generated iOS headers
// rather than hardcoding one. Runs as a postinstall step since it edits node_modules,
// which npm/yarn wipe and reinstall from scratch.
const fs = require('fs');
const path = require('path');

const scopeDir = path.join(__dirname, '..', 'node_modules', '@react-native-firebase');
const STALE_PATTERN = /ModuleConstants<(JS::NativeRNFBTurbo\w+::Constants)>/g;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.h')) out.push(full);
  }
  return out;
}

if (fs.existsSync(scopeDir)) {
  for (const pkg of fs.readdirSync(scopeDir)) {
    const generatedDir = path.join(scopeDir, pkg, 'ios', 'generated');
    for (const file of walk(generatedDir)) {
      let src = fs.readFileSync(file, 'utf8');
      if (STALE_PATTERN.test(src)) {
        src = src.replace(STALE_PATTERN, 'ModuleConstants<$1::Builder>');
        fs.writeFileSync(file, src);
        console.log(`[patch-firebase-messaging-constants] patched ${path.relative(scopeDir, file)}`);
      }
      STALE_PATTERN.lastIndex = 0;
    }
  }
}
