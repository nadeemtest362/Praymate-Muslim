import { flowIntegrationService } from './flowIntegration';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ResilienceEvent {
  eventType: 'error' | 'recovery' | 'performance' | 'integrity' | 'network' | 'state';
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: {
    screen?: string;
    action?: string;
    errorMessage?: string;
    errorStack?: string;
    networkState?: any;
    performanceMetrics?: any;
    dataIntegrity?: any;
    recoveryAttempt?: number;
    timeToRecover?: number;
  };
  metadata?: Record<string, any>;
}

export class EnhancedOnboardingAnalytics {
  private static instance: EnhancedOnboardingAnalytics;
  private performanceMarkers = new Map<string, number>();
  private errorCounts = new Map<string, number>();
  private sessionStartTime: number;
  
  private constructor() {
    this.sessionStartTime = Date.now();
  }
  
  static getInstance(): EnhancedOnboardingAnalytics {
    if (!EnhancedOnboardingAnalytics.instance) {
      EnhancedOnboardingAnalytics.instance = new EnhancedOnboardingAnalytics();
    }
    return EnhancedOnboardingAnalytics.instance;
  }
  
  /**
   * Track resilience-related events
   */
  async trackResilienceEvent(event: ResilienceEvent): Promise<void> {
    try {
      const networkState = await NetInfo.fetch();
      const sessionDuration = Date.now() - this.sessionStartTime;
      
      const enhancedEvent = {
        ...event,
        context: {
          ...event.context,
          networkState: {
            isConnected: networkState.isConnected,
            type: networkState.type,
            isInternetReachable: networkState.isInternetReachable,
          },
          device: {
            platform: Platform.OS,
            version: Platform.Version,
          },
          session: {
            duration: sessionDuration,
            errorCount: this.getTotalErrorCount(),
          },
        },
        timestamp: new Date().toISOString(),
      };
      
      // Track via existing system
      await flowIntegrationService.trackEvent(`resilience_${event.eventType}`, enhancedEvent);
      
      // Also log to console in dev
      if (__DEV__) {
        console.log('[Resilience Analytics]', enhancedEvent);
      }
      
      // Queue for offline sync if needed
      if (!networkState.isConnected) {
        await this.queueOfflineEvent(enhancedEvent);
      }
    } catch (error) {
      console.error('Failed to track resilience event:', error);
    }
  }
  
  /**
   * Track user actions
   */
  async trackUserAction(action: string, metadata?: Record<string, any>): Promise<void> {
    try {
      await flowIntegrationService.trackEvent(action, {
        timestamp: new Date().toISOString(),
        sessionDuration: Date.now() - this.sessionStartTime,
        ...metadata,
      });
    } catch (error) {
      console.error('Failed to track user action:', error);
    }
  }
  
  /**
   * Track errors with context
   */
  async trackError(error: Error, context: {
    screen: string;
    action: string;
    recoverable: boolean;
    userImpact: 'none' | 'minor' | 'major' | 'blocking';
  }): Promise<void> {
    const errorKey = `${context.screen}_${context.action}`;
    const errorCount = (this.errorCounts.get(errorKey) || 0) + 1;
    this.errorCounts.set(errorKey, errorCount);
    
    await this.trackResilienceEvent({
      eventType: 'error',
      severity: context.userImpact === 'blocking' ? 'critical' : 
                context.userImpact === 'major' ? 'high' : 
                context.userImpact === 'minor' ? 'medium' : 'low',
      context: {
        screen: context.screen,
        action: context.action,
        errorMessage: error.message,
        errorStack: error.stack,
      },
      metadata: {
        recoverable: context.recoverable,
        errorCount,
        errorFrequency: errorCount / ((Date.now() - this.sessionStartTime) / 1000),
      },
    });
  }
  
  /**
   * Track successful recovery from error
   */
  async trackRecovery(fromError: string, context: {
    screen: string;
    recoveryMethod: 'retry' | 'fallback' | 'cache' | 'reset';
    attemptNumber: number;
    timeToRecover: number;
  }): Promise<void> {
    await this.trackResilienceEvent({
      eventType: 'recovery',
      severity: 'low',
      context: {
        screen: context.screen,
        action: `recovery_from_${fromError}`,
        recoveryAttempt: context.attemptNumber,
        timeToRecover: context.timeToRecover,
      },
      metadata: {
        recoveryMethod: context.recoveryMethod,
        success: true,
      },
    });
  }
  
  /**
   * Track performance metrics
   */
  startPerformanceMarker(marker: string): void {
    this.performanceMarkers.set(marker, Date.now());
  }
  
  async endPerformanceMarker(marker: string, context: {
    screen: string;
    threshold?: number;
  }): Promise<void> {
    const startTime = this.performanceMarkers.get(marker);
    if (!startTime) return;
    
    const duration = Date.now() - startTime;
    this.performanceMarkers.delete(marker);
    
    const isSlowLoad = context.threshold ? duration > context.threshold : duration > 3000;
    
    await this.trackResilienceEvent({
      eventType: 'performance',
      severity: isSlowLoad ? 'medium' : 'low',
      context: {
        screen: context.screen,
        action: marker,
        performanceMetrics: {
          duration,
          threshold: context.threshold,
          isSlowLoad,
        },
      },
    });
  }
  
