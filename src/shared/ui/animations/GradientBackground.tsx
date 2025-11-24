import React, { useEffect } from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  Easing,
  interpolate
} from 'react-native-reanimated';
import { colors, dimensions } from '../../../theme';

interface GradientBackgroundProps extends ViewProps {
  colors?: string[];
  animate?: boolean;
}

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function GradientBackground({ 
  children, 
  colors: customColors, 
  animate = true,
  style,
  ...props 
}: GradientBackgroundProps) {
  // Ensure we have at least 2 colors for the gradient
  const defaultColors: [string, string] = ['#5E55D1', '#7C71E0'];
  const gradientColors = customColors || colors.gradients.background || defaultColors;
  const animation = useSharedValue(0);

  useEffect(() => {
    if (animate) {
      animation.value = withRepeat(
        withTiming(1, { duration: 15000, easing: Easing.inOut(Easing.ease) }),
        -1, // Infinite repetitions
        true // Reverse on each iteration
      );
    }
  }, [animate, animation]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      animation.value,
      [0, 1],
      [0, 20]
    );

    return {
      transform: [{ translateY }]
    };
  });

  return (
    <View style={[styles.container, style]} {...props}>
      <AnimatedLinearGradient
        colors={gradientColors.length >= 2 ? gradientColors as [string, string, ...string[]] : ['#5E55D1', '#7C71E0'] as const}
        style={[styles.gradient, animate && animatedStyle]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  gradient: {
    position: 'absolute',
    left: -dimensions.fullWidth * 0.5, // Extend beyond screen bounds
    top: -dimensions.fullHeight * 0.5, // for animation without showing edges
    width: dimensions.fullWidth * 2,
    height: dimensions.fullHeight * 2,
  },
}); 