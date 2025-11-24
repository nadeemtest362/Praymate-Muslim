import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabaseClient';
import { secureQueueStorage } from './secureQueueStorage';
import { safeFindIndex } from './safeArrayMethods';

const PENDING_COMPLETIONS_KEY = 'pendingPrayerCompletions';

interface PendingCompletion {
  id: string;
  prayerId: string;
  userId: string;
  timestamp: string;
  retryCount: number;
  lastAttempt: string;
}

export class PrayerCompletionQueue {
  private static instance: PrayerCompletionQueue;
  private processingQueue = false;
  private networkUnsubscribe: (() => void) | null = null;
  private lastProcessTime = 0;
  private migrationPromise: Promise<void> | null = null;

  private constructor() {
    this.startNetworkMonitoring();
    this.ensureMigrated().catch(error => {
      console.error('[PrayerCompletionQueue] Initial migration error:', error);
    });
  }

  static getInstance(): PrayerCompletionQueue {
    if (!PrayerCompletionQueue.instance) {
      PrayerCompletionQueue.instance = new PrayerCompletionQueue();
    }
    return PrayerCompletionQueue.instance;
  }

  /**
   * Start monitoring network state to process queue when connectivity is restored
   */
  private startNetworkMonitoring(): void {
    let wasConnected = true; // Assume connected initially
    
    this.networkUnsubscribe = NetInfo.addEventListener(state => {
      // Only process when transitioning from disconnected to connected
      if (state.isConnected && !wasConnected && !this.processingQueue) {
        console.log('[PrayerCompletionQueue] Network connectivity restored - processing queue');
        this.processPendingCompletions().catch(error => {
          console.error('[PrayerCompletionQueue] Error processing queue on connectivity restore:', error);
        });
      }
      wasConnected = state.isConnected || false;
    });
  }

  /**
   * Add a prayer completion to the pending queue for retry later
   */
  async addPendingCompletion(prayerId: string, userId: string): Promise<void> {
    try {
      await this.ensureMigrated();
      const pendingCompletions = await this.getPendingCompletions();
      
      const completion: PendingCompletion = {
        id: `${prayerId}_${Date.now()}`,
        prayerId,
        userId,
        timestamp: new Date().toISOString(),
        retryCount: 0,
        lastAttempt: new Date().toISOString()
      };

      // Check if this prayer is already pending
      const existingIndex = safeFindIndex(pendingCompletions, p => p.prayerId === prayerId);
      if (existingIndex !== -1) {
        // Update existing entry
        pendingCompletions[existingIndex] = completion;
      } else {
        // Add new entry
        pendingCompletions.push(completion);
      }

      const stored = await secureQueueStorage.setJson(PENDING_COMPLETIONS_KEY, pendingCompletions);
      if (!stored) {
        console.warn('[PrayerCompletionQueue] Failed to persist completion queue update');
        return;
      }
      console.log('[PrayerCompletionQueue] Added pending completion:', completion.id);
    } catch (error) {
      console.error('[PrayerCompletionQueue] Error adding pending completion:', error);
    }
  }

  /**
   * Get all pending completions
   */
  async getPendingCompletions(): Promise<PendingCompletion[]> {
    try {
      await this.ensureMigrated();
      const data = await secureQueueStorage.getJson<PendingCompletion[]>(PENDING_COMPLETIONS_KEY);
      return data ? data : [];
    } catch (error) {
      console.error('[PrayerCompletionQueue] Error getting pending completions:', error);
      return [];
    }
  }

  /**
   * Remove a completed prayer from the pending queue
   */
  async removeCompletedPrayer(prayerId: string): Promise<void> {
    try {
      await this.ensureMigrated();
      const pendingCompletions = await this.getPendingCompletions();
      const filtered = pendingCompletions.filter(p => p.prayerId !== prayerId);
      const stored = await secureQueueStorage.setJson(PENDING_COMPLETIONS_KEY, filtered);
      if (!stored) {
        console.warn('[PrayerCompletionQueue] Failed to persist removal for prayer', prayerId);
        return;
      }
      console.log('[PrayerCompletionQueue] Removed completed prayer:', prayerId);
    } catch (error) {
      console.error('[PrayerCompletionQueue] Error removing completed prayer:', error);
    }
  }

