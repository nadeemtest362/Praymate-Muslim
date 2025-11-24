import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useOnboardingStore } from '../../../stores/onboardingStore';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../hooks/useAuth';
import PrayerDisplayScreen from '../../../../app/(app)/prayer-display';
import OnboardingGradientBackground from '../../../components/shared/OnboardingGradientBackground';
import LottieView from 'lottie-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { invokeGeneratePrayerWithRetry } from '../../../utils/generatePrayerRetry';
import { prayerGenerationQueue } from '../../../utils/prayerGenerationQueue';
import { secureLog } from '../../../utils/secureLogger';
import { usePrayerGenerationQueueStatus } from '../../../hooks/usePrayerGenerationQueueStatus';
import { OnboardingFlowContext } from '../../../contexts/OnboardingFlowContext';

// Simple props - just need onNext from the host
interface FirstPrayerDisplayScreenProps {
  config: any; // We'll ignore this complexity
  onNext: () => void;
  logSduiEvent?: (eventName: string, eventData?: Record<string, any>) => void;
}

function FirstPrayerDisplayScreenCore({ onNext }: FirstPrayerDisplayScreenProps) {
  const prayerFocusPeople = useOnboardingStore(state => state.prayerFocusPeople);
  // Get prayer content and other data from stores
  const { user } = useAuth();
  const firstPrayerContent = useOnboardingStore(state => state.firstPrayerContent);
  const setFirstPrayerContent = useOnboardingStore(state => state.setFirstPrayerContent);
  const firstPrayerId = useOnboardingStore(state => state.firstPrayerId);
  const setFirstPrayerId = useOnboardingStore(state => state.setFirstPrayerId);
  const { getState } = useOnboardingStore;
  const [isGeneratingPrayer, setIsGeneratingPrayer] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const { hasQueuedGeneration } = usePrayerGenerationQueueStatus();
  const flowContext = React.useContext(OnboardingFlowContext);
  const logEvent = flowContext?.logEvent;
  
  // ❌ REMOVED: Duplicate screen tracking - centralized in _layout.tsx
  // Screen view events are now automatically tracked by the onboarding host
  
  // Generate prayer if not already available
  useEffect(() => {
    const generatePrayerIfNeeded = async () => {
      // If we already have prayer content, don't regenerate
      if (firstPrayerContent && firstPrayerContent !== "Loading your prayer...") {
        return;
      }
      
      // If already generating, don't start again
      if (isGeneratingPrayer) {
        return;
      }
      
      setIsGeneratingPrayer(true);
      setGenerationError(null);
      if (logEvent) {
        logEvent('first_prayer_generation_started');
      }
      
      try {
        const onboardingData = getState();
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          throw new Error('No authenticated user');
        }

        console.log('[FirstPrayer] Generating prayer with onboarding data');

        const currentHour = new Date().getHours();
        const displayTimeOfDay = currentHour < 16 ? 'morning' : 'evening';
        console.log(`[FirstPrayer] Prayer will display as ${displayTimeOfDay} based on current time (${currentHour}:00)`);
        if (logEvent) {
          logEvent('first_prayer_generation_context_ready', {
            time_of_day: displayTimeOfDay,
          });
        }

        const payload = {
          slot: 'onboarding-initial',
          initialOnboardingSnapshot: {
            userId: session.user.id,
            firstName: onboardingData.firstName,
            initialMotivation: onboardingData.initialMotivation,
            mood: onboardingData.mood?.id,
            moodContext: onboardingData.moodContext,
            prayerNeeds: onboardingData.prayerNeeds,
            customPrayerNeed: onboardingData.customPrayerNeed,
            relationshipWithGod: onboardingData.relationshipWithGod,
            prayerFrequency: onboardingData.prayerFrequency,
            faithTradition: onboardingData.faithTradition,
            commitmentLevel: onboardingData.commitmentLevel,
            streakGoalDays: onboardingData.streakGoalDays,
            prayerFocusPeople: onboardingData.prayerFocusPeople
          }
        };

        const result = await invokeGeneratePrayerWithRetry(payload, {
          source: 'onboarding-first-prayer',
          userId: session.user.id,
        });

        if (result.error || !result.data?.prayer) {
          secureLog.error('[FirstPrayer] Failed to generate onboarding prayer', result.error, {
            attempts: result.attempts,
          });
          await prayerGenerationQueue.enqueueGeneration({
            userId: session.user.id,
            payload,
            slot: 'onboarding-initial',
            source: 'onboarding-first-prayer',
          });
          setGenerationError('We\'re still preparing your first prayer. It will appear shortly.');
          if (logEvent) {
            logEvent('first_prayer_generation_queued', {
              attempts: result.attempts,
            });
          }
          return;
        }

        setFirstPrayerContent(result.data.prayer);
        if (result.data.prayerId) {
          setFirstPrayerId(result.data.prayerId);
          console.log('[FirstPrayer] Prayer ID stored:', result.data.prayerId);
        }
        console.log('[FirstPrayer] Prayer generated successfully');
        if (logEvent) {
          logEvent('first_prayer_generation_succeeded', {
            prayer_id: result.data.prayerId,
            attempts: result.attempts,
          });
        }
        
      } catch (error) {
        console.error('[FirstPrayer] Error generating prayer:', error);
        setGenerationError('Unable to generate your prayer. We\'ll retry shortly.');
        if (logEvent) {
          logEvent('first_prayer_generation_failed', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      } finally {
        setIsGeneratingPrayer(false);
        if (logEvent) {
          logEvent('first_prayer_generation_finished');
        }
      }
    };
    
    generatePrayerIfNeeded();
  }, [firstPrayerContent, user?.id, getState, isGeneratingPrayer, setFirstPrayerContent, setFirstPrayerId, logEvent]);
  
  // Handle back/navigation - this will trigger when user finishes viewing the prayer
  const handleBack = async () => {
    // Prayer completion is now handled in PrayerDisplayScreen when user taps Amen
    if (logEvent) {
      logEvent('first_prayer_continue_clicked');
    }
    onNext();
  };

  // Determine time of day for display
  const timeOfDay = new Date().getHours() < 16 ? 'morning' : 'evening';

  // Show loading state while generating prayer
  if (!firstPrayerContent || firstPrayerContent === "Loading your prayer..." || isGeneratingPrayer || hasQueuedGeneration) {
    return (
      <View style={styles.container}>
        <OnboardingGradientBackground />
        <Animated.View 
          entering={FadeIn.duration(400).delay(100)}
          style={styles.loadingContainer}
        >
          <View style={styles.lottieContainer}>
            <LottieView
              source={require('../../../../assets/lottie/love-card.json')}
              autoPlay
              loop
              style={styles.lottie}
              colorFilters={[
                { keypath: "Layer 2 Outlines", color: "#6C63FF" },
                { keypath: "Layer 3 Outlines", color: "#7C71E0" },
                { keypath: "Layer 4 Outlines", color: "#9866C5" },
                { keypath: "Layer 5 Outlines", color: "#5E55D1" },
                { keypath: "Layer 6 Outlines", color: "#8B80FF" }
              ]}
            />
          </View>
          
          <Animated.View entering={FadeIn.duration(600).delay(300)}>
            <Text style={styles.loadingTitle}>Creating your prayer</Text>
            <Text style={styles.loadingSubtitle}>This usually takes 10-20 seconds</Text>
          </Animated.View>

          {generationError && (
            <Text style={styles.errorText}>{generationError}</Text>
          )}
        </Animated.View>
      </View>
    );
  }

  // Use the existing sophisticated prayer-display component EXACTLY as it appears in the main app
  return (
    <PrayerDisplayScreen
      prayer={firstPrayerContent}
      timeOfDay={timeOfDay}
      onBack={handleBack}
      isOnboarding={true}
      prayerId={firstPrayerId || undefined}
      peopleOverride={prayerFocusPeople?.map(p => ({
        id: p.id,
        name: p.name,
        image_uri: p.image_uri,
        relationship: p.relationship,
        gender: p.gender,
      }))}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  lottieContainer: {
    width: 200,
    height: 200,
    marginBottom: 40,
  },
  lottie: {
    width: '100%',
    height: '100%',
  },
  loadingTitle: {
    fontSize: 24,
    fontFamily: 'SNPro-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  loadingSubtitle: {
    fontSize: 16,
    fontFamily: 'SNPro-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
});

// Export directly without error boundary
export default FirstPrayerDisplayScreenCore; 