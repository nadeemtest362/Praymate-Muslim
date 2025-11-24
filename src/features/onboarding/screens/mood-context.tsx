import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, Alert,
  ScrollView, TouchableWithoutFeedback, Keyboard
} from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '../../../stores/onboardingStore';
import { OnboardingFlowContext } from '../../../contexts/OnboardingFlowContext';
import Animated, { FadeIn } from 'react-native-reanimated';

import * as Haptics from 'expo-haptics';

import { StatusBar } from 'expo-status-bar';
import OnboardingGradientBackground from '../../../components/shared/OnboardingGradientBackground';
import useResponsive from '../../../hooks/useResponsive';
import { Button } from '../../../shared/ui';

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141941',
  },
  innerContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    paddingHorizontal: R.w(7.5),
    flexGrow: 1,
    backgroundColor: 'transparent',
  },
  inputContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: R.w(3.5),
    padding: R.w(3.5),
    marginTop: R.h(2),
    marginBottom: R.h(2),
  },
  textInput: {
    color: '#FFFFFF',
    fontSize: R.font(16),
    minHeight: R.h(8), 
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: R.font(12),
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'right',
    marginTop: R.h(0.7),
  },

  madlibContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: R.h(4),
    marginBottom: R.h(3),
    paddingHorizontal: R.w(2),
    flexWrap: 'wrap',
    width: '100%',
  },
  madlibText: {
    fontSize: R.font(26),
    fontFamily: 'SNPro-Heavy',
    color: '#FFFFFF',
    marginHorizontal: R.w(0.7),
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    textAlign: 'center',
    lineHeight: R.lineHeight(32),
  },
  madlibPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 9999,
    paddingHorizontal: R.w(1.8),
    paddingVertical: R.h(0.7),
    marginVertical: R.h(0.3),
    marginHorizontal: R.w(0.3),
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
  },
      android: {
        elevation: 6,
      },
    }),
  },
  pillEmoji: {
    fontSize: R.font(17),
    marginRight: R.w(0.8),
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: R.font(17),
    fontFamily: 'SNPro-Heavy',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  buttonContainer: {
    width: '100%',
    marginTop: R.h(4), // Space above button
  },
  skipButtonContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: R.h(1), // Slightly more space
  },
  skipButton: {
    paddingVertical: R.h(1.2), // ~10px
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: R.font(14),
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    textDecorationLine: 'underline',
  },
});


const MAX_CONTEXT_LENGTH = 180;

// Define props for MoodContextScreen, expecting config and onNext from the host
interface MoodContextScreenProps {
  config: { // Assuming a config structure, adjust if different from MoodContextScreenConfig.json
    titleTemplate: {
      part1: string;
      part2: string;
      moodLabelPlaceholder: string;
    };
    inputField: {
      placeholder: string;
      maxLength: number;
      charCountFormat: string;
    };
    continueButton: {
      text: string;
      action: string; // e.g., SAVE_MOOD_CONTEXT_AND_NAVIGATE
      navigateTo: string;
    };
    skipButton: {
      text: string;
      action: string; // e.g., SKIP_MOOD_CONTEXT_AND_NAVIGATE
      navigateTo: string;
    };
    errorMessages?: {
        missingMoodInfo?: string;
    }
    // tracking etc.
  };
  onNext: () => void;
  onBack?: () => void;
}

