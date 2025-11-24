import { useState, useEffect, useMemo } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import { supabase } from '../../../../lib/supabaseClient';
import { useAuth } from '../../../../hooks/useAuth';
import { useOnboardingStore } from '../../../../stores/onboardingStore';
import { useCreateIntention } from '../../../prayer-display/hooks/useIntentions';
import { PRAYER_TOPICS, PrayerTopicId } from '../../../../constants/prayerConstants';
import { 
  AddIntentionScreenConfig, 
  UseOnboardingAddIntentionReturn, 
  DisplayCategory,
  DETAILS_MAX_LENGTH 
} from '../types';

export function useOnboardingAddIntention(
  config: AddIntentionScreenConfig,
  onNext: () => void
): UseOnboardingAddIntentionReturn {
  const { user } = useAuth();
  
  // Select state and actions from onboarding store
  const prayerFocusPeople = useOnboardingStore(state => state.prayerFocusPeople);
  const addIntentionToCurrentBatch = useOnboardingStore(state => state.addIntentionToCurrentBatch);

  // React Query mutation for creating intentions
  const createIntentionMutation = useCreateIntention();

  // Animation values
  const gridTranslateX = useSharedValue(0);
  const gridAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: gridTranslateX.value }],
    };
  });

  // Form state
  const [currentPersonIndex, setCurrentPersonIndex] = useState(0);
  const [selectedNeedId, setSelectedNeedId] = useState<PrayerTopicId | null>(null);
  const [needDetails, setNeedDetails] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // UI state
  const [showNeedSelector, setShowNeedSelector] = useState(true);
  const [showDetailsInput, setShowDetailsInput] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successTimeout, setSuccessTimeout] = useState<number | null>(null);
  const [celebrationPersonName, setCelebrationPersonName] = useState<string | undefined>(undefined);

  const isSelfMode = config.isForSelfIntention === true;
  const currentPerson = isSelfMode ? null : prayerFocusPeople[currentPersonIndex];

  // Reset state when person changes or mode changes
  useEffect(() => {
    setSelectedNeedId(null);
    setNeedDetails('');
    setShowNeedSelector(true);
    setShowDetailsInput(false);
  }, [currentPersonIndex, isSelfMode]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (successTimeout) {
        clearTimeout(successTimeout as any);
      }
    };
  }, [successTimeout]);

  // Compute displayed categories based on config
  const displayedCategories: DisplayCategory[] = useMemo(() => {
    const allTopics = Object.values(PRAYER_TOPICS);
    const displayedIds = config.intentionCollectionPhase.displayedCategoryIds;

    let filteredTopics = allTopics;

    if (displayedIds && displayedIds.length > 0) {
      const idSet = new Set(displayedIds);
      filteredTopics = allTopics.filter(topic => idSet.has(topic.id));
    }
    
    return filteredTopics.map(topic => ({
      id: topic.id,
      label: topic.label,
      emoji: topic.emoji,
      customDetailPrompt: topic.customDetailPrompt,
      customDetailPlaceholder: topic.customDetailPlaceholder,
    }));
  }, [config.intentionCollectionPhase.displayedCategoryIds]);

  const currentCategory = useMemo(() => {
    return displayedCategories.find(cat => cat.id === selectedNeedId) || null;
  }, [selectedNeedId, displayedCategories]);

  const isCompletable = !!selectedNeedId && !!needDetails.trim();

  // Handlers
  const transitionToSection = (section: 'need' | 'details') => {
    setShowNeedSelector(section === 'need');
    setShowDetailsInput(section === 'details');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleNeedSelector = () => {
    // Trigger the animation
    gridTranslateX.value = withSequence(
      withTiming(-5, { duration: 50 }),
      withTiming(5, { duration: 50 }),
      withTiming(-3, { duration: 50 }),
      withTiming(3, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );

    setShowNeedSelector(true);
    setShowDetailsInput(false);
    // Keep details when going back - user can manually clear if needed
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleDetailsInput = () => {
    if (showDetailsInput) {
      transitionToSection('need');
    } else {
      transitionToSection('details');
    }
  };

  const handleNeedSelect = (needId: PrayerTopicId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedNeedId(needId);
    transitionToSection('details');
  };

  const handleDetailsChange = (text: string) => {
    if (text.length <= DETAILS_MAX_LENGTH) {
      setNeedDetails(text);
    }
  };

  const handleSaveIntention = async () => {
    if (!user?.id || !selectedNeedId) {
      Alert.alert("Error", config.alerts?.missingNeedError || "Please select a prayer need.");
      return;
    }

    if (!needDetails.trim()) {
      Alert.alert("Missing Information", config.alerts?.missingDetailsError || "Please add some details about this need.");
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Check if similar intention already exists
      const personId = isSelfMode ? null : (currentPerson?.id || null);
      const trimmedDetails = needDetails.trim();
      
      const { data: existingIntention } = await supabase
        .from('prayer_intentions')
        .select('id')
        .eq('user_id', user.id)
        .eq('person_id', personId)
        .eq('category', selectedNeedId)
        .ilike('details', trimmedDetails)
        .single();
        
      if (existingIntention) {
        console.log('[OnboardingAddIntention] Similar intention already exists, skipping duplicate');
        // Still proceed as if it was saved successfully
      } else {
        // Save using React Query mutation (which handles both DB and cache updates)
        const intentionData = {
          person_id: personId,
          category: selectedNeedId,
          details: trimmedDetails,
          is_active: true,
        };

        await createIntentionMutation.mutateAsync({
          userId: user.id,
          intention: intentionData
        });
        console.log(`[OnboardingAddIntention] Successfully saved intention via store for person_id: ${personId}`);
      }

      // 2. Add to batch for confirmation screen
      if (!isSelfMode && currentPerson) {
        const intentionDataToBatch = {
          personName: currentPerson.name,
          personImageUri: currentPerson.image_uri,
          category: selectedNeedId,
          details: needDetails.trim(),
          isSelf: false,
        };
        addIntentionToCurrentBatch(intentionDataToBatch);
        console.log("[OnboardingAddIntention] Batched intention for:", currentPerson.name);
      } else if (isSelfMode) {
        const selfIntentionDataToBatch = {
          personName: user?.user_metadata?.display_name || "Myself",
          personImageUri: user?.user_metadata?.avatar_url || undefined,
          category: selectedNeedId,
          details: needDetails.trim(),
          isSelf: true,
        };
        addIntentionToCurrentBatch(selfIntentionDataToBatch);
        console.log("[OnboardingAddIntention] Self-intention saved to DB and batched for summary.");
      }

      // Show success celebration with captured person name
      setCelebrationPersonName(currentPerson?.name);
      setShowSuccess(true);
      
      // Auto-continue after delay
      if (successTimeout) clearTimeout(successTimeout as any);
      const timeout = setTimeout(() => {
        if (!isSelfMode && currentPersonIndex < prayerFocusPeople.length - 1) {
          // Moving to next person: update index first, then hide overlay to prevent flashback
          setCurrentPersonIndex(currentPersonIndex + 1);
          setTimeout(() => setShowSuccess(false), 0);
        } else {
          // Navigating away: keep overlay visible during transition to avoid flash
          onNext();
        }
      }, 2500);
      setSuccessTimeout(timeout);

    } catch (error) {
      console.error('[OnboardingAddIntention] Overall error in handleSaveIntention:', error);
      Alert.alert("Error", config.alerts?.genericSaveError || `Failed to save prayer intention: ${(error as Error).message}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    // State
    formState: {
      selectedNeedId,
      needDetails,
      currentPersonIndex,
    },
    showStates: {
      showNeedSelector,
      showDetailsInput,
      showSuccess,
      celebrationPersonName,
    },
    
    // Computed
    currentPerson,
    currentCategory,
    isCompletable,
    displayedCategories,
    isSelfMode,
    
    // Actions
    handlers: {
      handleNeedSelect,
      handleDetailsChange,
      handleSaveIntention,
      toggleNeedSelector,
      toggleDetailsInput,
    },
    
    // UI State
    isLoading,
    animations: {
      gridTranslateX,
      gridAnimatedStyle,
    },
  };
} 