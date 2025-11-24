/**
 * Centralized Data Repository for Onboarding
 * Handles all data operations with caching, queuing, and sync
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../../lib/supabaseClient';
import { OnboardingContext } from './stateMachine';
import NetInfo from '@react-native-community/netinfo';

// Types
export interface DataOperation {
  id: string;
  type: 'save' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  expiresAt: Date;
  isDirty: boolean;
}

export interface SaveResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  fromCache?: boolean;
}

// Cache configuration
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY_PREFIX = '@onboarding_cache:';
const QUEUE_KEY = '@onboarding_queue';
const STATE_KEY = '@onboarding_state';

export class OnboardingDataRepository {
  private operationQueue: DataOperation[] = [];
  private cache = new Map<string, CacheEntry<any>>();
  private isOnline = true;
  private isSyncing = false;
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.initializeNetworkMonitoring();
    this.loadQueueFromStorage();
    this.startSyncInterval();
  }

  /**
   * Initialize network state monitoring
   */
  private initializeNetworkMonitoring() {
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected ?? false;
      if (this.isOnline && !this.isSyncing) {
        this.syncQueue();
      }
    });
  }

  /**
   * Start periodic sync interval
   */
  private startSyncInterval() {
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing && this.operationQueue.length > 0) {
        this.syncQueue();
      }
    }, 30000); // Try to sync every 30 seconds
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }

  /**
   * Load pending operations from storage
   */
  private async loadQueueFromStorage() {
    try {
      const queueData = await AsyncStorage.getItem(QUEUE_KEY);
      if (queueData) {
        this.operationQueue = JSON.parse(queueData);
      }
    } catch (error) {
      console.error('Failed to load operation queue:', error);
    }
  }

  /**
   * Save operation queue to storage
   */
  private async saveQueueToStorage() {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.operationQueue));
    } catch (error) {
      console.error('Failed to save operation queue:', error);
    }
  }

  /**
   * Get cache key for a specific data type
   */
  private getCacheKey(type: string, id?: string): string {
    return `${CACHE_KEY_PREFIX}${type}${id ? `:${id}` : ''}`;
  }

  /**
   * Get data from cache
   */
  private async getFromCache<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const memoryCache = this.cache.get(key);
    if (memoryCache && memoryCache.expiresAt > new Date()) {
      return memoryCache.data;
    }

    // Check persistent cache
    try {
      const cachedData = await AsyncStorage.getItem(key);
      if (cachedData) {
        const cacheEntry: CacheEntry<T> = JSON.parse(cachedData);
        if (new Date(cacheEntry.expiresAt) > new Date()) {
          // Update memory cache
          this.cache.set(key, cacheEntry);
          return cacheEntry.data;
        }
      }
    } catch (error) {
      console.error('Cache read error:', error);
    }

    return null;
  }

  /**
   * Save data to cache
   */
  private async saveToCache<T>(key: string, data: T, isDirty = false): Promise<void> {
    const cacheEntry: CacheEntry<T> = {
      data,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + CACHE_DURATION_MS),
      isDirty
    };

    // Save to memory cache
    this.cache.set(key, cacheEntry);

    // Save to persistent cache
    try {
      await AsyncStorage.setItem(key, JSON.stringify(cacheEntry));
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  /**
   * Queue an operation for later sync
   */
  private queueOperation(operation: Omit<DataOperation, 'id' | 'timestamp' | 'retryCount'>): void {
    const op: DataOperation = {
      ...operation,
      id: `${Date.now()}_${Math.random()}`,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: 3
    };

    this.operationQueue.push(op);
    this.saveQueueToStorage();
  }

  /**
   * Sync queued operations with Supabase
   */
  private async syncQueue(): Promise<void> {
    if (this.isSyncing || this.operationQueue.length === 0) return;

    this.isSyncing = true;
    const failedOperations: DataOperation[] = [];

    for (const operation of this.operationQueue) {
      try {
        await this.executeOperation(operation);
      } catch (error) {
        console.error('Sync operation failed:', error);
        operation.retryCount++;
        
        if (operation.retryCount < operation.maxRetries) {
          failedOperations.push(operation);
        } else {
          console.error('Operation permanently failed after max retries:', operation);
        }
      }
    }

    this.operationQueue = failedOperations;
    await this.saveQueueToStorage();
    this.isSyncing = false;
  }

  /**
   * Execute a single operation
   */
  private async executeOperation(operation: DataOperation): Promise<void> {
    const { type, table, data } = operation;

    switch (type) {
      case 'save':
        const { error: saveError } = await supabase
          .from(table)
          .insert(data);
        if (saveError) throw saveError;
        break;

      case 'update':
        const { error: updateError } = await supabase
          .from(table)
          .update(data)
          .eq('id', data.id);
        if (updateError) throw updateError;
        break;

      case 'delete':
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .eq('id', data.id);
        if (deleteError) throw deleteError;
        break;
    }
  }

  /**
   * Save onboarding state
   */
  async saveOnboardingState(context: OnboardingContext): Promise<SaveResult<void>> {
    try {
      // Always save to local storage first
      await AsyncStorage.setItem(STATE_KEY, JSON.stringify(context));
      
      // Mark cache as dirty
      await this.saveToCache(STATE_KEY, context, true);

      if (this.isOnline) {
        // Try to save to Supabase
        const { error } = await supabase
          .from('onboarding_sessions')
          .upsert({
            session_id: context.sessionId,
            user_id: (await supabase.auth.getUser()).data.user?.id,
            state: context,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
        
        // Mark cache as clean
        await this.saveToCache(STATE_KEY, context, false);
      } else {
        // Queue for later sync
        this.queueOperation({
          type: 'save',
          table: 'onboarding_sessions',
          data: {
            session_id: context.sessionId,
            state: context,
            updated_at: new Date().toISOString()
          },
          maxRetries: 3
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to save onboarding state:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Unknown error') 
      };
    }
  }

  /**
   * Load onboarding state
   */
  async loadOnboardingState(): Promise<SaveResult<OnboardingContext | null>> {
    try {
      // Check cache first
      const cachedState = await this.getFromCache<OnboardingContext>(STATE_KEY);
      if (cachedState) {
        return { success: true, data: cachedState, fromCache: true };
      }

      // Load from local storage
      const localState = await AsyncStorage.getItem(STATE_KEY);
      if (localState) {
        const state = JSON.parse(localState);
        await this.saveToCache(STATE_KEY, state);
        return { success: true, data: state };
      }

      // If online, try to load from Supabase
      if (this.isOnline) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: true, data: null };

        const { data, error } = await supabase
          .from('onboarding_sessions')
          .select('state')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        if (error) throw error;
        
        if (data?.state) {
          await this.saveToCache(STATE_KEY, data.state);
          return { success: true, data: data.state };
        }
      }

      return { success: true, data: null };
    } catch (error) {
      console.error('Failed to load onboarding state:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Unknown error') 
      };
    }
  }

  /**
   * Save prayer person with atomic operation
   */
  async savePrayerPerson(person: any): Promise<SaveResult<any>> {
    const cacheKey = this.getCacheKey('prayer_person', person.id);

    try {
      // Save to cache immediately
      await this.saveToCache(cacheKey, person, true);

      if (this.isOnline) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
          .from('prayer_focus_people')
          .insert({
            ...person,
            user_id: user.id
          })
          .select()
          .single();

        if (error) throw error;
        
        // Update cache with server response
        await this.saveToCache(cacheKey, data, false);
        return { success: true, data };
      } else {
        // Queue for later sync
        this.queueOperation({
          type: 'save',
          table: 'prayer_focus_people',
          data: person,
          maxRetries: 3
        });

        return { success: true, data: person, fromCache: true };
      }
    } catch (error) {
      console.error('Failed to save prayer person:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Unknown error') 
      };
    }
  }

  /**
   * Save prayer intention with atomic operation
   */
  async savePrayerIntention(intention: any): Promise<SaveResult<any>> {
    const cacheKey = this.getCacheKey('prayer_intention', intention.id);

    try {
      // Save to cache immediately
      await this.saveToCache(cacheKey, intention, true);

      if (this.isOnline) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
          .from('prayer_intentions')
          .insert({
            ...intention,
            user_id: user.id,
            is_active: true
          })
          .select()
          .single();

        if (error) throw error;
        
        // Update cache with server response
        await this.saveToCache(cacheKey, data, false);
        return { success: true, data };
      } else {
        // Queue for later sync
        this.queueOperation({
          type: 'save',
          table: 'prayer_intentions',
          data: {
            ...intention,
            is_active: true
          },
          maxRetries: 3
        });

        return { success: true, data: intention, fromCache: true };
      }
    } catch (error) {
      console.error('Failed to save prayer intention:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Unknown error') 
      };
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(updates: any): Promise<SaveResult<any>> {
    try {
      // Save to cache immediately
      await this.saveToCache('user_profile', updates, true);

      if (this.isOnline) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id)
          .select()
          .single();

        if (error) throw error;
        
        // Update cache with server response
        await this.saveToCache('user_profile', data, false);
        return { success: true, data };
      } else {
        // Queue for later sync
        this.queueOperation({
          type: 'update',
          table: 'profiles',
          data: updates,
          maxRetries: 3
        });

        return { success: true, data: updates, fromCache: true };
      }
    } catch (error) {
      console.error('Failed to update user profile:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Unknown error') 
      };
    }
  }

  /**
   * Clear all onboarding data
   */
  async clearAllData(): Promise<void> {
    try {
      // Clear memory cache
      this.cache.clear();
      
      // Clear operation queue
      this.operationQueue = [];
      await AsyncStorage.removeItem(QUEUE_KEY);
      
      // Clear all cached data
      const keys = await AsyncStorage.getAllKeys();
      const onboardingKeys = keys.filter(key => 
        key.startsWith(CACHE_KEY_PREFIX) || key === STATE_KEY
      );
      await AsyncStorage.multiRemove(onboardingKeys);
    } catch (error) {
      console.error('Failed to clear onboarding data:', error);
    }
  }

  /**
   * Public method to save generic data with caching
   */
  async saveData<T>(key: string, data: T): Promise<SaveResult<T>> {
    const cacheKey = this.getCacheKey(key);
    
    try {
      // Save to cache immediately
      await this.saveToCache(cacheKey, data, !this.isOnline);
      
      // Save to AsyncStorage for persistence
      await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
      
      return { success: true, data };
    } catch (error) {
      console.error(`Failed to save data for key ${key}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Unknown error') 
      };
    }
  }

  /**
   * Public method to get cached data
   */
  async getCachedData<T>(key: string): Promise<T | null> {
    const cacheKey = this.getCacheKey(key);
    return this.getFromCache<T>(cacheKey);
  }

  /**
   * Public method to clear cache
   */
  async clearCache(): Promise<void> {
    await this.clearAllData();
  }

  /**
   * Public method to queue analytics event
   */
  async queueAnalyticsEvent(eventData: any): Promise<void> {
    this.queueOperation({
      type: 'save',
      table: 'onboarding_analytics_events',
      data: eventData,
      maxRetries: 3
    });
  }
}

// Export singleton instance
export const onboardingDataRepository = new OnboardingDataRepository(); 