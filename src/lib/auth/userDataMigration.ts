import { queryClient, queryKeys } from '../queryClient';
import type { Profile } from '../../types/auth';

/**
 * Reset all user-scoped queries when switching users
 * Call this when transitioning from anonymous to real user
 */
export const resetUserScopedQueries = (prevUserId?: string) => {
  if (!prevUserId) return;
  
  console.log('[userDataMigration] Resetting queries for previous user:', prevUserId);
  
  // Cancel any in-flight requests for the previous user before removing
  queryClient.cancelQueries({ queryKey: queryKeys.profile(prevUserId) });
  queryClient.cancelQueries({ queryKey: queryKeys.prayers(prevUserId) });
  queryClient.cancelQueries({ queryKey: queryKeys.people(prevUserId) });
  queryClient.cancelQueries({ queryKey: queryKeys.intentions(prevUserId) });
  queryClient.cancelQueries({ queryKey: queryKeys.homeData(prevUserId) });
  queryClient.cancelQueries({ queryKey: queryKeys.userStats(prevUserId) });
  queryClient.cancelQueries({ queryKey: queryKeys.prayerState(prevUserId) });
  queryClient.cancelQueries({ queryKey: queryKeys.onboardingFlow(prevUserId) });
  queryClient.cancelQueries({ queryKey: queryKeys.onboardingState(prevUserId) });
  
  // Cancel queries with the old user ID in general
  queryClient.cancelQueries({
    predicate: (query) => {
      const key = query.queryKey;
      return Array.isArray(key) && key.includes(prevUserId);
    }
  });
  
  // Remove all queries scoped to the previous user
  queryClient.removeQueries({ queryKey: queryKeys.profile(prevUserId) });
  queryClient.removeQueries({ queryKey: queryKeys.prayers(prevUserId) });
  queryClient.removeQueries({ queryKey: queryKeys.prayersToday(prevUserId) });
  queryClient.removeQueries({ queryKey: queryKeys.people(prevUserId) });
  queryClient.removeQueries({ queryKey: queryKeys.intentions(prevUserId) });
  queryClient.removeQueries({ queryKey: queryKeys.activeIntentions(prevUserId) });
  queryClient.removeQueries({ queryKey: queryKeys.homeData(prevUserId) });
  queryClient.removeQueries({ queryKey: queryKeys.userStats(prevUserId) });
  queryClient.removeQueries({ queryKey: queryKeys.prayerState(prevUserId) });
  queryClient.removeQueries({ queryKey: queryKeys.onboardingFlow(prevUserId) });
  queryClient.removeQueries({ queryKey: queryKeys.onboardingState(prevUserId) });
  
  // Remove any prayer queries with the old user ID
  queryClient.removeQueries({
    predicate: (query) => {
      const key = query.queryKey;
      return Array.isArray(key) && key.includes(prevUserId);
    }
  });
};

/**
 * Migrate user data in cache from anonymous to real user
 * Use when server-side migration preserves data but user ID changes
 */
export const migrateUserDataInCache = (
  prevId: string,
  nextId: string,
  qc = queryClient
) => {
  console.log('[userDataMigration] Migrating cache data:', { prevId, nextId });
  
  // Migrate profile data if it exists
  const prevProfile = qc.getQueryData<Profile>(queryKeys.profile(prevId));
  if (prevProfile) {
    qc.setQueryData(queryKeys.profile(nextId), { ...prevProfile, id: nextId });
    console.log('[userDataMigration] Migrated profile data');
  }
  
  // For other data types, we typically want to invalidate and refetch
  // rather than migrate, since the server handles the migration
  
  // Clean up old user data
  resetUserScopedQueries(prevId);
  
  // Invalidate queries for the new user to ensure fresh data
  qc.invalidateQueries({ queryKey: queryKeys.profile(nextId) });
  qc.invalidateQueries({ queryKey: queryKeys.prayers(nextId) });
  qc.invalidateQueries({ queryKey: queryKeys.people(nextId) });
  qc.invalidateQueries({ queryKey: queryKeys.intentions(nextId) });
  qc.invalidateQueries({ queryKey: queryKeys.homeData(nextId) });
  qc.invalidateQueries({ queryKey: queryKeys.userStats(nextId) });
  qc.invalidateQueries({ queryKey: queryKeys.prayerState(nextId) });
  qc.invalidateQueries({ queryKey: queryKeys.onboardingFlow(nextId) });
  qc.invalidateQueries({ queryKey: queryKeys.onboardingState(nextId) });
};

/**
 * Wait for user ID to change (for anonymous → real user transitions)
 */
export const waitForUserIdChange = (
  previousId: string,
  timeout = 5000
): Promise<string | null> => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkUserId = () => {
      const session = queryClient.getQueryData<{ user?: { id?: string } }>(queryKeys.session);
      const currentId = session?.user?.id;
      
      if (currentId && currentId !== previousId) {
        resolve(currentId);
        return;
      }
      
      if (Date.now() - startTime > timeout) {
        reject(new Error('Timeout waiting for user ID change'));
        return;
      }
      
      // Check again in 100ms
      setTimeout(checkUserId, 100);
    };
    
    checkUserId();
  });
};
