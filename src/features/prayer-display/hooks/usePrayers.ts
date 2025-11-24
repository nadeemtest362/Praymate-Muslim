import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryClient, queryKeys, cacheConfig } from '../../../lib/queryClient';
import { prayersRepository } from '../../../repositories/prayersRepository';
import { usePeople } from '../../people/hooks/usePeople';
import { extractPeopleFromSnapshot } from '../../../utils/prayerUtils';
import { getPrayerDayStart } from '../../../lib/time/Clock';
import { isNetworkError } from '../../../utils/errorUtils';

type TodaysPrayersResult = Awaited<ReturnType<typeof prayersRepository.getTodaysPrayers>>;
// Feature flag imports removed - React Query is now the default

type UsePrayersOptions = {
  // When 'static', treat prayers as append-only history for list views
  // Disable refetch-on-mount/focus and make cache effectively permanent
  staleMode?: 'static' | 'default';
  // When false, skip people fetch/enhancement and rely on snapshot-only avatars
  enhanceWithPeople?: boolean;
  // If true, seed the query with existing cached pages for instant paint
  initialFromCache?: boolean;
};

// Helper function to enhance a single prayer with people data
const enhancePrayer = (prayer: any, peopleMap: Map<string, any>) => {
  let prayerPeopleFromSnapshot: any[] = [];
  
  // Extract people from input_snapshot
  if (prayer.input_snapshot) {
    try {
      prayerPeopleFromSnapshot = extractPeopleFromSnapshot(prayer.input_snapshot);
    } catch (error) {
      console.error('Error extracting people from snapshot:', error);
      prayerPeopleFromSnapshot = [];
    }
  }
  
  // Enhance people with full data (avatars, relationships, etc.)
  const enhancedPeople = prayerPeopleFromSnapshot.map((person: any) => {
    const fullPerson = peopleMap.get(person.name.toLowerCase());
    if (fullPerson) {
      return {
        ...person,
        id: fullPerson.id,
        image_uri: person.image_uri ?? fullPerson.image_uri,
        relationship: fullPerson.relationship || person.relationship,
        gender: fullPerson.gender || person.gender
      };
    }
    return person;
  });
  
  return {
    ...prayer,
    enhancedPeople
  };
};

// Infinite prayers query
export const usePrayers = (
  userId: string | null,
  filter: 'all' | 'morning' | 'evening' | 'liked' = 'all',
  options: UsePrayersOptions = {}
) => {
  const { staleMode = 'default', enhanceWithPeople = true, initialFromCache = true } = options;
  const queryClient = useQueryClient();

  // Fetch people unconditionally; gate network fetch with `enabled` for hook order safety
  const { data: prayerPeople } = usePeople(userId || null, { activeOnly: false, enabled: enhanceWithPeople });

  const queryKey = [...queryKeys.prayersInfinite(userId || '', filter)];
  const cachedData = initialFromCache ? (queryClient.getQueryData(queryKey) as any) : undefined;

  return useInfiniteQuery({
    // IMPORTANT: keep key stable — do NOT key by people readiness
    queryKey,
    queryFn: ({ pageParam }) =>
      prayersRepository.getPrayers(userId!, {
        cursor: pageParam,
        filter,
        limit: 20,
      }),
    enabled: !!userId,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    // Per-call cache behavior overrides
    ...(staleMode === 'static'
      ? {
          staleTime: Infinity,
          gcTime: Infinity,
          refetchOnMount: false as const,
          refetchOnWindowFocus: false as const,
          refetchOnReconnect: false as const,
        }
      : {}),
    // Seed UI instantly when cache exists
    ...(cachedData ? { initialData: cachedData } : {}),
    select: (data) => {
      // For list smoothness: precompute snapshot-only people once, not per-row during render
      if (!enhanceWithPeople) {
        return {
          ...data,
          pages: data.pages.map((page: any) => ({
            ...page,
            prayers: page.prayers.map((prayer: any) => ({
              ...prayer,
              enhancedPeople: extractPeopleFromSnapshot(prayer.input_snapshot || null),
            })),
          })),
        };
      }

      if (!prayerPeople?.length) {
        // Minimal snapshot-only enrichment (fallback mode)
        return {
          ...data,
          pages: data.pages.map((page: any) => ({
            ...page,
            prayers: page.prayers.map((prayer: any) => ({
              ...prayer,
              enhancedPeople: extractPeopleFromSnapshot(prayer.input_snapshot || null),
            })),
          })),
        };
      }

      const peopleMap = new Map();
      prayerPeople.forEach((person: any) => {
        peopleMap.set(person.name.toLowerCase(), person);
      });

      return {
        ...data,
        pages: data.pages.map((page: any) => ({
          ...page,
          prayers: page.prayers.map((prayer: any) => enhancePrayer(prayer, peopleMap)),
        })),
      };
    },
  });
};

// Today's prayers query
export const useTodaysPrayers = (userId: string | null, dayKey: string | null | undefined = 'current') => {
  return useQuery({
    queryKey: queryKeys.prayersToday(userId || '', dayKey),
    meta: { silent: true },
    queryFn: async ({ queryKey, meta }) => {
      try {
        return await prayersRepository.getTodaysPrayers(userId!);
      } catch (error) {
        if (meta?.silent && isNetworkError(error)) {
          const cached = queryClient.getQueryData<TodaysPrayersResult>(queryKey);

          if (cached) {
            console.debug('[useTodaysPrayers] Silent network failure, serving cached data');
            return cached;
          }
        }

        throw error;
      }
    },
    enabled: !!userId,
    ...cacheConfig.userControlled, // Never expires or gets garbage collected
  });
};

