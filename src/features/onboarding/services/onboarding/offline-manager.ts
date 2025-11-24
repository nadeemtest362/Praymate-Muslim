import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { supabase } from '../../../../lib/supabaseClient';
import { enhancedAnalytics } from './analytics-enhanced';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OfflineOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

interface SyncResult {
  success: boolean;
  syncedOperations: number;
  failedOperations: number;
  conflicts: {
    operation: OfflineOperation;
    reason: string;
  }[];
}

export class OfflineManager {
  private static instance: OfflineManager;
  private isOnline: boolean = true;
  private operationQueue: OfflineOperation[] = [];
  private syncInProgress: boolean = false;
  private readonly QUEUE_KEY = 'offline_operation_queue';
  private readonly MAX_RETRY_COUNT = 3;
  private netInfoUnsubscribe: (() => void) | null = null;
  
  private constructor() {
    this.initializeNetworkListener();
    this.loadQueueFromStorage();
  }
  
  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }
  
  /**
   * Initialize network state listener
   */
  private initializeNetworkListener(): void {
    this.netInfoUnsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected === true && state.isInternetReachable !== false;
      
      if (wasOffline && this.isOnline) {
        console.log('[OfflineManager] Connection restored, syncing pending operations...');
        this.syncPendingOperations();
      } else if (!wasOffline && !this.isOnline) {
        console.log('[OfflineManager] Connection lost, switching to offline mode');
        enhancedAnalytics.trackNetworkIssue({
          type: 'offline',
          operation: 'connection_lost',
          retryCount: 0,
          fallbackUsed: true,
        });
      }
    });
    
    // Get initial state
    NetInfo.fetch().then((state) => {
      this.isOnline = state.isConnected === true && state.isInternetReachable !== false;
    });
  }
  
  /**
   * Load queued operations from storage
   */
  private async loadQueueFromStorage(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem(this.QUEUE_KEY);
      if (queueData) {
        this.operationQueue = JSON.parse(queueData);
        console.log(`[OfflineManager] Loaded ${this.operationQueue.length} pending operations`);
      }
    } catch (error) {
      console.error('[OfflineManager] Failed to load queue from storage:', error);
    }
  }
  
  /**
   * Save queue to storage
   */
  private async saveQueueToStorage(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(this.operationQueue));
    } catch (error) {
      console.error('[OfflineManager] Failed to save queue to storage:', error);
    }
  }
  
  /**
   * Check if currently online
   */
  getIsOnline(): boolean {
    return this.isOnline;
  }
  
  /**
   * Execute an operation with offline support
   */
  async executeOperation<T>(
    operation: () => Promise<T>,
    offlineOperation?: OfflineOperation
  ): Promise<{ success: boolean; data?: T; queued?: boolean }> {
    if (this.isOnline) {
      try {
        const startTime = Date.now();
        const data = await operation();
        
        // Track successful operation
        const duration = Date.now() - startTime;
        if (duration > 3000) {
          enhancedAnalytics.trackNetworkIssue({
            type: 'slow',
            operation: offlineOperation?.type || 'unknown',
            retryCount: 0,
            fallbackUsed: false,
          });
        }
        
        return { success: true, data };
      } catch (error) {
        console.error('[OfflineManager] Operation failed:', error);
        
        // If operation fails due to network, queue it
        if (this.isNetworkError(error) && offlineOperation) {
          return this.queueOperation(offlineOperation);
        }
        
        throw error;
      }
    } else if (offlineOperation) {
      // We're offline, queue the operation
      return this.queueOperation(offlineOperation);
    } else {
      // Offline and no offline operation provided
      enhancedAnalytics.trackNetworkIssue({
        type: 'offline',
        operation: 'blocked_operation',
        retryCount: 0,
        fallbackUsed: false,
      });
      
      throw new Error('No internet connection');
    }
  }
  
  /**
   * Queue an operation for later sync
   */
  private async queueOperation(operation: OfflineOperation): Promise<{ success: boolean; queued: boolean }> {
    const queuedOp = {
      ...operation,
      id: operation.id || `op_${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: operation.maxRetries || this.MAX_RETRY_COUNT,
    };
    
    this.operationQueue.push(queuedOp);
    await this.saveQueueToStorage();
    
    console.log(`[OfflineManager] Operation queued: ${queuedOp.type} on ${queuedOp.table}`);
    
    return { success: true, queued: true };
  }
  
  /**
   * Sync all pending operations
   */
  async syncPendingOperations(): Promise<SyncResult> {
    if (this.syncInProgress || !this.isOnline || this.operationQueue.length === 0) {
      return {
        success: true,
        syncedOperations: 0,
        failedOperations: 0,
        conflicts: [],
      };
    }
    
    console.log(`[OfflineManager] Starting sync of ${this.operationQueue.length} operations`);
    this.syncInProgress = true;
    
    const result: SyncResult = {
      success: true,
      syncedOperations: 0,
      failedOperations: 0,
      conflicts: [],
    };
    
    const operationsToSync = [...this.operationQueue];
    this.operationQueue = [];
    
    for (const operation of operationsToSync) {
      try {
        await this.executeSyncOperation(operation);
        result.syncedOperations++;
      } catch (error) {
        console.error(`[OfflineManager] Failed to sync operation:`, error);
        
        operation.retryCount++;
        
        if (operation.retryCount < operation.maxRetries) {
          // Re-queue for retry
          this.operationQueue.push(operation);
        } else {
          // Max retries reached
          result.failedOperations++;
          result.conflicts.push({
            operation,
            reason: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }
    
    await this.saveQueueToStorage();
    this.syncInProgress = false;
    
    // Track sync results
    if (result.failedOperations > 0) {
      enhancedAnalytics.trackStateIssue({
        type: 'sync_failure',
        screen: 'offline_sync',
        expectedState: { totalOperations: operationsToSync.length },
        actualState: { failedOperations: result.failedOperations },
        resolved: false,
      });
    }
    
    console.log(`[OfflineManager] Sync complete:`, result);
    return result;
  }
  
  /**
   * Execute a single sync operation
   */
  private async executeSyncOperation(operation: OfflineOperation): Promise<void> {
    const { type, table, data } = operation;
    
    switch (type) {
      case 'create':
        await supabase.from(table).insert(data);
        break;
        
      case 'update':
        if (!data.id) {
          throw new Error('Update operation requires an ID');
        }
        await supabase.from(table).update(data).eq('id', data.id);
        break;
        
      case 'delete':
        if (!data.id) {
          throw new Error('Delete operation requires an ID');
        }
        await supabase.from(table).delete().eq('id', data.id);
        break;
        
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }
  
  /**
   * Check if an error is network-related
   */
  private isNetworkError(error: any): boolean {
    // Check for common network error indicators
    if (error.message) {
      const networkErrorPatterns = [
        'network',
        'internet',
        'connection',
        'timeout',
        'fetch',
        'ERR_NETWORK',
        'ERR_INTERNET_DISCONNECTED',
      ];
      
      const message = error.message.toLowerCase();
      return networkErrorPatterns.some(pattern => message.includes(pattern));
    }
    
    // Check for specific error codes
    if (error.code) {
      const networkErrorCodes = ['NETWORK_ERROR', 'TIMEOUT', 'CONNECTION_LOST'];
      return networkErrorCodes.includes(error.code);
    }
    
    return false;
  }
  
  /**
   * Get pending operations count
   */
  getPendingOperationsCount(): number {
    return this.operationQueue.length;
  }
  
  /**
   * Get pending operations
   */
  getPendingOperations(): OfflineOperation[] {
    return [...this.operationQueue];
  }
  
  /**
   * Clear all pending operations
   */
  async clearPendingOperations(): Promise<void> {
    this.operationQueue = [];
    await this.saveQueueToStorage();
  }
  
  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
    }
  }
}

// Export singleton instance
export const offlineManager = OfflineManager.getInstance(); 