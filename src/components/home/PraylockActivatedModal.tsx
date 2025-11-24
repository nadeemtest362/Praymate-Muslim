import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
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
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import useResponsive from '../../hooks/useResponsive';
import { FloatingParticles } from '../shared/FloatingParticles';
import MaskedView from '@react-native-masked-view/masked-view';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface PraylockActivatedModalProps {
  visible: boolean;
  onClose: () => void;
  onBeginPrayer: () => void;
  currentPeriod?: 'morning' | 'evening';
}

const PraylockActivatedModal: React.FC<PraylockActivatedModalProps> = ({
  visible,
  onClose,
  onBeginPrayer,
  currentPeriod = 'morning',
}) => {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);
  const confettiRef = useRef<LottieView>(null);
  
  // Animations - start in hidden state so modal doesn't flash
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.85);
  const iconScale = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslate = useSharedValue(12);
  const messageOpacity = useSharedValue(0);
  const messageTranslate = useSharedValue(18);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslate = useSharedValue(28);
  const buttonScale = useSharedValue(0.96);

  const playCelebrationSound = useCallback(async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../../assets/sounds/prayblock-tone.wav'),
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
      console.warn('[PraylockActivatedModal] Failed to play celebration sound', error);
    }
  }, []);

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

      iconScale.value = withDelay(
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
      iconScale.value = 0;
      contentOpacity.value = 0;
      titleOpacity.value = 0;
      titleTranslate.value = 12;
      messageOpacity.value = 0;
      messageTranslate.value = 18;
      buttonOpacity.value = 0;
      buttonTranslate.value = 28;
      buttonScale.value = 0.96;
    }
  }, [
    visible,
    opacity,
    scale,
    iconScale,
    contentOpacity,
    titleOpacity,
    titleTranslate,
    messageOpacity,
    messageTranslate,
    buttonOpacity,
    buttonTranslate,
    buttonScale,
    playCelebrationSound,
  ]);

  const modalStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
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
            source={require('../../../assets/lottie/clouds.json')}
            autoPlay={false}
            loop={false}
            style={[styles.confettiAnimation, { opacity: 0.12 }]}
            resizeMode="cover"
            speed={2}
          
          />
        </View>
        <View style={styles.content}>
          {/* Praylock Icon */}
          <Animated.View style={[styles.iconContainer, iconAnimatedStyle]}>
            <Image
              source={require('../../../assets/images/praylock-icon.png')}
              style={styles.praylockIcon}
              resizeMode="contain"
            />
          </Animated.View>

          <Animated.View style={contentStyle}>
            {/* Title */}
            <Animated.View style={titleStyle}>
              <MaskedView
                maskElement={
                  <Text style={styles.title}>
                    PRAYBLOCK ACTIVATED
                  </Text>
                }
              >
                <LinearGradient
                  colors={['#FFD700', '#FFA000']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={[styles.title, { opacity: 0 }]}>
                    PRAYBLOCK ACTIVATED
                  </Text>
                </LinearGradient>
              </MaskedView>
            </Animated.View>

            {/* Message */}
            <Animated.View style={messageStyle}>
              <Text style={styles.messageText}>
                Complete Your {currentPeriod.charAt(0).toUpperCase() + currentPeriod.slice(1)} Prayer To Unblock Your Apps
              </Text>
            </Animated.View>

          </Animated.View>
        </View>

        {/* Bottom button */}
        <AnimatedTouchableOpacity
          activeOpacity={0.9}
          style={[styles.continueButton, buttonStyle]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onClose();
            onBeginPrayer();
          }}
        >
          <LinearGradient
            colors={['#ab0478', '#ff7144']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.continueGradient}
          >
            <Text style={styles.continueButtonText}>🙏 Pray Now</Text>
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
  iconContainer: {
    marginBottom: R.h(2),
  },
  praylockIcon: {
    width: R.w(60),
    height: R.w(60),
  },
  title: {
    fontSize: R.font(64),
    fontFamily: 'SNPro-Black',
    color: '#FFD700',
    textAlign: 'center',
    letterSpacing: -2.5,
    marginBottom: R.h(4),
    
  },
  messageText: {
    fontSize: R.font(24),
    fontFamily: 'SNPro-Heavy',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: R.lineHeight(24),
    marginBottom: R.h(2),
    paddingHorizontal: R.w(8),
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
    color: '#fff',
  },
});

export default PraylockActivatedModal;
