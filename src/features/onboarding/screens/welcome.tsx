import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useOnboardingStore, InitialMotivation } from '../../../stores/onboardingStore';
import OnboardingGradientBackground from '../../../components/shared/OnboardingGradientBackground';
import useResponsive from '../../../hooks/useResponsive';
import { createOnboardingOptionStyles } from '../../../constants/onboardingStyles';
import { OnboardingFlowContext } from '../../../contexts/OnboardingFlowContext';


const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    alignItems: 'center',
  },
  questionScreenContainer: {
    alignItems: 'center',
    marginBottom: R.h(3.5),
    paddingTop: R.h(1),   
    width: '100%',   
    paddingHorizontal: R.w(2.5),
  },
  questionText: { 
    fontSize: R.font(30),
    fontFamily: 'SNPro-Heavy',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: R.font(42),
    letterSpacing: -1,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  inlineLogoText: {
    fontSize: R.font(32),
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -1,
    fontFamily: 'SNPro-Heavy',
  },
  inlineLogoAccent: {
    fontSize: R.font(32),
    fontWeight: '800',
    color: '#7DD3FC',
    letterSpacing: -1,
   
  },
  inlineLogoWrapper: {
    letterSpacing: -1,
  },
  inlineLogoEmoji: {
    fontSize: R.font(28),
    marginLeft: R.w(0.6),
    marginRight: R.w(1),
  },
  optionWrapper: {
    width: '100%',
  },
});

// Types for compatibility with existing config
interface QuestionOptionConfig {
  id: string;
  text: string;
  emoji?: string;
  responseValue?: any;
}

interface WelcomeScreenConfig {
  logoScreen?: any; // Not used in simplified version
  verseScreen?: any; // Not used in simplified version
  questionScreen: {
    greeting?: string; // Not used but kept for compatibility
    question: string;
    options: QuestionOptionConfig[];
  };
  timers?: any; // Not used in simplified version
  tracking?: {
    screenViewEvent?: string;
    optionSelectedEventPrefix?: string;
  };
}

interface WelcomeScreenProps {
  config: WelcomeScreenConfig;
  onNext: () => void;
  logSduiEvent?: (eventName: string, eventData?: Record<string, any>) => void;
}

function WelcomeScreenCore({ config, onNext, logSduiEvent }: WelcomeScreenProps) {
  // All hooks at the top level - no conditional calls
  const R = useResponsive();
  const insets = useSafeAreaInsets();
  const setInitialMotivation = useOnboardingStore((state: any) => state.setInitialMotivation);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const flowContext = React.useContext(OnboardingFlowContext);
  const currentFlow = flowContext?.currentFlow;
  const currentStepIndex = flowContext?.currentStepIndex ?? -1;
  const currentStep = currentFlow && currentStepIndex >= 0 ? currentFlow.steps[currentStepIndex] : undefined;
  const logEvent = flowContext?.logEvent;
  
  // Generate responsive styles
  const styles = useMemo(() => createStyles(R), [R]);
  const optionStyles = useMemo(() => createOnboardingOptionStyles(R), [R]);
  
  // Check if config has expected structure after hooks
  if (!config?.questionScreen) {
    console.error('[WelcomeScreen] Config questionScreen is missing!');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'white', fontSize: 18 }}>Configuration not loaded</Text>
      </View>
    );
  }

  // Render question text with APP_LOGO replacement
  const renderQuestionText = () => {
    const question = config.questionScreen.question;

    if (!question.includes('{APP_LOGO}')) {
      return <Text style={styles.questionText}>{question}</Text>;
    }

    const parts = question.split('{APP_LOGO}');

    return (
      <Text style={styles.questionText}>
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            {part}
            {index < parts.length - 1 && (
              <Text style={styles.inlineLogoWrapper}>
                <Text style={styles.inlineLogoText}>pray</Text>
                <Text style={styles.inlineLogoAccent}>mate</Text>
                <Text style={styles.inlineLogoEmoji}>🙏 </Text>
              </Text>
            )}
          </React.Fragment>
        ))}
      </Text>
    );
  };

  const handleSelectOption = async (option: QuestionOptionConfig) => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Visual feedback
    setSelectedOptionId(option.id);
    
    // Log the selection event - single event call
    if (config.tracking?.optionSelectedEventPrefix && logSduiEvent) {
      logSduiEvent(`${config.tracking.optionSelectedEventPrefix}${option.id}`, { 
        response: option.responseValue || option.id,
        option_id: option.id,
        option_value: option.responseValue || option.id,
      });
    }
    
    // CRITICAL: Save the motivation choice to store
    setInitialMotivation(option.id as InitialMotivation);
    
    // Navigate to next step
    onNext();
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background gradient */}
      <OnboardingGradientBackground />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingTop: insets.top + R.h(1),
            paddingBottom: insets.bottom + R.h(2.5),
            paddingLeft: insets.left + R.w(5),
            paddingRight: insets.right + R.w(5)
          }
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View 
          style={styles.questionScreenContainer}
          entering={FadeIn.duration(600)}
        >
          {/* Main Question */}
          {renderQuestionText()}
        </Animated.View>

        <View style={optionStyles.optionsContainer}>
          {config.questionScreen.options.map((option, index) => (
            <Animated.View
              key={option.id}
              entering={FadeInDown.delay(200 + index * 100).duration(500)}
              style={styles.optionWrapper}
            >
              <TouchableOpacity
                style={[
                  optionStyles.option,
                  selectedOptionId === option.id && optionStyles.selectedOption
                ]}
                onPress={() => handleSelectOption(option)}
                activeOpacity={0.8}
                disabled={!!selectedOptionId}
              >
                {option.emoji && <Text style={optionStyles.optionEmoji}>{option.emoji}</Text>}
                <Text
                  style={[
                    optionStyles.optionText,
                    selectedOptionId === option.id && optionStyles.selectedOptionText
                  ]}
                >
                  {option.text}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

export default WelcomeScreenCore;
