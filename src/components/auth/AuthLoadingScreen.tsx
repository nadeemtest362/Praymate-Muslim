import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import OnboardingGradientBackground from '../shared/OnboardingGradientBackground';
import useResponsive from '../../hooks/useResponsive';

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  container: {
    flex: 1,
  },
  logoScreen: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: R.h(12),
  },
  logoContainerCentered: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: R.h(21.5),
  },
  logoWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoEmoji: {
    fontSize: R.font(48),
    marginRight: R.w(2),
  },
  logoTextLarge: {
    fontSize: R.font(48),
    fontFamily: 'SNPro-Heavy',
    color: '#FFFFFF',
    letterSpacing: -1.5,
    textTransform: 'lowercase',
    textShadowColor: 'rgba(255, 255, 255, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  logoAccentLarge: {
    fontSize: R.font(48),
    fontFamily: 'SNPro-Heavy',
    color: '#7DD3FC',
    letterSpacing: -1.5,
    textTransform: 'lowercase',
    textShadowColor: 'rgba(125, 211, 252, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

export default function AuthLoadingScreen() {
  const R = useResponsive();
  const styles = createStyles(R);
  
  // Animation values
  const logoScale = useSharedValue(0.85);
  const logoOpacity = useSharedValue(20);
  const logoY = useSharedValue(10);

  useEffect(() => {
    // Simple, smooth logo animation - no spring, no bounce
    logoOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    logoScale.value = withTiming(1, { duration: 1600, easing: Easing.out(Easing.cubic) });
  
  }, [logoOpacity, logoScale, logoY]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      { scale: logoScale.value },
      { translateY: logoY.value }
    ]
  }));

  return (
    <View style={styles.container}>
      {/* Modern gradient background */}
      <OnboardingGradientBackground />

      {/* Subtle overlay for depth */}
      <LinearGradient
        colors={['rgba(139, 69, 19, 0.1)', 'transparent', 'rgba(30, 144, 255, 0.1)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.logoScreen}>
        <Animated.View style={[styles.logoContainerCentered, logoStyle]}>
          <View style={styles.logoWrapper}>
            <Text style={styles.logoTextLarge}>pray</Text>
            <Text style={styles.logoAccentLarge}>mate</Text>
            <Text style={styles.logoEmoji}>🙏</Text>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}