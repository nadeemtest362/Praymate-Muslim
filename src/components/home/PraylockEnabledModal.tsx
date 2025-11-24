import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSequence, 
  withDelay, 
  interpolate,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import useResponsive from '../../hooks/useResponsive';

interface PraylockEnabledModalProps {
  visible: boolean;
  onDismiss: () => void;
  activationMessage: string;
}

const PraylockEnabledModal: React.FC<PraylockEnabledModalProps> = ({ 
  visible, 
  onDismiss, 
  activationMessage 
}) => {
  const R = useResponsive();
  const styles = useMemo(() => createModalStyles(R), [R]);
  
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(0);
  const emojiScale = useSharedValue(0);
  const borderFill = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Epic entrance animation
      opacity.value = withTiming(1, { duration: 150 });
      scale.value = withSequence(
        withTiming(1.1, { duration: 400, easing: Easing.out(Easing.back(1.5)) }),
        withTiming(1, { duration: 200 })
      );
      
      // Lock icon rotation with haptic feedback
      rotate.value = withSequence(
        withDelay(200, withTiming(3, { duration: 100 })),
        withTiming(-3, { duration: 100 }),
        withTiming(2, { duration: 100 }),
        withTiming(-1, { duration: 100 }),
        withTiming(0, { duration: 100 })
      );
      
      // Emoji bounce
      emojiScale.value = withDelay(300, withSequence(
      withTiming(1.3, { duration: 200 }),
      withTiming(1, { duration: 200 })
      ));
      
      // Border fill animation
      borderFill.value = withDelay(400, withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) }));

      
      // Haptic sequence
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 100);
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 300);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 500);
    } else {
      // Reset all values
      opacity.value = 0;
      scale.value = 0;
      rotate.value = 0;
      emojiScale.value = 0;
      borderFill.value = 0;
    }
  }, [visible, borderFill, emojiScale, opacity, rotate, scale]);

  const animatedModalStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { rotate: `${rotate.value}deg` }
    ]
  }));

  const emojiAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: emojiScale.value }]
  }));

  const circleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(borderFill.value, [0, 1], [0.8, 1]) }],
    opacity: interpolate(borderFill.value, [0, 0.1, 1], [0, 1, 1]),
  }));

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
          style={styles.modalBackdrop} 
          activeOpacity={1} 
          onPress={onDismiss}
        />
        
        <Animated.View style={[styles.modalContainer, animatedModalStyle]}>
          <LinearGradient
            colors={['#141941', '#3b2f7f', '#b44da6']}
            style={styles.completionGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.completionContent}>
              {/* PRAYLOCK circle with lock icon */}
              <Animated.View style={[styles.trophyContainer, emojiAnimatedStyle]}>
                <Animated.View style={[styles.praylockCircle, circleAnimatedStyle]}>
                  {/* Static background circle */}
                  <View style={styles.praylockBackground} />
                  {/* Border */}
                  <View style={styles.praylockBorderAnimated} />
                  {/* Lock icon container */}
                  <View style={styles.praylockContent}>
                    <Image 
                      source={{ uri: 'https://kfrvxoxdehduqrpcbibl.supabase.co/storage/v1/object/public/assets/app/emojis/praylock-icon.png' }}
                      style={styles.praylockIcon}
                      resizeMode="contain"
                    />
                  </View>
                </Animated.View>
              </Animated.View>
              
              {/* Title */}
              <Text style={styles.completionTitle}>PRAYBLOCK ACTIVATED</Text>
              
              {/* Subtitle */}
              <Text style={styles.completionSubtitle}>
                {activationMessage}
              </Text>
              
              {/* Continue button */}
              <TouchableOpacity 
                style={styles.continueButton}
                onPress={onDismiss}
              >
                <Text style={styles.continueText}>Got it!</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const createModalStyles = (R: any) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: R.w(85),
    borderRadius: R.w(5),
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  completionGradient: {
    padding: R.w(6),
    alignItems: 'center',
  },
  completionContent: {
    alignItems: 'center',
  },
  trophyContainer: {
    marginBottom: R.h(2),
  },
  praylockCircle: {
    width: R.w(20),
    height: R.w(20),
    borderRadius: R.w(10),
    backgroundColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
    overflow: 'hidden',
  },
  praylockBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: R.w(10),
    backgroundColor: 'rgba(139, 127, 232, 0.2)',
  },
  praylockBorderAnimated: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: R.w(10),
    borderWidth: R.w(1.5),
    borderColor: 'rgba(139, 127, 232, 0.4)',
  },
  praylockContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  praylockIcon: {
    width: R.w(8),
    height: R.w(8),
  },
  completionTitle: {
    fontSize: R.font(28),
    fontFamily: "SNPro-Heavy",
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: R.h(1),
    letterSpacing: -1,
  },
  completionSubtitle: {
    fontSize: R.font(18),
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: R.h(3),
    lineHeight: R.lineHeight(18),
    paddingHorizontal: R.w(2),
    fontFamily: "SNPro-Medium",
  },
  continueButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: R.w(6),
    paddingVertical: R.h(1.8),
    paddingHorizontal: R.w(8),
  },
  continueText: {
    fontSize: R.font(16),
    fontFamily: "SNPro-Bold",
    color: '#1a1a1a',
    letterSpacing: 0.5,
  },
});

export default PraylockEnabledModal;
