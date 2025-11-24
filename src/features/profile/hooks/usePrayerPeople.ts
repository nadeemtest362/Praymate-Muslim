import { useMemo } from 'react';
import { useAllPeople, usePeople } from '../../people/hooks/usePeople';
import { useAuth } from '../../../hooks/useAuth';
import type { PrayerPerson } from '../../../repositories/peopleRepository';

interface UsePrayerPeopleReturn {
  prayerPeople: PrayerPerson[];
  peopleCount: number;
  activePeopleIds: string[];
  isLoading: boolean;
  error: Error | null;
  refreshPeople: () => Promise<void>;
}

export function usePrayerPeople(): UsePrayerPeopleReturn {
  const { user } = useAuth();
  
  // Get all people for the prayer circle display
  const { data: allPeople = [], isLoading: isLoadingAll, refetch: refetchAll, error: allPeopleError } = useAllPeople(user?.id ?? null);
  
  // Get people with active intentions to determine active status
  const { data: activePeople = [], isLoading: isLoadingActive, refetch: refetchActive, error: activePeopleError } = usePeople(user?.id || '', { activeOnly: true });
  
  // Calculate active people IDs from people with active intentions
  const activePeopleIds = useMemo(() => 
    activePeople.map(person => person.id),
    [activePeople]
  );
  
  const refreshPeople = async () => {
    await Promise.all([refetchAll(), refetchActive()]);
  };

  // Combine errors - if either query has an error, return the first one
  const error = allPeopleError || activePeopleError;

  return {
    prayerPeople: allPeople,
    peopleCount: allPeople.length,
    activePeopleIds,
    isLoading: isLoadingAll || isLoadingActive,
    error,
    refreshPeople,
  };
} 