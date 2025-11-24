import { Alert } from 'react-native';
import { useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAllPeople } from '../../features/people/hooks/usePeople';
import { useIntentions as useIntentionsQuery, useToggleIntentionActive, useDeleteIntention } from '../../features/prayer-display/hooks/useIntentions';
import { PersonGroupType, PersonWithoutIntention } from './types';
import { queryClient, queryKeys } from '../../lib/queryClient';
import type { PrayerIntention } from '../../repositories/intentionsRepository';
import type { PrayerPerson } from '../../repositories/peopleRepository';
import { getPrefetchedIntentions, getPrefetchedPeople } from '../../features/intentions/prefetchCache';

const getFirstCachedIntentions = (): PrayerIntention[] | undefined => {
  const matches = queryClient.getQueriesData<PrayerIntention[]>({ queryKey: ['intentions'], exact: false });
  for (let index = 0; index < matches.length; index += 1) {
    const [, data] = matches[index];
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
  }
  return undefined;
};

const getFirstCachedPeople = (): PrayerPerson[] | undefined => {
  const matches = queryClient.getQueriesData<PrayerPerson[]>({ queryKey: ['people'], exact: false });
  for (let index = 0; index < matches.length; index += 1) {
    const [, data] = matches[index];
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
  }
  return undefined;
};

