/**
 * Common types for the UI component library
 */

import { ViewStyle, TextStyle, ImageStyle } from 'react-native';

// Base component props that all components can extend
export interface BaseComponentProps {
  style?: ViewStyle | TextStyle | ImageStyle;
  testID?: string;
}

// Common props interface
export interface CommonProps extends BaseComponentProps {
  disabled?: boolean;
}

// Common size variants
export type Size = 'small' | 'medium' | 'large';

// Common variants
export type Variant = 'primary' | 'secondary' | 'ghost';

// Animation types
export interface AnimationConfig {
  duration?: number;
  damping?: number;
  mass?: number;
  stiffness?: number;
} 