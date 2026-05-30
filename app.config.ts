import { ConfigContext, ExpoConfig } from "expo/config";

const EAS_PROJECT_ID = "ec2af655-89d5-43dd-b5a5-b56101a3c24a";
const PROJECT_SLUG = "paltuu";
const OWNER = "syedshuja";

// App production config
const APP_NAME = "Paltuu";
const BUNDLE_IDENTIFIER = "com.paltuu.app";
const PACKAGE_NAME = "com.paltuu.app";
const SCHEME = "paltuu";

export default ({ config }: ConfigContext): ExpoConfig => {
  // Determine environment based on APP_ENV (fallback to EAS_BUILD_PROFILE or development)
  const APP_ENV =
    (process.env.APP_ENV as "development" | "preview" | "production") ||
    (process.env.EAS_BUILD_PROFILE as "development" | "preview" | "production") ||
    "development";

  console.log("🛠️  Building Paltuu for environment:", APP_ENV);

  const { name, bundleIdentifier, packageName, scheme } = getDynamicAppConfig(APP_ENV);

  return {
    ...config,
    name: name,
    slug: PROJECT_SLUG,
    scheme: scheme,
    owner: OWNER,
    ios: {
      ...config.ios,
      bundleIdentifier: bundleIdentifier,
    },
    android: {
      ...config.android,
      package: packageName,
    },
    updates: {
      ...config.updates,
      url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    extra: {
      ...config.extra,
      eas: {
        projectId: EAS_PROJECT_ID,
      },
    },
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
      scheme: SCHEME,
    };
  }
  if (environment === "preview") {
    return {
      name: `${APP_NAME} (Preview)`,
      bundleIdentifier: `${BUNDLE_IDENTIFIER}.preview`,
      packageName: `${PACKAGE_NAME}.preview`,
      scheme: `${SCHEME}-preview`,
    };
  }
  return {
    name: `${APP_NAME} (Dev)`,
    bundleIdentifier: `${BUNDLE_IDENTIFIER}.dev`,
    packageName: `${PACKAGE_NAME}.dev`,
    scheme: `${SCHEME}-dev`,
  };
};
