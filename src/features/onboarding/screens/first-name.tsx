import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, Keyboard,
  TouchableWithoutFeedback,
  Alert,
  ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
// Removed: import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useOnboardingStore } from '../../../stores/onboardingStore';
import OnboardingGradientBackground from '../../../components/shared/OnboardingGradientBackground';

import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withTiming, withSpring, withDelay } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import useResponsive from '../../../hooks/useResponsive';

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoContainer: {
    position: 'absolute',
    top: R.h(7),
    alignSelf: 'center',
  },
  logoWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoText: {
    fontSize: R.font(24),
    fontFamily: 'SNPro-heavy',
    color: '#FFFFFF',

    textTransform: 'lowercase',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  logoAccent: {
    fontSize: R.font(24),
    fontFamily: 'SNPro-heavy',
    color: '#7DD3FC',
    marginLeft: 0,

    textTransform: 'lowercase',
    textShadowColor: 'rgba(125, 211, 252, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  titleText: {
    fontSize: R.font(36),
    fontFamily: 'SNPro-Black',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: R.font(42),
    marginTop: R.h(16.5),
    marginBottom: R.h(4),
    letterSpacing: -1,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  inputContainer: {
    width: '100%',
    paddingHorizontal: R.w(2.5),
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    color: '#FFFFFF',
    fontSize: R.font(24),
    fontWeight: '500',
    paddingVertical: R.h(2.2),
    paddingHorizontal: R.w(6),
    borderRadius: R.w(4),
    textAlign: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  spacer: {
    flex: 1,
  },
  button: {
    backgroundColor: '#FFFFFF',
    paddingVertical: R.h(2.2),
    borderRadius: R.w(7.5),
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    marginTop: R.h(3),
    marginBottom: R.h(1.2),
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: R.font(20),
    fontWeight: '600',
    color: '#1A1B4B',
    textAlign: 'center',
    textTransform: 'lowercase',
  },
  // New Styles for Acknowledgement Message
  acknowledgementContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: R.w(5),
  },
  emojiText: {
    fontSize: R.font(48),
    marginBottom: R.h(2.5),
  },
  acknowledgementTextPrimary: {
    fontSize: R.font(42),
    fontFamily: 'SNPro-Heavy',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: R.h(3.5),
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 5,
    letterSpacing: -0.5,
  },
  acknowledgementTextSecondary: {
    fontSize: R.font(24),
    fontFamily: 'SNPro-SemiBold',
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    lineHeight: R.font(32),
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});


// Config types based on FirstNameScreenConfig.json
interface LogoConfig {
  text: string;
  accent: string;
  emoji: string;
}
interface InputFieldConfig {
  placeholder: string;
  maxLength: number;
  autoCapitalize: "none" | "sentences" | "words" | "characters";
  autoCorrect: boolean;
  returnKeyType: "done" | "go" | "next" | "search" | "send";
  autoFocus?: boolean;
  validation: {
    requiredMessage: string;
  };
}
interface ActionButtonConfig {
  text: string;
  action: string; // e.g., "SAVE_FIRST_NAME_AND_NAVIGATE"
  successMessage?: string; // Optional: for client-side toast after successful save if needed
  errorMessage: string;
  // navigateToOnSuccess is handled by the host via onNext
}
interface FirstNameScreenConfig {
  logo?: LogoConfig;
  title: string;
  inputField: InputFieldConfig;
  actionButton: ActionButtonConfig;
  tracking?: {
    screenViewEvent?: string;
    // saveSuccessEvent and saveFailureEvent will be logged by the host based on onSaveFirstName result
  };
}

interface FirstNameScreenProps {
  config: FirstNameScreenConfig;
  onSaveFirstName: (name: string) => Promise<{ success: boolean; error?: any }>;
  onNext: () => void;
  // logSduiEvent: (eventName: string, eventData?: Record<string, any>) => void;
}

// Simple Logo Component (can be shared if structure is consistent)
const LogoComponent = ({ config, styles }: { config?: LogoConfig; styles: any }) => {
    if (!config) return null;
    return (
  <View style={styles.logoWrapper}>
        <Text style={styles.logoText}>{config.text}</Text>
        <Text style={styles.logoAccent}>{config.accent}{config.emoji}</Text>
  </View>
);
};

function FirstNameScreenCore({ config, onSaveFirstName, onNext }: FirstNameScreenProps) {

  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);
  

  const [localFirstName, setLocalFirstName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAcknowledgement, setShowAcknowledgement] = useState(false);
  const [acknowledgedName, setAcknowledgedName] = useState('');
  const inputRef = useRef<TextInput>(null);
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (config.inputField.autoFocus === true || config.inputField.autoFocus === undefined) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [config.inputField.autoFocus]);

  const handleContinue = async () => {
    const trimmedName = localFirstName.trim();
    if (!trimmedName) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(config.inputField.validation.requiredMessage || 'Please enter your first name.');
      return;
    }

    setIsLoading(true);
    Keyboard.dismiss();

    try {
      const result = await onSaveFirstName(trimmedName);
      if (result && result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setAcknowledgedName(trimmedName); // Store the name for the message
        setShowAcknowledgement(true); // Show the acknowledgement message
        
        // Animate the welcome message
        opacity.value = withTiming(1, { duration: 500 });
        scale.value = withDelay(200, withSpring(1.1, { damping: 12 }));
        
        // Stronger haptic feedback to "feel it"
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, 600);
        
        // Proceed to next screen after a delay
        setTimeout(() => {
          onNext(); 
        }, 3500); // Increased delay to let user feel the moment

      } else {
        throw new Error(result?.error || config.actionButton.errorMessage || 'Failed to save name');
      }
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', err.message || config.actionButton.errorMessage || 'Could not save your name.');
      console.error('Save first name error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const animatedTextStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value
    };
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background gradient */}
      <OnboardingGradientBackground />
      
      {/* Subtle overlay for depth */}
      <LinearGradient
        colors={['rgba(139, 69, 19, 0.1)', 'transparent', 'rgba(30, 144, 255, 0.1)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={[
            styles.contentContainer,
            { 
              paddingTop: R.insets.top + R.h(7), 
              paddingBottom: R.insets.bottom + R.h(2.5), 
              paddingLeft: R.insets.left + R.w(5), 
              paddingRight: R.insets.right + R.w(5) 
            }
          ]}>
            {!showAcknowledgement ? (
              <>
            

                <Animated.Text
                  entering={FadeIn.delay(300).duration(600)}
                  style={styles.titleText}
                >
                  {config.title}
                </Animated.Text>

                <Animated.View
                  entering={FadeIn.delay(600).duration(800)}
                  style={styles.inputContainer}
                >
                  <TextInput
                    ref={inputRef}
                    style={styles.input}
                    placeholder={config.inputField.placeholder}
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={localFirstName}
                    onChangeText={setLocalFirstName}
                    autoCapitalize={config.inputField.autoCapitalize}
                    autoCorrect={config.inputField.autoCorrect}
                    returnKeyType={config.inputField.returnKeyType}
                    onSubmitEditing={isLoading ? undefined : handleContinue} // Prevent submit while loading/showing ack
                    maxLength={config.inputField.maxLength}
                    editable={!isLoading} // Prevent editing while loading/showing ack
                    autoFocus={config.inputField.autoFocus === true || config.inputField.autoFocus === undefined}
                  />
                </Animated.View>

                <View style={styles.spacer} />

                <TouchableOpacity
                  style={[styles.button, (!localFirstName.trim() || isLoading) && styles.buttonDisabled]}
                  onPress={handleContinue}
                  disabled={!localFirstName.trim() || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#1A1B4B" />
                  ) : (
                    <Text style={styles.buttonText}>{config.actionButton.text}</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.acknowledgementContainer}>
                <Animated.Text 
                  style={styles.emojiText}
                  entering={FadeIn.duration(600)}
                >
                  👋
                </Animated.Text>
                <Animated.Text 
                  style={[styles.acknowledgementTextPrimary, animatedTextStyle]}
                >
                  It's great to meet you, {acknowledgedName}!
                </Animated.Text>
                <Animated.Text 
                  entering={FadeIn.duration(1000).delay(1200)}
                  style={styles.acknowledgementTextSecondary}
                >
                  Let's begin your personal prayer journey
                </Animated.Text>
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

// Responsive styles function


// Export directly without error boundary
export default FirstNameScreenCore; 