function MoodContextScreenCore({ config, onNext, onBack }: MoodContextScreenProps) {
  const router = useRouter();
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);
  
  // Get onboarding flow context actions
  const flowContext = React.useContext(OnboardingFlowContext);
  const saveMoodAndContextToProfile = flowContext?.saveMoodAndContextToProfile;
  
  // Add defensive check
  if (!saveMoodAndContextToProfile) {
    console.error('[MoodContext] saveMoodAndContextToProfile is not available in context');
  }

  // Get store actions and state reactively
  const initialMoodContext = useOnboardingStore((state) => state.moodContext);
  const tempNavParams = useOnboardingStore((state) => state.tempNavParams);
  const clearTempNavParams = useOnboardingStore((state) => state.setTempNavParams);
  
  // Local state for mood details
  const [moodId, setMoodId] = useState<string | null>(null);
  const [moodEmoji, setMoodEmoji] = useState<string | null>(null);
  const [moodLabel, setMoodLabel] = useState<string | null>(null);

  const [contextInput, setContextInput] = useState(initialMoodContext || '');
  const inputRef = useRef<TextInput>(null);
  const [isInitialized, setIsInitialized] = useState(false); // Tracks if initial param processing has occurred
  const [isSaving, setIsSaving] = useState(false);
  
  // Memoize handleGoBack to stabilize its reference for the useEffect dependency array
  const handleGoBack = useCallback(() => {
    if (onBack) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onBack();
    } else {
      console.warn("[MoodContextScreen] onBack prop not available, using router.back() as fallback.");
      router.back(); // Fallback, might cause unmount of host
    }
  }, [onBack, router]);

  useEffect(() => {
    // Process tempNavParams when they become available and haven't been processed yet
    if (tempNavParams && !isInitialized) {
      console.log('[MoodContextScreen] Initializing with tempNavParams from store:', tempNavParams);
      setMoodId(tempNavParams.id as string || null);
      setMoodEmoji(tempNavParams.emoji as string || null);
      setMoodLabel(tempNavParams.label as string || config.titleTemplate?.moodLabelPlaceholder || 'this way');
      clearTempNavParams(null); // Clear after processing to prevent re-initialization on remounts with old params
      setIsInitialized(true); // Mark as initialized
      
      // Focus the input field after initialization
      setTimeout(() => {
        inputRef.current?.focus();
      }, 500); // Delay to ensure animations have started
    } else if (!tempNavParams && !isInitialized) {
      // Params haven't arrived yet, and we haven't initialized. Do nothing and wait.
      console.log('[MoodContextScreen] Waiting for tempNavParams...');
    }
  }, [tempNavParams, isInitialized, clearTempNavParams, config.titleTemplate?.moodLabelPlaceholder]);


  useEffect(() => {
    // This effect handles showing an alert IF moodId is confirmed to be null AFTER initialization
    // and the component believes it should have received params.
    if (isInitialized && moodId === null) {
      console.error('[MoodContextScreen] CRITICAL: moodId is null after initialization. Displaying error alert.');
      Alert.alert(
        config.errorMessages?.missingMoodInfo || "Error: Missing mood information", 
        "Please go back and select a mood.", 
        [{ text: "Go Back", onPress: handleGoBack }]
      );
    }
  }, [isInitialized, moodId, config.errorMessages?.missingMoodInfo, handleGoBack]);

  const handleSkip = async () => {
    if (!moodId || !moodEmoji) {
      Alert.alert("Error", config.errorMessages?.missingMoodInfo || "Missing mood information.", [{ text: "Go Back", onPress: handleGoBack }]);
      return;
    }
    
    setIsSaving(true);
    // Save mood with empty context to profile
    let result: { success: boolean; error?: string };
    try {
      result = saveMoodAndContextToProfile 
        ? await saveMoodAndContextToProfile(moodId, moodEmoji, '') 
        : { success: false, error: 'Context not available' };
    } catch (error) {
      console.error('[MoodContext] Error calling saveMoodAndContextToProfile:', error);
      result = { success: false, error: 'Failed to save mood' };
    }
    setIsSaving(false);

    if (result && result.success) {
      // Client-side stores are updated by saveMoodAndContextToProfile, but ensure moodId|emoji format is right for old store logic if needed
      // useOnboardingStore.getState().setMood(`${moodId}|${moodEmoji}`); // This is now done in the context function
      // useOnboardingStore.getState().setMoodContext('');
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onNext(); 
    } else {
      Alert.alert("Save Failed", result?.error || "Could not save your mood. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleContinue = async () => {
    if (!moodId || !moodEmoji) {
      Alert.alert("Error", config.errorMessages?.missingMoodInfo || "Missing mood information.", [{ text: "Go Back", onPress: handleGoBack }]);
      return;
    }
    
    setIsSaving(true);
    // Save mood and actual context to profile
    let result: { success: boolean; error?: string };
    try {
      result = saveMoodAndContextToProfile
        ? await saveMoodAndContextToProfile(moodId, moodEmoji, contextInput.trim())
        : { success: false, error: 'Context not available' };
    } catch (error) {
      console.error('[MoodContext] Error calling saveMoodAndContextToProfile:', error);
      result = { success: false, error: 'Failed to save mood and context' };
    }
    setIsSaving(false);

    if (result && result.success) {
      // Client-side stores are updated by saveMoodAndContextToProfile
      // useOnboardingStore.getState().setMood(`${moodId}|${moodEmoji}`); // Done in context function
      // useOnboardingStore.getState().setMoodContext(contextInput.trim());
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onNext();
    } else {
      Alert.alert("Save Failed", result?.error || "Could not save your mood and context. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const charsRemaining = (config.inputField?.maxLength || MAX_CONTEXT_LENGTH) - contextInput.length;
  const titlePart1 = config.titleTemplate?.part1 || "what's bringing you to feel";
  const titlePart2 = config.titleTemplate?.part2 || "this way?";
  const displayedMoodLabel = moodLabel || config.titleTemplate?.moodLabelPlaceholder || "this way";
  const currentMoodEmoji = moodEmoji || '🤔'; // Ensure we have a fallback for the emoji display

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <OnboardingGradientBackground />
      
    <KeyboardAvoidingView 
        style={StyleSheet.absoluteFillObject}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.innerContainer}>

          <ScrollView
            style={styles.content}
            contentContainerStyle={[
              styles.contentContainer,
              {
                paddingTop: R.insets.top + R.h(2),
                paddingBottom: R.insets.bottom + R.h(20)
              }
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View 
              entering={FadeIn.duration(600)}
              style={styles.madlibContainer} 
            >
              <Text 
                style={styles.madlibText}
                adjustsFontSizeToFit
                numberOfLines={1}
                minimumFontScale={0.7}
              >
                {titlePart1}
              </Text>
              <TouchableOpacity 
                style={styles.madlibPill} 
                onPress={onBack ? handleGoBack : undefined}
                activeOpacity={onBack ? 0.7 : 1}
                disabled={!onBack}
              >
                <Text style={styles.pillEmoji}>{currentMoodEmoji}</Text>
                <Text style={styles.pillText}>{displayedMoodLabel}</Text>
                </TouchableOpacity>
              <Text 
                style={styles.madlibText}
                adjustsFontSizeToFit
                numberOfLines={1}
                minimumFontScale={0.7}
              >
                {titlePart2}
              </Text>
            </Animated.View>
            
            <Animated.View
              entering={FadeIn.delay(200).duration(600)}
              style={styles.inputContainer}
            >
              <TextInput
                ref={inputRef}
                style={styles.textInput}
                value={contextInput}
                onChangeText={setContextInput}
                placeholder={config.inputField?.placeholder || "Share what's on your heart..."}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                multiline
                maxLength={config.inputField?.maxLength || MAX_CONTEXT_LENGTH}
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={handleContinue}
              />
              <Text style={styles.charCount}>{config.inputField?.charCountFormat?.replace("{remaining}", charsRemaining.toString()) || charsRemaining}</Text>
            </Animated.View>

          <Animated.View 
              entering={FadeIn.delay(400).duration(600)} 
            style={styles.buttonContainer}
          >
            <Button
              onPress={handleContinue}
              variant="primary"
              fullWidth
              disabled={isSaving}
              loading={isSaving}
            >
              {config.continueButton?.text || "Continue"}
            </Button>
          </Animated.View>

          <Animated.View 
              entering={FadeIn.delay(500).duration(600)} 
            style={styles.skipButtonContainer} 
          > 
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton} disabled={isSaving}>
              <Text style={styles.skipButtonText}>{config.skipButton?.text || "Skip for now"}</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
    </View>
  );
}


// Export directly without error boundary
export default MoodContextScreenCore; 