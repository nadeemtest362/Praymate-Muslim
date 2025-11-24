import useResponsive from '../hooks/useResponsive';

// Design System Tokens
export const createDesignSystem = (R: ReturnType<typeof useResponsive>) => ({
  // Border Radius
  radius: {
    card: R.w(8),        // Standard card radius
    button: R.w(6),      // Button radius  
    badge: R.w(4),       // Small badges
    input: R.w(6),       // Input fields
  },
  
  // Spacing Scale
  spacing: {
    xs: R.w(1),          // 4px
    sm: R.w(2),          // 8px  
    md: R.w(3),          // 12px
    lg: R.w(4),          // 16px
    xl: R.w(5),          // 20px
    xxl: R.w(6),         // 24px
  },
  
  // Typography Scale
  typography: {
    // Headers
    h1: { fontSize: R.font(28), fontWeight: '900' as const, letterSpacing: -0.5 },
    h2: { fontSize: R.font(24), fontWeight: '800' as const, letterSpacing: -0.3 },
    h3: { fontSize: R.font(20), fontWeight: '800' as const, letterSpacing: -0.3 },
    h4: { fontSize: R.font(18), fontWeight: '700' as const, letterSpacing: -0.2 },
    
    // Body Text
    bodyLarge: { fontSize: R.font(16), fontWeight: '600' as const },
    body: { fontSize: R.font(14), fontWeight: '500' as const },
    bodySmall: { fontSize: R.font(12), fontWeight: '500' as const },
    
    // Special
    display: { fontSize: R.font(28), fontWeight: '900' as const }, // Smaller display for compact design
    caption: { fontSize: R.font(11), fontWeight: '500' as const },
  },
  
  // Card Styles
  card: {
    padding: R.w(4),     // Standard card padding
    background: 'rgba(255, 255, 255, 0.06)',
    border: 'rgba(255, 255, 255, 0.1)',
    shadow: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    }
  },
  
  // Colors
  colors: {
    primary: '#4ADE80',
    primaryAlpha: 'rgba(74, 222, 128, 0.2)',
    primaryBorder: 'rgba(74, 222, 128, 0.3)',
    
    white: '#FFFFFF',
    whiteAlpha90: 'rgba(255, 255, 255, 0.9)',
    whiteAlpha70: 'rgba(255, 255, 255, 0.7)',
    whiteAlpha50: 'rgba(255, 255, 255, 0.5)',
    whiteAlpha30: 'rgba(255, 255, 255, 0.3)',
    whiteAlpha15: 'rgba(255, 255, 255, 0.15)',
    whiteAlpha10: 'rgba(255, 255, 255, 0.1)',
    whiteAlpha06: 'rgba(255, 255, 255, 0.06)',
  }
});

export type DesignSystem = ReturnType<typeof createDesignSystem>;
