import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { Image as ExpoImage } from 'expo-image';
import { queryClient, queryKeys, cacheConfig } from '../../../lib/queryClient';
import { useAuth } from '../../../hooks/useAuth';
import { 
  peopleRepository, 
  type PrayerPerson, 
  type AddPrayerPersonParams, 
  type AddPrayerPersonOnlyParams,
  type UpdatePrayerPersonParams,
  type PeopleCursor 
} from '../../../repositories/peopleRepository';
import { getPublicImageUrl } from '../../../utils/imageStorage';
import { registerPrefetchedImageUrl } from '../../../utils/imagePrefetchRegistry';

// Re-export types for external use
export type { PrayerPerson, AddPrayerPersonParams, AddPrayerPersonOnlyParams, UpdatePrayerPersonParams };

// Hook for getting people (with active intentions by default)
export function usePeople(
  userId: string | null, 
  options: { activeOnly?: boolean; enabled?: boolean } = {}
) {
  const { activeOnly = true, enabled = true } = options;
  const queryKey = queryKeys.people(userId || '', activeOnly);

  return useQuery({
    queryKey,
    queryFn: async (): Promise<PrayerPerson[]> => {
      if (!userId) throw new Error('User not authenticated');
      
      const { data } = await peopleRepository.getPeople(userId, { activeOnly });
      return data;
    },
    enabled: enabled && !!userId,
    initialData: () => {
      if (!userId) return undefined;
      return queryClient.getQueryData<PrayerPerson[]>(queryKey);
    },
    ...cacheConfig.userControlled, // Never expires or gets garbage collected
  });
}

// Hook for getting all people (including those without active intentions)
export function useAllPeople(
  userId: string | null,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;

  const queryKey = queryKeys.people(userId || '', false); // activeOnly = false

  return useQuery({
    queryKey,
    queryFn: async (): Promise<PrayerPerson[]> => {
      if (!userId) throw new Error('User not authenticated');
      
      const { data } = await peopleRepository.getAllPeople(userId);
      
      // Prefetch person images for better UX on intentions tab
      const imagesToPrefetch = data
        .filter(person => person.image_uri)
        .map(person => person.image_uri!)
        .filter((uri, index, array) => array.indexOf(uri) === index); // Remove duplicates
      
      if (imagesToPrefetch.length > 0) {
        void Promise.all(
          imagesToPrefetch.map(async (imageUri) => {
            try {
              const imageUrl = getPublicImageUrl(imageUri);
              if (!imageUrl) {
                return;
              }

              const success = await ExpoImage.prefetch(imageUrl, { cachePolicy: 'memory-disk' }).catch(() => false);
              if (success) {
                registerPrefetchedImageUrl(imageUrl);
              }
            } catch {
              // no-op; we'll rely on normal image loading
            }
          })
        );
      }
      
      return data;
    },
    enabled: enabled && !!userId,
    initialData: () => {
      if (!userId) return undefined;
      return queryClient.getQueryData<PrayerPerson[]>(queryKey);
    },
    ...cacheConfig.userControlled, // Never expires or gets garbage collected
  });
}

// Hook for getting people with infinite scroll pagination
export function usePeopleInfinite(
  userId: string | null,
  options: { activeOnly?: boolean; enabled?: boolean } = {}
) {
  const { activeOnly = true, enabled = true } = options;

  return useInfiniteQuery({
    queryKey: [...queryKeys.people(userId || '', activeOnly), 'infinite'],
    queryFn: async ({ pageParam }): Promise<{ data: PrayerPerson[]; nextCursor?: PeopleCursor }> => {
      if (!userId) throw new Error('User not authenticated');
      
      return peopleRepository.getPeople(userId, { 
        activeOnly,
        cursor: pageParam 
      });
    },
    enabled: enabled && !!userId,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as PeopleCursor | undefined,
    ...cacheConfig.userControlled, // Never expires or gets garbage collected
  });
}

// Hook for getting a single person by ID
export function usePerson(personId: string, options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.person(personId),
    queryFn: (): Promise<PrayerPerson | null> => peopleRepository.getPersonById(personId),
    enabled: enabled && !!personId,
    ...cacheConfig.userControlled, // Never expires or gets garbage collected
  });
}

// Hook for adding a person with an intention
export function useAddPersonWithIntention() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: AddPrayerPersonParams): Promise<PrayerPerson> => {
      if (!user?.id) throw new Error('User not authenticated');
      return peopleRepository.addPersonWithIntention(user.id, params);
    },
    onSuccess: (newPerson) => {
      if (!user?.id) return;

      // Update both active and all people queries
      queryClient.setQueryData<PrayerPerson[]>(
        queryKeys.people(user.id, true), // activeOnly = true
        (old) => old ? [newPerson, ...old] : [newPerson]
      );

      queryClient.setQueryData<PrayerPerson[]>(
        queryKeys.people(user.id, false), // activeOnly = false  
        (old) => old ? [newPerson, ...old] : [newPerson]
      );

      // Update infinite queries for both active and all people
      [true, false].forEach((activeOnly) => {
        const infiniteKey = [...queryKeys.people(user.id, activeOnly), 'infinite'];
        queryClient.setQueryData(infiniteKey, (old: any) => {
          if (!old?.pages?.length) return old;
          
          // Add to first page
          const newPages = [...old.pages];
          newPages[0] = {
            ...newPages[0],
            data: [newPerson, ...newPages[0].data]
          };
          
          return { ...old, pages: newPages };
        });
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.people(user.id, true), 
        exact: false 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.intentions(user.id),
        exact: false 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.homeData(user.id) 
      });
    },
    onError: (error) => {
      console.error('[usePeople] Add person with intention error:', error);
      // TODO: Show user-facing error via toast/alert system
      // Possible user-friendly message: "Failed to add person. Please try again."
    },
  });
}

