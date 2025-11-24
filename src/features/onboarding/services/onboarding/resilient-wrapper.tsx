import React, { Component, ReactNode, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useOnboardingStore } from '../../../../stores/onboardingStore';
import { AtomicDataStore } from './atomic-data-store';
import { offlineManager } from './offline-manager';
import { enhancedAnalytics } from './analytics-enhanced';
import { useInterruptionHandler } from './interruption-handler';
import { colors, spacing, typography } from '../../../../theme';
import { OnboardingSkeletonScreen } from '../../../onboarding/SkeletonLoader';
import NetInfo from '@react-native-community/netinfo';
import Animated, { 
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';

// Unified error boundary
class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error: Error | null }
> {
  state: { hasError: boolean; error: Error | null } = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    this.props.onError?.(error);
    enhancedAnalytics.trackError(error, {
      screen: 'ErrorBoundary',
      action: 'component_error',
      recoverable: true,
      userImpact: 'major',
    });
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback || (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{this.state.error.message}</Text>
          <Pressable 
            style={styles.retryButton} 
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

interface ResilientWrapperProps {
  children: ReactNode | ((props: ResilientChildProps) => ReactNode);
  screenName: string;
  loadingView?: ReactNode;
  errorView?: (error: Error, retry: () => void) => ReactNode;
  onLoad?: () => Promise<void>;
  saveInterval?: number;
}

interface ResilientChildProps {
  savedState: any;
  saveFormData: (formData: Record<string, any>, additionalData?: any) => Promise<void>;
  clearSavedState: () => Promise<void>;
  hasSavedState: boolean;
  isOnline: boolean;
  pendingOps: number;
}

export function ResilientWrapper({
  children,
  screenName,
  loadingView,
  errorView,
  onLoad,
  saveInterval = 30000,
}: ResilientWrapperProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingOps, setPendingOps] = useState(0);
  
  const saveState = useOnboardingStore((state: any) => state.saveStateAtomically);
  const loadState = useOnboardingStore((state: any) => state.loadFromAtomicStore);
  
  // Use interruption handler
  const { savedState: interruptedState, saveFormData, clearSavedState } = useInterruptionHandler(screenName);
  
  const contentOpacity = useSharedValue(0);
  const bannerHeight = useSharedValue(0);
  const pulseOpacity = useSharedValue(1);

  // Initialize and load
  useEffect(() => {
    let saveTimer: NodeJS.Timeout;
    let opsTimer: NodeJS.Timeout;
    
    const init = async () => {
      try {
        setIsLoading(true);
        
        // Load state
        await loadState();
        
        // Check for interrupted state
        if (interruptedState) {
          console.log(`[ResilientWrapper] Found interrupted state for ${screenName}`, interruptedState);
          enhancedAnalytics.trackUserAction('resumed_from_interruption', {
            screen: screenName,
            hadFormData: !!interruptedState.formData,
          });
        }
        
        // Custom load
        if (onLoad) await onLoad();
        
        // Check integrity
        const { isValid, issues } = await AtomicDataStore.verifyIntegrity();
        if (!isValid) console.warn(`${screenName} integrity issues:`, issues);
        
        // Start animations
        contentOpacity.value = withSpring(1);
        setIsLoading(false);
        
        // Setup auto-save
        saveTimer = setInterval(saveState, saveInterval) as unknown as NodeJS.Timeout;
        
        // Monitor offline status
        const unsubscribe = NetInfo.addEventListener((state) => {
          const online = state.isConnected === true;
          setIsOnline(online);
          bannerHeight.value = withSpring(online ? 0 : 50);
        });
        
        // Monitor pending ops
        opsTimer = setInterval(() => {
          const count = offlineManager.getPendingOperationsCount();
          setPendingOps(count);
          
          if (count > 0 && isOnline) {
            pulseOpacity.value = withRepeat(
              withSequence(
                withTiming(0.4, { duration: 1000 }),
                withTiming(1, { duration: 1000 })
              ),
              -1
            );
          }
        }, 1000) as unknown as NodeJS.Timeout;
        
        return () => {
          clearInterval(saveTimer);
          clearInterval(opsTimer);
          unsubscribe();
        };
      } catch (error) {
        setLoadError(error as Error);
        setIsLoading(false);
      }
    };
    
    init();
  }, [bannerHeight, contentOpacity, interruptedState, isOnline, loadState, onLoad, pulseOpacity, saveInterval, saveState, screenName]);

  const animatedContent = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const animatedBanner = useAnimatedStyle(() => ({
    height: bannerHeight.value,
    opacity: bannerHeight.value > 0 ? 1 : 0,
  }));

  const animatedPulse = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const handleSync = async () => {
    await saveState();
    const result = await offlineManager.syncPendingOperations();
    console.log(`${screenName} sync:`, result);
  };

  // Error state
  if (loadError) {
    return errorView ? errorView(loadError, () => {
      setLoadError(null);
      setIsLoading(true);
    }) : (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Failed to Load</Text>
        <Text style={styles.errorMessage}>{loadError.message}</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary
      onError={(error) => enhancedAnalytics.trackError(error, {
        screen: screenName,
        action: 'screen_error',
        recoverable: true,
        userImpact: 'major',
      })}
    >
      <View style={styles.container}>
        {/* Offline banner */}
        <Animated.View style={[styles.offlineBanner, animatedBanner]}>
          <Text style={styles.offlineText}>
            📡 Offline - Changes will sync when connected
          </Text>
        </Animated.View>

        {/* Content */}
        {isLoading ? (
          loadingView || <OnboardingSkeletonScreen variant="default" />
        ) : (
          <Animated.View style={[styles.content, animatedContent]}>
            {typeof children === 'function' 
              ? children({
                  savedState: interruptedState,
                  saveFormData,
                  clearSavedState,
                  hasSavedState: !!interruptedState,
                  isOnline,
                  pendingOps,
                })
              : children}
          </Animated.View>
        )}

        {/* Sync indicator */}
        {pendingOps > 0 && isOnline && (
          <Pressable style={styles.syncButton} onPress={handleSync}>
            <Animated.View style={[styles.syncBadge, animatedPulse]}>
              <Text style={styles.syncText}>{pendingOps} pending</Text>
            </Animated.View>
          </Pressable>
        )}
      </View>
    </ErrorBoundary>
  );
}

// HOC for easy usage
export function withResilience<P extends object>(
  Component: React.ComponentType<P>,
  screenName: string,
  options?: Partial<ResilientWrapperProps>
) {
  const WrappedComponent = (props: P) => (
    <ResilientWrapper screenName={screenName} {...options}>
      {(resilientProps) => <Component {...props} {...resilientProps} />}
    </ResilientWrapper>
  );
  WrappedComponent.displayName = `withResilience(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xlarge,
  },
  errorTitle: {
    fontSize: typography.fontSizes.xlarge,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.medium,
  },
  errorMessage: {
    fontSize: typography.fontSizes.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xlarge,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.medium,
    paddingHorizontal: spacing.xlarge,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  offlineBanner: {
    backgroundColor: colors.warning,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  offlineText: {
    color: colors.text.primary,
    fontSize: typography.fontSizes.small,
    fontWeight: '600',
  },
  syncButton: {
    position: 'absolute',
    bottom: 100,
    right: spacing.medium,
  },
  syncBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.medium,
    paddingVertical: spacing.small,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  syncText: {
    color: '#FFFFFF',
    fontSize: typography.fontSizes.small,
    fontWeight: '600',
  },
}); 