import { supabase } from './supabaseClient';
import { eventBus, emitDataChange } from './eventBus';
import { applyRealtimePatch } from './realtimePatch';
import { captureException } from './sentry';

interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: any;
  old?: any;
  table: string;
}

// Typed callbacks for domain-specific handling
export interface RealtimeCallbacks {
  onPrayers?: (payload: RealtimePayload) => void;
  onPeople?: (payload: RealtimePayload) => void;
  onIntentions?: (payload: RealtimePayload) => void;
}

class RealtimeManager {
  private channel: any = null;
  private isSetup = false;
  private setupPromise: Promise<void> | null = null;
  private currentUserId: string | null = null;
  private accessToken: string | null = null;
  private callbacks: RealtimeCallbacks = {};

  async setup(userId: string, accessToken?: string) {
    // If setup is already in progress for this user, wait for it
    if (this.setupPromise && this.currentUserId === userId) {
      return this.setupPromise;
    }

    if (this.isSetup && this.currentUserId === userId) {
      return;
    }

    // Create setup promise to prevent concurrent setups
    this.setupPromise = this._doSetup(userId, accessToken);
    try {
      await this.setupPromise;
    } finally {
      this.setupPromise = null;
    }
  }

  private async _doSetup(userId: string, accessToken?: string) {
    // Skip realtime setup during onboarding to prevent infinite loops
    const globalLocation = (typeof globalThis !== 'undefined' && (globalThis as any)?.location) || null;
    if (globalLocation?.pathname?.includes('onboarding')) {
      return;
    }

    // Cleanup any existing subscription first
    await this.cleanup();
    
    this.currentUserId = userId;
    this.accessToken = accessToken || null;

    // Single channel with composite filter for all user data
    // All app tables use 'user_id' column for proper filtering
    this.channel = supabase
      .channel('changes_for_user')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePayload) => {
          this.handleTableChange(payload, userId);
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          eventBus.emit('realtime:ready');
        }
      });

    this.isSetup = true;
  }

  // Update access token for reconnection
  updateToken(accessToken: string) {
    // Only update if token actually changed
    if (this.accessToken === accessToken) {
      return;
    }
    
    this.accessToken = accessToken;
    if (this.isSetup && this.currentUserId) {
      // Restart subscription with new token
      this.restart(this.currentUserId);
    }
  }

  // Set typed callbacks for domain-specific handling
  setCallbacks(callbacks: RealtimeCallbacks) {
    this.callbacks = callbacks;
  }

  // Verify connection (useful for app state changes)
  async verifyConnection() {
    if (!this.channel || !this.isSetup) return;
    
    // Simple ping to verify channel is alive
    try {
      const status = this.channel.state;
      // Check for both v1 and v2 supabase realtime states
      if (status !== 'joined' && status !== 'SUBSCRIBED') {
        if (this.currentUserId) {
          await this.restart(this.currentUserId);
        }
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('RealtimeSync connection verification failed');
      captureException(err, { area: 'realtimeSync.verifyConnection' });
      if (this.currentUserId) {
        await this.restart(this.currentUserId);
      }
    }
  }

  private handleTableChange(payload: RealtimePayload, userId: string) {
    const table = this.getTableFromPayload(payload);
    if (!table) {
      return;
    }

    const record = payload.new || payload.old;
    if (!record?.id) return;

    // Call domain-specific callback if available
    this.callDomainCallback(table, payload);

    // Map Postgres events to our event system
    let action: 'created' | 'updated' | 'deleted' | 'completed';
    switch (payload.eventType) {
      case 'INSERT':
        action = 'created';
        break;
      case 'UPDATE':
        // Special case: detect prayer completion
        if (table === 'prayers' && payload.new?.completed_at && !payload.old?.completed_at) {
          action = 'completed';
        } else {
          action = 'updated';
        }
        break;
      case 'DELETE':
        action = 'deleted';
        break;
      default:
        return;
    }

    // Apply cache patch for better UX (avoid flicker)
    try {
      // Use 'updated' for 'completed' actions since cache patch doesn't handle 'completed' separately
      const patchAction = action === 'completed' ? 'updated' : action;
      applyRealtimePatch(table, patchAction, record);
    } catch {
      // Intentionally no logging; emitDataChange below will ensure invalidation as fallback
    }

    // Emit data change event (will trigger cache invalidation as backup)
    emitDataChange(table, action, { userId, id: record.id });
  }

  private getTableFromPayload(payload: RealtimePayload): 'prayers' | 'people' | 'intentions' | null {
    // The table name should be in the payload, but if not, we can infer from the data
    if (payload.table === 'prayers') return 'prayers';
    if (payload.table === 'prayer_focus_people') return 'people';
    if (payload.table === 'prayer_intentions') return 'intentions';
    
    // Fallback: try to infer from record structure
    const record = payload.new || payload.old;
    if (!record) return null;
    
    if ('content' in record || 'slot' in record) return 'prayers';
    if ('name' in record && 'relationship' in record) return 'people';
    if ('topic' in record && 'person_id' in record) return 'intentions';
    
    return null;
  }

  private callDomainCallback(table: 'prayers' | 'people' | 'intentions', payload: RealtimePayload) {
    try {
      switch (table) {
        case 'prayers':
          this.callbacks.onPrayers?.(payload);
          break;
        case 'people':
          this.callbacks.onPeople?.(payload);
          break;
        case 'intentions':
          this.callbacks.onIntentions?.(payload);
          break;
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('RealtimeSync domain callback error');
      captureException(err, { area: 'realtimeSync.domainCallback', table });
    }
  }

  async cleanup() {
    if (this.channel) {
      try {
        const { error } = await supabase.removeChannel(this.channel);
        if (error) {
          const err = error instanceof Error ? error : new Error((error as any)?.message || 'removeChannel error');
          console.error('RealtimeSync cleanup error');
          captureException(err, { area: 'realtimeSync.cleanup' });
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('RealtimeSync cleanup error');
        captureException(err, { area: 'realtimeSync.cleanup' });
      }
      this.channel = null;
    }
    
    this.isSetup = false;
    this.currentUserId = null;
    this.accessToken = null;
    this.callbacks = {};
    // Don't clear setupPromise here - let the setup method handle it
  }

  // Method to restart subscriptions (useful after auth changes)
  async restart(userId: string) {
    const token = this.accessToken ? this.accessToken : undefined;
    // Use setup method which has proper concurrency protection
    await this.setup(userId, token);
  }
}

export const realtimeManager = new RealtimeManager();
