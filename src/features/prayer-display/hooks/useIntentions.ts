import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image as ExpoImage } from 'expo-image';
import { queryClient, queryKeys, cacheConfig } from '../../../lib/queryClient';
import { intentionsRepository, type PrayerIntention, type CreateIntentionParams, type UpdateIntentionParams } from '../../../repositories/intentionsRepository';
import { getPublicImageUrl } from '../../../utils/imageStorage';
import { isImageUrlPrefetched, registerPrefetchedImageUrl } from '../../../utils/imagePrefetchRegistry';

// All intentions query
export const useIntentions = (userId: string | null) => {
  const queryKey = queryKeys.intentions(userId || '');

  return useQuery({
    queryKey,
    queryFn: async () => {
      const intentions = await intentionsRepository.getAllIntentions(userId!);
      
      // Prefetch person images for better UX on intentions tab
      const imagesToPrefetch = intentions
        .filter(intention => intention.prayer_focus_people?.image_uri)
        .map(intention => intention.prayer_focus_people!.image_uri!)
        .filter((uri, index, array) => array.indexOf(uri) === index); // Remove duplicates
      if (imagesToPrefetch.length > 0) {
        imagesToPrefetch.forEach((imageUri) => {
          void (async () => {
            try {
              const imageUrl = getPublicImageUrl(imageUri);
              if (!imageUrl || isImageUrlPrefetched(imageUrl)) {
                return;
              }

              const success = await ExpoImage
                .prefetch(imageUrl, { cachePolicy: 'memory-disk' })
                .catch(() => false);

              if (success) {
                registerPrefetchedImageUrl(imageUrl);
              }
            } catch {
              // Silently fail - prefetching is an optimization only
            }
          })();
        });
      }
      
      return intentions;
    },
    enabled: !!userId,
    initialData: () => {
      if (!userId) return undefined;
      return queryClient.getQueryData<PrayerIntention[]>(queryKey);
    },
    ...cacheConfig.userControlled, // Never expires or gets garbage collected
  });
};

// Intentions by person ID query
export const useIntentionsByPersonId = (userId: string | null, personId: string | null) => {
  return useQuery({
    queryKey: queryKeys.intentionsByPerson(userId || '', personId),
    queryFn: () => intentionsRepository.getIntentionsByPersonId(userId!, personId ?? null),
    enabled: !!userId,
    ...cacheConfig.userControlled, // Never expires or gets garbage collected
  });
};

// Active intentions only query
export const useActiveIntentions = (userId: string | null) => {
  return useQuery({
    queryKey: queryKeys.activeIntentions(userId || ''),
    queryFn: () => intentionsRepository.getActiveIntentions(userId!),
    enabled: !!userId,
    ...cacheConfig.userControlled, // Never expires or gets garbage collected
  });
};

// Single intention query
export const useIntentionById = (intentionId: string | null) => {
  return useQuery({
    queryKey: queryKeys.intention(intentionId || ''),
    queryFn: () => intentionsRepository.getIntentionById(intentionId!),
    enabled: !!intentionId,
    ...cacheConfig.userControlled, // Never expires or gets garbage collected
  });
};

// Create intention mutation
export const useCreateIntention = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, intention }: { userId: string; intention: CreateIntentionParams }) =>
      intentionsRepository.createIntention(userId, intention),
    onMutate: async ({ userId, intention }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: queryKeys.intentions(userId) });

      // Get current data
      const previousIntentions = queryClient.getQueryData<PrayerIntention[]>(
        queryKeys.intentions(userId)
      );

      // Optimistically update cache
      if (previousIntentions) {
        const optimisticIntention: PrayerIntention = {
          id: `temp-${Date.now()}`,
          user_id: userId,
          person_id: intention.person_id,
          category: intention.category,
          details: intention.details,
          is_active: intention.is_active,
          created_at: new Date().toISOString(),
          prayer_focus_people: null, // Will be populated when real data returns
        };

        queryClient.setQueryData<PrayerIntention[]>(
          queryKeys.intentions(userId),
          [optimisticIntention, ...previousIntentions]
        );
      }

      return { previousIntentions };
    },
    onError: (error, { userId }, context) => {
      // Rollback optimistic update
      if (context?.previousIntentions) {
        queryClient.setQueryData(queryKeys.intentions(userId), context.previousIntentions);
      }
      console.error('[useCreateIntention] Error:', error);
    },
    onSuccess: (newIntention, { userId }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.intentions(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.activeIntentions(userId) });
      
      // If intention is for a specific person, invalidate person queries
      if (newIntention.person_id) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.intentionsByPerson(userId, newIntention.person_id) 
        });
      }
      
      // Always invalidate people queries since adding an intention affects activeOnly status
      queryClient.invalidateQueries({ queryKey: queryKeys.people(userId, true) }); // activeOnly: true
      queryClient.invalidateQueries({ queryKey: queryKeys.people(userId, false) }); // activeOnly: false
    },
  });
};

