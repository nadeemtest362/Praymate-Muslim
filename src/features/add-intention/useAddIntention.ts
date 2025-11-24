import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Alert, Keyboard } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { 
  PrayerTopicId, 
  PRAYER_TOPICS,
  RelationshipChipData 
} from '../../constants/prayerConstants';
import { useAuth } from '../../hooks/useAuth';
import { useAllPeople, useAddPersonWithIntention, useAddPersonOnly } from '../people/hooks/usePeople';
import { useIntentions as useIntentionsQuery, useCreateIntention, useUpdateIntention, useDeleteIntention } from '../prayer-display/hooks/useIntentions';
import type { PrayerPerson } from '../../repositories/peopleRepository';
import { generateClientUUID } from '../../utils/uuid';
import { UseAddIntentionReturn, FlowSection, IntentionFormState, ManualPersonCreationState } from './types';
import { trackEvent, mergeAnalyticsProperties } from '../../lib/analytics';

export const useAddIntention = (): UseAddIntentionReturn => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const intentionId = params.id as string | undefined;
  const personId = params.personId as string | undefined;
  const isEditing = !!intentionId;
  
  // Parse contact params from manage-modal
  const contactId = params.contactId as string | undefined;
  const contactName = params.contactName as string | undefined;
  const contactImageUri = params.contactImageUri as string | undefined;
  const contactPhone = params.contactPhone as string | undefined;
  const contactEmail = params.contactEmail as string | undefined;
  
  const { user } = useAuth();
  const { data: allPeople = [], isLoading: isLoadingPeople } = useAllPeople(user?.id || null, { enabled: !!user?.id });
  const prayerPeople = allPeople; // useAllPeople returns all people, which includes prayer people
  const addPersonWithIntentionMutation = useAddPersonWithIntention();
  
  const { data: intentions = [] } = useIntentionsQuery(user?.id || null);
  const createIntentionMutation = useCreateIntention();
  const updateIntentionMutation = useUpdateIntention();
  const deleteIntentionMutation = useDeleteIntention();

  const analyticsBase = useMemo(() => {
    return {
      is_editing: isEditing,
      has_preselected_person: !!personId,
      initial_person_id: personId || null,
    };
  }, [isEditing, personId]);

  // Get intention data for editing (simple direct access)
  const editingIntention = useMemo(() => {
    if (!intentionId) return null;
    return intentions.find(i => i.id === intentionId) || null;
  }, [intentionId, intentions]);

  // Initialize form state for editing
  const initialFormState = useMemo((): IntentionFormState => {
    if (editingIntention) {
      // Find person in prayer people store
      const selectedPerson = editingIntention.person_id 
        ? prayerPeople.find(p => p.id === editingIntention.person_id) || null
        : null;

      return {
        selectedPerson,
        isForSelf: !editingIntention.person_id,
        selectedNeedId: editingIntention.category as PrayerTopicId,
        needDetails: editingIntention.details || '',
      };
    }
    return {
      selectedPerson: null,
      isForSelf: false,
      selectedNeedId: null,
      needDetails: '',
    };
  }, [editingIntention, prayerPeople]);

  // Form state
  const [formState, setFormState] = useState<IntentionFormState>(initialFormState);

  // Track if form has been hydrated to prevent overwriting user edits
  const didHydrate = useRef(false);
  
  // Sync form state when editing intention loads asynchronously (only once)
  useEffect(() => {
    if (editingIntention && !didHydrate.current) {
      setFormState({
        selectedPerson: editingIntention.person_id
          ? allPeople.find(p => p.id === editingIntention.person_id) || null
          : null,
        isForSelf: !editingIntention.person_id,
        selectedNeedId: editingIntention.category as PrayerTopicId,
        needDetails: editingIntention.details || '',
      });
      didHydrate.current = true;
    }
  }, [editingIntention, allPeople]);

  // Manual person creation state
  const [manualPersonState, setManualPersonState] = useState<ManualPersonCreationState>({
    isActive: false,
    step: 'relationship',
    selectedRelationship: null,
    name: '',
    gender: null,
  });

  // UI states
  const hasPreselectedPerson = !!personId;
  const [currentSection, setCurrentSection] = useState<FlowSection>(
    isEditing ? 'details' : hasPreselectedPerson ? 'need' : 'person'
  );
  const [showSections, setShowSections] = useState({
    person: !isEditing && !hasPreselectedPerson, // Don't show person selector when editing or person preselected
    need: hasPreselectedPerson, // Show need selector if person is preselected
    details: isEditing, // Show details when editing
  });
  const [isLoadingIntention, setIsLoadingIntention] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Computed values
  const currentCategory = useMemo(() => {
    if (!formState.selectedNeedId) return null;
    const topic = PRAYER_TOPICS[formState.selectedNeedId];
    return topic ? { emoji: topic.emoji, label: topic.label } : null;
  }, [formState.selectedNeedId]);

  const isCompletable = useMemo(() => {
    return !!(
      (formState.selectedPerson || formState.isForSelf) &&
      formState.selectedNeedId &&
      formState.needDetails.trim()
    );
  }, [formState]);

  // Data is loaded at app level, no need to fetch here

  // Initialize UI state for editing mode
  useEffect(() => {
    if (editingIntention) {
      setShowSections({ person: false, need: false, details: true });
      setCurrentSection('details');
    }
  }, [editingIntention]);

  // Pre-select person if personId is provided
  useEffect(() => {
    if (personId && allPeople.length > 0) {
      console.log(`[AddIntention] Pre-selecting person with ID: ${personId}`);
      console.log(`[AddIntention] Available people:`, allPeople.map(p => ({ id: p.id, name: p.name })));
      
      // Check if personId is the user's ID (self intention)
      if (personId === user?.id) {
        console.log('[AddIntention] Pre-selecting self');
        setFormState(prev => ({ ...prev, selectedPerson: null, isForSelf: true }));
        // Since person is pre-selected, show need selector directly
        setCurrentSection('need');
        setShowSections({ person: false, need: true, details: false });
      } else {
        // Look for person in allPeople array
        const person = allPeople.find(p => p.id === personId);
        if (person) {
          console.log(`[AddIntention] Found person to pre-select:`, person.name);
          setFormState(prev => ({ ...prev, selectedPerson: person, isForSelf: false }));
          // Since person is pre-selected, show need selector directly
          setCurrentSection('need');
          setShowSections({ person: false, need: true, details: false });
        } else {
          console.log(`[AddIntention] Person with ID ${personId} not found in allPeople array, will retry...`);
        }
      }
    } else if (personId) {
      console.log(`[AddIntention] PersonId provided (${personId}) but allPeople not loaded yet`);
    }
  }, [personId, allPeople, user?.id]);

  // Retry pre-selection with a delay if person not found (handles React Query cache timing)
  useEffect(() => {
    if (personId && personId !== user?.id && allPeople.length > 0 && !formState.selectedPerson && !formState.isForSelf) {
      const retryTimeout = setTimeout(() => {
        const person = allPeople.find(p => p.id === personId);
        if (person) {
          console.log(`[AddIntention] Retry successful - found person:`, person.name);
          setFormState(prev => ({ ...prev, selectedPerson: person, isForSelf: false }));
          setCurrentSection('need');
          setShowSections({ person: false, need: true, details: false });
        } else {
          console.log(`[AddIntention] Retry failed - person still not found`);
        }
      }, 500); // Wait 500ms for cache to update

      return () => clearTimeout(retryTimeout);
    }
  }, [personId, allPeople, user?.id, formState.selectedPerson, formState.isForSelf]);

  // Handle contact from manage-modal
  useEffect(() => {
    if (contactId && contactName && !isEditing) {
      console.log(`[AddIntention] Pre-selecting contact: ${contactName}`);
      
      // Set the contact info and start manual person creation
      setManualPersonState({
        isActive: true,
        step: 'relationship',
        selectedRelationship: null,
        name: contactName,
        gender: null,
      });
    }
  }, [contactId, contactName, isEditing]);

  // Navigation handlers
  const transitionToSection = useCallback((section: FlowSection) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentSection(section);
    setShowSections(prev => ({ ...prev, [section]: true }));
  }, []);

  const togglePersonSelector = useCallback(() => {
    // Don't allow changing person when editing
    if (isEditing) {
      return;
    }
    
    if (currentSection === 'person' && showSections.person) {
      setShowSections(prev => ({ ...prev, person: false }));
    } else {
      setCurrentSection('person');
      setShowSections(prev => ({ ...prev, person: true }));
    }
  }, [currentSection, showSections.person, isEditing]);

  const toggleNeedSelector = useCallback(() => {
    if (currentSection === 'need' && showSections.need) {
      // When closing need selector, go back to details if editing
      setShowSections(prev => ({ ...prev, need: false }));
      if (isEditing) {
        setCurrentSection('details');
        setShowSections(prev => ({ ...prev, details: true }));
      }
    } else {
      setCurrentSection('need');
      setShowSections(prev => ({ ...prev, need: true, details: false }));
    }
  }, [currentSection, showSections.need, isEditing]);

  const toggleDetailsInput = useCallback(() => {
    if (currentSection === 'details' && showSections.details) {
      setShowSections(prev => ({ ...prev, details: false }));
    } else {
      setCurrentSection('details');
      setShowSections(prev => ({ ...prev, details: true }));
    }
  }, [currentSection, showSections.details]);

  // Form handlers
  const handlePersonSelect = useCallback((person: PrayerPerson) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFormState(prev => ({ 
      ...prev, 
      selectedPerson: person, 
      isForSelf: false 
    }));
    // Hide person selector and show need selector
    setCurrentSection('need');
    setShowSections({ person: false, need: true, details: false });
    trackEvent('intentions_flow_person_selected', mergeAnalyticsProperties(analyticsBase, {
      person_id: person.id,
      is_for_self: false,
    }));
  }, [analyticsBase]);

  const handleSelfSelect = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFormState(prev => ({ 
      ...prev, 
      selectedPerson: null, 
      isForSelf: true 
    }));
    // Hide person selector and show need selector
    setCurrentSection('need');
    setShowSections({ person: false, need: true, details: false });
    trackEvent('intentions_flow_person_selected', mergeAnalyticsProperties(analyticsBase, {
      person_id: null,
      is_for_self: true,
    }));
  }, [analyticsBase]);

  const handleNeedSelect = useCallback((needId: PrayerTopicId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFormState(prev => ({ ...prev, selectedNeedId: needId }));
    // Hide need selector and show details
    setCurrentSection('details');
    setShowSections({ person: false, need: false, details: true });
    trackEvent('intentions_flow_need_selected', mergeAnalyticsProperties(analyticsBase, {
      category_id: needId,
    }));
  }, [analyticsBase]);

  const handleDetailsChange = useCallback((text: string) => {
    setFormState(prev => ({ ...prev, needDetails: text }));
  }, []);

  // Manual person creation handlers
  const handleStartManualPersonCreation = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Navigate to manage-modal to add from contacts
    router.push({
      pathname: '/people/manage-modal',
      params: {
        fromAddIntention: 'true'
      }
    });
  }, [router]);

  const handleRelationshipSelect = useCallback((relationship: RelationshipChipData) => {
    setManualPersonState(prev => ({
      ...prev,
      selectedRelationship: relationship,
      step: 'name',
      name: relationship.needsCustomName ? (prev.name || contactName || '') : relationship.label,
    }));
  }, [contactName]);

  const handleManualPersonNameSubmit = useCallback((name: string) => {
    const { selectedRelationship } = manualPersonState;
    if (!selectedRelationship) return;

    // Update the manual person state with the submitted name
    setManualPersonState(prev => ({ ...prev, name }));

    if (selectedRelationship.hidePronounStep) {
      // Skip pronoun step, use default gender
      const newPerson: PrayerPerson = {
        id: generateClientUUID(), // Use proper UUID instead of temp prefix
        contactId: contactId || null,
        user_id: user?.id || '',
        name: name || selectedRelationship.label,
        relationship: selectedRelationship.label,
        gender: selectedRelationship.defaultGender || 'name',
        image_uri: contactImageUri || null,
        email: contactEmail || null,
        phoneNumberHash: null,
      };
      
      setFormState(prev => ({ 
        ...prev, 
        selectedPerson: newPerson, 
        isForSelf: false 
      }));
      setManualPersonState(prev => ({ ...prev, isActive: false }));
      // Hide person selector and show need selector
      setCurrentSection('need');
      setShowSections({ person: false, need: true, details: false });
      trackEvent('intentions_flow_person_selected', mergeAnalyticsProperties(analyticsBase, {
        person_id: newPerson.id,
        is_for_self: false,
        creation_method: 'manual',
      }));
    } else {
      // Go to pronoun step
      setManualPersonState(prev => ({ ...prev, step: 'pronoun' }));
    }
  }, [manualPersonState.selectedRelationship, user?.id, contactImageUri, contactEmail, contactId, analyticsBase]);

  const handleGenderSelect = useCallback((gender: 'he' | 'she' | 'name') => {
    const { selectedRelationship, name } = manualPersonState;
    if (!selectedRelationship) return;

    const newPerson: PrayerPerson = {
      id: generateClientUUID(), // Use proper UUID instead of temp prefix
      contactId: contactId || null,
      user_id: user?.id || '',
      name: name || selectedRelationship.label,
      relationship: selectedRelationship.label,
      gender,
      image_uri: contactImageUri || null,
      email: contactEmail || null,
      phoneNumberHash: null,
    };
    
    setFormState(prev => ({ 
      ...prev, 
      selectedPerson: newPerson, 
      isForSelf: false 
    }));
    setManualPersonState(prev => ({ ...prev, isActive: false }));
    // Hide person selector and show need selector
    setCurrentSection('need');
    setShowSections({ person: false, need: true, details: false });
    trackEvent('intentions_flow_person_selected', mergeAnalyticsProperties(analyticsBase, {
      person_id: newPerson.id,
      is_for_self: false,
      creation_method: 'manual',
      gender,
    }));
  }, [manualPersonState, user?.id, contactImageUri, contactEmail, contactId, analyticsBase]);

  const handleCancelManualPersonCreation = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setManualPersonState({
      isActive: false,
      step: 'relationship',
      selectedRelationship: null,
      name: '',
      gender: null,
    });
  }, []);

  // Save handler
  const handleSave = useCallback(async () => {
    if (!user?.id || !isCompletable) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();
    setIsLoadingIntention(true);

    try {
      const { selectedPerson, isForSelf, selectedNeedId, needDetails } = formState;
      
      if (isEditing && intentionId) {
        // Update existing intention
        await updateIntentionMutation.mutateAsync({
          intentionId,
          updates: {
            category: selectedNeedId!,
            details: needDetails.trim(),
          }
        });
        trackEvent('intentions_flow_saved', mergeAnalyticsProperties(analyticsBase, {
          intention_id: intentionId,
          for_self: isForSelf,
          has_selected_person: !!selectedPerson,
        }));
      } else {
        // Create new intention
        if (isForSelf) {
          // Handle self intentions (no person_id)
          await createIntentionMutation.mutateAsync({
            userId: user!.id,
            intention: {
              person_id: null,
              category: selectedNeedId!,
              details: needDetails.trim(),
              is_active: true,
            }
          });
        } else if (selectedPerson) {
          // In the UUID-first system, determine if person exists in prayer database  
          // by checking if they're in the allPeople store
          const existsInDatabase = allPeople.some(p => p.id === selectedPerson.id);
          
          if (!existsInDatabase) {
            // Person is new and needs to be created with intention atomically
            const isContact = selectedPerson.contactId || selectedPerson.id === contactId;
            
            await addPersonWithIntentionMutation.mutateAsync({
              contactId: isContact ? (selectedPerson.contactId || contactId) : null,
              name: selectedPerson.name,
              relationship: selectedPerson.relationship,
              gender: selectedPerson.gender,
              image_uri: selectedPerson.image_uri,
              email: selectedPerson.email,
              rawPhoneNumber: isContact ? contactPhone || null : null,
              intentionCategory: selectedNeedId!,
              intentionDetails: needDetails.trim(),
            });
            trackEvent('intentions_flow_saved', mergeAnalyticsProperties(analyticsBase, {
              intention_id: null,
              for_self: false,
              has_selected_person: true,
              person_creation: 'new_with_intention',
            }));
          } else {
            // Person exists in database, just add intention
            await createIntentionMutation.mutateAsync({
              userId: user!.id,
              intention: {
                person_id: selectedPerson.id,
                category: selectedNeedId!,
                details: needDetails.trim(),
                is_active: true,
              }
            });
            trackEvent('intentions_flow_saved', mergeAnalyticsProperties(analyticsBase, {
              intention_id: null,
              for_self: false,
              has_selected_person: true,
              person_creation: 'existing',
            }));
          }
        } else {
          throw new Error('No person selected');
        }
      }

      setShowSuccess(true);
      trackEvent('intentions_created_success', mergeAnalyticsProperties(analyticsBase, {
        duration_ms: 0,
      }));
      
      setTimeout(() => {
        router.back();
      }, 2500);
    } catch (error) {
      console.error('Error saving intention:', error);
      Alert.alert('Error', 'Failed to save intention. Please try again.');
      trackEvent('intentions_flow_saved', mergeAnalyticsProperties(analyticsBase, {
        success: false,
        error_message: error instanceof Error ? error.message : String(error),
      }));
    } finally {
      setIsLoadingIntention(false);
    }
      }, [user, isCompletable, formState, isEditing, intentionId, updateIntentionMutation, createIntentionMutation, addPersonWithIntentionMutation, router, allPeople, contactId, contactPhone]);

  // Delete handler
  const handleDelete = useCallback(async () => {
    if (!intentionId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      'Delete Intention',
      'Are you sure you want to delete this intention? This cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              await deleteIntentionMutation.mutateAsync({ intentionId });
              trackEvent('intentions_deleted', mergeAnalyticsProperties(analyticsBase, {
                intention_id: intentionId,
                deleted_from: 'edit_screen',
              }));
              router.back();
            } catch (error) {
              console.error('Error deleting intention:', error);
              Alert.alert('Error', 'Failed to delete intention. Please try again.');
              trackEvent('intentions_delete_failed', mergeAnalyticsProperties(analyticsBase, {
                intention_id: intentionId,
                error_message: error instanceof Error ? error.message : String(error),
              }));
            }
          }
        }
      ]
    );
  }, [intentionId, deleteIntentionMutation, router, analyticsBase]);

  return {
    // States
    formState,
    manualPersonState,
    currentSection,
    showSections,
    isLoading: isLoadingPeople,
    isLoadingIntention,
    showSuccess,
    currentCategory,
    isCompletable,
    isEditing,
    contactInfo: contactId ? {
      id: contactId,
      name: contactName!,
      image_uri: contactImageUri,
      phone: contactPhone,
      email: contactEmail,
    } : undefined,
    
    // Actions
    handlePersonSelect,
    handleSelfSelect,
    handleNeedSelect,
    handleDetailsChange,
    handleSave,
    handleDelete,
    
    // Navigation
    transitionToSection,
    togglePersonSelector,
    toggleNeedSelector,
    toggleDetailsInput,
    
    // Manual person creation
    handleStartManualPersonCreation,
    handleRelationshipSelect,
    handleManualPersonNameSubmit,
    handleGenderSelect,
    handleCancelManualPersonCreation,
  };
}; 