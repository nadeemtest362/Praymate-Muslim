import { Router } from 'expo-router';
import type { Prayer } from '../models/prayer';

interface NavigateToPrayerParams {
  router: Router;
  currentPeriod: 'morning' | 'evening';
  morningPrayer: Prayer | null;
  eveningPrayer: Prayer | null;
  currentWindowAvailable: boolean;
}

/**
 * Navigate to the appropriate prayer screen based on current state
 * This logic is shared between home screen button and deep link handling
 */
export function navigateToPrayer({
  router,
  currentPeriod,
  morningPrayer,
  eveningPrayer,
  currentWindowAvailable
}: NavigateToPrayerParams) {
  console.log('[PrayerNavigation] Starting navigation with:', {
    currentPeriod,
    hasMorningPrayer: !!morningPrayer,
    hasEveningPrayer: !!eveningPrayer,
    currentWindowAvailable,
    router: !!router
  });
  
  const currentPrayer = currentPeriod === 'morning' ? morningPrayer : eveningPrayer;
  
  if (currentPrayer) {
    console.log('[PrayerNavigation] Found existing prayer, navigating to prayer-display:', {
      prayerId: currentPrayer.id,
      hasContent: !!currentPrayer.content,
      slot: currentPeriod
    });
    
    // Navigate directly to prayer display
    router.push({
      pathname: '/prayer-display',
      params: {
   
        slot: currentPeriod,
        verse: currentPrayer.verse_ref ?? '',
        prayerId: currentPrayer.id
      }
    });
  } else {
    console.log('[PrayerNavigation] No existing prayer, navigating to intention-review');
    
    // Navigate to intention review to generate new prayer (always pass time period)
    const route = `/intention-review?time=${currentPeriod}`;
    
    console.log('[PrayerNavigation] Navigating to route:', route);
    router.push(route);
  }
}
