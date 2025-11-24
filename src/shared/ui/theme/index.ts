/**
 * UI Library Theme Extensions
 * 
 * Extends the base app theme with component-specific styles
 * while preserving all existing design decisions.
 */

// Import the theme directly
import * as theme from '../../../theme';

const baseTheme = {
  colors: {
    ...theme.colors,
    ui: {
      buttonSecondary: 'rgba(255, 255, 255, 0.1)',
      cardBackground: theme.colors.background.card,
      cardBorder: theme.colors.border,
      inputBackground: 'rgba(255, 255, 255, 0.05)',
    }
  },
  typography: theme.typography,
  spacing: theme.spacing,
  borderRadius: {
    ...theme.borderRadius,
    lg: theme.borderRadius.large,
    xl: theme.borderRadius.large * 1.5,
  },
  shadows: theme.shadows,
  animations: { durations: { fast: 200, normal: 300, slow: 500 } },
  specialSpacing: { inputHeight: { medium: 48 } },
};

// Component-specific theme extensions
export const componentTheme = {
  // Button variants that use existing gradients
  button: {
    primary: {
      gradient: baseTheme.colors.gradients.primary,
      text: baseTheme.colors.text.primary,
      shadow: baseTheme.shadows.medium,
    },
    secondary: {
      background: baseTheme.colors.ui.buttonSecondary,
      text: baseTheme.colors.text.primary,
      border: baseTheme.colors.ui.cardBorder,
    },
    ghost: {
      background: 'transparent',
      text: baseTheme.colors.text.primary,
    },
  },
  
  // Card styles that match existing patterns
  card: {
    background: baseTheme.colors.ui.cardBackground,
    border: baseTheme.colors.ui.cardBorder,
    borderRadius: baseTheme.borderRadius.lg,
    padding: baseTheme.spacing.medium,
    shadow: baseTheme.shadows.small,
  },
  
  // Input styles matching existing forms
  input: {
    background: baseTheme.colors.ui.inputBackground,
    text: baseTheme.colors.text.primary,
    placeholder: baseTheme.colors.text.muted,
    border: baseTheme.colors.ui.cardBorder,
    borderRadius: baseTheme.borderRadius.lg,
    height: baseTheme.specialSpacing.inputHeight.medium,
    padding: baseTheme.spacing.medium,
  },
  
  // Modal styles preserving existing design
  modal: {
    backdrop: 'rgba(20, 19, 60, 0.75)', // Matches Backdrop component
    background: baseTheme.colors.background.secondary,
    borderRadius: baseTheme.borderRadius.xl,
    shadow: baseTheme.shadows.large,
  },
  
  // Animation timings from existing patterns
  animation: {
    springConfig: {
      damping: 26,
      mass: 1.2,
      stiffness: 100,
    },
    durations: baseTheme.animations.durations,
  },
};

// Extended theme combining base and component themes
export const extendedTheme = {
  ...baseTheme,
  components: componentTheme,
} as const;

// Export type for the extended theme
export type ExtendedTheme = typeof extendedTheme;

// Re-export base theme for convenience
export { baseTheme };

// Theme type
export type BaseTheme = typeof baseTheme;

// Theme hook (can be expanded later for dynamic theming)
export const useTheme = () => extendedTheme; 