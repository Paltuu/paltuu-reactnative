import { ExpoConfig } from "expo/config";

const EAS_PROJECT_ID = "ec2af655-89d5-43dd-b5a5-b56101a3c24a";
const PROJECT_SLUG = "paltuu";
const OWNER = "paltuupk";

const APP_NAME = "Paltuu";
const BUNDLE_IDENTIFIER = "com.paltuu.app";
const PACKAGE_NAME = "com.paltuu.app";
const SCHEME = "paltuu";

export default (): ExpoConfig => {
  const APP_ENV =
    (process.env.APP_ENV as "development" | "preview" | "production") ||
    (process.env.EAS_BUILD_PROFILE as "development" | "preview" | "production") ||
    "development";

  console.log("🛠️  Building Paltuu for environment:", APP_ENV);

  const { name, bundleIdentifier, packageName, scheme } = getDynamicAppConfig(APP_ENV);

  return {
    name,
    slug: PROJECT_SLUG,
    scheme,
    version: "1.0.10",
    orientation: "portrait",
    icon: "./assets/paltuu-app-icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    owner: OWNER,
    ios: {
      supportsTablet: true,
      bundleIdentifier,
      // App Store Connect rejects a submission that reuses a version+buildNumber it has
      // already seen (this is what "Something went wrong when submitting" turned out to
      // mean — three separate 1.0.10 builds today all defaulted to buildNumber "1" with
      // nothing here to bump it). Bump this by hand alongside android.versionCode whenever
      // submitting a new production build for the same `version`.
      buildNumber: "3",
      googleServicesFile: "./GoogleService-Info.plist",
      usesAppleSignIn: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        // @react-native-firebase/app auto-configures Firebase natively on iOS too (it's
        // not platform-gated the way @react-native-firebase/messaging's JS usage is —
        // that one is Android-only, see DispatcherCallProvider.tsx/index.js/
        // NotificationContext.tsx). Left at its default (unset = YES), GoogleUtilities'
        // AppDelegateSwizzler swizzles application:didRegisterForRemoteNotificationsWith
        // DeviceToken: to feed Firebase Messaging — competing with Expo's own
        // EXAppDelegateSubscriber chain for the same callback, which is the suspected
        // cause of "simple" (non-VoIP) push notifications silently failing on iOS after
        // this dependency was added. Nothing on iOS actually calls the Firebase
        // Messaging JS API, so there is no APNs-token forwarding to preserve here —
        // disabling the proxy should be a clean no-op for Firebase's own behavior.
        FirebaseAppDelegateProxyEnabled: false,
      },
    },
    android: {
      package: packageName,
      versionCode: 19,
      googleServicesFile: "./google-services.json",
      adaptiveIcon: {
        foregroundImage: "./assets/paltuu-app-icon.png",
        backgroundColor: "#A03048",
      },
      edgeToEdgeEnabled: true,
      softwareKeyboardLayoutMode: 'pan',
      predictiveBackGestureEnabled: false,
      permissions: [
        "android.permission.RECORD_AUDIO",
        "com.google.android.gms.permission.AD_ID",
        // ── Vets at Home dispatcher ringing-call alert (Android) ──
        // A full-screen, looping-sound notifee notification, not a fake phone call — see
        // src/services/androidDispatchAlert.ts. This is the only Android permission it
        // needs; no telecom/foreground-service/restricted permissions (iOS still uses
        // react-native-callkeep/CallKit for the same feature, untouched, see ios: block).
        "android.permission.USE_FULL_SCREEN_INTENT",
      ],
      ...(APP_ENV === 'development' && { usesCleartextTraffic: true }),
    },
    // Android 15+ edge-to-edge draws a translucent gray contrast scrim behind
    // the 3-button nav bar by default (`enforceContrast`) so its buttons stay
    // legible over arbitrary content — that's the gray strip that doesn't
    // match the app's white background. Matching the bar's own color to the
    // app and turning that scrim off is what makes it blend in instead.
    androidNavigationBar: {
      backgroundColor: "#FFFFFF",
      barStyle: "dark-content",
      enforceContrast: false,
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    updates: {
      url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
    },
    // Back to "appVersion": simple, reliable string match on `version`
    // above. Bump `version` whenever a native module is added/changed so
    // OTA updates don't reach a binary that lacks it (this is what
    // crashed Android before — expo-media-library shipped without a
    // version bump). "fingerprint" policy was tried and reverted: its
    // computed hash was too sensitive to incidental repo drift to
    // reliably match the live production binary.
    runtimeVersion: {
      policy: "appVersion",
    },
    extra: {
      router: {},
      eas: {
        projectId: EAS_PROJECT_ID,
      },
    },
    plugins: [
      "expo-secure-store",
      "expo-apple-authentication",
      [
        "expo-splash-screen",
        {
          image: "./assets/splash-logo-white.png",
          imageWidth: 220,
          resizeMode: "contain",
          backgroundColor: "#a03048",
          dark: {
            image: "./assets/splash-logo-white.png",
            backgroundColor: "#a03048",
          },
          ios: {
            image: "./assets/splash-logo-white.png",
            imageWidth: 220,
            resizeMode: "contain",
            backgroundColor: "#a03048",
            dark: {
              image: "./assets/splash-logo-white.png",
              backgroundColor: "#a03048",
            },
          },
          android: {
            image: "./assets/splash-logo-white.png",
            // Android 12+ masks the system splash icon to a centered circle
            // (~66% of the 288dp canvas is the safe zone). Our wide "paltuu"
            // wordmark at 220 filled ~76% of the width, so the leading "p" and
            // trailing "u"/paw fell outside the circle and got clipped. 170dp
            // keeps the whole lockup inside the safe circle. iOS has no mask, so
            // it stays at 220 above. For a larger-looking splash, a squarer
            // lockup (paw over "Paltuu") would fill the circle better.
            imageWidth: 170,
            resizeMode: "contain",
            backgroundColor: "#a03048",
            dark: {
              image: "./assets/splash-logo-white.png",
              backgroundColor: "#a03048",
            },
          },
        },
      ],
      [
        "expo-font",
        {
          fonts: [
            "./node_modules/@expo-google-fonts/montserrat/400Regular/Montserrat_400Regular.ttf",
            "./node_modules/@expo-google-fonts/montserrat/500Medium/Montserrat_500Medium.ttf",
            "./node_modules/@expo-google-fonts/montserrat/600SemiBold/Montserrat_600SemiBold.ttf",
            "./node_modules/@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf",
            "./node_modules/@expo-google-fonts/dm-sans/400Regular/DMSans_400Regular.ttf",
            "./node_modules/@expo-google-fonts/dm-sans/500Medium/DMSans_500Medium.ttf",
            "./node_modules/@expo-google-fonts/dm-sans/700Bold/DMSans_700Bold.ttf",
          ],
        },
      ],
      "expo-router",
      [
        "expo-image-picker",
        {
          photosPermission: "Allow Paltuu to access your photos and videos to share them in your posts.",
          cameraPermission: "Allow Paltuu to access your camera to take photos and videos of your pets.",
          microphonePermission: "Allow Paltuu to access your microphone to record video sound.",
        },
      ],
      "expo-web-browser",
      [
        "expo-media-library",
        {
          photosPermission: "Allow Paltuu to access your photos to save media.",
          savePhotosPermission: "Allow Paltuu to save photos and videos to your library.",
          isAccessMediaLocationEnabled: true,
        },
      ],
      [
        "expo-notifications",
        {
          color: "#a03048",
          defaultChannel: "default",
        },
      ],
      "expo-video",
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static",
          },
        },
      ],
      // Adds `use_modular_headers!` to the Podfile so the Google Sign-In
      // Firebase pods (AppCheckCore → GoogleUtilities/RecaptchaInterop) can be
      // integrated under static frameworks.
      "./plugins/withModularHeaders",
      "@react-native-google-signin/google-signin",
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "Paltuu uses your location to show pets, vets, and shelters near you.",
        },
      ],
      // ── Vets at Home dispatcher ringing-call alert ──
      // Android background FCM data-message handling (see index.js) needs the native
      // Firebase app initialized; @react-native-firebase/messaging itself autolinks and
      // needs no plugin entry of its own. @notifee/react-native (Android alert UI) also
      // autolinks with no plugin entry needed.
      [
        "@react-native-firebase/app",
        {
          ios: {
            // firebase-ios-sdk's Swift Package products are automatic (not
            // `.dynamic`) libraries, so under `use_frameworks! :linkage => :static`
            // — which expo-build-properties sets above, and which
            // @react-native-google-signin needs (see ./plugins/withModularHeaders)
            // — every react-native-firebase pod that resolves Firebase via SPM
            // embeds its own copy, and those collide at link time as
            // duplicate-symbol errors. react-native-firebase's Podfile hook detects
            // this and fails `pod install`. Switching to dynamic linkage isn't
            // viable here (it would break the Google Sign-In modular-headers fix),
            // so opt out of SPM instead: this emits `$RNFirebaseDisableSPM = true`
            // into the Podfile, falling back to CocoaPods-based Firebase
            // integration.
            disableSPM: true,
          },
        },
      ],
      "./plugins/withVoipBackgroundMode",
      "./plugins/withVoipPushAppDelegate",
    ],
  };
};

export const getDynamicAppConfig = (
  environment: "development" | "preview" | "production"
) => {
  if (environment === "production") {
    return {
      name: APP_NAME,
      bundleIdentifier: BUNDLE_IDENTIFIER,
      packageName: PACKAGE_NAME,
      scheme: [SCHEME, BUNDLE_IDENTIFIER],
    };
  }
  if (environment === "preview") {
    return {
      name: `${APP_NAME} (Preview)`,
      bundleIdentifier: `${BUNDLE_IDENTIFIER}.preview`,
      packageName: `${PACKAGE_NAME}.preview`,
      scheme: [`${SCHEME}-preview`, `${BUNDLE_IDENTIFIER}.preview`],
    };
  }
  return {
    name: `${APP_NAME} (Dev)`,
    bundleIdentifier: `${BUNDLE_IDENTIFIER}.dev`,
    packageName: `${PACKAGE_NAME}.dev`,
    scheme: [`${SCHEME}-dev`, `${BUNDLE_IDENTIFIER}.dev`],
  };
};
