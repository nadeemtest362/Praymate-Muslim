import React, { useState, useEffect } from 'react';
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

import OnboardingGradientBackground from '../../../components/shared/OnboardingGradientBackground';
import { OnboardingFlowContext } from '../../../contexts/OnboardingFlowContext';
import { Button } from '../../../shared/ui';

interface OptionConfig {
  id: string;
  text: string;
  emoji?: string;
  action: string;
  responseValue: string;
  // navigateTo is handled by the host
}

interface FaithTraditionScreenConfig {
  question: string;
  subtitle?: string;
  options: OptionConfig[];
  tracking?: {
    screenViewEvent?: string;
    optionSelectedEventPrefix?: string;
  };
}

interface FaithTraditionScreenProps {
  config: FaithTraditionScreenConfig;
  onNext: (selectedOptionData?: { optionId: string; responseValue: string }) => void;
  logSduiEvent?: (eventName: string, eventData?: Record<string, any>) => void;
}

function FaithTraditionScreenCore({
  config,
  onNext,
  logSduiEvent
}: FaithTraditionScreenProps) {
  const insets = useSafeAreaInsets();
  const flowContext = React.useContext(OnboardingFlowContext);
  const currentFlow = flowContext?.currentFlow;
  const currentStepIndex = flowContext?.currentStepIndex ?? -1;
  const currentStep = currentFlow && currentStepIndex >= 0 ? currentFlow.steps[currentStepIndex] : undefined;
  const logEvent = flowContext?.logEvent;
  
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  const handleSelectOption = (option: OptionConfig) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Toggle selection if clicking the same option
    if (selectedOptionId === option.id) {
      setSelectedOptionId(null);
    } else {
      setSelectedOptionId(option.id);
    }
  };

  const handleContinue = () => {
    if (!selectedOptionId) return;
    
    const selectedOption = config.options.find(opt => opt.id === selectedOptionId);
    if (!selectedOption) return;

    if (config.tracking?.optionSelectedEventPrefix && logSduiEvent) {
      // Send the full event name for detailed tracking
      logSduiEvent(`${config.tracking.optionSelectedEventPrefix}${selectedOption.id}`, { response: selectedOption.responseValue });
    }

    if (logEvent) {
      logEvent('faith_tradition_selected', {
        option_id: selectedOption.id,
        option_value: selectedOption.responseValue,
      });
    }

    // Proceed to the next step, passing necessary data for the host to handle
    onNext({ optionId: selectedOption.id, responseValue: selectedOption.responseValue });
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
            paddingTop: insets.top + 20, 
            paddingBottom: insets.bottom + 20,
            paddingLeft: insets.left + 20,
            paddingRight: insets.right + 20
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
          
          {/* Subtitle */}
          {config.subtitle && (
            <Animated.Text
              entering={FadeIn.delay(300).duration(600)}
              style={styles.subtitleText}
            >
              {config.subtitle}
            </Animated.Text>
          )}
        </Animated.View>

        <View style={styles.optionsContainer}>
          {config.options.map((option, index) => (
            <Animated.View
              key={option.id}
              entering={FadeInDown.delay(200 + index * 100).duration(500)} // Stagger option fade-in
              style={styles.optionWrapper}
            >
              <TouchableOpacity
                style={[
                  styles.option,
                  selectedOptionId === option.id && styles.selectedOption
                ]}
                onPress={() => handleSelectOption(option)}
                activeOpacity={0.8}
              >
                {option.emoji && <Text style={styles.optionEmoji}>{option.emoji}</Text>}
                <Text style={styles.optionText}>{option.text}</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {/* Continue Button */}
        <Animated.View 
          entering={FadeIn.delay(600).duration(600)}
          style={styles.continueButtonContainer}
        >
          <Button
            onPress={handleContinue}
            variant="primary"
            fullWidth
            disabled={!selectedOptionId}
          >
            Continue
          </Button>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: 30,
    paddingTop: 10,
    width: '100%',    
  },
  questionText: { 
    fontSize: 32,
    fontFamily: 'SNPro-Heavy',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 42,
    letterSpacing: -1,
    paddingHorizontal: 10, 
  },
  subtitleText: {
    fontSize: 18,
    fontFamily: 'SNPro-SemiBold',
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  optionsContainer: {
    width: '100%',
    marginTop: 16, 
  },
  optionWrapper: {
    width: '100%',
    marginBottom: 16,
  },
  option: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 18,
    paddingVertical: 20, 
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
  },
  selectedOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  optionEmoji: {
    fontSize: 36,
    marginRight: 24,
  },
  optionText: {
    fontSize: 18,
    fontFamily: 'SNPro-Bold',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    lineHeight: 24,
    marginRight: 12,
    flex: 1,
  },
  continueButtonContainer: {
    width: '100%',
    marginTop: 40,
    paddingBottom: 20,
  },
});

// Export directly without error boundary
export default FaithTraditionScreenCore; 