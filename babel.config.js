module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    env: {
      production: {
        plugins: [
          ['transform-remove-console', { exclude: ['error'] }],
          // Reanimated plugin MUST be last
          'react-native-reanimated/plugin',
        ],
      },
      development: {
        plugins: [
          // Reanimated plugin MUST be last
          'react-native-reanimated/plugin',
        ],
      },
      test: {
        plugins: [
          // Reanimated plugin MUST be last
          'react-native-reanimated/plugin',
        ],
      },
    },
  };
};