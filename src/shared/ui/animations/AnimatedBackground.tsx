import React, { useEffect } from 'react';
import { StyleSheet, View, ViewProps, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  Easing,
  interpolate
} from 'react-native-reanimated';
import { baseTheme } from '../theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export interface AnimatedBackgroundProps extends ViewProps {
  /**
   * Gradient colors - defaults to theme gradient
   */
  colors?: string[];
  /**
   * Enable subtle animation
   */
  animate?: boolean;
  /**
   * Animation duration in ms
   */
  duration?: number;
  /**
   * Start point of gradient
   */
  start?: { x: number; y: number };
  /**
   * End point of gradient
   */
  end?: { x: number; y: number };
  /**
   * Children components
   */
  children?: React.ReactNode;
}

export function AnimatedBackground({ 
  children, 
  colors: customColors, 
  animate = true,
  duration = 15000,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  style,
  ...props 
}: AnimatedBackgroundProps) {
  const gradientColors = (customColors || baseTheme.colors.gradients.background) as unknown as readonly [string, string, ...string[]];
  const animation = useSharedValue(0);

  useEffect(() => {
    if (animate) {
      animation.value = withRepeat(
        withTiming(1, { 
          duration, 
          easing: Easing.inOut(Easing.ease) 
        }),
        -1, // Infinite repetitions
        true // Reverse on each iteration
      );
    }
  }, [animate, duration, animation]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      animation.value,
      [0, 1],
      [0, 20]
    );

    const scale = interpolate(
      animation.value,
      [0, 0.5, 1],
      [1, 1.05, 1]
    );

    return {
      transform: [
        { translateY },
        { scale }
      ]
    };
  });

  return (
    <View style={[styles.container, style]} {...props}>
      <AnimatedLinearGradient
        colors={gradientColors}
        style={[
          styles.gradient, 
          animate && animatedStyle
        ]}
        start={start}
        end={end}
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
    left: -screenWidth * 0.5, // Extend beyond screen bounds
    top: -screenHeight * 0.5, // for animation without showing edges
    width: screenWidth * 2,
    height: screenHeight * 2,
  },
}); 