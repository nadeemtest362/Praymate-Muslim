import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { baseTheme } from '../theme';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
export type BadgeSize = 'small' | 'medium' | 'large';

export interface BadgeProps {
  /**
   * Badge content
   */
  children: React.ReactNode;
  /**
   * Visual variant
   */
  variant?: BadgeVariant;
  /**
   * Size preset
   */
  size?: BadgeSize;
  /**
   * Show a dot indicator
   */
  dot?: boolean;
  /**
   * Additional styles
   */
  style?: ViewStyle;
  /**
   * Text style
   */
  textStyle?: TextStyle;
  /**
   * Animate entrance/exit
   */
  animated?: boolean;
}

const variantStyles: Record<BadgeVariant, { background: string; text: string; border?: string }> = {
  default: {
    background: 'rgba(255, 255, 255, 0.12)',
    text: baseTheme.colors.text.primary,
    border: 'rgba(255, 255, 255, 0.2)',
  },
  primary: {
    background: baseTheme.colors.primary,
    text: '#FFFFFF',
  },
  success: {
    background: '#4CAF50',
    text: '#FFFFFF',
  },
  warning: {
    background: '#FF9800',
    text: '#FFFFFF',
  },
  error: {
    background: '#F44336',
    text: '#FFFFFF',
  },
  info: {
    background: '#2196F3',
    text: '#FFFFFF',
  },
};

const sizeStyles = {
  small: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 11,
    minHeight: 20,
  },
  medium: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    fontSize: 13,
    minHeight: 24,
  },
  large: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    fontSize: 15,
    minHeight: 28,
  },
};

export function Badge({
  children,
  variant = 'default',
  size = 'medium',
  dot = false,
  style,
  textStyle,
  animated = true,
}: BadgeProps) {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];
  
  const BadgeWrapper = animated ? Animated.View : View;
  
  return (
    <BadgeWrapper
      entering={animated ? FadeIn.duration(200) : undefined}
      exiting={animated ? FadeOut.duration(200) : undefined}
      style={[
        styles.badge,
        {
          backgroundColor: variantStyle.background,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          paddingVertical: sizeStyle.paddingVertical,
          minHeight: sizeStyle.minHeight,
          borderColor: variantStyle.border,
          borderWidth: variantStyle.border ? 1 : 0,
        },
        style,
      ]}
    >
      {dot && (
        <View
          style={[
            styles.dot,
            {
              backgroundColor: variantStyle.text,
              width: size === 'small' ? 6 : size === 'medium' ? 8 : 10,
              height: size === 'small' ? 6 : size === 'medium' ? 8 : 10,
            },
          ]}
        />
      )}
      {typeof children === 'string' || typeof children === 'number' ? (
        <Text
          style={[
            styles.text,
            {
              color: variantStyle.text,
              fontSize: sizeStyle.fontSize,
            },
            textStyle,
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </BadgeWrapper>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999, // Full rounded
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.25,
  },
  dot: {
    borderRadius: 9999,
    marginRight: 6,
  },
}); 