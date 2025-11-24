import { useState, useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../../hooks/useAuth';
import { useAllPeople, useAddPersonWithIntention, type PrayerPerson } from '../../people/hooks/usePeople';
import { supabase } from '../../../lib/supabaseClient';
import { PrayerTopicId } from '../../../constants/prayerConstants';

export interface AddIntentionState {
  selectedPerson: PrayerPerson | null;
  isForSelf: boolean;
  selectedNeedId: PrayerTopicId | null;
  needDetails: string;
  isLoading: boolean;
  error: string | null;
}

export interface AddIntentionNavigation {
  showPersonSelector: boolean;
  showNeedSelector: boolean;
  showDetailsInput: boolean;
}

export interface UseAddIntentionFlowOptions {
  editingId?: string;
  initialPersonId?: string;
  isManualEntry?: boolean;
  quickAdd?: boolean;
  contactInfo?: {
    id: string;
    name: string;
    image_uri?: string;
    phone?: string;
    email?: string;
  };
}

export const useAddIntentionFlow = (options: UseAddIntentionFlowOptions = {}) => {
  const { user } = useAuth();
  const { data: prayerPeople = [] } = useAllPeople(user?.id ?? null, { enabled: !!user?.id });
  const addPersonWithIntentionMutation = useAddPersonWithIntention();
  
  // State
  const [state, setState] = useState<AddIntentionState>({
    selectedPerson: null,
    isForSelf: !options.isManualEntry && !options.quickAdd,
    selectedNeedId: null,
    needDetails: '',
    isLoading: false,
    error: null,
  });
  
  const [navigation, setNavigation] = useState<AddIntentionNavigation>({
    showPersonSelector: !!options.isManualEntry && !options.editingId && !options.quickAdd,
    showNeedSelector: (!options.isManualEntry && !options.quickAdd) || !!options.editingId,
    showDetailsInput: false,
  });
  
  const isSaving = useRef(false);
  
  // React Query automatically loads prayer people when user?.id is available
  
  // Handle contact from manage-modal
  useEffect(() => {
    if (options.contactInfo && !options.editingId) {
      const tempPerson: PrayerPerson = {
        id: options.contactInfo.id,
        user_id: user?.id || '',
        name: options.contactInfo.name,
        relationship: '',
        gender: 'Other',
        image_uri: options.contactInfo.image_uri || null,
        email: options.contactInfo.email || null,
        phoneNumberHash: null,
      };
      
      setState(prev => ({ ...prev, selectedPerson: tempPerson, isForSelf: false }));
      setNavigation({
        showPersonSelector: false,
        showNeedSelector: true,
        showDetailsInput: false,
      });
    }
  }, [options.contactInfo, options.editingId, user?.id]);
  
  // Handle pre-selecting a person
  useEffect(() => {
    if (options.initialPersonId && !options.editingId && !options.contactInfo && prayerPeople.length > 0) {
      const person = prayerPeople.find(p => p.id === options.initialPersonId);
      if (person) {
        setState(prev => ({ ...prev, selectedPerson: person, isForSelf: false }));
        setNavigation({
          showPersonSelector: false,
          showNeedSelector: true,
          showDetailsInput: false,
        });
      }
    }
  }, [options.initialPersonId, options.editingId, options.contactInfo, prayerPeople]);
  
  // Fetch intention if editing
  useEffect(() => {
    const fetchIntention = async () => {
      if (!options.editingId || !user?.id) return;
      
      setState(prev => ({ ...prev, isLoading: true }));
      
      try {
        const { data, error } = await supabase
          .from('prayer_intentions')
          .select(`*, person:person_id (id, name, image_uri, relationship)`)
          .eq('id', options.editingId)
          .eq('user_id', user.id)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setState(prev => ({
            ...prev,
            selectedPerson: data.person || null,
            isForSelf: !data.person,
            selectedNeedId: data.category as PrayerTopicId,
            needDetails: data.details || '',
            isLoading: false,
          }));
          
          setNavigation({
            showPersonSelector: false,
            showNeedSelector: false,
            showDetailsInput: true,
          });
        }
      } catch (error) {
        console.error('[useAddIntentionFlow] Error fetching intention:', error);
        setState(prev => ({ 
          ...prev, 
          error: 'Failed to load prayer intention',
          isLoading: false 
        }));
      }
    };
    
    fetchIntention();
  }, [options.editingId, user?.id]);
  
  // Navigation
  const transitionToSection = useCallback((section: 'person' | 'need' | 'details') => {
    if (section === 'person' && options.editingId) return;
    
    setNavigation({
      showPersonSelector: section === 'person',
      showNeedSelector: section === 'need',
      showDetailsInput: section === 'details',
    });
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [options.editingId]);
  
  // Handlers
  const handlePersonSelect = useCallback((person: PrayerPerson) => {
    setState(prev => ({ ...prev, selectedPerson: person, isForSelf: false }));
    transitionToSection('need');
  }, [transitionToSection]);
  
  const handleSelfSelect = useCallback(() => {
    setState(prev => ({ ...prev, selectedPerson: null, isForSelf: true }));
    transitionToSection('need');
  }, [transitionToSection]);
  
  const handleNeedSelect = useCallback((needId: PrayerTopicId) => {
    setState(prev => ({ ...prev, selectedNeedId: needId }));
    transitionToSection('details');
  }, [transitionToSection]);
  
  const handleDetailsChange = useCallback((details: string) => {
    setState(prev => ({ ...prev, needDetails: details }));
  }, []);
  
  const handleSave = useCallback(async () => {
    if (isSaving.current || state.isLoading) return;
    if (!user?.id || !state.selectedNeedId || !state.needDetails.trim()) {
      Alert.alert("Missing Information", "Please complete all fields.");
      return;
    }
    
    isSaving.current = true;
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const dbPersonId = state.isForSelf ? null : state.selectedPerson?.id || null;
      
      // Handle contact from manage-modal (new person from contacts that needs to be saved)
      if (!state.isForSelf && state.selectedPerson && options.contactInfo) {
        await addPersonWithIntentionMutation.mutateAsync({
          contactId: options.contactInfo.id, // Add contactId for proper deduplication
          name: state.selectedPerson.name,
          relationship: 'Friend',
          gender: 'Other',
          image_uri: state.selectedPerson.image_uri,
          email: state.selectedPerson.email,
          rawPhoneNumber: options.contactInfo.phone || null,
          intentionCategory: state.selectedNeedId,
          intentionDetails: state.needDetails.trim(),
        });
      } else {
        // Regular intention save
        const intentionData = {
          user_id: user.id,
          person_id: dbPersonId,
          category: state.selectedNeedId,
          details: state.needDetails.trim(),
          is_active: true,
        };
        
        if (options.editingId) {
          const { error } = await supabase
            .from('prayer_intentions')
            .update(intentionData)
            .match({ id: options.editingId, user_id: user.id });
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('prayer_intentions')
            .insert(intentionData);
          if (error) throw error;
        }
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Reset form
      setState({
        selectedPerson: null,
        isForSelf: true,
        selectedNeedId: null,
        needDetails: '',
        isLoading: false,
        error: null,
      });
      
      return { success: true };
    } catch (error) {
      console.error('[useAddIntentionFlow] Error saving:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to save prayer intention',
        isLoading: false 
      }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return { success: false, error };
    } finally {
      isSaving.current = false;
    }
  }, [state, user, options, addPersonWithIntentionMutation]);
  
  const isValid = (state.isForSelf || !!state.selectedPerson) && 
                  !!state.selectedNeedId && 
                  !!state.needDetails.trim();
  
  return {
    state,
    navigation,
    handlers: {
      handlePersonSelect,
      handleSelfSelect,
      handleNeedSelect,
      handleDetailsChange,
      handleSave,
      transitionToSection,
    },
    isValid,
    prayerPeople,
  };
}; 