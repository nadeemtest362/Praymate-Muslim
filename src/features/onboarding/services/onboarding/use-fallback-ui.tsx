import React, { useState, useCallback, useRef, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../../../../lib/supabaseClient';
import { 
  MissingStateFallback,
  LoadingStateFallback,
  PermissionDeniedFallback,
  OfflineStateFallback,
  ErrorStateFallback,
  EmptyStateFallback,
  TimeoutFallback,
  AuthErrorFallback
} from './fallback-components';

type FallbackState = 
  | 'none'
  | 'loading'
  | 'missing-state' 
  | 'permission-denied'
  | 'offline'
  | 'error'
  | 'empty'
  | 'timeout'
  | 'auth-error';

interface FallbackConfig {
  state: FallbackState;
  props?: Record<string, any>;
}

interface UseFallbackUIOptions {
  requiredData?: Record<string, any>;
  checkAuth?: boolean;
  timeout?: number;
  onTimeout?: () => void;
}

export function useFallbackUI(options: UseFallbackUIOptions = {}) {
  const { 
    requiredData = {}, 
    checkAuth = true, 
    timeout = 30000,
    onTimeout 
  } = options;
  
  const [fallbackConfig, setFallbackConfig] = useState<FallbackConfig>({ state: 'none' });
  const [isOnline, setIsOnline] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  
  // Monitor network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected === true);
    });
    
    return () => unsubscribe();
  }, []);
  
  // Check for missing required data
  useEffect(() => {
    const missingKeys = Object.entries(requiredData)
      .filter(([key, value]) => value === null || value === undefined)
      .map(([key]) => key);
      
    if (missingKeys.length > 0) {
      setFallbackConfig({
        state: 'missing-state',
        props: {
          missingItem: missingKeys.join(', ')
        }
      });
    }
  }, [requiredData]);
  
  // Check auth if required
  useEffect(() => {
    if (checkAuth) {
      supabase.auth.getUser().then(({ data: { user }, error }: { data: { user: any }, error: any }) => {
        if (error || !user) {
          setFallbackConfig({
            state: 'auth-error',
            props: {}
          });
        }
      });
    }
  }, [checkAuth]);
  
  // Loading state management
  const showLoading = useCallback((message?: string, showProgress?: boolean) => {
    setFallbackConfig({
      state: 'loading',
      props: { message, showProgress }
    });
    
    // Setup timeout if configured
    if (timeout > 0) {
      timeoutRef.current = setTimeout(() => {
        setFallbackConfig({
          state: 'timeout',
          props: {}
        });
        onTimeout?.();
      }, timeout);
    }
  }, [timeout, onTimeout]);
  
  const hideLoading = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setFallbackConfig({ state: 'none' });
  }, []);
  
  // Update loading progress
  const updateProgress = useCallback((progress: number) => {
    setFallbackConfig(prev => {
      if (prev.state === 'loading') {
        return {
          ...prev,
          props: { ...prev.props, progress }
        };
      }
      return prev;
    });
  }, []);
  
  // Error handling
  const showError = useCallback((error: Error | string, showDetails = false) => {
    setFallbackConfig({
      state: 'error',
      props: { error, showDetails }
    });
  }, []);
  
  // Permission denied handling
  const showPermissionDenied = useCallback((
    permissionType: 'contacts' | 'notifications' | 'camera',
    callbacks?: {
      onRetry?: () => void;
      onSkip?: () => void;
    }
  ) => {
    setFallbackConfig({
      state: 'permission-denied',
      props: {
        permissionType,
        ...callbacks
      }
    });
  }, []);
  
  // Empty state handling
  const showEmpty = useCallback((
    itemType: string,
    callbacks?: {
      onAdd?: () => void;
      onContinue?: () => void;
    }
  ) => {
    setFallbackConfig({
      state: 'empty',
      props: {
        itemType,
        ...callbacks
      }
    });
  }, []);
  
  // Reset fallback
  const resetFallback = useCallback(() => {
    setFallbackConfig({ state: 'none' });
  }, []);
  
  // Render the appropriate fallback component
  const renderFallback = useCallback(() => {
    const { state, props = {} } = fallbackConfig;
    
    switch (state) {
      case 'loading':
        return <LoadingStateFallback {...props} />;
        
      case 'missing-state':
        return <MissingStateFallback {...props} />;
        
      case 'permission-denied':
        return <PermissionDeniedFallback permissionType="contacts" {...props} />;
        
      case 'offline':
        return <OfflineStateFallback {...props} />;
        
      case 'error':
        return <ErrorStateFallback {...props} />;
        
      case 'empty':
        return <EmptyStateFallback {...props} />;
        
      case 'timeout':
        return <TimeoutFallback {...props} />;
        
      case 'auth-error':
        return <AuthErrorFallback {...props} />;
        
      default:
        return null;
    }
  }, [fallbackConfig]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return {
    // State
    fallbackState: fallbackConfig.state,
    isOnline,
    
    // Methods
    showLoading,
    hideLoading,
    updateProgress,
    showError,
    showPermissionDenied,
    showEmpty,
    resetFallback,
    
    // Render function
    renderFallback,
    
    // Direct component access if needed
    FallbackComponents: {
      MissingStateFallback,
      LoadingStateFallback,
      PermissionDeniedFallback,
      OfflineStateFallback,
      ErrorStateFallback,
      EmptyStateFallback,
      TimeoutFallback,
      AuthErrorFallback,
    }
  };
}

// Wrapper HOC for screens that need fallback UI
export function withFallbackUI<P extends object>(
  Component: React.ComponentType<P & { fallbackUI: ReturnType<typeof useFallbackUI> }>,
  options?: UseFallbackUIOptions
) {
  const WrappedComponent = (props: P) => {
    const fallbackUI = useFallbackUI(options);
    
    // If there's a fallback to show, render it instead of the component
    if (fallbackUI.fallbackState !== 'none') {
      return <>{fallbackUI.renderFallback()}</>;
    }
    
    return <Component {...props} fallbackUI={fallbackUI} />;
  };
  
  WrappedComponent.displayName = `withFallbackUI(${Component.displayName || Component.name || 'Component'})`;
  
  return WrappedComponent;
} 