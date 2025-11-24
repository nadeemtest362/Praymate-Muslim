import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  Easing,
  FadeIn
} from 'react-native-reanimated';
import useResponsive from '../../hooks/useResponsive';

interface PrayerProgressBarProps {
  currentIndex: number;
  totalSlides: number;
}

export const PrayerProgressBar: React.FC<PrayerProgressBarProps> = ({ 
  currentIndex, 
  totalSlides 
}) => {
  const R = useResponsive();
  const progress = useSharedValue(0);
  
  useEffect(() => {
    // Calculate progress: start from 3% on slide 1 (index 1), end at 100% on last slide
    // Slide 0 (intro) won't show this component, so we adjust the calculation
    const adjustedIndex = currentIndex - 1; // Adjust since we start showing from slide 1
    const adjustedTotal = totalSlides - 1; // Subtract intro slide from total
    const progressPercentage = 3 + ((adjustedIndex / adjustedTotal) * 97); // Start at 3%, scale to 100%
    
    progress.value = withTiming(Math.max(3, Math.min(100, progressPercentage)), {
      duration: 300,
      easing: Easing.out(Easing.cubic)
    });
  }, [currentIndex, totalSlides]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));
  
  return (
    <Animated.View 
      entering={FadeIn.duration(300)}
      style={[styles.container, { paddingRight: R.w(12) }]}
    >
      <View style={[styles.track, { height: R.h(1) }]}>
        <Animated.View 
          style={[
            styles.fill, 
            { height: R.h(1) },
            animatedStyle
          ]} 
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  track: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: 'rgba(255, 255, 255, 0.17)',
    borderRadius: 10,
  },
});
