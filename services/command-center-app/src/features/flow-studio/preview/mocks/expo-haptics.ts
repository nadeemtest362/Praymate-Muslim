// Mock haptics API
export const impactAsync = async (style?: any) => {
  console.log('Haptic feedback:', style)
}

export const notificationAsync = async (type?: any) => {
  console.log('Haptic notification:', type)
}

export const selectionAsync = async () => {
  console.log('Haptic selection')
}

export const ImpactFeedbackStyle = {
  Light: 'light',
  Medium: 'medium',
  Heavy: 'heavy',
  Soft: 'soft',
  Rigid: 'rigid',
}

export const NotificationFeedbackType = {
  Success: 'success',
  Warning: 'warning',
  Error: 'error',
}
