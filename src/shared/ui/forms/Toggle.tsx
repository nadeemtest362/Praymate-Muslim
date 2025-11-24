/**
 * Toggle Component
 * 
 * Animated toggle switch with the app's design language
 */

import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import type { Size } from '../types';

const AnimatedView = Animated.createAnimatedComponent(View);

export interface ToggleProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
  size?: Size;
  color?: string;
  disabled?: boolean;
  haptic?: boolean;
  style?: any;
}

export const Toggle: React.FC<ToggleProps> = React.memo(({
  checked = false,
  onCheckedChange,
  label,
  size = 'medium',
  color = '#7C71E0',
  disabled = false,
  haptic = true,
  style,
}) => {
  const handlePress = () => {
    if (disabled) return;
    
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    onCheckedChange?.(!checked);
  };
  
  const trackAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      checked ? 1 : 0,
      [0, 1],
      ['rgba(255, 255, 255, 0.2)', color]
    );
    
    return {
      backgroundColor: withTiming(backgroundColor, { duration: 200 }),
    };
  });
  
  const thumbAnimatedStyle = useAnimatedStyle(() => {
    const translateX = withSpring(
      checked ? 
        (size === 'small' ? 20 : size === 'medium' ? 24 : 28) : 
        2,
      {
        damping: 15,
        stiffness: 200,
      }
    );
    
    const scale = withSpring(checked ? 1.1 : 1, {
      damping: 15,
      stiffness: 200,
    });
    
    return {
      transform: [
        { translateX },
        { scale },
      ],
    };
  });
  
  const sizeStyles = {
    track: styles[`track_${size}`],
    thumb: styles[`thumb_${size}`],
  };
  
  const toggleElement = (
    <AnimatedView style={[
      styles.track,
      sizeStyles.track,
      disabled && styles.disabled,
      trackAnimatedStyle,
    ]}>
      <AnimatedView style={[
        styles.thumb,
        sizeStyles.thumb,
        thumbAnimatedStyle,
      ]} />
    </AnimatedView>
  );
  
  if (!label) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.8}
        style={style}
      >
        {toggleElement}
      </TouchableOpacity>
    );
  }
  
  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[styles.container, style]}
    >
      <Text style={[
        styles.label,
        styles[`label_${size}`],
        disabled && styles.labelDisabled,
      ]}>
        {label}
      </Text>
      {toggleElement}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  track: {
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    padding: 2,
  },
  track_small: {
    width: 40,
    height: 22,
  },
  track_medium: {
    width: 48,
    height: 26,
  },
  track_large: {
    width: 56,
    height: 30,
  },
  thumb: {
    backgroundColor: '#FFFFFF',
    borderRadius: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  thumb_small: {
    width: 18,
    height: 18,
  },
  thumb_medium: {
    width: 22,
    height: 22,
  },
  thumb_large: {
    width: 26,
    height: 26,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 1,
    marginRight: 12,
  },
  label_small: {
    fontSize: 14,
  },
  label_medium: {
    fontSize: 16,
  },
  label_large: {
    fontSize: 18,
  },
  labelDisabled: {
    opacity: 0.5,
  },
});

Toggle.displayName = 'Toggle'; 