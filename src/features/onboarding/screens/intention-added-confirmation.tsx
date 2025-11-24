import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ConfettiCannon from 'react-native-confetti-cannon';
import Animated, { 
  FadeIn, 
  FadeInDown, 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat, 
  withSequence,
  Easing, 
  ZoomIn,
} from 'react-native-reanimated';
import { Avatar } from '../../../shared/ui';
import { useOnboardingStore } from '../../../stores/onboardingStore';
import { StatusBar } from 'expo-status-bar';
import OnboardingGradientBackground from '../../../components/shared/OnboardingGradientBackground';

const { width, height } = Dimensions.get('window');

interface IntentionAddedConfirmationScreenConfig {
  title: string;
  infoText: string;
  doneButton: {
    text: string;
    action: string; 
  };
  tracking?: {
    screenViewEvent?: string;
  };
}

interface IntentionAddedConfirmationScreenProps {
  config: IntentionAddedConfirmationScreenConfig;
  onNext: () => void;
}

function IntentionAddedConfirmationScreenCore({ config, onNext }: IntentionAddedConfirmationScreenProps) {
  const insets = useSafeAreaInsets();
  const confettiRef = useRef<ConfettiCannon>(null);
  
  const { currentBatchOfIntentions, clearCurrentBatchOfIntentions } = useOnboardingStore(
    (state) => ({
      currentBatchOfIntentions: state.currentBatchOfIntentions,
      clearCurrentBatchOfIntentions: state.clearCurrentBatchOfIntentions,
    })
  );

  const starRotate = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const buttonGlow = useSharedValue(0);

  // Play success sound effect
  const playSuccessSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../../../assets/sounds/success-chime.mp3'),
        { shouldPlay: true, volume: 0.7 }
      );
      // Unload sound after playing to free memory
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.log('Could not play success sound:', error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      confettiRef.current?.start();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playSuccessSound();
      starRotate.value = withRepeat(withTiming(360, { duration: 10000, easing: Easing.linear }), -1, false);
      
      // Start button glow animation
      buttonGlow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [buttonGlow, starRotate]);

  const starStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${starRotate.value}deg` }] }));

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }],
      shadowOpacity: 0.25 + (buttonGlow.value * 0.15),
      shadowRadius: 8 + (buttonGlow.value * 4),
    };
  });

  const handleDone = async () => {
    // Button press animation
    buttonScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
    
    // Light haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    clearCurrentBatchOfIntentions();
    
    onNext(); 
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background gradient */}
      <OnboardingGradientBackground />

      {/* Confetti */}
      <ConfettiCannon ref={confettiRef} count={150} origin={{x: width/2, y: height * 0.2}} fallSpeed={3000} fadeOut={true} colors={['#FFD700', '#FFFFFF', '#FF6B8B', '#6C63FF', '#4CD964']} explosionSpeed={350} autoStart={true} />
      
      <View style={styles.darkOverlay} />
      <Animated.View style={[styles.decorativeCircle, styles.circle1]} entering={FadeIn.duration(2000)} />
      <Animated.View style={[styles.decorativeCircle, styles.circle2]} entering={FadeIn.duration(2000).delay(200)} />
      <Animated.View style={[styles.starsContainer, starStyle]}>
        <MaterialCommunityIcons name="star-four-points" size={20} color="rgba(255,255,255,0.3)" style={styles.starBg1} />
        <MaterialCommunityIcons name="star-four-points" size={16} color="rgba(255,255,255,0.2)" style={styles.starBg2} />
        <MaterialCommunityIcons name="star-four-points" size={24} color="rgba(255,255,255,0.3)" style={styles.starBg3} />
        <MaterialCommunityIcons name="star-four-points" size={12} color="rgba(255,255,255,0.2)" style={styles.starBg4} />
      </Animated.View>

      <View style={[styles.contentWrapper, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
        <Animated.Text style={styles.successTitle} entering={FadeInDown.duration(800).delay(200)}>
          {config.title} 
        </Animated.Text>

        <View style={styles.avatarsDisplayContainer}>
          {currentBatchOfIntentions.length > 0 ? (
            <View style={styles.avatarsRow}>
              {currentBatchOfIntentions.map((item, index) => (
                <Animated.View 
                  key={`${item.personName}-${index}`}
                  entering={ZoomIn.delay(300 + index * 150).duration(500)}
                  style={styles.avatarWrapper}
                >
                  {/* Only show avatar if name doesn't start with emoji */}
                  {!/\p{Emoji}/u.test(Array.from(item.personName.trim())[0] || '') && (
                    <Avatar size={80} image_uri={!item.isSelf ? item.personImageUri : undefined} name={item.personName} />
                  )}
                  {/* Show emoji as large display if name starts with emoji */}
                  {/\p{Emoji}/u.test(Array.from(item.personName.trim())[0] || '') && (
                    <View style={styles.emojiAvatarContainer}>
                      <Text style={styles.emojiAvatarText}>
                        {Array.from(item.personName.trim())[0]}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.avatarNameText} numberOfLines={1}>{item.personName}</Text>
                </Animated.View>
              ))}
            </View>
          ) : (
            <Text style={styles.infoText}>No intentions were added in this batch.</Text>
          )}
        </View>
        
        <Animated.Text style={styles.infoText} entering={FadeIn.duration(500).delay(Math.max(600, 300 + currentBatchOfIntentions.length * 150))}>
          {config.infoText}
        </Animated.Text>

        <Animated.View entering={FadeInDown.duration(600).delay(Math.max(800, 500 + currentBatchOfIntentions.length * 150))} style={styles.doneButtonContainer}>
          <Animated.View style={buttonAnimatedStyle}>
            <TouchableOpacity style={styles.doneButton} onPress={handleDone} activeOpacity={0.8}>
              <Text style={styles.doneButtonText}>{config.doneButton.text}</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E0B36' },
  contentWrapper: { flex: 1, alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 30 },
  darkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.4)', zIndex: 1, pointerEvents: 'none' },
  decorativeCircle: { position: 'absolute', borderRadius: 300, opacity: 0.3, zIndex: 2, pointerEvents: 'none' },
  circle1: { width: 400, height: 400, backgroundColor: 'rgba(108, 99, 255, 0.3)', top: -150, right: -100 },
  circle2: { width: 300, height: 300, backgroundColor: 'rgba(255, 107, 139, 0.2)', bottom: -80, left: -80 },
  starsContainer: { position: 'absolute', width: width, height: height, zIndex: 2, pointerEvents: 'none' },
  starBg1: { position: 'absolute', top: '20%', left: '25%' },
  starBg2: { position: 'absolute', top: '35%', right: '20%' },
  starBg3: { position: 'absolute', bottom: '30%', left: '15%' },
  starBg4: { position: 'absolute', bottom: '40%', right: '10%' },
  successTitle: { 
    fontSize: 30,
    fontWeight: '800', 
    color: '#FFFFFF', 
    textAlign: 'center', 
    marginVertical: 25, 
    letterSpacing: -0.5 
  },
  avatarsDisplayContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 120,
    marginBottom: 20,
    width: '90%',
    paddingHorizontal: 10,
  },
  avatarsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  avatarWrapper: {
    alignItems: 'center',
    width: 80,
    marginHorizontal: 8,
  },
  avatarNameText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    maxWidth: 80, 
    textAlign: 'center',
  },
  infoText: { 
    color: 'rgba(255, 255, 255, 0.7)', 
    fontSize: 14, 
    textAlign: 'center', 
    fontStyle: 'italic', 
    marginBottom: 25,
    paddingHorizontal: 0,
    maxWidth: '100%',
  },
  doneButtonContainer: {
    width: '100%',
    paddingHorizontal: 20, 
    marginBottom: 10,
  },
  doneButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  doneButtonText: {
    color: '#4B1E7C',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emojiAvatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiAvatarText: {
    fontSize: 40,
    textAlign: 'center',
  },
});

export default IntentionAddedConfirmationScreenCore; 