// Hook for adding a person only (no intention)
export function useAddPersonOnly() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: AddPrayerPersonOnlyParams): Promise<PrayerPerson> => {
      if (!user?.id) throw new Error('User not authenticated');
      return peopleRepository.addPersonOnly(user.id, params);
    },
    onSuccess: (newPerson) => {
      if (!user?.id) return;

      // Only update the "all people" query since this person has no intentions
      queryClient.setQueryData<PrayerPerson[]>(
        queryKeys.people(user.id, false), // activeOnly = false
        (old) => old ? [newPerson, ...old] : [newPerson]
      );

      // Update infinite query for all people
      const infiniteKey = [...queryKeys.people(user.id, false), 'infinite'];
      queryClient.setQueryData(infiniteKey, (old: any) => {
        if (!old?.pages?.length) return old;
        
        // Add to first page
        const newPages = [...old.pages];
        newPages[0] = {
          ...newPages[0],
          data: [newPerson, ...newPages[0].data]
        };
        
        return { ...old, pages: newPages };
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.people(user.id, false), 
        exact: false 
      });
    },
    onError: (error) => {
      console.error('[usePeople] Add person only error:', error);
      // TODO: Show user-facing error via toast/alert system
    },
  });
}

// Hook for updating a person
export function useUpdatePerson() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ personId, updates }: { 
      personId: string; 
      updates: UpdatePrayerPersonParams;
    }): Promise<PrayerPerson> => {
      if (!user?.id) throw new Error('User not authenticated');
      return peopleRepository.updatePerson(personId, user.id, updates);
    },
    onSuccess: (updatedPerson, { personId }) => {
      if (!user?.id) return;

      // Update person in both people queries
      [true, false].forEach((activeOnly) => {
        queryClient.setQueryData<PrayerPerson[]>(
          queryKeys.people(user.id, activeOnly),
          (old) => old?.map(person => 
            person.id === personId ? updatedPerson : person
          )
        );

        // Update infinite queries
        const infiniteKey = [...queryKeys.people(user.id, activeOnly), 'infinite'];
        queryClient.setQueryData(infiniteKey, (old: any) => {
          if (!old?.pages?.length) return old;
          
          const newPages = old.pages.map((page: any) => ({
            ...page,
            data: page.data.map((person: PrayerPerson) => 
              person.id === personId ? updatedPerson : person
            )
          }));
          
          return { ...old, pages: newPages };
        });
      });

      // Update individual person query
      queryClient.setQueryData(queryKeys.person(personId), updatedPerson);

      // IMPORTANT: Use refetchQueries for intentions because staleTime is Infinity
      // invalidateQueries alone won't trigger a refetch with Infinity staleTime
      queryClient.refetchQueries({ 
        queryKey: queryKeys.intentions(user.id),
        exact: false 
      });
      
      // Invalidate other related queries
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.people(user.id, true), 
        exact: false 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.homeData(user.id) 
      });
    },
    onError: (error) => {
      console.error('[usePeople] Update person error:', error);
      // TODO: Show user-facing error via toast/alert system
    },
  });
}

// Hook for deleting a person
export function useDeletePerson() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (personId: string): Promise<void> => {
      if (!user?.id) throw new Error('User not authenticated');
      return peopleRepository.deletePerson(personId, user.id);
    },
    onSuccess: (_, personId) => {
      if (!user?.id) return;

      // Remove person from both people queries
      [true, false].forEach((activeOnly) => {
        queryClient.setQueryData<PrayerPerson[]>(
          queryKeys.people(user.id, activeOnly),
          (old) => old?.filter(person => person.id !== personId)
        );

        // Update infinite queries
        const infiniteKey = [...queryKeys.people(user.id, activeOnly), 'infinite'];
        queryClient.setQueryData(infiniteKey, (old: any) => {
          if (!old?.pages?.length) return old;
          
          const newPages = old.pages.map((page: any) => ({
            ...page,
            data: page.data.filter((person: PrayerPerson) => person.id !== personId)
          }));
          
          return { ...old, pages: newPages };
        });
      });

      // Remove individual person query
      queryClient.removeQueries({ queryKey: queryKeys.person(personId) });

      // Invalidate related queries (intentions will also be deleted by cascade)
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.people(user.id, true), 
        exact: false 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.intentions(user.id),
        exact: false 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.homeData(user.id) 
      });
    },
    onError: (error) => {
      console.error('[usePeople] Delete person error:', error);
      // TODO: Show user-facing error via toast/alert system
    },
  });
}

// Hook for prefetching people data
export function usePrefetchPeople() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return {
    prefetchPeople: async (activeOnly: boolean = true) => {
      if (!user?.id) return;
      
      await queryClient.prefetchQuery({
        queryKey: queryKeys.people(user.id, activeOnly),
        queryFn: async () => {
          const { data } = await peopleRepository.getPeople(user.id, { activeOnly });
          return data;
        },
        ...cacheConfig.userControlled, // Never expires or gets garbage collected
      });
    },
    
    prefetchPerson: async (personId: string) => {
      await queryClient.prefetchQuery({
        queryKey: queryKeys.person(personId),
        queryFn: () => peopleRepository.getPersonById(personId),
        ...cacheConfig.userControlled, // Never expires or gets garbage collected
      });
    },
  };
}
