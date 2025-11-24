// Re-export everything from our React Native web compatibility layer
export * from '../react-native-web-compat'

// Make sure specific exports are available
export {
  Appearance,
  StatusBar,
  useColorScheme,
} from '../react-native-web-compat'
