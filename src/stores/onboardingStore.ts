import { create } from 'zustand';
import { AtomicDataStore } from '../features/onboarding/services/onboarding/atomic-data-store';

// Enum based on PRD Section 4.1 (profiles table)
export type InitialMotivation = 'consistency' | 'personal' | 'closer' | 'trying' | 'personalization' | 'restart' | 'intercession' | 'inspiration' | 'start' | null;

// Define the prayer focus person type
export interface PrayerFocusPerson {
  id: string;
  name: string;
  image_uri?: string; // Add image URI
  relationship?: string; // Add relationship
  gender?: string; // Changed from pronouns
  device_contact_id?: string | null;
  phoneNumberHash?: string; // Match main store field name for consistency
  phone_number_hash?: string; // Keep for database compatibility
}

// Define the structure for the last added intention details
export interface LastAddedIntention {
  id?: string;
  person_id?: string;
  personName: string;
  personImageUri?: string;
  phoneNumber?: string;
  category: string; // Assuming PrayerTopicId will be string here
  details: string;
  isSelf: boolean;
  is_active?: boolean;
}

// Define mood type
export interface Mood {
  id: string;
  emoji: string;
  label: string;
}

// Define the shape of the onboarding state
interface OnboardingState {
  // User selections & inputs
  initialMotivation: InitialMotivation;
  firstName: string;
  relationshipWithGod: 'very_close' | 'close' | 'complicated' | 'distant' | 'rebuilding' | '';
  prayerFrequency: 'multiple_daily' | 'daily' | 'few_times_week' | 'occasionally' | 'rarely' | '';
  faithTradition: 'catholic' | 'christian_non_catholic' | 'other' | '';
  commitmentLevel: 'very_committed' | 'ready_to_start' | 'want_to_try' | null;
  streakGoalDays: number | null;
  
  // Deeper understanding fields (Noom-style)
  prayerStruggleContext: string;
  prayerDisconnectReason: string;
  personalPrayerObstacles: string;
  meaningfulPrayerExperience: string;
  distanceFromGodReason: string;
  spiritualGoals: string;
  
  // Prayer Focus People
  prayerFocusPeople: PrayerFocusPerson[];
  
  // Original onboarding fields  
  mood: Mood | null;
  moodContext: string;
  
  // Add prayerTimes
  prayerTimes: string[];
  
  // User's personal prayer needs
  prayerNeeds: string[];
  customPrayerNeed: string;
  
  // Flow control
  currentStep: number;
  hasCompletedOnboarding: boolean;
  isLoading: boolean;
  
  // Additional state properties
  consentGiven: boolean | null;
  currentBatchOfIntentions: LastAddedIntention[];
  tempNavParams: any | null;
  firstPrayerContent: string | null;
  firstPrayerId: string | null;
  
  // Flow Studio & Paywall integration
  email?: string;
  currentFlowId: string | null;
  currentStepIndex: number;
  completedSteps: string[];
  paywallShown: boolean;
  paywallPlacement: string | null;
  selectedProduct: any | null;
  hasActiveSubscription: boolean;
  
  // Actions to update the state
  setInitialMotivation: (motivation: InitialMotivation) => void;
  
  // Dev/test helper methods
  setTestBatchOfIntentions: (intentions: LastAddedIntention[]) => void;
  setFirstName: (name: string) => void;
  setRelationshipWithGod: (value: 'very_close' | 'close' | 'complicated' | 'distant' | 'rebuilding' | '') => void;
  setPrayerFrequency: (value: 'multiple_daily' | 'daily' | 'few_times_week' | 'occasionally' | 'rarely' | '') => void;
  setFaithTradition: (value: 'catholic' | 'christian_non_catholic' | 'other' | '') => void;
  setCommitmentLevel: (level: 'very_committed' | 'ready_to_start' | 'want_to_try' | null) => void;
  setStreakGoalDays: (days: number | null) => void;
  
