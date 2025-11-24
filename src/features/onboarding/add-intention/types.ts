import { PrayerTopicId } from '../../../constants/prayerConstants';
import { PrayerFocusPerson } from '../../../stores/onboardingStore';

// SDUI Configuration Types
export interface AddIntentionScreenConfig {
  isForSelfIntention?: boolean; // Added for self-intention mode
  intentionCollectionPhase: {
    introTitle?: string;
    introSubtitle?: string;
    intentionPrompt: {
      titleTemplate: string;
      categorySelectorLabel?: string;
      detailsInputPlaceholder: string;
      madlibConnectorNeeds?: string;
      madlibConnectorFor?: string;
      madlibPlaceholderWhat?: string;
      madlibPlaceholderDetails?: string;
    };
    nextButtonText: string;
    finishButtonText: string;
    displayedCategoryIds?: string[];
  };
  alerts?: { // Optional alerts from config
    missingNeedError?: string;
    missingDetailsError?: string;
    genericSaveError?: string;
  }
}

export interface AddIntentionScreenProps {
  config: AddIntentionScreenConfig;
  onNext: () => void;
  // logSduiEvent is available from host layout if needed
}

// Display Category Type
export interface DisplayCategory {
  id: string;
  label: string;
  emoji?: string;
  customDetailPrompt?: string;
  customDetailPlaceholder?: string;
}

// Form State Type
export interface OnboardingAddIntentionFormState {
  selectedNeedId: PrayerTopicId | null;
  needDetails: string;
  currentPersonIndex: number;
}

// Show States Type
export interface OnboardingAddIntentionShowStates {
  showNeedSelector: boolean;
  showDetailsInput: boolean;
  showSuccess: boolean;
  celebrationPersonName?: string;
}

// Hook Return Type
export interface UseOnboardingAddIntentionReturn {
  // State
  formState: OnboardingAddIntentionFormState;
  showStates: OnboardingAddIntentionShowStates;
  
  // Computed
  currentPerson: PrayerFocusPerson | null;
  currentCategory: DisplayCategory | null;
  isCompletable: boolean;
  displayedCategories: DisplayCategory[];
  isSelfMode: boolean;
  
  // Actions
  handlers: {
    handleNeedSelect: (needId: PrayerTopicId) => void;
    handleDetailsChange: (text: string) => void;
    handleSaveIntention: () => Promise<void>;
    toggleNeedSelector: () => void;
    toggleDetailsInput: () => void;
  };
  
  // UI State
  isLoading: boolean;
  animations: {
    gridTranslateX: any; // SharedValue<number> from reanimated
    gridAnimatedStyle: any; // AnimatedStyle from reanimated
  };
}

// Constants
export const DETAILS_MAX_LENGTH = 200; 