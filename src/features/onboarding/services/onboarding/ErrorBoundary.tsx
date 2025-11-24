/**
 * Error Boundary Component for Onboarding
 * Catches component crashes and provides recovery options
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../../../theme';
import { onboardingStateMachine, OnboardingState } from './stateMachine';
import { onboardingDataRepository } from './dataRepository';
import { captureException } from '../../../../lib/sentry';

const { background, primary } = colors;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  currentState?: OnboardingState;
  onReset?: () => void;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isRecovering: boolean;
}



export class OnboardingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRecovering: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to error reporting service
    console.error('Onboarding Error Boundary caught an error:', error, errorInfo);
    
    // Report to Sentry
    captureException(error, {
      componentStack: errorInfo.componentStack,
      currentState: this.props.currentState || onboardingStateMachine.getContext().currentState,
      retryCount: this.state.retryCount,
    });

    // Save error state
    this.setState({ errorInfo });

    // Save current onboarding state for recovery
    this.saveErrorState(error, errorInfo);
  }

  private async saveErrorState(error: Error, errorInfo: ErrorInfo) {
    try {
      
      // Set error in state machine
      onboardingStateMachine.setError({
        code: 'COMPONENT_ERROR',
        message: error.message,
        recoverable: true,
        retryCount: this.state.retryCount,
      });

      // Save state to repository
      await onboardingDataRepository.saveOnboardingState(
        onboardingStateMachine.getContext()
      );
    } catch (saveError) {
      console.error('Failed to save error state:', saveError);
    }
  }

  handleRetry = async () => {
    try {
      this.setState({ isRecovering: true });

      // Increment retry count
      const newRetryCount = this.state.retryCount + 1;
      
      if (newRetryCount > 3) {
        Alert.alert(
          'Too Many Retries',
          'The app has crashed multiple times. Please restart the app or contact support.',
          [
            { text: 'OK', onPress: this.handleReset }
          ]
        );
        return;
      }

      // Clear error state
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: newRetryCount,
        isRecovering: false,
      });

      // Call parent retry handler if provided
      if (this.props.onRetry) {
        this.props.onRetry();
      }
    } catch (error) {
      console.error('Failed to retry:', error);
      this.setState({ isRecovering: false });
    }
  };

  handleReset = async () => {
    try {
      this.setState({ isRecovering: true });

      // Reset onboarding state machine
      onboardingStateMachine.reset();

      // Clear all cached data
      await onboardingDataRepository.clearAllData();

      // Clear error state
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: 0,
        isRecovering: false,
      });

      // Call parent reset handler if provided
      if (this.props.onReset) {
        this.props.onReset();
      }
    } catch (error) {
      console.error('Failed to reset:', error);
      this.setState({ isRecovering: false });
      
      Alert.alert(
        'Reset Failed',
        'Failed to reset the onboarding. Please restart the app.',
        [{ text: 'OK' }]
      );
    }
  };

  handleContactSupport = () => {
    // In a real app, this would open a support contact form or email
    Alert.alert(
      'Contact Support',
      'Please email support@personalprayers.com with error code: ' + 
      (this.state.error?.message || 'Unknown'),
      [{ text: 'OK' }]
    );
  };

  renderErrorDetails = () => {
    const { error, errorInfo } = this.state;
    
    if (__DEV__ && (error || errorInfo)) {
      return (
        <View style={styles.errorDetailsContainer}>
          <Text style={styles.errorDetailsTitle}>Error Details (Dev Only)</Text>
          <ScrollView style={styles.errorDetailsScroll}>
            <Text style={styles.errorDetailsText}>
              {error?.toString()}
              {'\n\n'}
              {errorInfo?.componentStack}
            </Text>
          </ScrollView>
        </View>
      );
    }
    
    return null;
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      // Default error UI
      return (
        <SafeAreaView style={styles.container}>
          <LinearGradient
            colors={[background.primary, background.secondary]}
            style={styles.gradient}
          >
            <View style={styles.content}>
              <View style={styles.iconContainer}>
                <Ionicons 
                  name="warning-outline" 
                  size={80} 
                  color={primary} 
                />
              </View>

              <Text style={styles.title}>Oops! Something went wrong</Text>
              
              <Text style={styles.message}>
                We encountered an unexpected error during your onboarding.
                Don't worry, your progress has been saved.
              </Text>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={this.handleRetry}
                  disabled={this.state.isRecovering}
                >
                  <Text style={styles.buttonText}>
                    {this.state.isRecovering ? 'Recovering...' : 'Try Again'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={this.handleReset}
                  disabled={this.state.isRecovering}
                >
                  <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                    Start Over
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.supportLink}
                onPress={this.handleContactSupport}
              >
                <Text style={styles.supportLinkText}>Contact Support</Text>
              </TouchableOpacity>

              {this.renderErrorDetails()}
            </View>
          </LinearGradient>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.8,
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: primary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: primary,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    color: primary,
  },
  supportLink: {
    marginTop: 24,
  },
  supportLinkText: {
    fontSize: 14,
    color: primary,
    textDecorationLine: 'underline',
  },
  errorDetailsContainer: {
    marginTop: 32,
    width: '100%',
    maxHeight: 200,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    padding: 16,
  },
  errorDetailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  errorDetailsScroll: {
    flex: 1,
  },
  errorDetailsText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontFamily: 'monospace',
    opacity: 0.8,
  },
});

// Export a hook for functional components to access error boundary
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return {
    throwError: (error: Error) => setError(error),
    resetError: () => setError(null),
  };
} 