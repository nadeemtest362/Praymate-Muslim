/**
 * Theme configuration for the Personal Prayers app
 * 
 * Centralizes all design tokens and visual styling constants
 */

// Colors
export const colors = {
  primary: {
    light: '#FFDAB9', // Peach Puff (lighter accent)
    main: '#B8860B', // DarkGoldenrod (main gold)
    dark: '#8B4513', // SaddleBrown (deep gold/brown)
  },
  secondary: {
    light: '#FFA07A', // LightSalmon (lighter orange)
    main: '#CC5500', // Burnt Orange (main orange)
    dark: '#8B0000', // DarkRed (deep terracotta/red)
  },
  tertiary: {
    light: '#F0E68C', // Khaki (soft warm highlight)
    main: '#5F9EA0', // CadetBlue (muted teal accent)
    dark: '#2F4F4F', // DarkSlateGray (deep teal)
  },
  neutral: {
    50: '#F8F8F8', // Slightly warmer light gray
    100: '#EFEFEF', // Warmer light gray
    200: '#DCDCDC', // Gainsboro (light gray)
    300: '#BDBDBD', // Medium gray
    400: '#9E9E9E', // Medium dark gray
    500: '#757575', // Dark gray
    600: '#424242', // Very dark gray
    700: '#313131', // Near black gray
    800: '#1F1F1F', // Dark charcoal
    900: '#121212', // Almost black
  },
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.7)',
    muted: 'rgba(255, 255, 255, 0.5)',
    accent: '#8BED4F',
    tertiary: '#757575', // Dark gray (tertiary text on dark)
    light: '#FFFFFF', // Pure white (for specific highlights)
    dark: '#121212', // Almost black (for text on light backgrounds)
    disabled: '#757575',
    link: '#FFA07A', // LightSalmon (link color)
  },
  background: {
    primary: '#121212', // Almost black (main app background)
    secondary: '#1F1F1F', // Dark charcoal (card backgrounds, secondary surfaces)
    tertiary: '#313131', // Near black gray (subtle variations)
    overlay: 'rgba(0, 0, 0, 0.6)', // Dark overlay
  },
  status: {
    success: '#8BED4F',
    error: '#FF6B6B',
    warning: '#FFD700',
    info: '#6C63FF',
  },
  gradients: {
    primary: ['#6C63FF', '#5A52E5'],
    secondary: ['#FF6B8B', '#FF5A7F'],
    tertiary: ['#F0E68C', '#5F9EA0'], // Khaki to muted teal
    backgroundPrimary: ['#1F1F1F', '#121212'], // Dark charcoal to almost black
    backgroundSecondary: ['#313131', '#1F1F1F'], // Near black gray to dark charcoal
    welcome: ['#CC5500', '#8B4513'], // Burnt Orange to Saddle Brown (dramatic welcome)
    morning: ['#2E7DAF', '#4D6AE3'],
    evening: ['#1A237E', '#311B92'],
    background: ['#141941', '#3b2f7f', '#b44da6'],
    darkBlue: ['#1A2151', '#3D3977', '#7B4D85'],
    purple: ['#4C1D95', '#7C3AED', '#A78BFA'],
  },
  ui: {
    cardBackground: 'rgba(255, 255, 255, 0.08)',
    cardBorder: 'rgba(255, 255, 255, 0.15)',
    inputBackground: 'rgba(255, 255, 255, 0.15)',
    buttonPrimary: '#FFFFFF',
    buttonSecondary: 'rgba(255, 255, 255, 0.1)',
  },
};

// Typography
export const typography = {
  fontFamily: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
  fontSizes: {
    tiny: 12,
    small: 14,
    medium: 16,
    large: 18,
    xlarge: 20,
    xxlarge: 24,
    display: 32,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 1,
  },
  h1: {
    fontSize: 32,
    fontWeight: '800' as const,
    letterSpacing: -1.1,
    lineHeight: 36,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  h3: {
    fontSize: 20,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 22,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
};

// Spacing 
export const spacing = {
  tiny: 4,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Special spacing for specific UI components
export const specialSpacing = {
  buttonHeight: {
    small: 36,
    medium: 48,
    large: 56,
  },
  inputHeight: {
    small: 36,
    medium: 48,
    large: 56,
  },
  cardPadding: {
    small: 12,
    medium: 16,
    large: 24,
  },
};

// Border radius
export const borderRadius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  round: 9999,
  full: 9999,
};

// Shadows
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Animations
export const animations = {
  durations: {
    veryFast: 100,
    fast: 200,
    normal: 300,
    slow: 500,
    verySlow: 800,
  },
  timings: {
    default: [0.42, 0, 0.58, 1] as const, // ease-in-out cubic
    spring: [0.25, 0.46, 0.45, 0.94] as const, // exponential out
    bounce: [0.175, 0.885, 0.32, 1.275] as const, // back out
  },
};

// Z-index
export const zIndex = {
  base: 0,
  elevated: 1,
  navigation: 10,
  modal: 20,
  toast: 30,
  tooltip: 40,
};

// Theme object
export const theme = {
  colors,
  typography,
  spacing,
  specialSpacing,
  borderRadius,
  shadows,
  animations,
  zIndex,
} as const;

export type Theme = typeof theme;

export default theme; 