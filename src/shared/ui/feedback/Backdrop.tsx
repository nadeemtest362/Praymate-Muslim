import React, { useEffect } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Easing 
} from 'react-native-reanimated';

interface BackdropProps {
  isVisible: boolean;
  onPress: () => void;
}

const Backdrop: React.FC<BackdropProps> = ({ isVisible, onPress }) => {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(
      isVisible ? 1 : 0,
      {
        duration: 200,
        easing: Easing.out(Easing.ease),
      }
    );
  }, [isVisible, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View 
      style={[styles.backdrop, animatedStyle]}
      pointerEvents={isVisible ? 'auto' : 'none'}
    >
      <TouchableOpacity 
        style={StyleSheet.absoluteFillObject} 
        onPress={onPress}
        activeOpacity={1}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(20, 19, 60, 0.75)',
    zIndex: 1000,
  },
});

export default Backdrop; 