import { Dimensions } from 'react-native';

export const dimensions = {
  fullHeight: Dimensions.get('window').height,
  fullWidth: Dimensions.get('window').width
};

export const colors = {
  // Primary palette - warm, calming gradients
  primary: '#8B5FBF', // Soft purple
  primaryLight: '#D6B4FC', // Light lavender
  primaryDark: '#61398F', // Deep purple
  
  // Secondary colors - complementary to the primary palette
  secondary: '#FF9E7B', // Soft coral
  secondaryLight: '#FFCAB5', // Light peach
  
  // UI elements
  background: {
    primary: '#FAF5FF', // Very light purple tint
    secondary: '#FFF9F5', // Very light peach tint
    card: '#FFFFFF' // White for cards
  },
  
  // Text colors
  text: {
    primary: '#2D1E40', // Deep purple for main text
    secondary: '#6B5776', // Muted purple for secondary text
    tertiary: '#9D91A3', // Very light purple for tertiary text
    muted: '#A8A8A8' // Muted gray for placeholder text
  },
  
  // States
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  
  // Misc
  border: 'rgba(45, 30, 64, 0.1)', // Subtle borders
  shadow: 'rgba(45, 30, 64, 0.08)', // Soft shadows for neumorphic effect
  overlay: 'rgba(45, 30, 64, 0.4)', // Overlay for modals
  
  // Gradients
  gradients: {
    primary: ['#8B5FBF', '#9D7FD9'], // Purple gradient
    secondary: ['#FF9E7B', '#FFBFA0'], // Coral gradient
    background: ['#FAF5FF', '#FFF9F5'], // Subtle background gradient
  }
};

export const typography = {
  fontSizes: {
    tiny: 10,
    small: 12,
    regular: 14,
    medium: 16,
    large: 18,
    xlarge: 24,
    xxlarge: 32,
  },
  fontFamily: {
    regular: 'SN Pro',
    medium: 'SN Pro',
    light: 'SN Pro',
    bold: 'SN Pro',
  }
};

export const spacing = {
  tiny: 4,
  small: 8,
  medium: 16,
  large: 24,
  xlarge: 32,
  xxlarge: 48,
};

export const borderRadius = {
  small: 4,
  medium: 8,
  large: 12,
  xlarge: 24,
  round: 999,
};

export const shadows = {
  small: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Neumorphic soft UI effects
export const neumorphism = {
  light: {
    shadowColor: colors.shadow,
    shadowOffset: { width: -6, height: -6 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 8,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.large,
  },
  dark: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.large,
  },
}; 