import { useState } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useOnboardingStore, PrayerFocusPerson } from '../../../../../stores/onboardingStore';
import { supabase } from '../../../../../lib/supabaseClient';
import { ensureImageUploaded } from '../../../../../utils/imageUploadUtils';
import { safeFind, safeSome } from '../../../../../utils/safeArrayMethods';

interface PersonData {
  name: string;
  relationship?: string;
  gender?: string;
  image_uri?: string;
  deviceContactId?: string;
}

export function usePrayerPeopleManager(maxPeople: number) {
  const { prayerFocusPeople, setPrayerFocusPeople } = useOnboardingStore();
  const [isLoading, setIsLoading] = useState(false);

  // Helper to check for duplicates
  const isPersonAlreadyAdded = (
    identifier: { name: string; device_contact_id?: string | null },
    currentPeople: PrayerFocusPerson[]
  ): PrayerFocusPerson | null => {
    // Prioritize device_contact_id if available and valid
    if (identifier.device_contact_id && identifier.device_contact_id.trim() !== '') {
      const existingByDeviceId = safeFind(
        currentPeople,
        (p: any) => p.device_contact_id === identifier.device_contact_id
      );
      if (existingByDeviceId) return existingByDeviceId;
    }
    // Fallback to case-insensitive name check
    const lname = identifier.name.trim().toLowerCase();
    return safeFind(currentPeople, (p) => p.name.trim().toLowerCase() === lname) || null;
  };

  const addPerson = async (personData: PersonData): Promise<boolean> => {
    if (prayerFocusPeople.length >= maxPeople) {
      Alert.alert("Limit Reached", `You can add up to ${maxPeople} people.`);
      throw new Error('Limit reached');
    }

    const existingPerson = isPersonAlreadyAdded(
      { name: personData.name, device_contact_id: personData.deviceContactId || null },
      prayerFocusPeople
    );
    
    if (existingPerson) {
      Alert.alert("Already Added", `'${personData.name}' is already in your prayer list.`);
      throw new Error('Person already added');
    }

    setIsLoading(true);
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Check if person already exists in database
      let dbData;
      console.log('[PrayerPeopleManager] Checking if person exists for user:', user.id, 'name:', personData.name);
      
      // Check by device_contact_id if available
      if (personData.deviceContactId) {
        const { data: existing } = await supabase
          .from('prayer_focus_people')
          .select('id, name, image_uri, relationship, gender, device_contact_id')
          .eq('user_id', user.id)
          .eq('device_contact_id', personData.deviceContactId)
          .single();
          
        if (existing) {
          console.log('[PrayerPeopleManager] Found existing person by device_contact_id:', existing);
          dbData = existing;
        }
      }
      
      // If not found by device ID, check by name
      if (!dbData) {
        const { data: existingByName } = await supabase
          .from('prayer_focus_people')
          .select('id, name, image_uri, relationship, gender, device_contact_id')
          .eq('user_id', user.id)
          .ilike('name', personData.name.trim())
          .single();
          
        if (existingByName) {
          console.log('[PrayerPeopleManager] Found existing person by name:', existingByName);
          dbData = existingByName;
        }
      }
      
      // Only insert if person doesn't exist
      if (!dbData) {
        console.log('[PrayerPeopleManager] Attempting to insert new person:', personData.name);
        const { data: newData, error: dbError } = await supabase
          .from('prayer_focus_people')
          .insert({
            user_id: user.id,
            name: personData.name,
            image_uri: personData.image_uri || null,
            relationship: personData.relationship || 'Friend',
            gender: personData.gender || 'name',
            device_contact_id: personData.deviceContactId || null,
          })
          .select('id, name, image_uri, relationship, gender, device_contact_id')
          .single();

        if (dbError) {
          console.error('[PrayerPeopleManager] Database insert error:', dbError);
          throw dbError;
        }
        dbData = newData;
        
        // Upload image in background (don't await)
        if (personData.image_uri) {
          const personId = newData.id;
          void (async () => {
            try {
              const uploadedUri = await ensureImageUploaded(personData.image_uri, user.id, 'contact');
              if (uploadedUri && uploadedUri !== personData.image_uri) {
                // Update the database with the uploaded URI
                try {
                  await supabase
                    .from('prayer_focus_people')
                    .update({ image_uri: uploadedUri })
                    .eq('id', personId)
                    .eq('user_id', user.id);
                  console.log(`Updated ${personData.name} with uploaded URI`);
                } catch (err) {
                  console.error(`Failed to update ${personData.name} with uploaded URI:`, err);
                }
              }
            } catch (err) {
              console.error(`Background upload failed for ${personData.name}:`, err);
            }
          })();
        }
      }

      // Create person object with real database ID
      const newPerson: PrayerFocusPerson = {
        id: dbData.id,
        name: dbData.name,
        relationship: dbData.relationship || undefined,
        gender: dbData.gender || undefined,
        image_uri: dbData.image_uri || undefined,
        device_contact_id: dbData.device_contact_id || undefined,
        phone_number_hash: undefined,
      };

      // Check if already in current list
      const alreadyInList = safeSome(prayerFocusPeople, person => 
        person.id === newPerson.id || 
        person.name.toLowerCase() === newPerson.name.toLowerCase()
      );
      
      if (alreadyInList) {
        Alert.alert("Already Added", `'${newPerson.name}' is already in your prayer list.`);
        throw new Error('Person already in list');
      }

      // Add to list
      const updatedList = [...prayerFocusPeople, newPerson];
      setPrayerFocusPeople(updatedList);
      
      // Debug logging
      console.log(`[PrayerPeopleManager] Successfully added person:`, {
        name: newPerson.name,
        dbId: newPerson.id,
        relationship: newPerson.relationship,
        gender: newPerson.gender,
        totalPeople: updatedList.length
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      return updatedList.length === maxPeople;
    } catch (error) {
      console.error('Error adding person:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const removePerson = async (idToRemove: string): Promise<void> => {
    setIsLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('prayer_focus_people')
        .delete()
        .eq('id', idToRemove)
        .eq('user_id', user.id);

      if (error) throw error;

      const updatedList = prayerFocusPeople.filter(person => person.id !== idToRemove);
      setPrayerFocusPeople(updatedList);
      
      console.log(`[PrayerPeopleManager] Successfully removed person ID: ${idToRemove}, remaining: ${updatedList.length}`);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      console.error('Error removing person:', err);
      Alert.alert('Error', 'Could not remove person.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    people: prayerFocusPeople,
    addPerson,
    removePerson,
    isLoading,
    isFull: prayerFocusPeople.length >= maxPeople,
    isEmpty: prayerFocusPeople.length === 0,
    count: prayerFocusPeople.length,
  };
} 