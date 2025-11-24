import { PrayerTopicId } from '../../constants/prayerConstants';
import { RelationshipChipData } from '../../constants/prayerConstants';
import type { PrayerPerson } from '../../repositories/peopleRepository';

// Main flow states
export type FlowSection = 'person' | 'need' | 'details';

// Manual person creation states
export interface ManualPersonCreationState {
  isActive: boolean;
  step: 'relationship' | 'name' | 'pronoun';
  selectedRelationship: RelationshipChipData | null;
  name: string;
  gender: 'he' | 'she' | 'name' | null;
}

// Form state
export interface IntentionFormState {
  selectedPerson: PrayerPerson | null;
  isForSelf: boolean;
  selectedNeedId: PrayerTopicId | null;
  needDetails: string;
}

// Component props types
export interface AddIntentionHeaderProps {
  isEditing: boolean;
  onBack: () => void;
}

export interface MadlibSentenceProps {
  isForSelf: boolean;
  selectedPerson: PrayerPerson | null;
  selectedNeedId: PrayerTopicId | null;
  currentCategory: { emoji: string; label: string } | null;
  onPersonClick: () => void;
  onNeedClick: () => void;
  isPersonLocked: boolean;
}

export interface PersonSelectorProps {
  isForSelf: boolean;
  selectedPerson: PrayerPerson | null;
  prayerPeople: PrayerPerson[];
  isLoading: boolean;
  onSelectSelf: () => void;
  onSelectPerson: (person: PrayerPerson) => void;
  onAddPerson: () => void;
}

export interface ManualPersonCreationProps {
  state: ManualPersonCreationState;
  isLoading: boolean;
  contactInfo?: {
    id: string;
    name: string;
    image_uri?: string;
    phone?: string;
    email?: string;
  };
  onRelationshipSelect: (relationship: RelationshipChipData) => void;
  onNameSubmit: (name: string) => void;
  onGenderSelect: (gender: 'he' | 'she' | 'name') => void;
  onCancel: () => void;
  onBack: () => void;
}

export interface NeedSelectorProps {
  selectedNeedId: PrayerTopicId | null;
  onSelect: (needId: PrayerTopicId) => void;
}

export interface DetailsInputProps {
  details: string;
  currentCategory: { 
    emoji: string; 
    label: string;
    customDetailPrompt?: string;
    customDetailPlaceholder?: string;
  } | null;
  maxLength: number;
  onChangeText: (text: string) => void;
}

export interface SuccessCelebrationProps {
  visible: boolean;
  onComplete?: () => void;
}

export interface FloatingActionButtonProps {
  isCompletable: boolean;
  isLoading: boolean;
  isEditing: boolean;
  onSave: () => void;
}

// Hook return type
export interface UseAddIntentionReturn {
  // States
  formState: IntentionFormState;
  manualPersonState: ManualPersonCreationState;
  currentSection: FlowSection;
  showSections: {
    person: boolean;
    need: boolean;
    details: boolean;
  };
  isLoading: boolean;
  isLoadingIntention: boolean;
  showSuccess: boolean;
  currentCategory: { emoji: string; label: string } | null;
  isCompletable: boolean;
  isEditing: boolean;
  contactInfo?: {
    id: string;
    name: string;
    image_uri?: string;
    phone?: string;
    email?: string;
  };
  
  // Actions
  handlePersonSelect: (person: PrayerPerson) => void;
  handleSelfSelect: () => void;
  handleNeedSelect: (needId: PrayerTopicId) => void;
  handleDetailsChange: (text: string) => void;
  handleSave: () => Promise<void>;
  handleDelete: () => Promise<void>;
  
  // Navigation
  transitionToSection: (section: FlowSection) => void;
  togglePersonSelector: () => void;
  toggleNeedSelector: () => void;
  toggleDetailsInput: () => void;
  
  // Manual person creation
  handleStartManualPersonCreation: () => void;
  handleRelationshipSelect: (relationship: RelationshipChipData) => void;
  handleManualPersonNameSubmit: (name: string) => void;
  handleGenderSelect: (gender: 'he' | 'she' | 'name') => void;
  handleCancelManualPersonCreation: () => void;
} 