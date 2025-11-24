// Global patch to ensure expo-haptics APIs exist in production builds
let H: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  H = require('expo-haptics');
  if (H && typeof H === 'object') {
    const noop = () => Promise.resolve();
    if (!H.notificationAsync) H.notificationAsync = noop;
    if (!H.impactAsync) H.impactAsync = noop;
    if (!H.selectionAsync) H.selectionAsync = noop;

    if (!H.NotificationFeedbackType) {
      H.NotificationFeedbackType = {
        Success: 'success',
        Warning: 'warning',
        Error: 'error',
      };
    }
    if (!H.ImpactFeedbackStyle) {
      H.ImpactFeedbackStyle = {
        Light: 'light',
        Medium: 'medium',
        Heavy: 'heavy',
        Soft: 'soft',
        Rigid: 'rigid',
      };
    }
  }
} catch {
  // expo-haptics not present, nothing to patch
}

export {}; 