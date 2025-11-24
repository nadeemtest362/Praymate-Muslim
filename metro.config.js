const path = require("path");
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname);

// Disable package exports support
config.resolver.unstable_enablePackageExports = false;

// Add Node.js polyfills for react-native-svg (merge-safe)
config.resolver.alias = {
  ...(config.resolver.alias || {}),
  buffer: "buffer",
  "@features": __dirname + "/src/features",
  "@shared": __dirname + "/src/shared",
  "@components": __dirname + "/src/components",
  "@posthog/core/error-tracking": path.resolve(
    __dirname,
    "node_modules/@posthog/core/dist/error-tracking/index.js"
  ),
};

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  "@posthog/core": path.resolve(__dirname, "node_modules/@posthog/core/dist"),
};

// Add global polyfill for react-native-svg
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

// Better source maps and minification settings for debugging production issues
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
    // Preserve these specific constructors and methods
    reserved: [
      "Boolean",
      "Array",
      "Promise",
      "Object",
      "String",
      "Number",
      "Math",
      "filter",
      "map",
      "includes",
      "indexOf",
      "find",
      "some",
      "slice",
      "push",
      "length",
      "forEach",
      "reduce",
      "every",
      "concat",
      "join",
      "splice",
      "shift",
      "unshift",
      "pop",
      "reverse",
      "sort",
      "fill",
      "allSettled",
    ],
  },
  compress: {
    // Prevent removal of seemingly unused code
    unused: false,
    // Keep all function names
    keep_fnames: true,
    // Don't inline functions - this can break method references
    inline: false,
    // Don't remove console logs in production for debugging
    drop_console: false,
    // Preserve typeof checks
    typeofs: false,
    // Don't evaluate constant expressions
    evaluate: false,
    // Keep comparisons as-is
    comparisons: false,
    // Don't convert to arrows (can break 'this' context)
    arrows: false,
  },
  source_map: {
    includeSources: true,
  },
};

// Ensure critical modules are not tree-shaken
config.transformer.optimizationSizeLimit = 1024 * 1024; // 1MB

module.exports = config;
