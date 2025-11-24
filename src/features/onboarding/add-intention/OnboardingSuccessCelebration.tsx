import React, { useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ConfettiCannon from 'react-native-confetti-cannon';
import Animated, {
  FadeIn,
  ZoomIn,
  SlideInUp,
} from 'react-native-reanimated';

import useResponsive from '../../../hooks/useResponsive';

interface OnboardingSuccessCelebrationProps {
  visible: boolean;
  personName?: string;
  isSelfMode?: boolean;
}

export const OnboardingSuccessCelebration: React.FC<OnboardingSuccessCelebrationProps> = ({
  visible,
  personName,
  isSelfMode = false,
}) => {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);
  const confettiRef = useRef<ConfettiCannon>(null);

  useEffect(() => {
    if (visible) {
      // Fire confetti and haptic after a short delay
      setTimeout(() => {
        confettiRef.current?.start();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 100);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View 
      entering={FadeIn.duration(300)}
      style={[StyleSheet.absoluteFillObject, styles.successContainer]}
    >
      {/* Gradient Background */}
      <LinearGradient
        colors={['rgba(139, 69, 19, 0.1)', 'transparent', 'rgba(30, 144, 255, 0.1)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      />
      
      {/* Confetti */}
      <ConfettiCannon
        ref={confettiRef}
        count={150}
        origin={{ x: -10, y: 0 }}
        fadeOut={true}
        autoStart={false}
        fallSpeed={2000}
      />
      
      {/* Success Content */}
      <View style={styles.successContent}>
        <Animated.View 
          entering={ZoomIn.delay(200).springify()}
          style={styles.successIconContainer}
        >
          <MaterialCommunityIcons name="check-circle" size={R.w(25)} color="#FFFFFF" />
        </Animated.View>
        
        <Animated.Text 
          entering={SlideInUp.delay(500).springify()}
          style={styles.celebrationTitle}
        >
          New Intention Added! 🙏
        </Animated.Text>
        
        <Animated.Text 
          entering={SlideInUp.delay(600).springify()}
          style={styles.celebrationSubtitle}
        >
          {isSelfMode 
            ? "Your personal intention has been saved"
            : `Your prayer for ${personName || 'them'} has been saved`}
        </Animated.Text>
        
        <Animated.View 
          entering={SlideInUp.delay(700).springify()}
        >
          <Text style={[styles.sparkles, { fontSize: R.font(60) }]}>✨</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  successContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A2151', // Solid background to prevent any transparency
    zIndex: 9999, // Ensure it's on top
  },
  successContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: R.w(5),
    width: '100%',
  },
  successIconContainer: {
    marginBottom: R.h(4),
  },
  celebrationTitle: {
    fontSize: R.font(28),
    fontFamily: 'SNPro-Black',
    color: '#FFFFFF',
    lineHeight: R.font(34),
    letterSpacing: -1.2,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginBottom: R.h(1),
  },
  celebrationSubtitle: {
    fontSize: R.font(18),
    fontFamily: 'SNPro-Bold',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: R.h(2.5),
    paddingHorizontal: R.w(5),
  },
  sparkles: {
    textAlign: 'center',
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
}); 