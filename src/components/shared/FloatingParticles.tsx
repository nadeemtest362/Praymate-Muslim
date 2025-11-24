import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
} from 'react-native-reanimated';

// Individual particle component to properly use hooks
const FloatingParticle = ({ index }: { index: number }) => {
  const translateY = useSharedValue(Math.random() * 400);
  const translateX = useSharedValue(Math.random() * 200);
  const opacity = useSharedValue(Math.random() * 0.3 + 0.1);

  React.useEffect(() => {
    // Use withRepeat with proper cleanup instead of recursive callbacks
    translateY.value = withRepeat(
      withTiming(translateY.value + 400, { 
        duration: 10000 + Math.random() * 5000 
      }),
      -1,
      true
    );
    
    translateX.value = withRepeat(
      withTiming(translateX.value + (Math.random() > 0.5 ? 100 : -100), {
        duration: 8000 + Math.random() * 4000
      }),
      -1,
      true
    );

    opacity.value = withRepeat(
      withTiming(Math.random() * 0.4 + 0.1, {
        duration: 4000 + Math.random() * 2000
      }),
      -1,
      true
    );
  }, [opacity, translateX, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: 0.8 + Math.sin(index) * 0.3 }
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        animatedStyle,
      ]}
    />
  );
};

// Enhanced FloatingParticles component with better memory management
export const FloatingParticles = () => {
  const particles = Array.from({ length: 8 }, (_, i) => (
    <FloatingParticle key={i} index={i} />
  ));

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {particles}
    </View>
  );
};

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
}); 