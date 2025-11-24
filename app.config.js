const config = require("./app.json");

// In EAS Build, the environment variables are available here
if (
  process.env.EXPO_PUBLIC_SUPABASE_URL &&
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
) {
  config.expo.extra = {
    ...config.expo.extra,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  };
}

// OneSignal App ID (public) for client initialization
if (process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID) {
  config.expo.extra = {
    ...config.expo.extra,
    oneSignalAppId: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID,
  };
}

if (process.env.EXPO_PUBLIC_POSTHOG_API_KEY) {
  config.expo.extra = {
    ...config.expo.extra,
    posthogApiKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY,
    posthogHost:
      process.env.EXPO_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
  };
}

// Extend iOS configuration with required permissions
config.expo.ios = {
  ...config.expo.ios,
  infoPlist: {
    NSUserNotificationsUsageDescription:
      "Enable notifications to receive daily prayer reminders at your chosen times",
    NSContactsUsageDescription:
      "Allow access to select people in your contacts you'd like to pray for",
    NSPhotoLibraryUsageDescription:
      "Allow photo library access to select images for prayer people",
    // Override NSAppTransportSecurity to remove NSAllowsLocalNetworking for production
    NSAppTransportSecurity: {
      NSAllowsArbitraryLoads: false,
      // NSAllowsLocalNetworking removed for production security
    },
  },
};

const plugins = config.expo.plugins || [];
const hasSentryPlugin = plugins.some((plugin) => {
  if (Array.isArray(plugin)) {
    return plugin[0] === "@sentry/react-native/expo";
  }
  return plugin === "@sentry/react-native/expo";
});

if (!hasSentryPlugin) {
  plugins.push([
    "@sentry/react-native/expo",
    {
      project: process.env.SENTRY_PROJECT || "praymate",
      organization: process.env.SENTRY_ORG || "stealth-3f",
    },
  ]);
}

config.expo.plugins = plugins;

module.exports = {
  ...config,
};