export const useIntentions = () => {
  const { user, profile } = useAuth();
  const peopleQuery = useAllPeople(user?.id ?? null);
  const cachedPeople = user?.id
    ? queryClient.getQueryData<PrayerPerson[]>(queryKeys.people(user.id, false))
    : undefined;
  const prefetchedPeople = getPrefetchedPeople(user?.id);
  const fallbackPeople = cachedPeople ?? prefetchedPeople ?? getFirstCachedPeople();
  const prayerPeople = peopleQuery.data ?? fallbackPeople ?? [];
  
  // Get data and actions from React Query hooks
  const intentionsQuery = useIntentionsQuery(user?.id ?? null);
  const cachedIntentions = user?.id
    ? queryClient.getQueryData<PrayerIntention[]>(queryKeys.intentions(user.id))
    : undefined;
  const prefetchedIntentions = getPrefetchedIntentions(user?.id);
  const fallbackIntentions = cachedIntentions ?? prefetchedIntentions ?? getFirstCachedIntentions();
  const intentions = intentionsQuery.data ?? fallbackIntentions ?? [];
  const hasCachedIntentions = Array.isArray(fallbackIntentions) && fallbackIntentions.length > 0;
  const hasCachedPeople = Array.isArray(fallbackPeople) && fallbackPeople.length > 0;

  const isLoading =
    (!hasCachedIntentions && intentionsQuery.isLoading) ||
    (!hasCachedPeople && peopleQuery.isLoading);
  const toggleActiveMutation = useToggleIntentionActive();
  const deleteIntentionMutation = useDeleteIntention();

  if (__DEV__) {
    console.log('[Intentions/useIntentions] datasets', {
      userId: user?.id,
      queryIntentions: Array.isArray(intentionsQuery.data) ? intentionsQuery.data.length : null,
      cachedIntentions: Array.isArray(cachedIntentions) ? cachedIntentions.length : null,
      prefetchedIntentions: Array.isArray(prefetchedIntentions) ? prefetchedIntentions.length : null,
      fallbackIntentions: Array.isArray(fallbackIntentions) ? fallbackIntentions.length : null,
      queryPeople: Array.isArray(peopleQuery.data) ? peopleQuery.data.length : null,
      cachedPeople: Array.isArray(cachedPeople) ? cachedPeople.length : null,
      prefetchedPeople: Array.isArray(prefetchedPeople) ? prefetchedPeople.length : null,
      fallbackPeople: Array.isArray(fallbackPeople) ? fallbackPeople.length : null,
      isLoading,
    });
  }
  
  // Computed logic extracted from compat hooks
  const groups = useMemo((): PersonGroupType[] => {
    const groupsArray: PersonGroupType[] = [];
    
    // Self group
    const selfIntentions = intentions.filter(i => !i.person_id);
    if (selfIntentions.length > 0) {
      groupsArray.push({
        id: 'self',
        name: 'You',
        avatar: profile?.avatar_url || null,
        intentions: selfIntentions.map(intention => ({
          id: intention.id,
          user_id: intention.user_id,
          person_id: intention.person_id,
          category: intention.category,
          details: intention.details,
          is_active: intention.is_active,
          created_at: intention.created_at,
          person: undefined
        }))
      });
    }
    
    // People groups
    const peopleMap = new Map<string, typeof intentions>();
    
    intentions.forEach(intention => {
      if (intention.person_id && intention.prayer_focus_people) {
        if (!peopleMap.has(intention.person_id)) {
          peopleMap.set(intention.person_id, []);
        }
        peopleMap.get(intention.person_id)!.push(intention);
      }
    });
    
    peopleMap.forEach((intentions, personId) => {
      const firstIntention = intentions[0];
      if (firstIntention.prayer_focus_people) {
        groupsArray.push({
          id: personId,
          name: firstIntention.prayer_focus_people.name,
          avatar: firstIntention.prayer_focus_people.image_uri || null,
          intentions: intentions.map(intention => ({
            id: intention.id,
            user_id: intention.user_id,
            person_id: intention.person_id,
            category: intention.category,
            details: intention.details,
            is_active: intention.is_active,
            created_at: intention.created_at,
            person: {
              id: (intention.prayer_focus_people as any)?.id || intention.person_id || '',
              name: intention.prayer_focus_people!.name,
              image_uri: intention.prayer_focus_people!.image_uri ?? null,
              relationship: intention.prayer_focus_people!.relationship ?? null
            }
          }))
        });
      }
    });
    
    // Sort groups: self first, then people with active intentions, then people with only inactive intentions
    groupsArray.sort((a, b) => {
      // Self always first
      if (a.id === 'self') return -1;
      if (b.id === 'self') return 1;
      
      // Check if groups have active intentions
      const aHasActive = a.intentions.some(i => i.is_active);
      const bHasActive = b.intentions.some(i => i.is_active);
      
      // Groups with active intentions come before groups with only inactive
      if (aHasActive && !bHasActive) return -1;
      if (!aHasActive && bHasActive) return 1;
      
      return 0;
    });
    
    if (__DEV__) {
      console.log('[Intentions/useIntentions] computed groups', {
        count: groupsArray.length,
        selfCount: selfIntentions.length,
      });
    }
    if (groupsArray.length === 0 && hasCachedIntentions) {
      console.warn('[Intentions] Prefetched intentions did not produce any groups', {
        intentionsCount: intentions.length,
      });
    }
    if (groupsArray.length === 0 && hasCachedPeople) {
      console.warn('[Intentions] Prefetched people did not produce any groups', {
        peopleCount: prayerPeople.length,
      });
    }
    return groupsArray;
  }, [intentions, profile?.avatar_url, hasCachedIntentions, hasCachedPeople, prayerPeople.length]);
  
  const peopleWithoutIntentions = useMemo((): PersonWithoutIntention[] => {
    // Find people without any intentions
    const peopleWithIntentionIds = new Set(
      intentions
        .filter(i => i.person_id !== null)
        .map(i => i.person_id as string)
    );
    
    const peopleWithoutInt = prayerPeople.filter(person => {
      return !peopleWithIntentionIds.has(person.id);
    });
    
    return peopleWithoutInt.map(person => ({
      id: person.id,
      name: person.name,
      image_uri: person.image_uri
    }));
  }, [intentions, prayerPeople]);
  
  // Handle actions with UI feedback
  const handleToggleActive = async (intentionId: string) => {
    try {
      await toggleActiveMutation.mutateAsync({ intentionId });
    } catch (error) {
      console.error('Error toggling intention:', error);
    }
  };

  const handleDelete = (intentionId: string) => {
    Alert.alert('Delete Intention', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteIntentionMutation.mutate({ intentionId });
        }
      }
    ]);
  };

  return {
    user,
    profile,
    intentions,
    groups,
    peopleWithoutIntentions,
    isLoading, // Now properly handled by compatibility layer
    isInitial: false, // Data pre-loaded at app level
    isRefreshing: false, // No need for refresh with store
    handleToggleActive,
    handleDelete,
  };
}; 
