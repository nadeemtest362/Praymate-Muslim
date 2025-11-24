import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated from 'react-native-reanimated';

import OnboardingGradientBackground from '../../../components/shared/OnboardingGradientBackground';
import { FloatingParticles } from '../../../components/shared/FloatingParticles';
import {
  useOnboardingAddIntention,
  OnboardingMadlibSentence,
  OnboardingNeedSelector,
  OnboardingDetailsInput,
  OnboardingSaveButton,
  OnboardingSuccessCelebration,
  AddIntentionScreenProps,
} from '../add-intention';
import { useOnboardingStore } from '../../../stores/onboardingStore';
import useResponsive from '../../../hooks/useResponsive';
import { OnboardingFlowContext } from '../../../contexts/OnboardingFlowContext';
import type { PrayerTopicId } from '../../../constants/prayerConstants';

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: R.w(5),
    paddingTop: R.h(2),
    paddingBottom: R.h(2),
  },
  headerTitle: {
    fontSize: R.font(32),
    fontFamily: 'SNPro-Heavy',
    color: '#FFFFFF',
    lineHeight: R.font(36),
    letterSpacing: -R.w(0.3),
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  progressTag: {
    marginBottom: R.h(2),
    alignSelf: 'center',
    paddingHorizontal: R.w(4),
    paddingVertical: R.h(0.7),
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: R.w(2),
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.w(2),
  },
  progressLabel: {
    fontSize: R.font(13),
    fontFamily: 'SNPro-Medium',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.3,
  },
  progressNumbers: {
    fontSize: R.font(14),
    fontFamily: 'SNPro-Bold',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: R.w(5),
    flexGrow: 1,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: R.font(16),
    fontWeight: '600',
  },
});


function OnboardingAddIntentionScreenCore({ config, onNext }: AddIntentionScreenProps) {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);
  
  const prayerFocusPeople = useOnboardingStore(state => state.prayerFocusPeople);
  const flowContext = React.useContext(OnboardingFlowContext);
  const logEvent = flowContext?.logEvent;
  
  const {
    formState,
    showStates,
    currentPerson,
    currentCategory,
    isCompletable,
    displayedCategories,
    isSelfMode,
    handlers,
    isLoading,
    animations,
  } = useOnboardingAddIntention(config, onNext);

  const handleNeedSelect = React.useCallback(
    (needId: PrayerTopicId) => {
      if (logEvent) {
        logEvent('intention_need_selected', {
          need_id: needId,
        });
      }
      handlers.handleNeedSelect(needId);
    },
    [handlers, logEvent]
  );

  const handleToggleNeedSelector = React.useCallback(() => {
    if (logEvent) {
      logEvent('intention_need_selector_toggled', {
        next_state: !showStates.showNeedSelector,
      });
    }
    handlers.toggleNeedSelector();
  }, [handlers, logEvent, showStates.showNeedSelector]);

  const handleToggleDetailsInput = React.useCallback(() => {
    if (logEvent) {
      logEvent('intention_details_input_toggled', {
        next_state: !showStates.showDetailsInput,
      });
    }
    handlers.toggleDetailsInput();
  }, [handlers, logEvent, showStates.showDetailsInput]);

  const handleDetailsChange = React.useCallback(
    (nextDetails: string) => {
      handlers.handleDetailsChange(nextDetails);
    },
    [handlers]
  );

  
  // Check if we're in a valid state
  if (!isSelfMode && prayerFocusPeople.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <OnboardingGradientBackground />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.outerContainer}>
      {/* Background gradient - covers entire screen including keyboard area */}
      <OnboardingGradientBackground />
      
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : R.h(2.5)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
            <StatusBar style="light" />

            {/* Enhanced floating particles */}
            {!showStates.showSuccess && <FloatingParticles />}

            {/* Header */}
            {!showStates.showSuccess && (
              <View 
                style={[
                  styles.header, 
                  { paddingTop: R.insets.top + R.h(1.5) }
                ]}
              >
                {!isSelfMode && currentPerson && (
                  <View style={styles.progressTag}>
                    <Text style={styles.progressLabel}>Person</Text>
                    <Text style={styles.progressNumbers}>
                      {formState.currentPersonIndex + 1} of {prayerFocusPeople.length}
                    </Text>
                  </View>
                )}
                <Text 
                  style={styles.headerTitle}
              
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {isSelfMode 
                    ? (config.intentionCollectionPhase.introTitle || "My Prayer Focus") 
                    : (config.intentionCollectionPhase.introTitle?.replace('{personName}', currentPerson?.name || 'Someone') || `Prayer for ${currentPerson?.name || 'Someone'}`)}
                </Text>
              </View>
            )}

            <ScrollView
              style={styles.content}
              contentContainerStyle={[
                styles.contentContainer,
                { paddingBottom: showStates.showDetailsInput 
                  ? R.h(15) 
                  : R.h(20) }
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {!showStates.showSuccess && (
                <>
                  {/* Madlib Sentence */}
                  <OnboardingMadlibSentence
                    isSelfMode={isSelfMode}
                    currentPerson={currentPerson}
                    currentCategory={currentCategory}
                    needDetails={formState.needDetails}
                    showDetailsInput={showStates.showDetailsInput}
                    config={config}
                    onNeedClick={handleToggleNeedSelector}
                    onDetailsClick={handleToggleDetailsInput}
                  />

                  {/* Need Selector */}
                  {showStates.showNeedSelector && (
                    <OnboardingNeedSelector
                      selectedNeedId={formState.selectedNeedId}
                      displayedCategories={displayedCategories}
                      gridAnimatedStyle={animations.gridAnimatedStyle}
                      onSelect={handleNeedSelect}
                    />
                  )}

                  {/* Details Input */}
                  {showStates.showDetailsInput && (
                    <OnboardingDetailsInput
                      needDetails={formState.needDetails}
                      currentCategory={currentCategory}
                      config={config}
                      onChangeText={handleDetailsChange}
                    />
                  )}
                </>
              )}

              {/* Save Button */}
              <OnboardingSaveButton
                isCompletable={isCompletable}
                isLoading={isLoading}
                isSelfMode={isSelfMode}
                currentPersonIndex={formState.currentPersonIndex}
                prayerFocusPeopleLength={prayerFocusPeople.length}
                config={config}
                showDetailsInput={showStates.showDetailsInput}
                onSave={async () => {
                  if (logEvent) {
                    logEvent('intention_save_clicked', {
                      is_self_mode: isSelfMode,
                      current_person_id: currentPerson?.id,
                      current_person_index: formState.currentPersonIndex,
                      need_id: formState.selectedNeedId,
                      has_details: formState.needDetails.length > 0,
                    });
                  }

                  // Proceed with save
                  await handlers.handleSaveIntention();
                  if (logEvent) {
                    logEvent('intention_save_completed', {
                      is_self_mode: isSelfMode,
                      current_person_id: currentPerson?.id,
                      next_person_index: formState.currentPersonIndex + 1,
                      remaining_people: Math.max(prayerFocusPeople.length - (formState.currentPersonIndex + 1), 0),
                    });
                  }
                }}
              />
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
      
      {/* Success Celebration */}
      <OnboardingSuccessCelebration
        visible={showStates.showSuccess}
        personName={showStates.celebrationPersonName}
        isSelfMode={isSelfMode}
      />
    </View>
  );
}


// Export directly without error boundary
export default OnboardingAddIntentionScreenCore; 