// Prayer by ID query
export const usePrayerById = (prayerId: string | null, userId: string | null) => {
  return useQuery({
    queryKey: queryKeys.prayer(userId || '', prayerId || ''),
    queryFn: () => prayersRepository.getPrayerById(prayerId!, userId!),
    enabled: !!prayerId && !!userId,
    ...cacheConfig.userControlled, // Never expires or gets garbage collected
  });
};

// Toggle like mutation
export const useTogglePrayerLike = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ prayerId, userId, liked }: { prayerId: string; userId: string; liked: boolean }) =>
      prayersRepository.toggleLike(prayerId, userId, liked),
    
    onMutate: async ({ prayerId, userId, liked }) => {
      // Optimistic update for today's prayers
      const dayKey = getPrayerDayStart().toISOString();
      const todaysQueryKey = queryKeys.prayersToday(userId, dayKey);
      
      await queryClient.cancelQueries({ queryKey: todaysQueryKey });
      
      const previousData = queryClient.getQueryData(todaysQueryKey);
      
      queryClient.setQueryData(todaysQueryKey, (old: any) => {
        if (!old) return old;
        
        const updatePrayer = (prayer: any) => 
          prayer?.id === prayerId ? { ...prayer, liked } : prayer;
        
        return {
          ...old,
          morning: updatePrayer(old.morning),
          evening: updatePrayer(old.evening),
        };
      });

      // Optimistic update for all infinite prayers lists
      const filters: ('all' | 'morning' | 'evening' | 'liked')[] = ['all', 'morning', 'evening', 'liked'];
      const infiniteQueryKeys = filters.map(filter => queryKeys.prayersInfinite(userId, filter));
      const previousInfiniteData: Record<string, any> = {};
      
      // Cancel and update all infinite queries
      await Promise.all(infiniteQueryKeys.map(key => queryClient.cancelQueries({ queryKey: key })));
      
      infiniteQueryKeys.forEach(key => {
        const keyString = key.join('-');
        previousInfiniteData[keyString] = queryClient.getQueryData(key);
        
        queryClient.setQueryData(key, (old: any) => {
          if (!old?.pages) return old;
          
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              prayers: page.prayers.map((prayer: any) =>
                prayer.id === prayerId ? { ...prayer, liked } : prayer
              ),
            })),
          };
        });
      });
      
      return { previousData, todaysQueryKey, previousInfiniteData, infiniteQueryKeys };
    },
    
    onError: (error, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousData) {
        queryClient.setQueryData(context.todaysQueryKey, context.previousData);
      }
      if (context?.previousInfiniteData && context?.infiniteQueryKeys) {
        // Rollback all infinite query updates
        context.infiniteQueryKeys.forEach((key: any) => {
          const keyString = key.join('-');
          const previousData = context.previousInfiniteData[keyString];
          if (previousData) {
            queryClient.setQueryData(key, previousData);
          }
        });
      }
      
      // Log error for debugging and provide user-friendly message
      console.error('[usePrayers] Toggle prayer like error:', error);
      // TODO: Show user-facing error via toast/alert system
    },
    
    onSettled: (data, error, { userId }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.prayers(userId) });
    },
  });
};

// Complete prayer mutation
export const useCompletePrayer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ prayerId, userId }: { prayerId: string; userId: string }) =>
      prayersRepository.completePrayer(prayerId, userId),
    
    onSuccess: (data, { userId, prayerId }) => {
      // Update cache with completion
      const dayKey = getPrayerDayStart().toISOString();
      const todaysQueryKey = queryKeys.prayersToday(userId, dayKey);
      
      queryClient.setQueryData(todaysQueryKey, (old: any) => {
        if (!old) return old;
        
        const now = new Date().toISOString();
        const updatePrayer = (prayer: any) => 
          prayer?.id === prayerId ? { ...prayer, completed_at: now } : prayer;
        
        return {
          ...old,
          morning: updatePrayer(old.morning),
          evening: updatePrayer(old.evening),
        };
      });
      
      // Comprehensive cache invalidation for all components that depend on prayer completion
      // Prayer Card dependencies
      queryClient.invalidateQueries({ queryKey: queryKeys.prayerState(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.userStats(userId) });
      
      // Journey Card dependencies  
      queryClient.invalidateQueries({ queryKey: queryKeys.prayersInfinite(userId, 'all') });
      queryClient.invalidateQueries({ queryKey: queryKeys.people(userId, false) });
      queryClient.invalidateQueries({ queryKey: queryKeys.people(userId, true) });
      
      // Invalidate all prayer queries to be safe
      queryClient.invalidateQueries({ queryKey: queryKeys.prayers(userId) });
      
      // Legacy homeData key (in case any components still use it)
      queryClient.invalidateQueries({ queryKey: queryKeys.homeData(userId) });
    },
    
    onError: (error) => {
      console.error('[usePrayers] Complete prayer error:', error);
      // TODO: Show user-facing error via toast/alert system
    },
  });
};
