import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { secureQueueStorage } from './secureQueueStorage';
import { secureLog } from './secureLogger';
import { invokeGeneratePrayerWithRetry } from './generatePrayerRetry';
import { emitDataChange } from '../lib/eventBus';

const PENDING_GENERATIONS_KEY = 'pendingPrayerGenerations';
const MAX_QUEUE_RETRIES = 4;
const MAX_WINDOW_MS = 60 * 60 * 1000; // 1 hour

interface PendingGeneration {
  id: string;
  userId: string;
  slot?: string;
  payload: Record<string, unknown>;
  source?: string;
  createdAt: string;
  retryCount: number;
  lastAttempt: string;
}

type QueueListener = (status: { pending: number }) => void;

export class PrayerGenerationQueue {
  private static instance: PrayerGenerationQueue;
  private processing = false;
  private listeners = new Set<QueueListener>();
  private networkUnsubscribe: (() => void) | null = null;
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
  private migrationPromise: Promise<void> | null = null;

  private constructor() {
    this.startNetworkMonitoring();
    this.startAppStateMonitoring();
    secureLog.info('[PrayerGenerationQueue] Initialized');
  }

  static getInstance(): PrayerGenerationQueue {
    if (!PrayerGenerationQueue.instance) {
      PrayerGenerationQueue.instance = new PrayerGenerationQueue();
    }
    return PrayerGenerationQueue.instance;
  }

  addListener(listener: QueueListener): () => void {
    this.listeners.add(listener);
    this.notifyListeners();
    return () => {
      this.listeners.delete(listener);
    };
  }

  async enqueueGeneration(params: {
    userId: string;
    payload: Record<string, unknown>;
    slot?: string;
    source?: string;
  }): Promise<void> {
    const pending = await this.getPendingGenerations();
    const entry: PendingGeneration = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      userId: params.userId,
      slot: params.slot,
      source: params.source,
      payload: params.payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      lastAttempt: new Date().toISOString(),
    };

    pending.push(entry);
    const stored = await secureQueueStorage.setJson(PENDING_GENERATIONS_KEY, pending);
    if (!stored) {
      secureLog.warn('[PrayerGenerationQueue] Failed to persist pending generation', { entryId: entry.id });
      return;
    }

    secureLog.info('[PrayerGenerationQueue] Enqueued prayer generation', {
      entryId: entry.id,
      slot: params.slot,
      source: params.source,
    });
    this.notifyListeners();

    // Attempt immediate processing if online
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected) {
      this.processPendingGenerations();
    }
  }

  async getPendingGenerations(): Promise<PendingGeneration[]> {
    await this.ensureMigrated();
    const stored = await secureQueueStorage.getJson<PendingGeneration[]>(PENDING_GENERATIONS_KEY);
    return stored ? stored : [];
  }

  async getPendingCount(): Promise<number> {
    const pending = await this.getPendingGenerations();
    return pending.length;
  }

  async clear(): Promise<void> {
    await this.ensureMigrated();
    await secureQueueStorage.remove(PENDING_GENERATIONS_KEY);
    this.notifyListeners();
  }

  async processPendingGenerations(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;
    try {
      const pending = await this.getPendingGenerations();
      if (pending.length === 0) {
        return;
      }

      const remaining: PendingGeneration[] = [];
      for (let i = 0; i < pending.length; i++) {
        const entry = pending[i];
        const shouldRetry = this.shouldRetry(entry);
        if (!shouldRetry) {
          secureLog.warn('[PrayerGenerationQueue] Dropping pending generation (expired or max retries)', {
            entryId: entry.id,
            retryCount: entry.retryCount,
            ageMinutes: this.ageMinutes(entry),
          });
          continue;
        }

        const attemptCount = entry.retryCount + 1;
        secureLog.info('[PrayerGenerationQueue] Processing pending generation', {
          entryId: entry.id,
          attemptCount,
          slot: entry.slot,
        });

        const result = await invokeGeneratePrayerWithRetry(entry.payload, {
          source: entry.source || 'queue',
          userId: entry.userId,
        });

        if (result.error) {
          entry.retryCount = attemptCount;
          entry.lastAttempt = new Date().toISOString();
          remaining.push(entry);
          secureLog.warn('[PrayerGenerationQueue] Re-queued generation after failure', {
            entryId: entry.id,
            attempts: attemptCount,
          });
        } else {
          secureLog.info('[PrayerGenerationQueue] Successfully generated prayer from queue', {
            entryId: entry.id,
            attempts: attemptCount,
          });
          const responseData = result.data;
          const prayerId = responseData?.prayerId;
          if (prayerId) {
            emitDataChange('prayers', 'created', {
              userId: entry.userId,
              id: prayerId,
            });
          } else {
            emitDataChange('prayers', 'updated', {
              userId: entry.userId,
              id: 'latest',
            } as any);
          }
        }
      }

      await secureQueueStorage.setJson(PENDING_GENERATIONS_KEY, remaining);
      this.notifyListeners();
    } catch (error) {
      secureLog.error('[PrayerGenerationQueue] Unexpected error processing pending generations', error);
    } finally {
      this.processing = false;
    }
  }

  private shouldRetry(entry: PendingGeneration): boolean {
    if (entry.retryCount >= MAX_QUEUE_RETRIES) {
      return false;
    }

    const createdAt = new Date(entry.createdAt).getTime();
    const now = Date.now();
    if (now - createdAt > MAX_WINDOW_MS) {
      return false;
    }

    return true;
  }

  private startNetworkMonitoring() {
    let wasConnected = true;
    this.networkUnsubscribe = NetInfo.addEventListener(state => {
      const isConnected = !!state.isConnected;
      if (isConnected && !wasConnected) {
        secureLog.info('[PrayerGenerationQueue] Connectivity restored, processing queue');
        this.processPendingGenerations();
      }
      wasConnected = isConnected;
    });
  }

  private startAppStateMonitoring() {
    this.appStateSubscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        secureLog.debug('[PrayerGenerationQueue] App became active, attempting queue processing');
        this.processPendingGenerations();
      }
    });
  }

  private notifyListeners() {
    const listeners = Array.from(this.listeners);
    if (listeners.length === 0) {
      return;
    }
    this.getPendingCount().then(count => {
      for (let i = 0; i < listeners.length; i++) {
        try {
          listeners[i]({ pending: count });
        } catch (error) {
          secureLog.error('[PrayerGenerationQueue] Listener threw error', error);
        }
      }
    }).catch(error => {
      secureLog.error('[PrayerGenerationQueue] Failed to notify listeners', error);
    });
  }

  private ageMinutes(entry: PendingGeneration): number {
    const createdAt = new Date(entry.createdAt).getTime();
    const now = Date.now();
    return Math.floor((now - createdAt) / 60000);
  }

  private async ensureMigrated(): Promise<void> {
    if (!this.migrationPromise) {
      this.migrationPromise = secureQueueStorage
        .migrateFromAsyncStorage([PENDING_GENERATIONS_KEY])
        .catch(error => {
          this.migrationPromise = null;
          secureLog.error('[PrayerGenerationQueue] Migration attempt failed', error);
          throw error;
        });
    }

    if (this.migrationPromise) {
      await this.migrationPromise;
    }
  }
}

export const prayerGenerationQueue = PrayerGenerationQueue.getInstance();
