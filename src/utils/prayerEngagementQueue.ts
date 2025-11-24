import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabaseClient';
import { secureQueueStorage } from './secureQueueStorage';
import { safeSome } from './safeArrayMethods';

const PENDING_ENGAGEMENTS_KEY = 'pendingPrayerEngagements';

interface PendingEngagement {
  id: string;
  prayerId: string;
  userId: string;
  timestamp: string;
  retryCount: number;
  lastAttempt: string;
}

export class PrayerEngagementQueue {
  private static instance: PrayerEngagementQueue;
  private processingQueue = false;
  private networkUnsubscribe: (() => void) | null = null;
  private lastProcessTime = 0;
  private migrationPromise: Promise<void> | null = null;

  private constructor() {
    this.startNetworkMonitoring();
    this.ensureMigrated().catch(error => {
      console.error('[PrayerEngagementQueue] Initial migration error:', error);
    });
  }

  static getInstance(): PrayerEngagementQueue {
    if (!PrayerEngagementQueue.instance) {
      PrayerEngagementQueue.instance = new PrayerEngagementQueue();
    }
    return PrayerEngagementQueue.instance;
  }

  /**
   * Start monitoring network state to process queue when connectivity is restored
   */
  private startNetworkMonitoring(): void {
    let wasConnected = true; // Assume connected initially
    
    this.networkUnsubscribe = NetInfo.addEventListener(state => {
      // Only process when transitioning from disconnected to connected
      if (state.isConnected && !wasConnected && !this.processingQueue) {
        console.log('[PrayerEngagementQueue] Network connectivity restored - processing queue');
        this.processPendingEngagements().catch(error => {
          console.error('[PrayerEngagementQueue] Error processing queue on connectivity restore:', error);
        });
      }
      wasConnected = state.isConnected || false;
    });
  }

