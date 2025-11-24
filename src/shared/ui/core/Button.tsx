/**
 * Button Component
 * 
 * Preserves all the beautiful button designs from the Personal Prayers app
 * while making them reusable and consistent.
 */

import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import type { Size, Variant } from '../types';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  variant?: Variant | 'gradient';
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  haptic?: boolean;
  children: React.ReactNode;
  style?: any; // Allow animated styles
}

export const Button: React.FC<ButtonProps> = React.memo(({
  variant = 'primary',
  size = 'medium',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  haptic = true,
  disabled,
  children,
  style,
  onPress,
  onPressIn,
  onPressOut,
  ...props
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const handlePressIn = (event: any) => {
    scale.value = withSpring(0.96, {
      damping: 26,
      mass: 1.2,
      stiffness: 100,
    });
    opacity.value = withTiming(0.9, { duration: 100 });
    onPressIn?.(event);
  };

  const handlePressOut = (event: any) => {
    scale.value = withSpring(1, {
      damping: 26,
      mass: 1.2,
      stiffness: 100,
    });
    opacity.value = withTiming(1, { duration: 100 });
    onPressOut?.(event);
  };

  const handlePress = (event: any) => {
    if (haptic && !disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.(event);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const buttonStyles = [
    styles.base,
    styles[size],
    variant !== 'gradient' && styles[variant],
    fullWidth && styles.fullWidth,
    (disabled || loading) && variant === 'primary' && styles.disabledPrimary,
    (disabled || loading) && variant !== 'primary' && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`text_${size}`],
    (disabled || loading) && variant === 'primary' ? styles.text_disabled : styles[`text_${variant}`],
  ];

  const renderContent = () => (
    <>
      {loading ? (
        <ActivityIndicator 
          color={variant === 'primary' ? '#1A1B4B' : '#FFFFFF'} 
          size="small" 
        />
      ) : (
        <View style={styles.contentContainer}>
          {icon && iconPosition === 'left' && (
            <View style={styles.iconLeft}>{icon}</View>
          )}
          <Text style={textStyles}>
            {children}
          </Text>
          {icon && iconPosition === 'right' && (
            <View style={styles.iconRight}>{icon}</View>
          )}
        </View>
      )}
    </>
  );

  if (variant === 'gradient') {
    return (
      <AnimatedTouchableOpacity
        {...props}
        disabled={disabled || loading}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={[buttonStyles, animatedStyle]}
      >
        <LinearGradient
          colors={['#5E55D1', '#7C71E0'] as const}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {renderContent()}
      </AnimatedTouchableOpacity>
    );
  }

  return (
    <AnimatedTouchableOpacity
      {...props}
      disabled={disabled || loading}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={[buttonStyles, animatedStyle]}
    >
      {renderContent()}
    </AnimatedTouchableOpacity>
  );
});

// Use shared UI theme to avoid cross-package coupling

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  // Size variants
  small: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
  },
  medium: {
    height: 60,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  large: {
    height: 72,
    paddingHorizontal: 32,
    borderRadius: 36,
  },
  // Style variants
  primary: {
    backgroundColor: '#FFFFFF',
  },
  secondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  gradient: {
    backgroundColor: 'transparent',
  },
  // States
  disabled: {
    opacity: 0.5,
  },
  disabledPrimary: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  fullWidth: {
    width: '100%',
  },
  // Content
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: "SNPro-Heavy",
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  text_small: {
    fontSize: 14,
    fontFamily: "SNPro-Heavy",
  },
  text_medium: {
    fontSize: 18,
    fontFamily: "SNPro-Heavy",
  },
  text_large: {
    fontSize: 20,
    fontFamily: "SNPro-Heavy",
  },
  text_primary: {
    color: '#1A1B4B',
    fontFamily: "SNPro-Heavy",
    fontSize: 22,
  },
  text_secondary: {
    color: '#FFFFFF',
    fontFamily: "SNPro-Bold",
  },
  text_ghost: {
    color: '#FFFFFF',
    fontFamily: "SNPro-Bold",
  },
  text_gradient: {
    color: '#FFFFFF',
    fontFamily: "SNPro-Bold",
  },
  text_disabled: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});

Button.displayName = 'Button'; 