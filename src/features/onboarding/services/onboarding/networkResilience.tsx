/**
 * Network Resilience Layer for Onboarding
 * Handles network failures, retries, and offline mode
 */

import React from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Alert, View, Text } from 'react-native';

// Types
export interface NetworkRequest<T> {
  execute: () => Promise<T>;
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
  timeout?: number;
  fallback?: () => T | Promise<T>;
  critical?: boolean;
  showErrorAlert?: boolean;
}

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
  details: any;
}

export interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  exponentialFactor: number;
  jitter: boolean;
}

export interface RequestResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  fromFallback?: boolean;
  retriesUsed?: number;
}

// Default configuration
const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  exponentialFactor: 2,
  jitter: true,
};

const DEFAULT_TIMEOUT = 30000; // 30 seconds

export class NetworkResilienceLayer {
  private networkState: NetworkState = {
    isConnected: true,
    isInternetReachable: null,
    type: 'unknown',
    details: null,
  };

  private networkListeners: ((state: NetworkState) => void)[] = [];
  private requestQueue: Map<string, NetworkRequest<any>> = new Map();
  private activeRequests: Map<string, AbortController> = new Map();

  constructor() {
    this.initializeNetworkMonitoring();
  }

  /**
   * Initialize network state monitoring
   */
  private initializeNetworkMonitoring() {
    // Get initial state
    NetInfo.fetch().then(state => {
      this.updateNetworkState(state);
    });

    // Subscribe to network state changes
    NetInfo.addEventListener(state => {
      this.updateNetworkState(state);
    });
  }

  /**
   * Update network state and notify listeners
   */
  private updateNetworkState(state: NetInfoState) {
    const previousState = this.networkState;
    
    this.networkState = {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
      details: state.details,
    };

    // Notify listeners if state changed
    if (previousState.isConnected !== this.networkState.isConnected ||
        previousState.isInternetReachable !== this.networkState.isInternetReachable) {
      this.notifyNetworkStateChange();
    }

    // Process queued requests if we're back online
    if (!previousState.isConnected && this.networkState.isConnected) {
      this.processQueuedRequests();
    }
  }

