import { useWindowDimensions, PixelRatio } from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function useResponsive() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isTablet = width >= 600;
  const isSmallPhone = height < 700; // iPhone SE, 8, etc.
  
  // Get the system's font scale for accessibility
  const fontScale = PixelRatio.getFontScale();

  // Width percentage helper
  const w = (pct: number) => wp(`${pct}%`);
  
  // Height percentage helper
  const h = (pct: number) => hp(`${pct}%`);
  
  // Font scaler that adapts to screen size AND respects accessibility
  const font = (size: number, options?: { allowFontScaling?: boolean }) => {
    // If accessibility scaling should be disabled for this specific text
    const allowScaling = options?.allowFontScaling ?? true;
    
    // Simple width-based scaling with conservative multipliers
    const baseWidth = 430;
    let scale = width / baseWidth;
    
    // Apply balanced adjustments for different screen sizes using explicit tiers
    if (isSmallPhone) {
      scale *= 0.70; // stronger reduction on short-height phones
    }

    if (width <= 360) {
      scale *= 0.78; // very small phones (SE, etc.)
    } else if (width <= 390) {
      scale *= 0.86; // compact widths (iPhone X/11/12 mini)
    } else if (width <= 414) {
      scale *= 0.84; // iPhone 14 class (tighter scale)
    } else if (width <= 440) {
      scale *= 0.96; // iPhone 15/16 Pro Max class
    } else if (width >= 480) {
      scale = Math.min(scale * 1.02, 1.1); // extra large phones/tablets
    }
    
    // If accessibility font scaling is already being applied by RN,
    // reduce our scaling to compensate
    if (allowScaling && fontScale > 1) {
      // Reduce our scale proportionally to the system scale
      // This prevents double-scaling
      scale = scale / Math.sqrt(fontScale);
    }
    
    // Clamp the scale to reasonable bounds
    scale = Math.max(0.70, Math.min(scale, 1.1));

    return size * scale;
  };
  
  // Separate line height scaler - less aggressive than font scaling
  const lineHeight = (size: number) => {
    // Line height should scale less aggressively than font size
    return Math.round(font(size) * 1.3); // 1.3x the font size is a good baseline
  };

  return { w, h, font, lineHeight, insets, isTablet, isSmallPhone, width, height, fontScale };
} 