  /**
   * Process all pending completions (with throttling to avoid excessive calls)
   */
  async processPendingCompletions(force = false): Promise<void> {
    if (this.processingQueue) {
      console.log('[PrayerCompletionQueue] Already processing queue, skipping');
      return;
    }

    await this.ensureMigrated();

    // Throttle processing - only once every 30 seconds (unless forced)
    if (!force) {
      const now = Date.now();
      if (now - this.lastProcessTime < 30000) {
        console.log('[PrayerCompletionQueue] Recently processed, skipping');
        return;
      }
      this.lastProcessTime = now;
    }

    this.processingQueue = true;
    this.lastProcessTime = Date.now(); // Update time when we actually start processing
    console.log('[PrayerCompletionQueue] Starting to process pending completions');

    try {
      const pendingCompletions = await this.getPendingCompletions();
      
      if (pendingCompletions.length === 0) {
        console.log('[PrayerCompletionQueue] No pending completions to process');
        return;
      }

      console.log(`[PrayerCompletionQueue] Processing ${pendingCompletions.length} pending completions`);
      const remainingCompletions: PendingCompletion[] = [];

      for (const completion of pendingCompletions) {
        const shouldRetry = this.shouldRetryCompletion(completion);
        
        if (!shouldRetry) {
          console.log(`[PrayerCompletionQueue] Skipping completion ${completion.id} - too old or too many retries`);
          continue;
        }

        try {
          const { error } = await supabase.functions.invoke('complete-prayer', {
            body: { 
              prayerId: completion.prayerId, 
              userId: completion.userId 
            }
          });

          if (error) throw error;
          
          console.log(`[PrayerCompletionQueue] Successfully completed prayer ${completion.prayerId}`);
          
          // Emit event to trigger cache invalidation for late completions
          const { emitDataChange } = await import('../lib/eventBus');
          emitDataChange('prayers', 'completed', { 
            userId: completion.userId, 
            id: completion.prayerId 
          });
          
          // Don't add to remaining - it's completed
        } catch (error) {
          console.error(`[PrayerCompletionQueue] Failed to complete prayer ${completion.prayerId}:`, error);
          
          // Update retry count and add back to queue
          completion.retryCount += 1;
          completion.lastAttempt = new Date().toISOString();
          
          if (completion.retryCount < 5) { // Max 5 retries
            remainingCompletions.push(completion);
          } else {
            console.log(`[PrayerCompletionQueue] Giving up on completion ${completion.id} after ${completion.retryCount} retries`);
          }
        }
      }

      // Save remaining completions back to storage
      const persisted = await secureQueueStorage.setJson(PENDING_COMPLETIONS_KEY, remainingCompletions);
      if (!persisted) {
        console.warn('[PrayerCompletionQueue] Failed to persist remaining completions after processing');
        return;
      }
      console.log(`[PrayerCompletionQueue] Processing complete. ${remainingCompletions.length} completions remaining`);
      
    } catch (error) {
      console.error('[PrayerCompletionQueue] Error processing pending completions:', error);
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Determine if a completion should be retried
   */
  private shouldRetryCompletion(completion: PendingCompletion): boolean {
    // Don't retry if too many attempts
    if (completion.retryCount >= 5) {
      return false;
    }

    // Don't retry if too old (older than 7 days)
    const completionDate = new Date(completion.timestamp);
    const now = new Date();
    const daysDiff = (now.getTime() - completionDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 7) {
      return false;
    }

    // Use exponential backoff for retries
    const lastAttempt = new Date(completion.lastAttempt);
    const minDelayMs = Math.pow(2, completion.retryCount) * 60 * 1000; // 1min, 2min, 4min, 8min, 16min
    const timeSinceLastAttempt = now.getTime() - lastAttempt.getTime();
    
    return timeSinceLastAttempt >= minDelayMs;
  }

  /**
   * Get count of pending completions
   */
  async getPendingCount(): Promise<number> {
    await this.ensureMigrated();
    const pendingCompletions = await this.getPendingCompletions();
    return pendingCompletions.length;
  }

  /**
   * Clear all pending completions (for testing or reset)
   */
  async clearPendingCompletions(): Promise<void> {
    try {
      await this.ensureMigrated();
      const removed = await secureQueueStorage.remove(PENDING_COMPLETIONS_KEY);
      if (removed) {
        console.log('[PrayerCompletionQueue] Cleared all pending completions');
      } else {
        console.warn('[PrayerCompletionQueue] Failed to clear pending completions');
      }
    } catch (error) {
      console.error('[PrayerCompletionQueue] Error clearing pending completions:', error);
    }
  }

  /**
   * Cleanup method to stop network monitoring
   */
  public cleanup(): void {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
      console.log('[PrayerCompletionQueue] Network monitoring stopped');
    }
  }

  private async ensureMigrated(): Promise<void> {
    if (!this.migrationPromise) {
      this.migrationPromise = secureQueueStorage
        .migrateFromAsyncStorage([PENDING_COMPLETIONS_KEY])
        .catch(error => {
          console.error('[PrayerCompletionQueue] Migration attempt failed:', error);
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
export const prayerCompletionQueue = PrayerCompletionQueue.getInstance();
