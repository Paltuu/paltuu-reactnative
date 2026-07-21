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
    version: "1.0.6",
    orientation: "portrait",
    icon: "./assets/paltuu-app-icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    owner: OWNER,
    ios: {
      supportsTablet: true,
      bundleIdentifier,
      googleServicesFile: "./GoogleService-Info.plist",
      usesAppleSignIn: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: packageName,
      versionCode: 15,
      googleServicesFile: "./google-services.json",
      adaptiveIcon: {
        foregroundImage: "./assets/paltuu-app-icon.png",
        backgroundColor: "#A03048",
      },
      edgeToEdgeEnabled: true,
      softwareKeyboardLayoutMode: 'pan',
      predictiveBackGestureEnabled: false,
      permissions: ["android.permission.RECORD_AUDIO", "com.google.android.gms.permission.AD_ID"],
      ...(APP_ENV === 'development' && { usesCleartextTraffic: true }),
      // ⚠️ TEMPORARY PIN — DELETE THIS BEFORE/WHEN MAKING THE NEXT ANDROID
      // NATIVE BUILD. This hardcodes the exact fingerprint already baked
      // into the live production AAB (build-1784459805759.aab), because
      // `eas update`'s dynamic fingerprint computation kept drifting from
      // it (see project memory: paltuu_rn_android_fingerprint_ota_gotcha).
      // The top-level runtimeVersion below is already back to
      // policy: "appVersion" — once this override is deleted, the NEXT
      // native build will correctly use appVersion again. Don't forget to
      // bump `version` above for that build, and don't carry this pin
      // forward into it.
      runtimeVersion: "e8333b52d1bd2676a926b9d65b5eef64d8dc6838",
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