  // Actions for deeper understanding (Noom-style)
  setPrayerStruggleContext: (context: string) => void;
  setPrayerDisconnectReason: (reason: string) => void;
  setPersonalPrayerObstacles: (obstacles: string) => void;
  setMeaningfulPrayerExperience: (experience: string) => void;
  setDistanceFromGodReason: (reason: string) => void;
  setSpiritualGoals: (goals: string) => void;
  setHasCompletedDeeperUnderstanding: (completed: boolean) => void;
  
  // Prayer Focus People actions
  setPrayerFocusPeople: (people: PrayerFocusPerson[]) => void;
  updatePrayerFocusPerson: (id: string, updates: Partial<PrayerFocusPerson>) => void;
  
  // Original actions
  setMood: (mood: Mood | null) => void;
  setMoodContext: (context: string) => void;
  setPrayerTimes: (times: string[]) => void;
  
  // Prayer needs actions
  setPrayerNeeds: (needs: string[]) => void;
  setCustomPrayerNeed: (need: string) => void;
  
  setStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  resetOnboarding: () => void;
  setConsent: (consent: boolean | null) => void;
  setHasCompletedOnboarding: (completed: boolean) => void;
  setOnboardingLoading: (loading: boolean) => void;
  addIntentionToCurrentBatch: (intention: LastAddedIntention) => void;
  clearCurrentBatchOfIntentions: () => void;
  setTempNavParams: (params: any | null) => void;
  setFirstPrayerContent: (content: string | null) => void;
  setFirstPrayerId: (id: string | null) => void;
  
  // Atomic operations
  saveStateAtomically: () => Promise<void>;
  loadFromAtomicStore: () => Promise<void>;
  clearAtomicData: () => Promise<void>;
  
  // Flow Studio integration
  setCurrentFlowId: (flowId: string | null) => void;
  setCurrentStepIndex: (index: number) => void;
  syncWithFlowStudio: () => Promise<void>;
  
  // Atomic bootstrap for flow + step
  setFlowAndStep: (flowId: string, stepIndex: number) => Promise<void>;
  
  // Paywall integration
  setPaywallShown: (shown: boolean) => void;
  setPaywallPlacement: (placement: string | null) => void;
  setSelectedProduct: (product: any | null) => void;
  setHasActiveSubscription: (hasSubscription: boolean) => void;
  
  // Additional methods
  addPrayerFocusPerson: (person: PrayerFocusPerson) => void;
  addIntention: (intention: LastAddedIntention) => void;
}

// Initial state (only data, no functions)
const initialState = {
  initialMotivation: null as InitialMotivation,
  firstName: '',
  relationshipWithGod: '' as 'very_close' | 'close' | 'complicated' | 'distant' | 'rebuilding' | '',
  prayerFrequency: '' as 'multiple_daily' | 'daily' | 'few_times_week' | 'occasionally' | 'rarely' | '',
  faithTradition: '' as 'catholic' | 'christian_non_catholic' | 'other' | '',
  commitmentLevel: null as 'very_committed' | 'ready_to_start' | 'want_to_try' | null,
  streakGoalDays: null as number | null,
  
  // Deeper understanding fields (Noom-style)
  prayerStruggleContext: '',
  prayerDisconnectReason: '',
  personalPrayerObstacles: '',
  meaningfulPrayerExperience: '',
  distanceFromGodReason: '',
  spiritualGoals: '',
  
  // Prayer Focus People
  prayerFocusPeople: [] as PrayerFocusPerson[],
  
  // Original onboarding fields  
  mood: null as Mood | null,
  moodContext: '',
  
  // Add prayerTimes initial state
  prayerTimes: [] as string[],
  
  // User's personal prayer needs
  prayerNeeds: [] as string[],
  customPrayerNeed: '',
  
  // Flow control
  currentStep: 1,
  hasCompletedOnboarding: false,
  isLoading: false,
  
  // Additional state properties
  consentGiven: null as boolean | null,
  currentBatchOfIntentions: [] as LastAddedIntention[],
  tempNavParams: null,
  firstPrayerContent: null as string | null,
  firstPrayerId: null as string | null,
  
  // Flow Studio & Paywall integration
  email: undefined as string | undefined,
  currentFlowId: null as string | null,
  currentStepIndex: 0,
  completedSteps: [] as string[],
  paywallShown: false,
  paywallPlacement: null as string | null,
  selectedProduct: null,
  hasActiveSubscription: false,
};

