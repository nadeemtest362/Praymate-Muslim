import React, { useState, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity
} from 'react-native';


import Animated, { 
  FadeIn, 
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming
} from 'react-native-reanimated';


import * as Haptics from 'expo-haptics';
import { MOOD_OPTIONS, MoodOption } from '../../../constants/onboardingPrompts';
import { OnboardingFlowContext } from '../../../contexts/OnboardingFlowContext';
import { StatusBar } from 'expo-status-bar';
import OnboardingGradientBackground from '../../../components/shared/OnboardingGradientBackground';
import { FloatingParticles } from '../../../components/shared/FloatingParticles';
import useResponsive from '../../../hooks/useResponsive';

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: R.h(1.5),
  },
  titleText: {
    fontSize: R.font(32),
    fontFamily: 'SNPro-Heavy',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: R.font(35),
    marginBottom: R.h(1.2),
    letterSpacing: -1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitleText: {
    fontSize: R.font(17),
    fontFamily: 'SNPro-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    letterSpacing: -0.3,
    opacity: 0.95,
    paddingHorizontal: R.w(3),
    lineHeight: R.font(22),
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    flex: 1,
  },
  moodOption: {
    width: '47%',
    aspectRatio: 1.8,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: R.w(4),
    marginBottom: R.h(1.5),
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: R.h(0.5) },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  selectedMoodOption: {
    backgroundColor: 'rgba(108, 99, 255, 0.35)',
    borderColor: '#6C63FF',
    borderWidth: 2,
    transform: [{ scale: 1.02 }],
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: R.h(0.75) },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  moodContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: R.w(2),
    height: '100%',
  },
  moodEmoji: {
    fontSize: R.font(28),
    marginBottom: R.h(0.8),
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  selectedMoodEmoji: {
    fontSize: R.font(32),
    transform: [{ scale: 1.1 }],
  },
  moodLabel: {
    fontSize: R.font(14),
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: R.font(16),
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  selectedMoodLabel: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: R.font(15),
  },
  selectionIndicator: {
    position: 'absolute',
    top: -R.w(0.5),
    right: -R.w(0.5),
    width: R.w(5),
    height: R.w(5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionRing: {
    width: R.w(4),
    height: R.w(4),
    borderRadius: R.w(2),
    backgroundColor: '#6C63FF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  moodTouchable: {
    flex: 1,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: R.font(16),
    fontWeight: '600',
  },
});




interface MoodScreenProps {
  config: {
    logo?: { text: string; accent: string; emoji: string };
    title: string;
    subtitle: string;
    moodOptions: MoodOption[];
    navigation: {
      action: string;
      navigateTo: string;
      params: Record<string, string>;
    };
  };
  onNext: (selectedOptionData?: MoodOption) => void;
}

function MoodScreenCore({ config, onNext }: MoodScreenProps) {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);
  const flowContext = React.useContext(OnboardingFlowContext);
  const currentFlow = flowContext?.currentFlow;
  const currentStepIndex = flowContext?.currentStepIndex ?? -1;
  const currentStep = currentFlow && currentStepIndex >= 0 ? currentFlow.steps[currentStepIndex] : undefined;
  const logEvent = flowContext?.logEvent;
  
  const [visualSelection, setVisualSelection] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  
  // Animation values
  const headerScale = useSharedValue(1);
  const cardScale = useSharedValue(1);
  
  const handleSelect = (option: MoodOption) => {
    if (isSelecting) return; // Prevent double selection
    
    setIsSelecting(true);
    setVisualSelection(option.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Enhanced selection animation
    headerScale.value = withSequence(
      withTiming(1.02, { duration: 150 }),
      withTiming(1, { duration: 150 })
    );
    
    cardScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withTiming(1.05, { duration: 150 }),
      withTiming(1, { duration: 100 })
    );
    
    console.log('[MoodSelectionScreen] handleSelect called. Option:', JSON.stringify(option, null, 2));

    if (logEvent) {
      logEvent('mood_selected', {
        mood_id: option.id,
        mood_label: option.label,
      });
    }
    
    // Delay to show visual feedback
    setTimeout(async () => {
      if (config.navigation.action === "NAVIGATE_WITH_PARAMS" || config.navigation.action === "NAVIGATE_NEXT") {
        console.log('[MoodSelectionScreen] Attempting to call onNext with option data.');
        onNext(option); 
      } else {
        console.warn(`MoodScreen: Unhandled navigation action '${config.navigation.action}' or no action. Calling onNext without data.`);
        onNext();
      }
    }, 200);
  };
  
  // Use config mood options with fallback to constants only if config is empty
  const displayOptions = config.moodOptions?.length > 0 ? config.moodOptions : MOOD_OPTIONS;

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
      
      <View style={[
        styles.contentContainer,
        {
          paddingTop: R.insets.top + R.h(2),
          paddingBottom: R.insets.bottom + R.h(2),
          paddingLeft: R.insets.left + R.w(4),
          paddingRight: R.insets.right + R.w(4)
        }
      ]}>
      
        {/* Enhanced header */}
        <Animated.View 
          entering={FadeIn.delay(300).duration(600)}
          style={[styles.headerContainer, headerAnimatedStyle]}
        >
          <Text style={styles.titleText}>
            {config.title}
          </Text>
          
          <Text style={styles.subtitleText}>
            {config.subtitle}
          </Text>
        </Animated.View>
        
        {/* Mood grid - NO SCROLLING */}
        <View style={styles.moodGrid}>
          {displayOptions.map((mood, index) => {
            const isSelected = visualSelection === mood.id;
            
            return (
              <Animated.View
                key={mood.id}
                entering={ZoomIn.delay(400 + index * 30).duration(500)}
                style={[
                  styles.moodOption,
                  isSelected && styles.selectedMoodOption
                ]}
              >
                <TouchableOpacity
                  style={styles.moodTouchable}
                  onPress={() => handleSelect(mood)}
                  activeOpacity={0.7}
                  disabled={isSelecting}
                >
                  <View style={styles.moodContent}>
                    <Text style={[
                      styles.moodEmoji,
                      isSelected && styles.selectedMoodEmoji
                    ]}>
                      {mood.emoji}
                    </Text>
                    <Text style={[
                      styles.moodLabel,
                      isSelected && styles.selectedMoodLabel
                    ]}>
                      {mood.label}
                    </Text>
                  </View>
                  
                  {/* Selection indicator */}
                  {isSelected && (
                    <Animated.View 
                      entering={ZoomIn.duration(200)}
                      style={styles.selectionIndicator}
                    >
                      <View style={styles.selectionRing} />
                    </Animated.View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </View>
    </View>
  );
}


// Export directly without error boundary
export default MoodScreenCore; 