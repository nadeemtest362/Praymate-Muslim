/**
 * Checkbox Component
 * 
 * Custom checkbox with animated check and the app's purple accent color
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
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import type { Size } from '../types';

const AnimatedView = Animated.createAnimatedComponent(View);

export interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
  size?: Size;
  color?: string;
  disabled?: boolean;
  haptic?: boolean;
  style?: any;
}

export const Checkbox: React.FC<CheckboxProps> = React.memo(({
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
  
  const animatedStyle = useAnimatedStyle(() => {
    const scale = withSpring(checked ? 1 : 0, {
      damping: 15,
      stiffness: 200,
    });
    
    const opacity = withTiming(checked ? 1 : 0, {
      duration: 200,
    });
    
    return {
      transform: [{ scale }],
      opacity,
    };
  });
  
  const containerAnimatedStyle = useAnimatedStyle(() => {
    const borderWidth = withTiming(checked ? 0 : 1, {
      duration: 200,
    });
    
    const backgroundColor = withTiming(
      checked ? color : 'transparent',
      { duration: 200 }
    );
    
    return {
      borderWidth,
      backgroundColor,
    };
  });
  
  const sizeStyles = styles[`checkbox_${size}`];
  const iconSize = size === 'small' ? 12 : size === 'medium' ? 14 : 16;
  
  const checkboxElement = (
    <AnimatedView 
      style={[
        styles.checkbox,
        sizeStyles,
        { borderColor: disabled ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.5)' },
        disabled && styles.disabled,
        containerAnimatedStyle,
      ]}
    >
      <AnimatedView style={animatedStyle}>
        <Ionicons name="checkmark" size={iconSize} color="#FFFFFF" />
      </AnimatedView>
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
        {checkboxElement}
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
      {checkboxElement}
      <Text style={[
        styles.label,
        styles[`label_${size}`],
        disabled && styles.labelDisabled,
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    borderWidth: 1,
  },
  checkbox_small: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  checkbox_medium: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  checkbox_large: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: '#FFFFFF',
    fontWeight: '500',
    marginLeft: 12,
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

Checkbox.displayName = 'Checkbox'; 