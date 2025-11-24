import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  Easing
} from 'react-native-reanimated';
import useResponsive from '../../hooks/useResponsive';

interface StreakStartPopupProps {
  visible: boolean;
  onDismiss: () => void;
}

const StreakStartPopup: React.FC<StreakStartPopupProps> = ({ visible, onDismiss }) => {
  const R = useResponsive();
  
  const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    completionContainer: {
      width: '85%',
      maxWidth: 400,
      borderRadius: R.w(6),
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    },
    confettiOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1,
      pointerEvents: 'none',
    },
    confetti: {
      position: 'absolute',
      fontSize: R.font(30),
    },
    completionGradient: {
      padding: R.w(8),
    },
    completionContent: {
      alignItems: 'center',
    },
    trophyContainer: {
      marginBottom: R.h(2.5),
    },
    trophyEmoji: {
      fontSize: R.font(80),
      textAlign: 'center',
    },
    completionTitle: {
      fontSize: R.font(28),
      fontWeight: '900',
      color: 'white',
      textAlign: 'center',
      marginBottom: R.h(1),
      letterSpacing: -0.5,
    },
    completionSubtitle: {
      fontSize: R.font(18),
      fontWeight: '500',
      color: 'rgba(255, 255, 255, 0.85)',
      textAlign: 'center',
      marginBottom: R.h(3),
    },
    achievementRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: R.w(4),
      marginBottom: R.h(3),
    },
    achievementBadge: {
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      borderRadius: R.w(4),
      paddingHorizontal: R.w(4),
      paddingVertical: R.h(1.5),
      alignItems: 'center',
      minWidth: R.w(20),
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.25)',
    },
    achievementEmoji: {
      fontSize: R.font(24),
      marginBottom: R.h(0.5),
    },
    achievementText: {
      fontSize: R.font(12),
      fontWeight: '600',
      color: 'rgba(255, 255, 255, 0.9)',
    },
    completionMessage: {
      fontSize: R.font(16),
      fontWeight: '500',
      color: 'rgba(255, 255, 255, 0.8)',
      textAlign: 'center',
      lineHeight: R.font(24),
      marginBottom: R.h(3),
      paddingHorizontal: R.w(2),
    },
    dismissButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: R.w(5),
      paddingVertical: R.h(2),
      paddingHorizontal: R.w(8),
      shadowColor: 'rgba(255, 255, 255, 0.5)',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 12,
      elevation: 5,
    },
    dismissButtonText: {
      color: '#7C3AED',
      fontSize: R.font(18),
      fontWeight: '700',
      textAlign: 'center',
    },
  });
  
  const styles = useMemo(() => createStyles(R), [R]);
  
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(0);
  const emojiScale = useSharedValue(0);
  const confettiOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Epic entrance animation
      opacity.value = withTiming(1, { duration: 150 });
      scale.value = withSequence(
        withTiming(1.1, { duration: 200, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 12, stiffness: 200 })
      );
      rotate.value = withSequence(
        withTiming(5, { duration: 100 }),
        withSpring(0, { damping: 10 })
      );
      
      // Emoji celebration
      emojiScale.value = withDelay(200, withSequence(
        withSpring(1.2, { damping: 8 }),
        withSpring(1, { damping: 12 })
      ));
      
      // Confetti burst
      confettiOpacity.value = withDelay(100, withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(1000, withTiming(0, { duration: 1000 }))
      ));
      
      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      scale.value = withTiming(0.8, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible, confettiOpacity, emojiScale, opacity, rotate, scale]);

  const mainAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotate.value}deg` }
    ],
    opacity: opacity.value,
  }));
  
  const emojiAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: emojiScale.value }],
  }));
  
  const confettiStyle = useAnimatedStyle(() => ({
    opacity: confettiOpacity.value,
  }));

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View style={styles.modalOverlay}>
        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFillObject} />
        
        <TouchableOpacity 
          style={StyleSheet.absoluteFillObject} 
          activeOpacity={1} 
          onPress={handleDismiss}
        />
        
        <Animated.View 
          style={[styles.completionContainer, mainAnimatedStyle]}
        >
          {/* Confetti overlay */}
          <Animated.View style={[styles.confettiOverlay, confettiStyle]}>
            <Text style={[styles.confetti, { top: R.h(2.5), left: R.w(7.5) }]}>🎊</Text>
            <Text style={[styles.confetti, { top: R.h(5), right: R.w(5) }]}>✨</Text>
            <Text style={[styles.confetti, { bottom: R.h(7.5), left: R.w(10) }]}>🎉</Text>
            <Text style={[styles.confetti, { top: R.h(10), right: R.w(12.5) }]}>⭐</Text>
            <Text style={[styles.confetti, { bottom: R.h(12.5), right: R.w(7.5) }]}>🌟</Text>
          </Animated.View>
          
          {/* Main content with gradient */}
          <LinearGradient
            colors={['#8B5CF6', '#7C3AED', '#6D28D9']}
            style={styles.completionGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.completionContent}>
              {/* Praying hands icon */}
              <Animated.View style={[styles.trophyContainer, emojiAnimatedStyle]}>
                <Text style={styles.trophyEmoji}>🙏</Text>
              </Animated.View>
              
              {/* Title */}
              <Text style={styles.completionTitle}>Day 1 - Blessed Beginning!</Text>
              
              {/* Subtitle */}
              <Text style={styles.completionSubtitle}>
                Your prayer journey has begun
              </Text>
              
              {/* Achievement badges */}
              <View style={styles.achievementRow}>
                <View style={styles.achievementBadge}>
                  <Text style={styles.achievementEmoji}>🌱</Text>
                  <Text style={styles.achievementText}>Started</Text>
                </View>
                <View style={styles.achievementBadge}>
                  <Text style={styles.achievementEmoji}>✨</Text>
                  <Text style={styles.achievementText}>Day 1</Text>
                </View>
                <View style={styles.achievementBadge}>
                  <Text style={styles.achievementEmoji}>🔥</Text>
                  <Text style={styles.achievementText}>Streak: 1</Text>
                </View>
              </View>
              
              {/* Motivational message */}
              <Text style={styles.completionMessage}>
                Welcome to your prayer journey! Today marks the beginning of a beautiful habit that will transform your relationship with God.
              </Text>
              
              {/* Dismiss button */}
              <TouchableOpacity 
                style={styles.dismissButton}
                onPress={handleDismiss}
              >
                <Text style={styles.dismissButtonText}>Begin My Journey</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default StreakStartPopup;