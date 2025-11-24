import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  TextInput,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import { signUpWithMigration } from '../../lib/auth';
import { useAuth } from '../../hooks/useAuth';
import { useAppleSignIn } from '../../hooks/useAppleSignIn';
import { queryKeys } from '../../lib/queryClient';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.45; // Increased to fit content on SE
const SHEET_HEIGHT_WITH_KEYBOARD = SCREEN_HEIGHT * 0.85; // Always use 85% for email input

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface SignUpBottomSheetProps {
  isVisible: boolean;
  onSignUpComplete: () => void;
  onEmailPress: () => void;
}

const SignUpBottomSheet: React.FC<SignUpBottomSheetProps> = ({
  isVisible,
  onSignUpComplete,
  onEmailPress,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SHEET_HEIGHT);
  const [error, setError] = React.useState<string | null>(null);
  const [showEmailInput, setShowEmailInput] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [isEmailLoading, setIsEmailLoading] = React.useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Use the shared Apple Sign In hook
  const { handleAppleSignIn, isAppleLoading, isAppleAuthAvailable } = useAppleSignIn({
    onError: (error) => setError(error),
    onSuccess: (isNewUser) => {
      console.log('[SignUpBottomSheet] Apple Sign In successful', { isNewUser });
      // Force a profile refresh to ensure latest data
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.profile(user.id) });
      }
      
      // Success! Call the parent's handler
      // The app's routing logic will handle redirecting to onboarding or homepage
      // based on the user's profile.has_completed_onboarding status
      onSignUpComplete();
    }
  });

  const scrollTo = useCallback((destination: number) => {
    'worklet';
    translateY.value = withSpring(destination, {
      damping: 45,
      stiffness: 350,
      overshootClamping: true,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 0.01,
    });
  }, [translateY]);

  useEffect(() => {
    if (isVisible) {
      scrollTo(0);
    } else {
      scrollTo(SHEET_HEIGHT);
    }
  }, [isVisible, scrollTo]);


  const emailInputRef = useRef<TextInput>(null);
  const sheetHeight = useSharedValue(SHEET_HEIGHT);

  // Handle keyboard show/hide
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        if (showEmailInput) {
          sheetHeight.value = withSpring(SHEET_HEIGHT_WITH_KEYBOARD, {
            damping: 45,
            stiffness: 350,
          });
        }
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        sheetHeight.value = withSpring(SHEET_HEIGHT, {
          damping: 45,
          stiffness: 350,
        });
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [showEmailInput, sheetHeight]);

  // Handle email form display
  const handleEmailPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowEmailInput(true);
    setError(null);
    // Expand sheet for email input
    sheetHeight.value = withSpring(SHEET_HEIGHT_WITH_KEYBOARD, {
      damping: 45,
      stiffness: 350,
    });
    // Focus input after animation
    setTimeout(() => {
      emailInputRef.current?.focus();
    }, 300);
  };

  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    setShowEmailInput(false);
    setEmail('');
    setError(null);
    // Shrink sheet back
    sheetHeight.value = withSpring(SHEET_HEIGHT, {
      damping: 45,
      stiffness: 350,
    });
  };

  // Generate a secure random password
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Handle email signup
  const handleEmailSignUp = async () => {
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsEmailLoading(true);
      setError(null);

      // Save the current anonymous user ID before signing up
      const previousUserId = user?.id;

      // Generate a random password for the user
      const tempPassword = generatePassword();

      // Create the account with data migration
      const { error: signUpError } = await signUpWithMigration(email, tempPassword, previousUserId);

      if (signUpError) {
        // Check if user already exists
        if (signUpError.message?.includes('already registered')) {
          setError('This email is already registered. Please sign in instead.');
        } else {
          setError(signUpError.message || 'Unable to create account. Please try again.');
        }
        return;
      }

      // Wait for auth state to fully update before completing
      // This ensures the benefits screen sees the correct user
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Force a profile refresh to ensure latest data
      if (user?.id) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.profile(user.id) });
      }
      
      // Success! Haptic feedback and complete
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSignUpComplete();
    } catch (error: any) {
      console.error('Email sign up error:', error);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsEmailLoading(false);
    }
  };


  const animatedSheetStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      height: sheetHeight.value,
    };
  });

  const animatedBackdropStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [0, SHEET_HEIGHT],
      [0.7, 0],
      Extrapolate.CLAMP
    );
    return {
      opacity: withTiming(opacity, { duration: 300 }),
    };
  });

  if (!isVisible) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Non-dismissible backdrop */}
      <Animated.View style={[styles.backdrop, animatedBackdropStyle]} />

      {/* Sheet */}
      <Animated.View style={[styles.sheetContainer, animatedSheetStyle]}>
        <LinearGradient
            colors={['#2D1854', '#1B1740', '#0F0A2C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.content, { paddingBottom: insets.bottom + 60 }]}
          >
            {/* Subtle top edge glow */}
            <View style={styles.topGlow} />
            
            {/* Main Content - Initial State */}
            {!showEmailInput ? (
              <Animated.View 
                entering={FadeIn.duration(200)}
                exiting={SlideOutLeft.duration(200)}
                style={styles.mainContent}
              >
                <Text style={styles.title}>Create Your Account</Text>
                <Text style={styles.subtitle}>
                  Sign up to save your prayers and continue your spiritual journey
                </Text>
                
                {error && (
                  <Animated.View 
                    entering={FadeIn.duration(200)}
                    style={styles.errorContainer}
                  >
                    <Text style={styles.errorText}>{error}</Text>
                  </Animated.View>
                )}
                
                {/* Apple Sign In Button */}
                {Platform.OS === 'ios' && (isAppleAuthAvailable || __DEV__) && (
                  <TouchableOpacity
                    style={styles.appleButton}
                    onPress={handleAppleSignIn}
                    disabled={isAppleLoading}
                    activeOpacity={0.8}
                  >
                    {isAppleLoading ? (
                      <ActivityIndicator color="#000000" />
                    ) : (
                      <>
                        <Ionicons name="logo-apple" size={20} color="#000000" />
                        <Text style={styles.appleButtonText}>
                          Continue with Apple
                          {__DEV__ && !isAppleAuthAvailable && ' (Dev Mode)'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
                
                {/* Email Sign Up Link */}
                <TouchableOpacity
                  style={styles.emailLinkContainer}
                  onPress={handleEmailPress}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emailLinkText}>Continue with email</Text>
                </TouchableOpacity>
                
                {/* Terms Text */}
                <Text style={styles.termsText}>
                  By continuing, you agree to our Terms and acknowledge our Privacy Policy
                </Text>
              </Animated.View>
            ) : (
              /* Email Input State */
              <Animated.View 
                entering={SlideInRight.duration(200)}
                exiting={FadeOut.duration(200)}
                style={styles.mainContent}
              >
                {/* Back Button */}
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleBackPress}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={24} color="rgba(255, 255, 255, 0.8)" />
                </TouchableOpacity>

                <Text style={styles.emailTitle}>What's your email?</Text>
                <Text style={styles.emailSubtitle}>
                  We'll create your account instantly
                </Text>

                {/* Email Input Container */}
                <View style={styles.inputContainer}>
                  <AnimatedTextInput
                    ref={emailInputRef}
                    entering={FadeIn.delay(100).duration(300)}
                    style={styles.emailInput}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleEmailSignUp}
                    editable={!isEmailLoading}
                    blurOnSubmit={false}
                  />
                  <Animated.View 
                    style={[styles.inputUnderline, email && styles.inputUnderlineActive]}
                    entering={FadeIn.delay(150).duration(300)}
                  />
                </View>

                {error && (
                  <Animated.View 
                    entering={FadeIn.duration(200)}
                    style={styles.errorContainer}
                  >
                    <Text style={styles.errorText}>{error}</Text>
                  </Animated.View>
                )}

                {/* Continue Button */}
                <TouchableOpacity
                  style={[styles.continueButton, (!email || isEmailLoading) && styles.continueButtonDisabled]}
                  onPress={handleEmailSignUp}
                  disabled={!email || isEmailLoading}
                  activeOpacity={0.8}
                >
                  {isEmailLoading ? (
                    <ActivityIndicator color="#2D1854" />
                  ) : (
                    <Text style={styles.continueButtonText}>Continue</Text>
                  )}
                </TouchableOpacity>

                {/* Helper Text */}
                <Text style={styles.helperText}>
                  No password needed - we'll email you if you need to sign in again
                </Text>
              </Animated.View>
            )}
          </LinearGradient>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOpacity: 0.40,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20, // Adjusted since we removed the handle
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 24, // Reduced from 32
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.2)',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  appleButton: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    gap: 8,
    marginBottom: 16,
  },
  appleButtonText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '600',
  },
  emailLinkContainer: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  emailLinkText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  termsText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 16, // Reduced from 24
    paddingHorizontal: 40,
    lineHeight: 16,
  },
  topGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  // Email input specific styles
  backButton: {
    position: 'absolute',
    top: 16,
    left: 24,
    zIndex: 10,
    padding: 8,
  },
  emailTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  emailSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  emailInput: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 4,
    textAlign: 'center',
  },
  inputUnderline: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1,
  },
  inputUnderlineActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  continueButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    color: '#2D1854',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  helperText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
    marginBottom: 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
});

export default SignUpBottomSheet;