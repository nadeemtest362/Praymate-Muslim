import React, { useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { resetUserScopedQueries } from '../../lib/auth/userDataMigration';
import { useHomeStore } from '../../stores/homeStore';

/**
 * Global component to detect user ID changes and handle cache cleanup
 * Mount this once in the app root to handle anonymous → real user transitions
 */
export const AuthChangeWatcher: React.FC = () => {
  const { user } = useAuth();
  const prevUserId = useRef<string | undefined>(undefined);

  useEffect(() => {
    const currentUserId = user?.id;
    const previousUserId = prevUserId.current;
    
    // If we had a previous user and now have a different user, clean up caches
    if (previousUserId && previousUserId !== currentUserId) {
      console.log('[AuthChangeWatcher] User ID changed:', { 
        from: previousUserId, 
        to: currentUserId 
      });
      
      // Reset all user-scoped React Query caches
      resetUserScopedQueries(previousUserId);
      
      // Inform Zustand stores that cached data is now invalid
      const homeStore = useHomeStore.getState();
      homeStore._setLoading(true);
      
      // Trigger reinitialization of home data with new user, or clear on sign-out
      if (currentUserId) {
        setTimeout(async () => {
          await useHomeStore.getState().initialize();
        }, 100);
      } else {
        // User signed out - clear any persisted HomeStore data
        homeStore._updatePrayerData({
          morningPrayer: null,
          eveningPrayer: null,
          currentStreak: 0,
          showStreakStartPopup: false,
        });
      }
    }
    
    prevUserId.current = currentUserId;
  }, [user?.id]);

  return null;
};
