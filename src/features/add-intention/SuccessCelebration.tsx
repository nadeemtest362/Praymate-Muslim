import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn, ZoomIn, SlideInUp } from 'react-native-reanimated';
import ConfettiCannon from 'react-native-confetti-cannon';
import { SuccessCelebrationProps } from './types';

export const SuccessCelebration: React.FC<SuccessCelebrationProps> = ({
  visible,
  onComplete,
}) => {
  const confettiRef = useRef<ConfettiCannon>(null);

  useEffect(() => {
    if (visible) {
      // Fire confetti after a short delay
      const timer = setTimeout(() => {
        confettiRef.current?.start();
      }, 100);

      // Auto complete after 2.5 seconds
      const completeTimer = setTimeout(() => {
        onComplete?.();
      }, 2500);

      return () => {
        clearTimeout(timer);
        clearTimeout(completeTimer);
      };
    }
  }, [visible, onComplete]);

  if (!visible) return null;

  return (
    <Animated.View 
      entering={FadeIn.duration(300)}
      style={[StyleSheet.absoluteFillObject, styles.successContainer]}
    >
      {/* Gradient Background */}
      <LinearGradient
        colors={['#4C1D95', '#7C3AED', '#A78BFA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
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
          <MaterialCommunityIcons name="check-circle" size={120} color="#FFFFFF" />
        </Animated.View>
        
        <Animated.Text 
          entering={SlideInUp.delay(400).springify()}
          style={styles.successTitle}
        >
          Prayer Added! 🙏
        </Animated.Text>
        
        <Animated.Text 
          entering={SlideInUp.delay(500).springify()}
          style={styles.successSubtitle}
        >
          Your intention has been saved
        </Animated.Text>
        
        <Animated.View 
          entering={SlideInUp.delay(600).springify()}
        >
          <Text style={{ fontSize: 60 }}>✨</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A2151', // Solid background to prevent any transparency
    zIndex: 9999, // Ensure it's on top
  },
  successContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 32,
    letterSpacing: -1.1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  successSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
}); 