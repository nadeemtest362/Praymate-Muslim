import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Image
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import OnboardingGradientBackground from '../../../components/shared/OnboardingGradientBackground';
import { FloatingParticles } from '../../../components/shared/FloatingParticles';
import useResponsive from '../../../hooks/useResponsive';
import { OnboardingFlowContext } from '../../../contexts/OnboardingFlowContext';

interface StageConfig {
  id: string;
  text?: string;
  type?: 'standard' | 'prayer-preview';
  prayerPreview?: {
    introText: string;
    prayerText: string;
  };
  image?: any;
  durationMs?: number;
}

interface AnalyticsConfig {
  stageViewedEvent?: string;
  completedEvent?: string;
}

interface OnboardingWelcomeScreenConfig {
  stages?: StageConfig[];
  autoAdvance?: boolean;
  defaultStageDurationMs?: number;
  continueButtonLabel?: string;
  finalButtonLabel?: string;
  showProgressDots?: boolean;
  analytics?: AnalyticsConfig;
}

interface OnboardingWelcomeScreenProps {
  config?: OnboardingWelcomeScreenConfig;
  onNext: () => void;
  logSduiEvent?: (eventName: string, eventData?: Record<string, unknown>) => void;
}

const DEFAULT_STAGES: StageConfig[] = [
  {
    id: 'line1',
    text: "Prayer doesn't have to be hard...",
    durationMs: 4500
  },
  {
    id: 'line2',
    text: 'God wants you to talk to him...',
    durationMs: 4500
  },
  {
    id: 'line3',
    text: 'To bring him your pain...',
    durationMs: 3500
  },
  {
    id: 'line4',
    text: 'Your joy...',
    durationMs: 3500
  },
  {
    id: 'line5',
    text: 'Your people...',
    durationMs: 3500
  },
  {
    id: 'line6',
    text: 'And everything else in between.',
    durationMs: 5000
  },
  {
    id: 'promise',
    text: 'praymate helps you grow closer to God in just 3 minutes a day',
    image: require('../../../../assets/images/praymate-jesus.jpeg'),
    durationMs: 6500
  }
];

const createStyles = (R: ReturnType<typeof useResponsive>, insets: ReturnType<typeof useSafeAreaInsets>) =>
  StyleSheet.create({
    container: {
      flex: 1
    },
    content: {
      flex: 1,
      paddingTop: insets.top,
      paddingBottom: insets.bottom + R.h(8),
      paddingHorizontal: R.w(8),
      justifyContent: 'center',
      alignItems: 'center'
    },
    stageWrapper: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      paddingHorizontal: R.w(6)
    },
    stageWrapperWithImage: {
      flex: 1,
      justifyContent: 'flex-start',
      alignItems: 'center',
      width: '100%',
      paddingHorizontal: R.w(4),
      paddingTop: R.h(8)
    },
    text: {
      fontSize: R.font(40),
      fontFamily: 'SNPro-Semibold',
      color: '#FFFFFF',
      lineHeight: R.font(40) * 1.3,
      letterSpacing: -0.5,
      textAlign: 'center'
    },
    textWithImage: {
      fontSize: R.font(36),
      fontFamily: 'SNPro-Heavy',
      color: '#FFFFFF',
      lineHeight: R.lineHeight(32),
      letterSpacing: -0.3,
      textAlign: 'center'
    },
    textWithImageContainer: {
      marginTop: R.h(4)
    },
    logoTextPray: {
      fontFamily: 'SNPro-Heavy',
      color: '#FFFFFF'
    },
    logoTextMate: {
      fontFamily: 'SNPro-Heavy',
      color: '#7DD3FC'
    },
    logoEmoji: {
      fontSize: R.font(26)
    },
    glowText: {
      textShadowColor: 'rgba(255, 215, 0, 0.5)',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 15
    },
    imageGlowWrapper: {
      marginBottom: R.h(3),
      shadowColor: '#FFD700',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 50,
      elevation: 20
    },
    imageContainer: {
      width: R.w(75),
      height: R.h(50),
      borderTopLeftRadius: R.w(12),
      borderTopRightRadius: R.w(12),
      overflow: 'hidden',
      position: 'relative',
      padding: 8,
      paddingBottom: 0,
      backgroundColor: '#1A1B4B'
    },
    stageImage: {
      width: '100%',
      height: '100%',
      borderTopLeftRadius: R.w(10),
      borderTopRightRadius: R.w(10)
    },

    previewIntro: {
      fontSize: R.font(18),
      fontFamily: 'SNPro-Regular',
      color: 'rgba(255, 255, 255, 0.7)',
      textAlign: 'center',
      marginBottom: R.h(3)
    },
    previewPrayer: {
      fontSize: R.font(20),
      fontFamily: 'SNPro-Regular',
      color: '#FFFFFF',
      lineHeight: R.font(20) * 1.6,
      textAlign: 'left',
      paddingHorizontal: R.w(8),
      paddingVertical: R.h(3),
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderRadius: R.w(3),
      borderLeftWidth: 3,
      borderLeftColor: '#FFD700'
    },
    buttonContainer: {
      position: 'absolute',
      bottom: insets.bottom + R.h(6),
      left: R.w(8),
      right: R.w(8)
    },
    ctaButton: {
      paddingVertical: R.h(2),
      paddingHorizontal: R.w(8),
      borderRadius: R.w(4),
      backgroundColor: '#FFFFFF',
      alignItems: 'center'
    },
    ctaText: {
      fontSize: R.font(18),
      fontFamily: 'SNPro-Bold',
      color: '#1A1B4B',
      letterSpacing: 0.3
    }
  });

