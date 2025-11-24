import { queryClient } from './queryClient';
import { queryKeys } from './queryClient';

interface RealtimeRecord {
  id: string;
  user_id: string;
  [key: string]: any;
}



/**
 * Apply realtime patches directly to React Query cache to avoid flicker
 * Falls back to invalidation if cache update fails
 */
export function applyRealtimePatch(
  table: 'prayers' | 'people' | 'intentions',
  action: 'created' | 'updated' | 'deleted',
  record: RealtimeRecord
) {
  try {
    const userId = record.user_id;
    
    switch (table) {
      case 'prayers':
        applyPrayersPatch(action, record, userId);
        break;
      case 'people':
        applyPeoplePatch(action, record, userId);
        break;
      case 'intentions':
        applyIntentionsPatch(action, record, userId);
        break;
    }
  } catch (error) {
    console.warn(`[RealtimePatch] Failed to apply ${table} patch, falling back to invalidation:`, error);
    
    // Fallback to invalidation
    queryClient.invalidateQueries({ 
      queryKey: [table, record.user_id], 
      exact: false 
    });
  }
}

function applyPrayersPatch(action: string, record: RealtimeRecord, userId: string) {
  // Update today's prayers cache
  const todaysQueryKey = [...queryKeys.prayers(userId), 'today'];
  
  queryClient.setQueryData(todaysQueryKey, (old: any) => {
    if (!old) return old;
    
    switch (action) {
      case 'created':
        // Add new prayer to appropriate slot
        const isEvening = record.slot?.includes('evening');
        return {
          ...old,
          [isEvening ? 'evening' : 'morning']: record,
        };
        
      case 'updated':
        // Update existing prayer
        const updatePrayer = (prayer: any) => 
          prayer?.id === record.id ? { ...prayer, ...record } : prayer;
        
        return {
          ...old,
          morning: updatePrayer(old.morning),
          evening: updatePrayer(old.evening),
        };
        
      case 'deleted':
        // Remove prayer
        return {
          ...old,
          morning: old.morning?.id === record.id ? null : old.morning,
          evening: old.evening?.id === record.id ? null : old.evening,
        };
        
      default:
        return old;
    }
  });
  
  // Update infinite queries cache (if it exists)
  const infiniteQueryKey = queryKeys.prayers(userId);
  queryClient.setQueryData(infiniteQueryKey, (old: any) => {
    if (!old?.pages) return old;
    
    const updatedPages = old.pages.map((page: any) => {
      if (!page?.prayers) return page;
      
      switch (action) {
        case 'created':
          return {
            ...page,
            prayers: [record, ...page.prayers],
          };
          
        case 'updated':
          return {
            ...page,
            prayers: page.prayers.map((prayer: any) =>
              prayer.id === record.id ? { ...prayer, ...record } : prayer
            ),
          };
          
        case 'deleted':
          return {
            ...page,
            prayers: page.prayers.filter((prayer: any) => prayer.id !== record.id),
          };
          
        default:
          return page;
      }
    });
    
    return {
      ...old,
      pages: updatedPages,
    };
  });
}

function applyPeoplePatch(action: string, record: RealtimeRecord, userId: string) {
  // Update people cache
  const peopleQueryKey = queryKeys.people(userId);
  
  queryClient.setQueryData(peopleQueryKey, (old: any[]) => {
    if (!Array.isArray(old)) return old;
    
    switch (action) {
      case 'created':
        return [record, ...old];
        
      case 'updated':
        return old.map((person: any) =>
          person.id === record.id ? { ...person, ...record } : person
        );
        
      case 'deleted':
        return old.filter((person: any) => person.id !== record.id);
        
      default:
        return old;
    }
  });
  
  // Also update active-only cache if it exists
  const activePeopleQueryKey = queryKeys.people(userId, true);
  queryClient.setQueryData(activePeopleQueryKey, (old: any[]) => {
    if (!Array.isArray(old)) return old;
    
    // For people cache, we'd need to check if person has active intentions
    // For simplicity, just invalidate active cache
    queryClient.invalidateQueries({ queryKey: activePeopleQueryKey });
    return old;
  });
}

function applyIntentionsPatch(action: string, record: RealtimeRecord, userId: string) {
  // Update intentions cache
  const intentionsQueryKey = queryKeys.intentions(userId);
  
  queryClient.setQueryData(intentionsQueryKey, (old: any[]) => {
    if (!Array.isArray(old)) return old;
    
    switch (action) {
      case 'created':
        return [record, ...old];
        
      case 'updated':
        return old.map((intention: any) =>
          intention.id === record.id ? { ...intention, ...record } : intention
        );
        
      case 'deleted':
        return old.filter((intention: any) => intention.id !== record.id);
        
      default:
        return old;
    }
  });
}
