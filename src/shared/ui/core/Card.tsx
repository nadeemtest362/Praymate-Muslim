/**
 * Card Component
 * 
 * Flexible card container that preserves the glass morphism
 * and gradient designs from Personal Prayers app.
 */

import React from 'react';
import {
  View,
  ViewStyle,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  TouchableOpacityProps,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeOut,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import type { Size, Variant } from '../types';

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export interface CardProps extends Omit<TouchableOpacityProps, 'style'> {
  variant?: Variant | 'glass' | 'intention' | 'prayer';
  size?: Size | 'auto';
  gradient?: [string, string] | [string, string, string] | string[];
  borderRadius?: number;
  elevation?: boolean;
  animated?: boolean;
  haptic?: boolean;
  blurIntensity?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

export const Card: React.FC<CardProps> = React.memo(({
  variant = 'default',
  size = 'auto',
  gradient,
  borderRadius,
  elevation = true,
  animated = false,
  haptic = true,
  blurIntensity = 80,
  children,
  style,
  contentStyle,
  disabled,
  onPress,
  onPressIn,
  onPressOut,
  ...touchableProps
}) => {
  const scale = useSharedValue(1);

  const handlePressIn = (event: any) => {
    if (onPress && !disabled) {
      scale.value = withSpring(0.98, {
        damping: 26,
        mass: 1.2,
        stiffness: 100,
      });
    }
    onPressIn?.(event);
  };

  const handlePressOut = (event: any) => {
    scale.value = withSpring(1, {
      damping: 26,
      mass: 1.2,
      stiffness: 100,
    });
    onPressOut?.(event);
  };

  const handlePress = (event: any) => {
    if (haptic && !disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.(event);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const cardStyle = [
    styles.base,
    size !== 'auto' && styles[size],
    styles[variant as keyof typeof styles] || {},
    elevation && variant !== 'ghost' && styles.elevation,
    { borderRadius: borderRadius ?? 16 },
    style,
  ];

  const renderContent = () => (
    <View style={[styles.content, contentStyle]}>
      {children}
    </View>
  );

  const renderCard = () => {
    const cardContent = (
      <>
        {gradient && gradient.length >= 2 && (
          <LinearGradient
            colors={gradient as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              StyleSheet.absoluteFillObject,
              { borderRadius: borderRadius ?? 16 },
            ]}
          />
        )}
        {renderContent()}
      </>
    );

    if (animated) {
      return (
        <AnimatedView
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          layout={Layout.springify()}
          style={cardStyle}
        >
          {cardContent}
        </AnimatedView>
      );
    }

    return <View style={cardStyle}>{cardContent}</View>;
  };

  if (disabled || !onPress) {
    return renderCard();
  }

  if (animated) {
    return (
      <AnimatedTouchableOpacity
        {...touchableProps}
        activeOpacity={1}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        layout={Layout.springify()}
        style={[cardStyle, animatedStyle]}
      >
        {gradient && gradient.length >= 2 && (
          <LinearGradient
            colors={gradient as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              StyleSheet.absoluteFillObject,
              { borderRadius: borderRadius ?? 16 },
            ]}
          />
        )}
        {renderContent()}
      </AnimatedTouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      {...touchableProps}
      activeOpacity={0.8}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={cardStyle}
    >
      {gradient && gradient.length >= 2 && (
        <LinearGradient
          colors={gradient as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            StyleSheet.absoluteFillObject,
            { borderRadius: borderRadius ?? 16 },
          ]}
        />
      )}
      {renderContent()}
    </TouchableOpacity>
  );
});

// Simplified theme access for now

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    padding: 16,
  },
  // Size variants
  small: {
    minHeight: 80,
  },
  medium: {
    minHeight: 120,
  },
  large: {
    minHeight: 180,
  },
  // Style variants
  default: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  primary: {
    backgroundColor: 'rgba(94, 85, 209, 0.25)',
    borderColor: 'rgba(94, 85, 209, 0.3)',
  },
  secondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  ghost: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderWidth: 0,
  },
  glass: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    // Glass effect handled by BlurView when needed
  },
  intention: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  prayer: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  // Elevation
  elevation: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
});

Card.displayName = 'Card'; 