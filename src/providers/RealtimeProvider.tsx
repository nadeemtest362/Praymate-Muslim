import React, { useEffect } from 'react';
import { realtimeManager } from '../lib/realtimeSync';
import { useSessionStore } from '../stores/authSlices/sessionSlice';

interface RealtimeProviderProps {
  children: React.ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const { user, session } = useSessionStore();

  useEffect(() => {
    if (user?.id && session?.access_token) {
      console.log('[RealtimeProvider] Setting up realtime for user:', user.id);
      realtimeManager.setup(user.id, session.access_token);
      // Ensure token is updated even if manager was already setup
      realtimeManager.updateToken(session.access_token);
    }

    return () => {
      console.log('[RealtimeProvider] Cleaning up realtime subscriptions');
      try {
        realtimeManager.cleanup();
      } catch (error) {
        console.warn('[RealtimeProvider] Error during cleanup:', error);
      }
    };
  }, [user?.id, session?.access_token]);

  return <>{children}</>;
}
