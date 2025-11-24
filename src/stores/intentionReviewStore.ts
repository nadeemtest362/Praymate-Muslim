/**
 * Intention Review Store
 * 
 * Manages session changes during prayer preparation (mood, context, intention toggles).
 * 
 * Key behaviors:
 * - Mood and context persist until actually used in a prayer generation
 * - Data survives app restarts via AsyncStorage
 * - Session is cleared in two cases:
 *   1. After successful prayer generation (normal flow)
 *   2. After 24 hours without use (safeguard against stale data)
 */

import { create } from 'zustand';
import { subscribeWithSelector, persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SessionChanges {
  toggledIntentions?: { id: string; toState: boolean }[];
  addedIntentions?: { id: string; details: string; category: string; personName?: string }[];
  mood?: string;
  moodContext?: string;
}

interface IntentionReviewStore {
  sessionChanges: SessionChanges;
  sessionStartTime: number | null;
  setSessionChanges: (changes: SessionChanges) => void;
  updateSessionChanges: (updates: Partial<SessionChanges>) => void;
  clearSessionChanges: () => void;
  startSession: () => void;
  isSessionExpired: () => boolean;
}

// Changed from 30 minutes to 24 hours as a safeguard
// The session should persist until used, but we still want some upper limit
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

export const useIntentionReviewStore = create<IntentionReviewStore>()(
  persist(
    subscribeWithSelector((set, get) => ({
      sessionChanges: {},
      sessionStartTime: null,
      
      setSessionChanges: (changes) => set({ sessionChanges: changes }),
      
      updateSessionChanges: (updates) => 
        set((state) => ({ 
          sessionChanges: { ...state.sessionChanges, ...updates } 
        })),
        
      clearSessionChanges: () => set({ 
        sessionChanges: {}, 
        sessionStartTime: null 
      }),
      
      startSession: () => set({ sessionStartTime: Date.now() }),
      
      isSessionExpired: () => {
        const { sessionStartTime } = get();
        if (!sessionStartTime) return false;
        return Date.now() - sessionStartTime > SESSION_TIMEOUT;
      },
    })),
    {
      name: 'intention-review-storage', // unique name for AsyncStorage key
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ 
        sessionChanges: state.sessionChanges,
        sessionStartTime: state.sessionStartTime 
      }), // Only persist what we need
    }
  )
); 