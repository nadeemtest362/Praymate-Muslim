import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  useAnimatedProps,
  withTiming, 
  withSequence,
  withDelay,
  Easing, 
  FadeIn,
  FadeInDown,
  ZoomIn,
  interpolate,
  runOnJS
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useOnboardingStore } from '../../../stores/onboardingStore';

import OnboardingGradientBackground from '../../../components/shared/OnboardingGradientBackground';
import { OnboardingFlowContext } from '../../../contexts/OnboardingFlowContext';

const { width, height } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CreatingProfileLoaderScreenConfig {
  displayText?: string;
  duration?: number; // milliseconds
}

interface CreatingProfileLoaderScreenProps {
  config: CreatingProfileLoaderScreenConfig;
  onNext: () => void;
}

interface LoadingStep {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  duration: number;
}

function CreatingProfileLoaderScreenCore({ config, onNext }: CreatingProfileLoaderScreenProps) {
  const insets = useSafeAreaInsets();
  
  // Onboarding Store Data

  const mood = useOnboardingStore(state => state.mood) as any;
  const firstName = useOnboardingStore(state => state.firstName);
  const initialMotivation = useOnboardingStore(state => state.initialMotivation);
  const prayerFocusPeopleFromStore = useOnboardingStore(state => state.prayerFocusPeople);
  const currentBatchOfIntentions = useOnboardingStore(state => state.currentBatchOfIntentions);
  const flowContext = React.useContext(OnboardingFlowContext);
  const logEvent = flowContext?.logEvent;
  
  const totalDuration = config.duration || 8500; // Default total duration
  
  // Get personalized data
  const getMoodDisplay = () => {
    if (!mood) return 'ready';
    if (typeof mood === 'string' && mood.includes('|')) {
      const [moodId] = mood.split('|');
      return moodId;
    }
    if (typeof mood === 'object' && mood.label) return mood.label.toLowerCase();
    return mood;
  };
  
  const getPeopleNames = () => {
    const names = [];
    if (firstName) names.push(firstName);
    names.push(...prayerFocusPeopleFromStore.map(p => p.name));
    return names;
  };
  
  const getMotivationLabel = () => {
    const motivationMap: Record<string, string> = {
      'personalization': 'personal prayers',
      'restart': 'renewed faith',
      'intercession': 'prayer community',
      'inspiration': 'spiritual renewal',
      'consistency': 'daily habits',
      'closer': 'deeper connection',
      'start': 'faith journey'
    };
    return motivationMap[initialMotivation || ''] || 'spiritual growth';
  };
  
  // Personalized loading steps
  const peopleNames = getPeopleNames();
  const moodDisplay = getMoodDisplay();
  const motivationLabel = getMotivationLabel();
  
  const LOADING_STEPS: LoadingStep[] = [
    {
      id: 'people',
      title: peopleNames.length > 0 
        ? `Setting up prayers for ${peopleNames.slice(0, 2).join(', ')}${peopleNames.length > 2 ? ` and ${peopleNames.length - 2} others` : ''}`
        : 'Setting up your prayer community',
      subtitle: currentBatchOfIntentions.length > 0 
        ? `Configuring ${currentBatchOfIntentions.length} prayer intentions`
        : 'Preparing your prayer intentions',
      icon: 'account-heart',
      duration: totalDuration * 0.25,
    },
    {
      id: 'mood',
      title: `Preparing your ${moodDisplay} mood context`,
      subtitle: 'Personalizing prayer tone and approach',
      icon: 'emoticon-happy',
      duration: totalDuration * 0.25,
    },
    {
      id: 'motivation',
      title: `Optimizing for ${motivationLabel}`,
      subtitle: 'Tailoring your spiritual journey',
      icon: 'star',
      duration: totalDuration * 0.25,
    },
    {
      id: 'finalizing',
      title: `Creating ${firstName ? firstName + "'s" : 'your'} prayer profile`,
      subtitle: 'Bringing everything together',
      icon: 'check-circle',
      duration: totalDuration * 0.25,
    }
  ];
  
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const completionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasNavigatedRef = useRef(false);
  const clearCompletionTimeout = useCallback(() => {
    if (completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = null;
    }
  }, []);

  const navigateAfterCompletion = useCallback(() => {
    if (hasNavigatedRef.current) {
      return;
    }
    hasNavigatedRef.current = true;
    if (logEvent) {
      logEvent('creating_profile_loader_navigating_next');
    }
    onNext();
    clearCompletionTimeout();
  }, [clearCompletionTimeout, logEvent, onNext]);

  useEffect(() => {
    hasNavigatedRef.current = false;
    return () => {
      hasNavigatedRef.current = true;
      clearCompletionTimeout();
    };
  }, [clearCompletionTimeout]);
  
  const progress = useSharedValue(0);
  const stepProgress = useSharedValue(0);
  const glowScale = useSharedValue(1);
  
  // Circle progress values
  const circleCircumference = 2 * Math.PI * 90;

  const currentStep = LOADING_STEPS[currentStepIndex];

  // Pre-calculate particle positions and sizes to prevent jumping
  const particleData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => ({
      id: i,
      left: (20 + Math.random() * 60) * width / 100,
      top: (20 + Math.random() * 60) * height / 100,
      size: 12 + Math.random() * 8,
      delay: i * 200,
    }));
  }, []);

  useEffect(() => {
    // Start the glow animation
    glowScale.value = withSequence(
      withTiming(1.2, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) })
    );

    // Function to advance to next step
    const advanceStep = () => {
      if (currentStepIndex < LOADING_STEPS.length - 1) {
        setCurrentStepIndex(prev => prev + 1);
        stepProgress.value = 0;
      } else {
        setShowCompletion(true);
        if (logEvent) {
          logEvent('creating_profile_loader_completed');
        }
        clearCompletionTimeout();
        completionTimeoutRef.current = setTimeout(navigateAfterCompletion, 1500);
      }
    };

    // Overall progress animation
    progress.value = withTiming(1, { 
      duration: totalDuration, 
      easing: Easing.out(Easing.cubic) 
    });

    // Step-specific progress
    stepProgress.value = withTiming(1, {
      duration: currentStep.duration,
      easing: Easing.inOut(Easing.cubic)
    }, (finished) => {
      if (finished) {
        runOnJS(advanceStep)();
      }
    });

    // Continue glow animation
    const glowInterval = setInterval(() => {
      glowScale.value = withSequence(
        withTiming(1.2, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) })
      );
    }, 3000);

    return () => {
      clearInterval(glowInterval);
      clearCompletionTimeout();
    };
  }, [clearCompletionTimeout, currentStep.duration, currentStepIndex, glowScale, logEvent, navigateAfterCompletion, progress, stepProgress, totalDuration, LOADING_STEPS.length]);

  // Animated styles
  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
  }));
  
  // Animated props for SVG circle
  const animatedCircleProps = useAnimatedProps(() => {
    const strokeDashoffset = circleCircumference * (1 - progress.value);
    return {
      strokeDashoffset
    };
  });

  // Step progress bar animation
  const stepProgressStyle = useAnimatedStyle(() => ({
    width: `${interpolate(stepProgress.value, [0, 1], [0, 100])}%`
  }));

  if (showCompletion) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        
        {/* Background gradient */}
        <OnboardingGradientBackground />
        
        <View style={[styles.contentWrapper, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
          <Animated.View 
            entering={ZoomIn.duration(800)}
            style={styles.completionContainer}
          >
            <Text style={{ fontSize: 180 }}>🙌</Text>
            <Text style={styles.completionTitle}>{firstName ? `${firstName}'s` : 'Your'} Prayer Profile is Ready!</Text>
            <Text style={styles.completionSubtitle}>Everything personalized for your spiritual journey</Text>
          </Animated.View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background gradient */}
      <OnboardingGradientBackground />
      
      <View style={[styles.contentWrapper, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.mainContent}>
          {/* Header */}
          <Animated.View 
            entering={FadeIn.duration(600)}
            style={styles.headerContainer}
          >
            <Text style={styles.headerTitle}>Creating Your Prayer Profile</Text>
            <Text style={styles.headerSubtitle}>Personalizing your spiritual experience</Text>
          </Animated.View>

          {/* Circular progress with icon */}
          <Animated.View 
            entering={ZoomIn.duration(800).delay(200)}
            style={styles.circleContainer}
          >
            {/* SVG for circular progress */}
            <Svg width={200} height={200} style={styles.svg}>
              {/* Background circle */}
              <Circle
                cx="100"
                cy="100"
                r="90"
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth="4"
                fill="transparent"
              />
              {/* Progress circle */}
              <G rotation="-90" origin="100, 100">
                <AnimatedCircle
                  cx="100"
                  cy="100"
                  r="90"
                  stroke="#FFFFFF"
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray={circleCircumference}
                  animatedProps={animatedCircleProps}
                  strokeLinecap="round"
                />
              </G>
            </Svg>
            
            {/* Glow effect */}
            <Animated.View style={[styles.glow, glowStyle]} />
            
            {/* Current step icon */}
            <Animated.View 
              key={currentStep.id}
              entering={ZoomIn.duration(500)}
              style={styles.iconContainer}
            >
              <MaterialCommunityIcons 
                name={currentStep.icon as any} 
                size={50} 
                color="#FFFFFF" 
              />
            </Animated.View>
          </Animated.View>

          {/* Current step info */}
          <Animated.View 
            key={`${currentStep.id}-info`}
            entering={FadeInDown.duration(600)}
            style={styles.stepInfoContainer}
          >
            <Text style={styles.stepTitle}>{currentStep.title}</Text>
            <Text style={styles.stepSubtitle}>{currentStep.subtitle}</Text>
            
            {/* Step progress bar */}
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <Animated.View 
                  style={[styles.progressBarFill, stepProgressStyle]} 
                />
              </View>
            </View>
          </Animated.View>

          {/* Steps indicator */}
          <Animated.View 
            entering={FadeIn.duration(800).delay(400)}
            style={styles.stepsIndicator}
          >
            {LOADING_STEPS.map((step, index) => (
              <View 
                key={step.id} 
                style={[
                  styles.stepDot,
                  index <= currentStepIndex && styles.stepDotActive,
                  index === currentStepIndex && styles.stepDotCurrent
                ]} 
              />
            ))}
          </Animated.View>

          {/* Floating particles */}
          <View style={styles.particlesContainer}>
            {particleData.map((particle) => (
              <Animated.View
                key={particle.id}
                entering={FadeIn.duration(1000).delay(particle.delay)}
                style={[
                  styles.particle,
                  {
                    left: particle.left,
                    top: particle.top,
                  }
                ]}
              >
                <MaterialCommunityIcons 
                  name="star-four-points" 
                  size={particle.size} 
                  color="rgba(255, 255, 255, 0.3)" 
                />
              </Animated.View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
  },
  contentWrapper: { 
    flex: 1, 
    paddingHorizontal: 20 
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'SNPro-Heavy',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: 'SNPro-Semibold',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  circleContainer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  glow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  iconContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepInfoContainer: {
    alignItems: 'center',
    paddingHorizontal: 30,
    minHeight: 120,
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 24,
    fontFamily: 'SNPro-Heavy',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  stepSubtitle: {
    fontSize: 16,
    fontFamily: 'SNPro-Semibold',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  progressBarContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBarBackground: {
    width: '80%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  stepsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 4,
  },
  stepDotActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  stepDotCurrent: {
    backgroundColor: '#FFFFFF',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  particlesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  particle: {
    position: 'absolute',
  },
  completionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionTitle: {
    fontSize: 32,
    fontFamily: 'SNPro-Heavy',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  completionSubtitle: {
    fontSize: 18,
    fontFamily: 'SNPro-Semibold',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
});

// Export directly without error boundary
export default CreatingProfileLoaderScreenCore; 