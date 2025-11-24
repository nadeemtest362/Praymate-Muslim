import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Image
} from 'react-native';
import Animated, { 
  FadeIn, 
  FadeInDown,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  Easing
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import OnboardingGradientBackground from '../../../components/shared/OnboardingGradientBackground';
import { FloatingParticles } from '../../../components/shared/FloatingParticles';
import useResponsive from '../../../hooks/useResponsive';
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
    justifyContent: 'center',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: R.h(3.5),
  },
  clockImage: {
    width: R.w(30),
    height: R.w(30),
  },
  title: {
    fontSize: R.font(38),
    fontFamily: 'SNPro-Heavy',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: R.h(1), // Reduced spacing for better grouping
    letterSpacing: -1.2,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  question: {
    fontSize: R.font(22),
    fontFamily: 'SNPro-SemiBold',
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    marginBottom: R.h(2),
    paddingHorizontal: R.w(4),
    lineHeight: R.font(28),
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  optionsContainer: {
    width: '100%',
    marginTop: R.h(2.5),
  },
  optionWrapper: {
    width: '100%',
    marginBottom: R.h(2),
  },
  option: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: R.w(5),
    paddingVertical: R.h(2.2), // Slightly increased for commitment screen
    paddingHorizontal: R.w(6),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: R.h(8), // Slightly taller for commitment screen
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  optionEmoji: {
    fontSize: R.font(28),
    marginRight: R.w(4),
  },
  selectedOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  optionText: {
    fontSize: R.font(18),
    fontFamily: 'SNPro-SemiBold',
    color: 'rgba(255, 255, 255, 0.95)',
    letterSpacing: -0.2,
    lineHeight: R.font(22),
    flex: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  selectedOptionText: {
    fontFamily: 'SNPro-Heavy',
  },
});

interface CommitmentOption {
  id: string;
  text: string;
  action: string;
  navigateTo: string;
}

// Option component to fix React Hooks violations
const OptionButton = ({ 
  option, 
  index, 
  isSelected, 
  optionScale, 
  styles, 
  onPress, 
  disabled 
}: {
  option: CommitmentOption;
  index: number;
  isSelected: boolean;
  optionScale: Animated.SharedValue<number>;
  styles: any;
  onPress: () => void;
  disabled: boolean;
}) => {
  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: isSelected ? optionScale.value : 1 }
    ]
  }));

  const getEmojiForOption = (optionId: string): string => {
    const emojiMap: Record<string, string> = {
      'very_committed': '🙏',
      'ready_to_start': '✨',
      'want_to_try': '🤲'
    };
    return emojiMap[optionId] || '🙏';
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(800 + index * 150).duration(600)}
      style={styles.optionWrapper}
    >
      <Animated.View style={animStyle}>
        <TouchableOpacity
          style={[
            styles.option,
            isSelected && styles.selectedOption
          ]}
          onPress={onPress}
          activeOpacity={0.8}
          disabled={disabled}
        >
          <Text style={styles.optionEmoji}>
            {getEmojiForOption(option.id)}
          </Text>
          <Text style={[
            styles.optionText,
            isSelected && styles.selectedOptionText
          ]}>
            {option.text}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

interface CommitmentQuestionScreenConfig {
  title: string;
  question: string;
  options: CommitmentOption[];
  tracking?: {
    screenViewEvent?: string;
    optionSelectedEventPrefix?: string;
  };
}

interface CommitmentQuestionScreenProps {
  config: CommitmentQuestionScreenConfig;
  onNext: (selectedOptionData?: any) => void;
  logSduiEvent?: (eventName: string, eventData?: Record<string, any>) => void;
}

function CommitmentQuestionScreenCore({ 
  config, 
  onNext,
  logSduiEvent 
}: CommitmentQuestionScreenProps) {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);
  
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const flowContext = React.useContext(OnboardingFlowContext);
  const logEvent = flowContext?.logEvent;
  
  // Enhanced animations
  const optionScale = useSharedValue(1);
  const clockScale = useSharedValue(1);
  const headerScale = useSharedValue(1);
  
  React.useEffect(() => {
    // Subtle pulsing animation for the clock
    clockScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, [clockScale]);
  
  const handleSelectOption = async (option: CommitmentOption) => {
    // Enhanced haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    setSelectedOptionId(option.id);
    
    // Enhanced selection animation
    optionScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withTiming(1.05, { duration: 150 }),
      withTiming(1, { duration: 100 })
    );
    
    // Header feedback animation
    headerScale.value = withSequence(
      withTiming(1.02, { duration: 150 }),
      withTiming(1, { duration: 150 })
    );
    
    // Log the selection event - single event call
    if (config.tracking?.optionSelectedEventPrefix && logSduiEvent) {
      logSduiEvent(`${config.tracking.optionSelectedEventPrefix}${option.id}`, {
        option_id: option.id,
      });
    }
    
    // Slight delay for visual feedback before navigation
    setTimeout(() => {
      onNext(option);
    }, 300);
  };

  const clockAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: clockScale.value }]
  }));

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: headerScale.value }]
  }));
  
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background gradient */}
      <OnboardingGradientBackground />
      
      {/* Enhanced floating particles */}
      <FloatingParticles />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingTop: R.insets.top + R.h(7),
            paddingBottom: R.insets.bottom + R.h(3.5),
            paddingLeft: R.insets.left + R.w(5),
            paddingRight: R.insets.right + R.w(5)
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Enhanced clock with blur background */}
        <Animated.View
          entering={ZoomIn.duration(800).delay(200)}
          style={[styles.imageContainer, clockAnimatedStyle]}
        >
        
            <Image 
              source={require('../../../../assets/images/clock.png')} 
              style={styles.clockImage}
              resizeMode="contain"
            />
       
        </Animated.View>
        
        {/* Enhanced header with animation */}
        <Animated.View style={headerAnimatedStyle}>
          <Animated.Text 
            entering={FadeIn.duration(800).delay(400)}
            style={styles.title}
          >
            {config.title}
          </Animated.Text>
          
          <Animated.Text 
            entering={FadeIn.delay(600).duration(800)}
            style={styles.question}
          >
            {config.question}
          </Animated.Text>
        </Animated.View>
        
        {/* Enhanced options with better styling */}
        <View style={styles.optionsContainer}>
          {config.options.map((option, index) => (
            <OptionButton
              key={option.id}
              option={option}
              index={index}
              isSelected={selectedOptionId === option.id}
              optionScale={optionScale}
              styles={styles}
              onPress={() => handleSelectOption(option)}
              disabled={!!selectedOptionId}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}


// Export directly without error boundary
export default CommitmentQuestionScreenCore; 