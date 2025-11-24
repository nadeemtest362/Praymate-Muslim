import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

export interface TwinklingStarProps {
  top: number;
  left: number;
  size: number;
  delay: number;
  color?: string;
  duration?: number;
}

export const TwinklingStar: React.FC<TwinklingStarProps> = ({ 
  top, 
  left, 
  size, 
  delay, 
  color = 'rgba(255, 255, 255, 0.9)', 
  duration = 5000 
}) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: duration * 0.4, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: duration * 0.6, easing: Easing.inOut(Easing.ease) })
        ),
        -1, 
        true 
      )
    );
  }, [opacity, delay, duration]);

  const animatedOpacityStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View 
      style={[
        styles.star,
        { 
          top: top,
          left: left,
          width: size, 
          height: size, 
          borderRadius: size / 2, 
          backgroundColor: color 
        },
        animatedOpacityStyle
      ]}
    />
  );
};

const styles = StyleSheet.create({
  star: {
    position: 'absolute',
  },
}); 