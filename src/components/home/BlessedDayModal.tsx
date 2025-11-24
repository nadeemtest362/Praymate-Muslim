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

interface BlessedDayModalProps {
  visible: boolean;
  onDismiss: () => void;
}

const BlessedDayModal: React.FC<BlessedDayModalProps> = ({ visible, onDismiss }) => {
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
      
      // Trophy rotation with haptic feedback
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
              {/* Perfect day circle with prayer hands */}
              <Animated.View style={[styles.trophyContainer, emojiAnimatedStyle]}>
                <Animated.View style={[styles.perfectDayCircle, circleAnimatedStyle]}>
                  {/* Static background circle */}
                  <View style={styles.perfectDayBackground} />
                  {/* Border */}
                  <View style={styles.perfectDayBorderAnimated} />
                  {/* Number container */}
                  <View style={styles.perfectDayContent}>
                    <Text style={styles.trophyEmoji}>🙏</Text>
                  </View>
                </Animated.View>
              </Animated.View>
              
              {/* Title */}
              <Text style={styles.completionTitle}>Blessed Day!</Text>
              
              {/* Subtitle */}
              <Text style={styles.completionSubtitle}>
                You've completed today's spiritual journey
              </Text>
              
              {/* Perfect day equation */}
              <View style={styles.achievementRow}>
                <View style={styles.achievementBadge}>
                  <Image 
                    source={require("../../../assets/images/morning1.png")}
                    style={styles.achievementImage}
                  />
                  <Text style={styles.achievementText}>Morning</Text>
                </View>
                <Text style={styles.plusText}>+</Text>
                <View style={styles.achievementBadge}>
                  <Image 
                    source={require("../../../assets/images/evening1.png")}
                    style={styles.achievementImage}
                  />
                  <Text style={styles.achievementText}>Evening</Text>
                </View>
                <Text style={styles.equalsText}>=</Text>
                <View style={styles.achievementBadge}>
                  <Text style={styles.achievementEmoji}>🙏</Text>
                  <Text style={styles.achievementText}>Blessed</Text>
                </View>
              </View>
              
              {/* Continue button */}
              <TouchableOpacity 
                style={styles.continueButton}
                onPress={onDismiss}
              >
                <Text style={styles.continueText}>Continue</Text>
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
  perfectDayCircle: {
    width: R.w(20),
    height: R.w(20),
    borderRadius: R.w(10),
    backgroundColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
    overflow: 'hidden',
  },
  perfectDayBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: R.w(10),
    backgroundColor: 'rgba(139, 237, 79, 0.2)',
  },
  perfectDayBorderAnimated: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: R.w(10),
    borderWidth: R.w(1.5),
    borderColor: 'rgba(139, 237, 79, 0.3)',
  },
  perfectDayContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  trophyEmoji: {
    fontSize: R.font(32),
    fontWeight: '800',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  completionTitle: {
    fontSize: R.font(56),
    fontFamily: 'SNPro-Black',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: R.h(1),
    letterSpacing: -1,
  },
  completionSubtitle: {
    fontSize: R.font(16),
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: R.h(3),
    lineHeight: R.lineHeight(16),
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.w(2),
    marginBottom: R.h(3),
  },
  achievementBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: R.w(3),
    paddingVertical: R.h(1),
    paddingHorizontal: R.w(2.5),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  achievementImage: {
    width: R.w(4.5),
    height: R.w(4.5),
    marginBottom: R.h(0.5),
  },
  achievementEmoji: {
    fontSize: R.font(18),
    marginBottom: R.h(0.5),
  },
  achievementText: {
    fontSize: R.font(10),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  plusText: {
    fontSize: R.font(16),
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  equalsText: {
    fontSize: R.font(16),
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  continueButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: R.w(6),
    paddingVertical: R.h(1.8),
    paddingHorizontal: R.w(8),
  },
  continueText: {
    fontSize: R.font(16),
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: 0.5,
  },

});

export default BlessedDayModal;
