import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withDelay,
  withTiming,
  withRepeat,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import useResponsive from '../../hooks/useResponsive';
import { FloatingParticles } from '../shared/FloatingParticles';
import MaskedView from '@react-native-masked-view/masked-view';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface StreakCelebrationModalProps {
  visible: boolean;
  onClose: () => void;
  currentStreak: number;
  streakGoal?: number;
}

const StreakCelebrationModal: React.FC<StreakCelebrationModalProps> = ({
  visible,
  onClose,
  currentStreak,
  streakGoal,
}) => {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);
  const confettiRef = useRef<LottieView>(null);
  
  // Animations - start in hidden state so modal doesn't flash
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.85);
  const emojiScale = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslate = useSharedValue(12);
  const messageOpacity = useSharedValue(0);
  const messageTranslate = useSharedValue(18);
  const progressOpacity = useSharedValue(0);
  const progressTranslate = useSharedValue(24);
  const progressFill = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslate = useSharedValue(28);
  const buttonScale = useSharedValue(0.96);

  const playCelebrationSound = useCallback(async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../../assets/sounds/success-streak.mp3'),
        { shouldPlay: true, volume: 0.85 }
      );

      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) {
          return;
        }
        if (status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
        }
      });
    } catch (error) {
      console.warn('[StreakCelebrationModal] Failed to play celebration sound', error);
    }
  }, []);

  const progressToGoal = streakGoal ? (currentStreak / streakGoal) * 100 : 0;
  const progressTarget = streakGoal
    ? Math.min(Math.max(progressToGoal / 100, 0), 1)
    : 1;
  const isAtGoal = streakGoal && currentStreak >= streakGoal;

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playCelebrationSound();
      confettiRef.current?.reset();
      confettiRef.current?.play();

      opacity.value = withTiming(1, {
        duration: 250,
        easing: Easing.out(Easing.quad),
      });

      scale.value = withSequence(
        withTiming(1.05, {
          duration: 320,
          easing: Easing.out(Easing.back(1.2)),
        }),
        withTiming(1, {
          duration: 180,
          easing: Easing.out(Easing.quad),
        })
      );

      emojiScale.value = withDelay(
        140,
        withSequence(
          withTiming(1.18, {
            duration: 220,
            easing: Easing.out(Easing.quad),
          }),
          withTiming(1, {
            duration: 180,
            easing: Easing.out(Easing.quad),
          })
        )
      );

      contentOpacity.value = withDelay(
        180,
        withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) })
      );

      titleOpacity.value = withDelay(
        260,
        withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) })
      );
      titleTranslate.value = withDelay(
        260,
        withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) })
      );

      messageOpacity.value = withDelay(
        360,
        withTiming(1, { duration: 340, easing: Easing.out(Easing.cubic) })
      );
      messageTranslate.value = withDelay(
        360,
        withTiming(0, { duration: 340, easing: Easing.out(Easing.cubic) })
      );

      progressOpacity.value = withDelay(
        420,
        withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) })
      );
      progressTranslate.value = withDelay(
        420,
        withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) })
      );
      progressFill.value = withDelay(
        460,
        withTiming(progressTarget, {
          duration: 520,
          easing: Easing.out(Easing.cubic),
        })
      );

      buttonOpacity.value = withDelay(
        540,
        withTiming(1, { duration: 340, easing: Easing.out(Easing.cubic) })
      );
      buttonTranslate.value = withDelay(
        540,
        withTiming(0, { duration: 340, easing: Easing.out(Easing.cubic) })
      );
      buttonScale.value = withDelay(
        650,
        withSequence(
          withTiming(1, {
            duration: 360,
            easing: Easing.out(Easing.back(1.6)),
          }),
          withRepeat(
            withSequence(
              withTiming(1.02, {
                duration: 840,
                easing: Easing.inOut(Easing.quad),
              }),
              withTiming(1, {
                duration: 840,
                easing: Easing.inOut(Easing.quad),
              })
            ),
            -1,
            true
          )
        )
      );
    } else {
      confettiRef.current?.reset();
      opacity.value = 0;
      scale.value = 0.85;
      emojiScale.value = 0;
      contentOpacity.value = 0;
      titleOpacity.value = 0;
      titleTranslate.value = 12;
      messageOpacity.value = 0;
      messageTranslate.value = 18;
      progressOpacity.value = 0;
      progressTranslate.value = 24;
      progressFill.value = 0;
      buttonOpacity.value = 0;
      buttonTranslate.value = 28;
      buttonScale.value = 0.96;
    }
  }, [
    visible,
    opacity,
    scale,
    emojiScale,
    contentOpacity,
    titleOpacity,
    titleTranslate,
    messageOpacity,
    messageTranslate,
    progressOpacity,
    progressTranslate,
    progressFill,
    buttonOpacity,
    buttonTranslate,
    buttonScale,
    progressTarget,
    playCelebrationSound,
  ]);

  const modalStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const emojiAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: emojiScale.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslate.value }],
  }));

  const messageStyle = useAnimatedStyle(() => ({
    opacity: messageOpacity.value,
    transform: [{ translateY: messageTranslate.value }],
  }));

  const progressGroupStyle = useAnimatedStyle(() => ({
    opacity: progressOpacity.value,
    transform: [{ translateY: progressTranslate.value }],
  }));

  const progressFillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(Math.min(progressFill.value, 1), 0) * 100}%`,
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [
      { translateY: buttonTranslate.value },
      { scale: buttonScale.value },
    ],
  }));

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.fullScreen, modalStyle]}>
        <FloatingParticles />
        <View pointerEvents="none" style={styles.confetti}>
          <LottieView
            ref={confettiRef}
            source={require('../../../assets/lottie/confetti-bg.json')}
            autoPlay={false}
            loop={false}
            style={[styles.confettiAnimation, { opacity: 0.12 }]}
            resizeMode="cover"
            speed={0.3}
          
          />
        </View>
        <View style={styles.content}>
          {/* Emoji */}
          <Animated.View style={[styles.emojiContainer, emojiAnimatedStyle]}>
            <Text style={styles.emoji}>🙌</Text>
          </Animated.View>

          <Animated.View style={contentStyle}>
            {/* Title */}
            <Animated.View style={titleStyle}>
              <MaskedView
                maskElement={
                  <Text style={styles.title}>
                    {currentStreak}-Day Prayer Streak!
                  </Text>
                }
              >
                <LinearGradient
                  colors={['#FFD700', '#FFA000']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={[styles.title, { opacity: 0 }]}>
                    {currentStreak}-Day Prayer Streak!
                  </Text>
                </LinearGradient>
              </MaskedView>
            </Animated.View>

            {/* Motivational message */}
            <Animated.View style={messageStyle}>
              <Text style={styles.motivationText}>
                {isAtGoal ? (
                  <>
                    <Text style={styles.goalNumber}>{streakGoal}</Text> days of bringing your people and your heart before God.
                  </>
                ) : currentStreak >= 7
                  ? "A week of prayer. Making a God part of your daily rhythm."
                  : currentStreak >= 3
                  ? "Three days of prayer & reflection. Building your bond with God."
                  : "Transforming your faith & life, one prayer at a time."}
              </Text>
            </Animated.View>

          </Animated.View>

          {/* Progress to goal - ALWAYS SHOW */}
          <Animated.View style={[styles.goalContainer, progressGroupStyle]}>
            <View style={styles.progressBar}>
              <Animated.View
                style={[styles.progressFillWrapper, progressFillStyle]}
              >
                <LinearGradient
                  colors={['#FFD700', '#FFB347']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.progressFillGradient}
                />
              </Animated.View>
            </View>
            {streakGoal && !isAtGoal && (
              <Text style={styles.goalText}>
                <Text style={styles.goalNumber}>{streakGoal - currentStreak}</Text> more to reach your <Text style={styles.goalNumber}>{streakGoal}</Text>-day goal
              </Text>
            )}
          </Animated.View>
        </View>

        {/* Bottom button */}
        <AnimatedTouchableOpacity
          activeOpacity={0.9}
          style={[styles.continueButton, buttonStyle]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onClose();
          }}
        >
          <LinearGradient
            colors={['#FFD700', '#FFA000']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.continueGradient}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </LinearGradient>
        </AnimatedTouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

const createStyles = (R: any) => StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: 'rgba(39, 6, 53, 0.9)',
    justifyContent: 'space-between',
    paddingTop: R.h(12),
    paddingBottom: R.h(6),
    paddingHorizontal: R.w(6),
  },
  confetti: {
    ...StyleSheet.absoluteFillObject,
  },
  confettiAnimation: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiContainer: {
    marginBottom: R.h(2),
  },
  emoji: {
    fontSize: R.font(180),
  },
  title: {
    fontSize: R.font(64),
    fontFamily: 'SNPro-Black',
    color: '#FFD700',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: R.h(8),
    
  },
  motivationText: {
    fontSize: R.font(24),
    fontFamily: 'SNPro-Heavy',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: R.lineHeight(24),
    marginBottom: R.h(2),
    paddingHorizontal: R.w(8),
  },
  goalNumber: {
    fontFamily: 'SNPro-Black',
    color: '#FFD700',
  },
  goalContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: R.w(12),
  },
  progressBar: {
    width: '100%',
    height: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: R.h(2),
  },
  progressFillWrapper: {
    height: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressFillGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  goalText: {
    fontSize: R.font(15),
    fontFamily: 'SNPro-Medium',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  continueButton: {
    borderRadius: R.w(8),
    width: '100%',
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  continueGradient: {
    paddingVertical: R.h(2.2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    fontSize: R.font(28),
    fontFamily: 'SNPro-Black',
    color: '#000000',
  },
});

export default StreakCelebrationModal;
