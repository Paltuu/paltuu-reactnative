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
    version: "1.0.2",
    orientation: "portrait",
    icon: "./assets/paltuu-app-icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    owner: OWNER,
    ios: {
      supportsTablet: true,
      bundleIdentifier,
      googleServicesFile: "./GoogleService-Info.plist",
    },
    android: {
      package: packageName,
      versionCode: 11,
      googleServicesFile: "./google-services.json",
      adaptiveIcon: {
        foregroundImage: "./assets/paltuu-app-icon.png",
        backgroundColor: "#A03048",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: ["android.permission.RECORD_AUDIO"],
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    updates: {
      url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
    },
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
            imageWidth: 220,
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
      "@react-native-firebase/app",
      "@react-native-firebase/messaging",
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
      "./plugins/with-rnfb-fix",
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
