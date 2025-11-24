// Safe wrapper for expo-haptics to prevent production crashes

let ExpoHaptics: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ExpoHaptics = require('expo-haptics');
} catch {
  console.warn('[Haptics] expo-haptics not available, using mock implementation');
  // Create a mock object to prevent crashes
  ExpoHaptics = {
    impactAsync: () => Promise.resolve(),
    notificationAsync: () => Promise.resolve(),
    selectionAsync: () => Promise.resolve(),
    ImpactFeedbackStyle: {
      Light: 'light',
      Medium: 'medium',
      Heavy: 'heavy',
      Soft: 'soft',
      Rigid: 'rigid'
    },
    NotificationFeedbackType: {
      Success: 'success',
      Warning: 'warning',
      Error: 'error'
    }
  };
}

// Create bound functions to ensure they work correctly
const impactAsync = (...args: any[]) => ExpoHaptics.impactAsync?.(...args) || Promise.resolve();
const notificationAsync = (...args: any[]) => ExpoHaptics.notificationAsync?.(...args) || Promise.resolve();
const selectionAsync = (...args: any[]) => ExpoHaptics.selectionAsync?.(...args) || Promise.resolve();

// Export individual functions
export { impactAsync, notificationAsync, selectionAsync };
export const ImpactFeedbackStyle = ExpoHaptics.ImpactFeedbackStyle;
export const NotificationFeedbackType = ExpoHaptics.NotificationFeedbackType;

// Also export as namespace for * imports
export const Haptics = {
  impactAsync,
  notificationAsync,
  selectionAsync,
  ImpactFeedbackStyle: ExpoHaptics.ImpactFeedbackStyle,
  NotificationFeedbackType: ExpoHaptics.NotificationFeedbackType
};

// Default export for compatibility
export default Haptics; 