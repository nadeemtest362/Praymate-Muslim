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
  FadeIn
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

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
    marginBottom: R.h(2.5),
    paddingTop: R.h(4.5),   
    width: '100%',    
  },
  questionText: { 
    fontSize: R.font(30),
    fontFamily: 'SNPro-Heavy',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: R.font(36),
    letterSpacing: -0.5,
    paddingHorizontal: R.w(1),
   
  },
  optionWrapper: {
    width: '100%',
  },
});


interface OptionConfig {
  id: string;
  text: string;
  emoji?: string;
  action: string;
  responseValue: string;
  // navigateTo is handled by the host
}

interface GeneralQuestionScreenConfig {
  question: string;
  options: OptionConfig[];
  tracking?: {
    screenViewEvent?: string;
    optionSelectedEventPrefix?: string;
  };
}

interface GeneralQuestionScreenProps {
  config: GeneralQuestionScreenConfig;
  onNext: (selectedOptionData?: { optionId: string; responseValue: string }) => void;
  logSduiEvent?: (eventName: string, eventData?: Record<string, any>) => void;
}

function GeneralQuestionScreenCore({
  config,
  onNext,
  logSduiEvent
}: GeneralQuestionScreenProps) {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);
  const optionStyles = useMemo(() => createOnboardingOptionStyles(R), [R]);
  const flowContext = React.useContext(OnboardingFlowContext);
  const currentFlow = flowContext?.currentFlow;
  const currentStepIndex = flowContext?.currentStepIndex ?? -1;
  const currentStep = currentFlow && currentStepIndex >= 0 ? currentFlow.steps[currentStepIndex] : undefined;
  const logEvent = flowContext?.logEvent;
  
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  const handleSelectOption = async (option: OptionConfig) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedOptionId(option.id); // For visual feedback if any
    
    // Log the selection event - single event call
    if (config.tracking?.optionSelectedEventPrefix && logSduiEvent) {
      logSduiEvent(`${config.tracking.optionSelectedEventPrefix}${option.id}`, { 
        response: option.responseValue,
        option_id: option.id,
        option_value: option.responseValue,
      });
    }

    // Proceed to the next step, passing necessary data for the host to handle
    // The host will use its own navigation logic based on the step's overall config
    onNext({ optionId: option.id, responseValue: option.responseValue });
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
            paddingTop: R.insets.top,
            paddingBottom: R.insets.bottom + R.h(2.5),
            paddingLeft: R.insets.left + R.w(5),
            paddingRight: R.insets.right + R.w(5)
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
          <Animated.Text
            style={styles.questionText}
          >
            {config.question}
          </Animated.Text>
        </Animated.View>

        <View style={optionStyles.optionsContainer}>
          {config.options.map((option) => (
            <Animated.View
              key={option.id}
              entering={FadeIn.duration(450)}
              style={styles.optionWrapper}
            >
              <TouchableOpacity
                style={[
                  optionStyles.option,
                  selectedOptionId === option.id && optionStyles.selectedOption
                ]}
                onPress={() => handleSelectOption(option)}
                activeOpacity={0.8}
              >
                {option.emoji && <Text style={optionStyles.optionEmoji}>{option.emoji}</Text>}
                <Text style={[
                  optionStyles.optionText,
                  selectedOptionId === option.id && optionStyles.selectedOptionText
                ]}>{option.text}</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// Responsive styles function


// Export directly without error boundary
export default GeneralQuestionScreenCore; 