  /**
   * Subscribe to network state changes
   */
  subscribeToNetworkState(listener: (state: NetworkState) => void): () => void {
    this.networkListeners.push(listener);
    
    // Immediately call with current state
    listener(this.networkState);

    // Return unsubscribe function
    return () => {
      this.networkListeners = this.networkListeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of network state change
   */
  private notifyNetworkStateChange() {
    this.networkListeners.forEach(listener => {
      listener(this.networkState);
    });
  }

  /**
   * Execute a network request with resilience
   */
  async executeWithResilience<T>(
    request: NetworkRequest<T>
  ): Promise<RequestResult<T>> {
    const {
      execute,
      maxRetries = DEFAULT_RETRY_OPTIONS.maxRetries,
      retryDelay = DEFAULT_RETRY_OPTIONS.initialDelay,
      exponentialBackoff = true,
      timeout = DEFAULT_TIMEOUT,
      fallback,
      critical = false,
      showErrorAlert = true,
    } = request;

    // Check if we're offline
    if (!this.networkState.isConnected) {
      if (critical) {
        // Queue critical requests for later
        const requestId = `${Date.now()}_${Math.random()}`;
        this.requestQueue.set(requestId, request);
      }

      // Try fallback if available
      if (fallback) {
        try {
          const fallbackData = await fallback();
          return {
            success: true,
            data: fallbackData,
            fromFallback: true,
          };
        } catch {
          return {
            success: false,
            error: new Error('Network unavailable and fallback failed'),
          };
        }
      }

      return {
        success: false,
        error: new Error('Network unavailable'),
      };
    }

    // Execute with retries
    let lastError: Error | null = null;
    let currentDelay = retryDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Create abort controller for timeout
        const abortController = new AbortController();
        const requestId = `${Date.now()}_${Math.random()}`;
        this.activeRequests.set(requestId, abortController);

        // Set timeout
        const timeoutId = setTimeout(() => {
          abortController.abort();
        }, timeout);

        try {
          // Execute the request
          const data = await execute();
          
          // Clear timeout and remove from active requests
          clearTimeout(timeoutId);
          this.activeRequests.delete(requestId);

          return {
            success: true,
            data,
            retriesUsed: attempt,
          };
        } catch (error) {
          // Clear timeout and remove from active requests
          clearTimeout(timeoutId);
          this.activeRequests.delete(requestId);

          if (error instanceof Error && error.name === 'AbortError') {
            lastError = new Error('Request timeout');
          } else {
            lastError = error instanceof Error ? error : new Error('Unknown error');
          }

          // Check if it's a network error that's worth retrying
          if (!this.shouldRetry(lastError)) {
            break;
          }

          // If not the last attempt, wait before retrying
          if (attempt < maxRetries) {
            await this.delay(currentDelay);

            // Calculate next delay with exponential backoff
            if (exponentialBackoff) {
              currentDelay = Math.min(
                currentDelay * DEFAULT_RETRY_OPTIONS.exponentialFactor,
                DEFAULT_RETRY_OPTIONS.maxDelay
              );

              // Add jitter to prevent thundering herd
              if (DEFAULT_RETRY_OPTIONS.jitter) {
                currentDelay = currentDelay * (0.5 + Math.random() * 0.5);
              }
            }
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
      }
    }

    // All retries failed
    if (showErrorAlert && lastError) {
      this.showNetworkError(lastError);
    }

    // Try fallback as last resort
    if (fallback) {
      try {
        const fallbackData = await fallback();
        return {
          success: true,
          data: fallbackData,
          fromFallback: true,
          error: lastError || undefined,
        };
      } catch {
        // Fallback also failed
      }
    }

    return {
      success: false,
      error: lastError || new Error('Request failed after all retries'),
      retriesUsed: maxRetries,
    };
  }

  /**
   * Check if an error is worth retrying
   */
  private shouldRetry(error: Error): boolean {
    // Network errors
    if (error.message.includes('Network request failed') ||
        error.message.includes('timeout') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('ETIMEDOUT')) {
      return true;
    }

    // Server errors (5xx)
    if (error.message.includes('500') ||
        error.message.includes('502') ||
        error.message.includes('503') ||
        error.message.includes('504')) {
      return true;
    }

    // Don't retry client errors (4xx) or other errors
    return false;
  }

  /**
   * Delay for a specified duration
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Process queued requests when back online
   */
  private async processQueuedRequests() {
    const requests = Array.from(this.requestQueue.entries());
    this.requestQueue.clear();

    for (const [, request] of requests) {
      // Execute queued request
      this.executeWithResilience(request);
    }
  }

  /**
   * Show network error to user
   */
  private showNetworkError(error: Error) {
    let title = 'Network Error';
    let message = 'Please check your internet connection and try again.';

    if (error.message.includes('timeout')) {
      title = 'Request Timeout';
      message = 'The request took too long. Please try again.';
    } else if (error.message.includes('500') || error.message.includes('Server')) {
      title = 'Server Error';
      message = 'Our servers are experiencing issues. Please try again later.';
    }

    Alert.alert(title, message, [{ text: 'OK' }]);
  }

  /**
   * Cancel all active requests
   */
  cancelAllRequests() {
    this.activeRequests.forEach(controller => {
      controller.abort();
    });
    this.activeRequests.clear();
  }

  /**
   * Get current network state
   */
  getNetworkState(): NetworkState {
    return { ...this.networkState };
  }

  /**
   * Check if network is available
   */
  isNetworkAvailable(): boolean {
    return this.networkState.isConnected && 
           (this.networkState.isInternetReachable === null || 
            this.networkState.isInternetReachable === true);
  }

  /**
   * Wrapper for fetch with resilience
   */
  async resilientFetch(
    url: string,
    options?: RequestInit,
    retryOptions?: Partial<NetworkRequest<Response>>
  ): Promise<RequestResult<Response>> {
    return this.executeWithResilience({
      execute: () => fetch(url, options),
      ...retryOptions,
    });
  }


}

// Export singleton instance
export const networkResilience = new NetworkResilienceLayer();

// Export hook for React components
export function useNetworkState() {
  const [networkState, setNetworkState] = React.useState<NetworkState>(
    networkResilience.getNetworkState()
  );

  React.useEffect(() => {
    const unsubscribe = networkResilience.subscribeToNetworkState(state => {
      setNetworkState(state);
    });

    return unsubscribe;
  }, []);

  return networkState;
}

// Export HOC for network-aware components
export function withNetworkResilience<P extends object>(
  Component: React.ComponentType<P & { networkState: NetworkState }>
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => {
    const networkState = useNetworkState();
    return <Component {...props} networkState={networkState} />;
  };
  WrappedComponent.displayName = `withNetworkResilience(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

/**
 * Network status bar component
 */
export function NetworkStatusBar() {
  const networkState = useNetworkState();
  
  if (networkState.isConnected) {
    return null;
  }
  
  return (
    <View style={{
      backgroundColor: '#FF0000',
      paddingVertical: 8,
      paddingHorizontal: 16,
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
    }}>
      <Text style={{ color: 'white', textAlign: 'center', fontSize: 12 }}>
        No internet connection - changes will sync when online
      </Text>
    </View>
  );
} 