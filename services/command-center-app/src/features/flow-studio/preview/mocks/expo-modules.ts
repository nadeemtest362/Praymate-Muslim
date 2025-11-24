// Mock for various expo modules

// expo-font
export const loadAsync = async () => Promise.resolve()
export const isLoaded = () => true

// expo-constants
export const Constants = {
  expoConfig: {
    name: 'Personal Prayers',
    slug: 'personal-prayers',
    version: '1.0.0',
  },
  manifest: null,
  deviceId: 'web-preview',
  isDevice: false,
  platform: {
    web: {},
  },
}

// expo-linking
export const Linking = {
  openURL: async (url: string) => window.open(url, '_blank'),
  canOpenURL: async () => true,
  addEventListener: () => ({ remove: () => {} }),
}

// expo-clipboard
export const Clipboard = {
  setStringAsync: async (text: string) => navigator.clipboard.writeText(text),
  getStringAsync: async () => navigator.clipboard.readText(),
}

// Default export
export default {
  Constants,
  Linking,
  Clipboard,
}