  /**
   * Track data integrity issues
   */
  async trackDataIntegrity(issues: string[], context: {
    screen: string;
    dataType: string;
    autoFixed: boolean;
  }): Promise<void> {
    if (issues.length === 0) return;
    
    await this.trackResilienceEvent({
      eventType: 'integrity',
      severity: context.autoFixed ? 'low' : 'high',
      context: {
        screen: context.screen,
        dataIntegrity: {
          issues,
          dataType: context.dataType,
          autoFixed: context.autoFixed,
        },
      },
    });
  }
  
  /**
   * Track network-related issues
   */
  async trackNetworkIssue(issue: {
    type: 'timeout' | 'offline' | 'slow' | 'failed';
    operation: string;
    retryCount: number;
    fallbackUsed: boolean;
  }): Promise<void> {
    await this.trackResilienceEvent({
      eventType: 'network',
      severity: issue.fallbackUsed ? 'medium' : 'high',
      context: {
        action: issue.operation,
        networkState: await NetInfo.fetch(),
      },
      metadata: {
        issueType: issue.type,
        retryCount: issue.retryCount,
        fallbackUsed: issue.fallbackUsed,
      },
    });
  }
  
  /**
   * Track state-related issues
   */
  async trackStateIssue(issue: {
    type: 'missing_data' | 'invalid_transition' | 'corrupted_state' | 'sync_failure';
    screen: string;
    expectedState: any;
    actualState: any;
    resolved: boolean;
  }): Promise<void> {
    await this.trackResilienceEvent({
      eventType: 'state',
      severity: issue.resolved ? 'medium' : 'high',
      context: {
        screen: issue.screen,
      },
      metadata: {
        issueType: issue.type,
        resolved: issue.resolved,
        stateMismatch: {
          expected: JSON.stringify(issue.expectedState).substring(0, 100),
          actual: JSON.stringify(issue.actualState).substring(0, 100),
        },
      },
    });
  }
  
  /**
   * Queue events for offline sync
   */
  private async queueOfflineEvent(event: any): Promise<void> {
    try {
      const ANALYTICS_QUEUE_KEY = 'analytics_offline_queue';
      const existingQueue = await AsyncStorage.getItem(ANALYTICS_QUEUE_KEY);
      const queue = existingQueue ? JSON.parse(existingQueue) : [];
      
      queue.push({
        ...event,
        queuedAt: Date.now(),
      });
      
      await AsyncStorage.setItem(ANALYTICS_QUEUE_KEY, JSON.stringify(queue));
      
      if (__DEV__) {
        console.log('[Analytics] Event queued for offline sync:', event.eventType);
      }
    } catch (error) {
      console.error('Failed to queue offline event:', error);
    }
  }
  
  /**
   * Sync queued offline events
   */
  async syncOfflineEvents(): Promise<void> {
    try {
      const ANALYTICS_QUEUE_KEY = 'analytics_offline_queue';
      const queueData = await AsyncStorage.getItem(ANALYTICS_QUEUE_KEY);
      
      if (!queueData) return;
      
      const queue = JSON.parse(queueData);
      if (queue.length === 0) return;
      
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) return;
      
      if (__DEV__) {
        console.log(`[Analytics] Syncing ${queue.length} offline events`);
      }
      
      for (const event of queue) {
        try {
          await flowIntegrationService.trackEvent(`resilience_${event.eventType}`, event);
        } catch (error) {
          console.error('Failed to sync offline event:', error);
          // Keep the event in queue for next sync attempt
          return;
        }
      }
      
      // Clear the queue after successful sync
      await AsyncStorage.removeItem(ANALYTICS_QUEUE_KEY);
      
      if (__DEV__) {
        console.log('[Analytics] Successfully synced all offline events');
      }
    } catch (error) {
      console.error('Failed to sync offline events:', error);
    }
  }

  /**
   * Get total error count for session
   */
  private getTotalErrorCount(): number {
    return Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
  }
  
  /**
   * Generate session summary
   */
  async generateSessionSummary(): Promise<{
    duration: number;
    errorCount: number;
    errorRate: number;
    recoveryRate: number;
    performanceIssues: number;
    dataIntegrityIssues: number;
    networkIssues: number;
  }> {
    const duration = Date.now() - this.sessionStartTime;
    const errorCount = this.getTotalErrorCount();
    
    // This would need to track recoveries vs errors
    // For now, returning placeholder
    return {
      duration,
      errorCount,
      errorRate: errorCount / (duration / 1000 / 60), // errors per minute
      recoveryRate: 0, // would calculate based on tracked recoveries
      performanceIssues: 0,
      dataIntegrityIssues: 0,
      networkIssues: 0,
    };
  }
}

// Export singleton instance
export const enhancedAnalytics = EnhancedOnboardingAnalytics.getInstance(); 