// Update intention mutation
export const useUpdateIntention = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ intentionId, updates }: { intentionId: string; updates: UpdateIntentionParams }) =>
      intentionsRepository.updateIntention(intentionId, updates),
    onMutate: async ({ intentionId, updates }) => {
      // Find the intention to get userId for cache keys (optimized to scan only intentions queries)
      const allQueries = queryClient.getQueriesData({ queryKey: ['intentions'], exact: false });
      let userId: string | null = null;
      let previousIntentions: PrayerIntention[] | undefined;

      // Find the query that contains this intention
      for (const [, data] of allQueries) {
        if (Array.isArray(data)) {
          const intention = data.find((i: PrayerIntention) => i.id === intentionId);
          if (intention) {
            userId = intention.user_id;
            previousIntentions = data as PrayerIntention[];
            break;
          }
        }
      }

      if (!userId) return { previousIntentions: undefined };

      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: queryKeys.intentions(userId) });

      // Optimistically update cache
      if (previousIntentions) {
        const updatedIntentions = previousIntentions.map(intention =>
          intention.id === intentionId ? { ...intention, ...updates } : intention
        );

        queryClient.setQueryData<PrayerIntention[]>(
          queryKeys.intentions(userId),
          updatedIntentions
        );
      }

      return { previousIntentions, userId };
    },
    onError: (error, { intentionId }, context) => {
      // Rollback optimistic update
      if (context?.previousIntentions && context?.userId) {
        queryClient.setQueryData(queryKeys.intentions(context.userId), context.previousIntentions);
      }
      console.error('[useUpdateIntention] Error:', error);
    },
    onSuccess: (updatedIntention) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.intentions(updatedIntention.user_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.activeIntentions(updatedIntention.user_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.intention(updatedIntention.id) });
      
      // If intention is for a specific person, invalidate person queries
      if (updatedIntention.person_id) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.intentionsByPerson(updatedIntention.user_id, updatedIntention.person_id) 
        });
      }
    },
  });
};

// Toggle intention active status mutation
export const useToggleIntentionActive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ intentionId }: { intentionId: string }) =>
      intentionsRepository.toggleIntentionActive(intentionId),
    onMutate: async ({ intentionId }) => {
      // Find the intention to get userId and current state (optimized scan)
      const allQueries = queryClient.getQueriesData({ queryKey: ['intentions'], exact: false });
      let userId: string | null = null;
      let previousIntentions: PrayerIntention[] | undefined;
      let currentIntention: PrayerIntention | undefined;

      for (const [, data] of allQueries) {
        if (Array.isArray(data)) {
          const intention = data.find((i: PrayerIntention) => i.id === intentionId);
          if (intention) {
            userId = intention.user_id;
            previousIntentions = data as PrayerIntention[];
            currentIntention = intention;
            break;
          }
        }
      }

      if (!userId || !currentIntention) return { previousIntentions: undefined };

      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: queryKeys.intentions(userId) });

      // Optimistically update main intentions cache
      if (previousIntentions) {
        const updatedIntentions = previousIntentions.map(intention =>
          intention.id === intentionId 
            ? { ...intention, is_active: !intention.is_active } 
            : intention
        );

        queryClient.setQueryData<PrayerIntention[]>(
          queryKeys.intentions(userId),
          updatedIntentions
        );
      }

      // Also optimistically update intentionsByPerson cache if applicable
      const byPersonKey = currentIntention.person_id
        ? queryKeys.intentionsByPerson(userId, currentIntention.person_id)
        : null;
      const previousByPerson = byPersonKey
        ? queryClient.getQueryData<PrayerIntention[]>(byPersonKey)
        : undefined;

      if (previousByPerson && byPersonKey) {
        const updatedByPerson = previousByPerson.map(i =>
          i.id === intentionId ? { ...i, is_active: !i.is_active } : i
        );
        queryClient.setQueryData<PrayerIntention[]>(byPersonKey, updatedByPerson);
      }

      return { previousIntentions, userId, previousByPerson, byPersonKey };
    },
    onError: (error, { intentionId }, context) => {
      // Rollback optimistic updates
      if (context?.previousIntentions && context?.userId) {
        queryClient.setQueryData(queryKeys.intentions(context.userId), context.previousIntentions);
      }
      if (context?.previousByPerson && context?.byPersonKey) {
        queryClient.setQueryData(context.byPersonKey, context.previousByPerson);
      }
      console.error('[useToggleIntentionActive] Error:', error);
    },
    onSuccess: (updatedIntention) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.intentions(updatedIntention.user_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.activeIntentions(updatedIntention.user_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.intention(updatedIntention.id) });
      
      // If intention is for a specific person, invalidate person queries
      if (updatedIntention.person_id) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.intentionsByPerson(updatedIntention.user_id, updatedIntention.person_id) 
        });
      }
    },
  });
};

// Delete intention mutation
export const useDeleteIntention = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ intentionId }: { intentionId: string }) =>
      intentionsRepository.deleteIntention(intentionId),
    onMutate: async ({ intentionId }) => {
      // No optimistic update for delete, so no context needed
      return {};
    },
    onError: (error, { intentionId }) => {
      console.error('[useDeleteIntention] Error:', error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intentions'] });
    },
  });
};

// Bulk create intentions mutation
export const useCreateMultipleIntentions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, intentions }: { userId: string; intentions: CreateIntentionParams[] }) =>
      intentionsRepository.createMultipleIntentions(userId, intentions),
    onSuccess: (newIntentions, { userId }) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.intentions(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.activeIntentions(userId) });
      
      // Invalidate person-specific queries
      const personIds = [...new Set(newIntentions.map(i => i.person_id).filter(Boolean))];
      personIds.forEach(personId => {
        if (personId) {
          queryClient.invalidateQueries({ 
            queryKey: queryKeys.intentionsByPerson(userId, personId) 
          });
        }
      });
    },
  });
};