  /**
   * Add a prayer engagement to the pending queue for retry later
   */
  async enqueuePrayerEngagement(prayerId: string, userId: string): Promise<void> {
    try {
      await this.ensureMigrated();
      const pendingEngagement: PendingEngagement = {
        id: `${prayerId}-${Date.now()}`,
        prayerId,
        userId,
        timestamp: new Date().toISOString(),
        retryCount: 0,
        lastAttempt: new Date().toISOString()
      };

      const existingQueue = await this.getPendingEngagements();
      
      // Check if this prayer is already in the queue
      const alreadyQueued = safeSome(existingQueue, item => item.prayerId === prayerId);
      if (alreadyQueued) {
        console.log('[PrayerEngagementQueue] Prayer engagement already queued:', prayerId);
        return;
      }

      const updatedQueue = [...existingQueue, pendingEngagement];
      const stored = await secureQueueStorage.setJson(PENDING_ENGAGEMENTS_KEY, updatedQueue);
      if (!stored) {
        console.warn('[PrayerEngagementQueue] Failed to persist engagement queue update');
        return;
      }
      
      console.log('[PrayerEngagementQueue] Added prayer engagement to queue:', {
        prayerId,
        userId,
        queueSize: updatedQueue.length
      });

      // Try to process immediately if connected
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected) {
        this.processPendingEngagements().catch(error => {
          console.error('[PrayerEngagementQueue] Error processing queue after enqueue:', error);
        });
      }
    } catch (error) {
      console.error('[PrayerEngagementQueue] Error enqueueing prayer engagement:', error);
    }
  }

  /**
   * Process all pending engagements in the queue
   */
  async processPendingEngagements(): Promise<void> {
    if (this.processingQueue) {
      console.log('[PrayerEngagementQueue] Already processing queue, skipping');
      return;
    }

    await this.ensureMigrated();

    // Rate limiting: don't process more than once per 5 seconds
    const now = Date.now();
    if (now - this.lastProcessTime < 5000) {
      console.log('[PrayerEngagementQueue] Rate limited, skipping queue processing');
      return;
    }
    this.lastProcessTime = now;

    this.processingQueue = true;

    try {
      const pendingEngagements = await this.getPendingEngagements();
      
      if (pendingEngagements.length === 0) {
        console.log('[PrayerEngagementQueue] No pending engagements to process');
        return;
      }

      console.log('[PrayerEngagementQueue] Processing', pendingEngagements.length, 'pending engagements');

      const processed: string[] = [];
      const failed: PendingEngagement[] = [];

      for (const engagement of pendingEngagements) {
        try {
          const { error } = await supabase.rpc('mark_prayer_engaged', {
            p_prayer_id: engagement.prayerId
          });

          if (error) {
            console.error('[PrayerEngagementQueue] Error marking prayer as engaged:', error);
            
            // Increment retry count
            engagement.retryCount++;
            engagement.lastAttempt = new Date().toISOString();
            
            // Keep in queue if under retry limit (max 5 retries)
            if (engagement.retryCount < 5) {
              failed.push(engagement);
            } else {
              console.warn('[PrayerEngagementQueue] Max retries reached for engagement:', engagement.prayerId);
            }
          } else {
            console.log('[PrayerEngagementQueue] Successfully marked prayer as engaged:', engagement.prayerId);
            processed.push(engagement.id);
          }
        } catch (error) {
          console.error('[PrayerEngagementQueue] Error processing engagement:', error);
          
          // Increment retry count
          engagement.retryCount++;
          engagement.lastAttempt = new Date().toISOString();
          
          // Keep in queue if under retry limit
          if (engagement.retryCount < 5) {
            failed.push(engagement);
          } else {
            console.warn('[PrayerEngagementQueue] Max retries reached for engagement:', engagement.prayerId);
          }
        }
      }

      // Update queue with only failed items
      const persisted = await secureQueueStorage.setJson(PENDING_ENGAGEMENTS_KEY, failed);
      if (!persisted) {
        console.warn('[PrayerEngagementQueue] Failed to persist failed engagement queue state');
        return;
      }
      
      console.log('[PrayerEngagementQueue] Queue processing complete:', {
        processed: processed.length,
        failed: failed.length,
        remaining: failed.length
      });

    } catch (error) {
      console.error('[PrayerEngagementQueue] Error processing pending engagements:', error);
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Get all pending engagements from storage
   */
  private async getPendingEngagements(): Promise<PendingEngagement[]> {
    try {
      await this.ensureMigrated();
      const stored = await secureQueueStorage.getJson<PendingEngagement[]>(PENDING_ENGAGEMENTS_KEY);
      return stored ? stored : [];
    } catch (error) {
      console.error('[PrayerEngagementQueue] Error getting pending engagements:', error);
      return [];
    }
  }

  /**
   * Clear all pending engagements (useful for testing)
   */
  async clearQueue(): Promise<void> {
    try {
      await this.ensureMigrated();
      const removed = await secureQueueStorage.remove(PENDING_ENGAGEMENTS_KEY);
      if (removed) {
        console.log('[PrayerEngagementQueue] Queue cleared');
      } else {
        console.warn('[PrayerEngagementQueue] Failed to clear queue');
      }
    } catch (error) {
      console.error('[PrayerEngagementQueue] Error clearing queue:', error);
    }
  }

  /**
   * Get queue status for debugging
   */
  async getQueueStatus(): Promise<{
    pending: number;
    items: PendingEngagement[];
  }> {
    await this.ensureMigrated();
    const items = await this.getPendingEngagements();
    return {
      pending: items.length,
      items
    };
  }

  /**
   * Cleanup network monitoring
   */
  cleanup(): void {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }
  }

  private async ensureMigrated(): Promise<void> {
    if (!this.migrationPromise) {
      this.migrationPromise = secureQueueStorage
        .migrateFromAsyncStorage([PENDING_ENGAGEMENTS_KEY])
        .catch(error => {
          console.error('[PrayerEngagementQueue] Migration attempt failed:', error);
          throw error;
        });
    }

    try {
      await this.migrationPromise;
    } catch (error) {
      this.migrationPromise = null;
      throw error;
    }
  }
}

// Export singleton instance
export const prayerEngagementQueue = PrayerEngagementQueue.getInstance();
