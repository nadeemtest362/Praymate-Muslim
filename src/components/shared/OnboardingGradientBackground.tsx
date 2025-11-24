import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface OnboardingGradientBackgroundProps {
  children?: React.ReactNode;
}

export const ONBOARDING_GRADIENT_COLORS = ['#141941', '#3b2f7f', '#b44da6'] as const;

export default function OnboardingGradientBackground({ children }: OnboardingGradientBackgroundProps) {
  return (
    <LinearGradient
      colors={ONBOARDING_GRADIENT_COLORS}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFillObject}
    >
      {children}
    </LinearGradient>
  );
} 