// Create the store
export const useOnboardingStore = create<OnboardingState>()((set, get) => ({
  ...initialState,
  
  // Actions to update the state
  setInitialMotivation: (motivation) => set({ initialMotivation: motivation }),
  
  // Dev/test helper methods
  setTestBatchOfIntentions: (intentions) => set({ currentBatchOfIntentions: intentions }),
  setFirstName: (name) => set({ firstName: name }),
  setRelationshipWithGod: (value) => set({ relationshipWithGod: value }),
  setPrayerFrequency: (value) => set({ prayerFrequency: value }),
  setFaithTradition: (value) => set({ faithTradition: value }),
  setCommitmentLevel: (level) => set({ commitmentLevel: level }),
  setStreakGoalDays: (days) => set({ streakGoalDays: days }),
  
  // Actions for deeper understanding (Noom-style)
  setPrayerStruggleContext: (context) => set({ prayerStruggleContext: context }),
  setPrayerDisconnectReason: (reason) => set({ prayerDisconnectReason: reason }),
  setPersonalPrayerObstacles: (obstacles) => set({ personalPrayerObstacles: obstacles }),
  setMeaningfulPrayerExperience: (experience) => set({ meaningfulPrayerExperience: experience }),
  setDistanceFromGodReason: (reason) => set({ distanceFromGodReason: reason }),
  setSpiritualGoals: (goals) => set({ spiritualGoals: goals }),
  setHasCompletedDeeperUnderstanding: (completed) => set({}), // No-op for now
  
  // Prayer Focus People actions
  setPrayerFocusPeople: (people) => {
    set({ prayerFocusPeople: people });
    console.log(`[OnboardingStore] Updated prayer people count: ${people.length}`, people.map(p => ({ name: p.name, id: p.id })));
    // Save atomically after update
    get().saveStateAtomically().catch(error => {
      console.error('[OnboardingStore] Failed to save atomically:', error);
    });
  },
  
  updatePrayerFocusPerson: (id, updates) => set((state) => ({
    prayerFocusPeople: state.prayerFocusPeople.map(person => 
      person.id === id ? { ...person, ...updates } : person
    )
  })),
  
  // Original actions
  setMood: (mood) => set({ mood }),
  setMoodContext: (context) => set({ moodContext: context }),
  setPrayerTimes: (times) => set({ prayerTimes: times }),
  
  // Prayer needs actions
  setPrayerNeeds: (needs) => set({ prayerNeeds: needs }),
  setCustomPrayerNeed: (need) => set({ customPrayerNeed: need }),
  
  setStep: (step) => set({ currentStep: Math.max(1, step) }),
  nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),
  previousStep: () => set((state) => ({ currentStep: Math.max(1, state.currentStep - 1) })),
  resetOnboarding: () => set(initialState),
  setConsent: (consent) => set({ consentGiven: consent }),
  setHasCompletedOnboarding: (completed) => set({ hasCompletedOnboarding: completed }),
  setOnboardingLoading: (loading) => set({ isLoading: loading }),
  
  addIntentionToCurrentBatch: (intention) => 
    set((state) => ({ 
      currentBatchOfIntentions: [...state.currentBatchOfIntentions, intention] 
    })),
  
  clearCurrentBatchOfIntentions: () => set({ currentBatchOfIntentions: [] }),
  setTempNavParams: (params) => set({ tempNavParams: params }),
  setFirstPrayerContent: (content) => set({ firstPrayerContent: content }),
  setFirstPrayerId: (id) => set({ firstPrayerId: id }),
  
  // Atomic operations
  saveStateAtomically: async () => {
    try {
      const state = get();
      const result = await AtomicDataStore.updateData(async (data) => {
        // Convert empty strings to null for enum fields
        const relationshipWithGod = state.relationshipWithGod === '' ? null : state.relationshipWithGod;
        const prayerFrequency = state.prayerFrequency === '' ? null : state.prayerFrequency;
        const faithTradition = state.faithTradition === '' ? null : state.faithTradition;
        
        return {
          ...data,
          // User profile data
          firstName: state.firstName,
          email: state.email,
          initialMotivation: state.initialMotivation,
          relationshipWithGod,
          prayerFrequency,
          faithTradition,
          commitmentLevel: state.commitmentLevel,
          streakGoalDays: state.streakGoalDays,
          
          // Mood and context
          mood: state.mood ? {
            id: state.mood.id,
            emoji: state.mood.emoji,
            label: state.mood.label,
          } : undefined,
          moodContext: state.moodContext,
          
          // Prayer people and intentions
          prayerPeople: state.prayerFocusPeople.map(p => ({
            ...p,
            image_uri: p.image_uri || undefined,
            relationship: p.relationship || undefined,
            gender: p.gender || undefined,
            device_contact_id: p.device_contact_id || undefined,
            phone_number_hash: p.phone_number_hash || undefined,
          })),
          prayerIntentions: state.currentBatchOfIntentions.map(i => ({
            id: i.id || `intention-${Date.now()}-${Math.random()}`,
            person_id: i.person_id || '',
            category: i.category,
            details: i.details,
            is_active: i.is_active ?? true,
          })),
          
          // Prayer preferences
          prayerTimes: state.prayerTimes,
          prayerNeeds: state.prayerNeeds,
          customPrayerNeed: state.customPrayerNeed,
          
          // Flow state
          currentFlowId: state.currentFlowId || undefined,
          currentStepIndex: state.currentStepIndex,
          completedSteps: state.completedSteps,
          
          // Paywall state
          paywallShown: state.paywallShown,
          paywallPlacement: state.paywallPlacement || undefined,
          selectedProduct: state.selectedProduct || undefined,
          
          // Prayer generation state
          firstPrayerContent: state.firstPrayerContent || undefined,
          firstPrayerId: state.firstPrayerId || undefined,
        };
      });
      
      if (!result) {
        console.error('AtomicDataStore.updateData returned undefined');
        throw new Error('Failed to save state: updateData returned undefined');
      }
      
      if (!result.success) {
        console.error('Failed to save state atomically:', result.error);
        throw result.error || new Error('Unknown save error');
      }
    } catch (error) {
      console.error('Error in saveStateAtomically:', error);
      // Re-throw to let caller handle it
      throw error;
    }
  },
  
  loadFromAtomicStore: async () => {
    const data = await AtomicDataStore.getData();
    
    console.log('[OnboardingStore] Loading from atomic store:', {
      currentFlowId: data.currentFlowId,
      currentStepIndex: data.currentStepIndex,
      hasData: !!data
    });
    
    // Convert null values back to empty strings for enum fields
    const relationshipWithGod = (data.relationshipWithGod === null || data.relationshipWithGod === undefined) 
      ? '' as const 
      : data.relationshipWithGod;
    const prayerFrequency = (data.prayerFrequency === null || data.prayerFrequency === undefined) 
      ? '' as const 
      : data.prayerFrequency;
    const faithTradition = (data.faithTradition === null || data.faithTradition === undefined) 
      ? '' as const 
      : data.faithTradition;
    
    // Map atomic store data back to state
    set({
      firstName: data.firstName || '',
      email: data.email,
      initialMotivation: data.initialMotivation || null,
      relationshipWithGod,
      prayerFrequency,
      faithTradition,
      commitmentLevel: data.commitmentLevel || null,
      streakGoalDays: data.streakGoalDays || null,
      
      mood: data.mood ? {
        id: data.mood.id,
        emoji: data.mood.emoji,
        label: data.mood.label,
      } : null,
      moodContext: data.moodContext || '',
      
      prayerFocusPeople: (data.prayerPeople || []).filter(p => p.id && p.name).map(p => ({
        id: p.id!,
        name: p.name!,
        image_uri: p.image_uri,
        relationship: p.relationship,
        gender: p.gender,
        device_contact_id: p.device_contact_id,
        phone_number_hash: p.phone_number_hash,
      })),
      // Map the intentions to include personName and isSelf properties
      currentBatchOfIntentions: (data.prayerIntentions || []).map(intention => {
        let person = undefined;
        if (data.prayerPeople && intention.person_id) {
          for (let i = 0; i < data.prayerPeople.length; i++) {
            if (data.prayerPeople[i].id === intention.person_id) {
              person = data.prayerPeople[i];
              break;
            }
          }
        }
        
        // Detect self intentions: person_id is null or empty
        const isSelfIntention = !intention.person_id;
        
        return {
          id: intention.id,
          person_id: intention.person_id,
          category: intention.category,
          details: intention.details,
          is_active: intention.is_active,
          personName: isSelfIntention ? 'Myself' : (person?.name || 'Unknown'),
          personImageUri: person?.image_uri,
          isSelf: isSelfIntention, // Properly detect self intentions
        };
      }),
      
      prayerTimes: data.prayerTimes || [],
      prayerNeeds: data.prayerNeeds || [],
      customPrayerNeed: data.customPrayerNeed || '',
      
      currentFlowId: data.currentFlowId || null,
      currentStepIndex: data.currentStepIndex || 0,
      completedSteps: data.completedSteps || [],
      
      paywallShown: data.paywallShown || false,
      paywallPlacement: data.paywallPlacement || null,
      selectedProduct: data.selectedProduct || null,
      
      // Prayer generation state
      firstPrayerContent: data.firstPrayerContent || null,
      firstPrayerId: data.firstPrayerId || null,
    });
  },
  
  clearAtomicData: async () => {
    await AtomicDataStore.clearData();
    // Reset all state to initial values
    set(initialState);
  },
  
  // Flow Studio integration
  setCurrentFlowId: (flowId) => {
    set({ currentFlowId: flowId });
    // Save atomically after update
    get().saveStateAtomically().catch(err => 
      console.error('[OnboardingStore] Failed to save flow ID:', err)
    );
  },
  setCurrentStepIndex: (index) => {
    const { currentFlowId } = get();
    if (index > 0 && !currentFlowId) {
      console.warn('[OnboardingStore] Refusing to persist step index > 0 without a flowId');
      return;
    }
    set({ currentStepIndex: index });
    // Save atomically after update
    get().saveStateAtomically().catch(err => 
      console.error('[OnboardingStore] Failed to save step index:', err)
    );
  },
  
  syncWithFlowStudio: async () => {
    const state = get();
    if (!state.currentFlowId) return;
    
    try {
      // This would typically sync the current state with the flow studio
      // For now, we'll just log it
      console.log('Syncing with flow studio:', {
        flowId: state.currentFlowId,
        stepIndex: state.currentStepIndex,
        completedSteps: state.completedSteps,
      });
    } catch (error) {
      console.error('Failed to sync with flow studio:', error);
    }
  },

  // Atomic bootstrap for flow + step
  setFlowAndStep: async (flowId, stepIndex) => {
    // Allow stepIndex 0 even without flowId? No: we always expect a valid flowId here.
    set({ currentFlowId: flowId, currentStepIndex: stepIndex });
    try {
      await get().saveStateAtomically();
    } catch (err) {
      console.error('[OnboardingStore] Failed to save flow+step atomically:', err);
      throw err;
    }
  },
  
  // Paywall integration
  setPaywallShown: (shown) => set({ paywallShown: shown }),
  setPaywallPlacement: (placement) => set({ paywallPlacement: placement }),
  setSelectedProduct: (product) => set({ selectedProduct: product }),
  setHasActiveSubscription: (hasSubscription) => set({ hasActiveSubscription: hasSubscription }),
  
  // Update existing methods to use atomic operations
  addPrayerFocusPerson: (person) => {
    set((state) => ({
      prayerFocusPeople: [...state.prayerFocusPeople, person],
    }));
    // Save atomically after update
    get().saveStateAtomically();
  },
  
  addIntention: (intention) => {
    set((state) => ({
      currentBatchOfIntentions: [...state.currentBatchOfIntentions, intention],
    }));
    // Save atomically after update
    get().saveStateAtomically();
  },
}));