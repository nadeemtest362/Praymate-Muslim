/**
 * Common types used across the UI component library
 */

export type Size = 'small' | 'medium' | 'large';
export type Variant = 'primary' | 'secondary' | 'ghost' | 'gradient';

export interface CommonProps {
  /**
   * Test ID for testing
   */
  testID?: string;
  /**
   * Accessibility label
   */
  accessibilityLabel?: string;
  /**
   * Accessibility hint
   */
  accessibilityHint?: string;
} 