function OnboardingWelcomeScreen({
  config,
  onNext,
  logSduiEvent
}: OnboardingWelcomeScreenProps) {
  const R = useResponsive();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(R, insets), [R, insets]);
  const flowContext = React.useContext(OnboardingFlowContext);
  const logEvent = flowContext?.logEvent;
  const logScreen = flowContext?.logScreen;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const ellipsisFadeAnim = useRef(new Animated.Value(0)).current;
  const imageFadeAnim = useRef(new Animated.Value(0)).current;
  const buttonFadeAnim = useRef(new Animated.Value(0)).current;

  const stages = useMemo<StageConfig[]>(() => {
    if (config?.stages && config.stages.length > 0) {
      return config.stages;
    }
    return DEFAULT_STAGES;
  }, [config?.stages]);

  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(false);

  const autoAdvance = config?.autoAdvance ?? true;
  const defaultStageDuration = config?.defaultStageDurationMs ?? 4500;
  
  const continueLabel = config?.finalButtonLabel ?? "I'm Ready";

  const currentStage = stages[currentStageIndex];
  const isLastStage = currentStageIndex >= stages.length - 1;

  const logStageViewed = useCallback(
    (stage: StageConfig) => {
      if (logEvent) {
        logEvent('onboarding_welcome_stage_viewed', {
          stage_id: stage.id,
          stage_type: stage.type || 'standard',
          stage_index: currentStageIndex,
        });
      }

      if (logSduiEvent && config?.analytics?.stageViewedEvent) {
        logSduiEvent(config.analytics.stageViewedEvent, {
          stage_id: stage.id,
          stageId: stage.id,
        });
      }
    },
    [config?.analytics?.stageViewedEvent, currentStageIndex, logEvent, logSduiEvent]
  );

  const handleComplete = useCallback(() => {
    if (hasCompleted) {
      return;
    }

    setHasCompleted(true);

    if (logEvent) {
      logEvent('onboarding_welcome_completed');
    }

    if (logSduiEvent && config?.analytics?.completedEvent) {
      logSduiEvent(config.analytics.completedEvent);
    }

    onNext();
  }, [config?.analytics?.completedEvent, hasCompleted, logEvent, logSduiEvent, onNext]);

  const handleAdvance = useCallback(() => {
    setCurrentStageIndex(prev => {
      if (prev >= stages.length - 1) {
        // Use setTimeout to avoid calling onNext during render
        setTimeout(() => handleComplete(), 0);
        return prev;
      }
      return prev + 1;
    });
  }, [handleComplete, stages.length]);

  // Handle stage transitions
  useEffect(() => {
    if (!currentStage || hasCompleted) {
      return undefined;
    }

    fadeAnim.setValue(0);
    scaleAnim.setValue(0.95);
    ellipsisFadeAnim.setValue(0);
    imageFadeAnim.setValue(0);
    buttonFadeAnim.setValue(0);
    
    // Vary animation timing based on stage - feels more human
    const text = currentStage.text?.toLowerCase() || '';
    const fadeInDuration = text.includes('hard') || text.includes('between') ? 1200 : 900;
    const scaleDelay = 150;
    
    // Last stage: image → pause → text → pause → button
    if (isLastStage) {
      // 1. Image fades in
      Animated.timing(imageFadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true
      }).start();
      
      // 2. Text fades in after image is visible
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 60,
            friction: 10,
            useNativeDriver: true
          })
        ]).start();
      }, 1500);
      
      // 3. Button fades in last
      setTimeout(() => {
        Animated.timing(buttonFadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true
        }).start();
      }, 3200);
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: fadeInDuration,
          useNativeDriver: true
        }),
        Animated.sequence([
          Animated.delay(scaleDelay),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 60,
            friction: 10,
            useNativeDriver: true
          })
        ])
      ]).start();
    }
    
    // Ellipsis fade in - timing varies by emotional weight of the line
    if (currentStage.text?.endsWith('...')) {
      const text = currentStage.text.toLowerCase();
      let delay = 700; // default
      
      if (text.includes('hard') || text.includes('prayer')) {
        delay = 1000; // heavy statement, let it breathe
      } else if (text.includes('god') || text.includes('talk')) {
        delay = 800; // warm but serious
      } else if (text.includes('joy') || text.includes('people')) {
        delay = 500; // part of quick rhythm
      }
      
      Animated.timing(ellipsisFadeAnim, {
        toValue: 1,
        duration: 400,
        delay: delay,
        useNativeDriver: true
      }).start();
    }

    logStageViewed(currentStage);

    let timer: ReturnType<typeof setTimeout> | undefined;
    let fadeOutTimer: ReturnType<typeof setTimeout> | undefined;

    if (autoAdvance && !isLastStage) {
      const duration = currentStage.durationMs ?? defaultStageDuration;
      const text = currentStage.text?.toLowerCase() || '';
      const fadeOutDuration = text.includes('between') ? 1400 : 1000; // Longer, smoother fades
      const fadeOutDelay = duration - fadeOutDuration;
      
      // Start fade out before stage transition
      fadeOutTimer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: fadeOutDuration,
          useNativeDriver: true
        }).start();
      }, fadeOutDelay);
      
      // Advance to next stage
      timer = setTimeout(() => {
        handleAdvance();
      }, duration);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      if (fadeOutTimer) {
        clearTimeout(fadeOutTimer);
      }
    };
  }, [
    autoAdvance,
    currentStage,
    defaultStageDuration,
    fadeAnim,
    scaleAnim,
    handleAdvance,
    hasCompleted,
    logStageViewed,
    isLastStage
  ]);

  if (!currentStage) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <OnboardingGradientBackground />
        <View style={[styles.content, { justifyContent: 'center' }]}>
          <Text style={styles.text}>Preparing your experience...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <OnboardingGradientBackground />
      
      <FloatingParticles />

      <View style={styles.content}>
        <View 
          style={isLastStage ? styles.stageWrapperWithImage : styles.stageWrapper}
        >
          {currentStage.type === 'prayer-preview' && currentStage.prayerPreview ? (
            <>
              <Text style={styles.previewIntro}>
                {currentStage.prayerPreview.introText}
              </Text>
              <Text style={styles.previewPrayer}>
                {currentStage.prayerPreview.prayerText}
              </Text>
            </>
          ) : (
            <>
              {isLastStage && (
                <View style={styles.imageGlowWrapper}>
                  <View style={styles.imageContainer}>
                    <Image 
                      source={require('../../../../assets/images/praymate-jesus.jpeg')} 
                      style={styles.stageImage}
                      resizeMode="cover"
                    />
                  </View>
                </View>
              )}
              <Animated.View 
                style={[
                  { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
                  isLastStage && styles.textWithImageContainer,
                  !isLastStage && { 
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }]
                  },
                  isLastStage && { opacity: fadeAnim }
                ]}
              >
                {(() => {
                  const text = currentStage.text || '';
                  const hasEllipsis = text.endsWith('...');
                  const baseText = hasEllipsis ? text.slice(0, -3) : text;
                  
                  // Words to highlight with glow
                  const glowWords = ['pain', 'joy', 'people', 'God'];
                  const parts = baseText.split(/(\s+)/);
                  const textStyle = isLastStage ? styles.textWithImage : styles.text;
                  
                  return (
                    <>
                      {parts.map((part, i) => {
                        const shouldGlow = glowWords.some(word => 
                          part.toLowerCase().replace(/[,.]/, '') === word.toLowerCase()
                        );
                        
                        // Style praymate as pray + mate + emoji
                        if (part.toLowerCase() === 'praymate') {
                          return (
                            <Text key={i} style={textStyle}>
                              <Text style={styles.logoTextPray}>pray</Text>
                              <Text style={styles.logoTextMate}>mate</Text>
                              <Text style={styles.logoEmoji}>🙏</Text>
                            </Text>
                          );
                        }
                        
                        return (
                          <Text key={i} style={[textStyle, shouldGlow ? styles.glowText : undefined]}>
                            {part}
                          </Text>
                        );
                      })}
                      {hasEllipsis && (
                        <Animated.Text style={[textStyle, { opacity: ellipsisFadeAnim }]}>
                          ...
                        </Animated.Text>
                      )}
                    </>
                  );
                })()}
              </Animated.View>
            </>
          )}
        </View>

        {isLastStage ? (
          <Animated.View style={[styles.buttonContainer, { opacity: buttonFadeAnim }]}>
            <TouchableOpacity
              onPress={handleAdvance}
              activeOpacity={0.9}
              style={styles.ctaButton}
            >
              <Text style={styles.ctaText}>{continueLabel}</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

export default OnboardingWelcomeScreen;
