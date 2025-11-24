import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../../theme';
import { 
  useFallbackUI, 
  withFallbackUI,
  withResilience 
} from '../services/onboarding';

/**
 * Example screen demonstrating all fallback UI states
 */
function FallbackUIExampleScreen({ config, onNext }: any) {
  const insets = useSafeAreaInsets();
  const [selectedExample, setSelectedExample] = useState<string>('');
  const [requiredData, setRequiredData] = useState<{ mood: string | null }>({ mood: 'happy' });
  const [checkAuth, setCheckAuth] = useState(true);
  
  // Use the fallback UI hook
  const fallbackUI = useFallbackUI({
    requiredData,
    checkAuth,
    timeout: 5000, // 5 second timeout for demo
    onTimeout: () => console.log('Operation timed out!')
  });

  // Example handlers
  const examples = [
    {
      id: 'loading',
      title: 'Loading State',
      description: 'Show loading indicator',
      action: () => {
        fallbackUI.showLoading('Loading your prayer data...');
        setTimeout(() => fallbackUI.hideLoading(), 3000);
      }
    },
    {
      id: 'loading-progress',
      title: 'Loading with Progress',
      description: 'Show loading with progress bar',
      action: () => {
        fallbackUI.showLoading('Generating your prayer...', true);
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          fallbackUI.updateProgress(progress);
          if (progress >= 100) {
            clearInterval(interval);
            fallbackUI.hideLoading();
          }
        }, 300);
      }
    },
    {
      id: 'missing-state',
      title: 'Missing State',
      description: 'Simulate missing required data',
      action: () => {
        setRequiredData({ mood: null });
        setTimeout(() => setRequiredData({ mood: 'happy' }), 100);
      }
    },
    {
      id: 'permission-contacts',
      title: 'Permission Denied - Contacts',
      description: 'Show contacts permission denied',
      action: () => {
        fallbackUI.showPermissionDenied('contacts', {
          onRetry: () => {
            console.log('Retry contacts permission');
            fallbackUI.resetFallback();
          },
          onSkip: () => {
            console.log('Skip contacts permission');
            fallbackUI.resetFallback();
          }
        });
      }
    },
    {
      id: 'permission-notifications',
      title: 'Permission Denied - Notifications',
      description: 'Show notifications permission denied',
      action: () => {
        fallbackUI.showPermissionDenied('notifications', {
          onRetry: () => fallbackUI.resetFallback(),
          onSkip: () => fallbackUI.resetFallback()
        });
      }
    },
    {
      id: 'offline',
      title: 'Offline State',
      description: 'Show offline fallback',
      action: () => {
        fallbackUI.showError('No internet connection', false);
      }
    },
    {
      id: 'error',
      title: 'Error State',
      description: 'Show error with details',
      action: () => {
        fallbackUI.showError(
          new Error('Failed to save prayer intention: Database connection timeout'),
          true
        );
      }
    },
    {
      id: 'empty',
      title: 'Empty State',
      description: 'Show empty list fallback',
      action: () => {
        fallbackUI.showEmpty('prayer intentions', {
          onAdd: () => {
            console.log('Add prayer intention');
            fallbackUI.resetFallback();
          },
          onContinue: () => {
            console.log('Continue without intentions');
            fallbackUI.resetFallback();
          }
        });
      }
    },
    {
      id: 'auth-error',
      title: 'Auth Error',
      description: 'Toggle auth check to trigger',
      action: () => {
        setCheckAuth(false);
        setTimeout(() => setCheckAuth(true), 100);
      }
    }
  ];

  // If there's a fallback to show, render it
  if (fallbackUI.fallbackState !== 'none') {
    return fallbackUI.renderFallback();
  }

  // Otherwise render the example screen
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Fallback UI Examples</Text>
        <Text style={styles.subtitle}>
          Tap any example to see the fallback UI in action
        </Text>

        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            Network: {fallbackUI.isOnline ? '🟢 Online' : '🔴 Offline'}
          </Text>
          <Text style={styles.statusText}>
            Current State: {fallbackUI.fallbackState}
          </Text>
        </View>

        <View style={styles.controlsContainer}>
          <View style={styles.control}>
            <Text style={styles.controlLabel}>Check Auth</Text>
            <Switch
              value={checkAuth}
              onValueChange={setCheckAuth}
              trackColor={{ false: colors.text.tertiary, true: colors.primary }}
            />
          </View>
        </View>

        <View style={styles.examplesContainer}>
          {examples.map((example) => (
            <Pressable
              key={example.id}
              style={({ pressed }) => [
                styles.exampleCard,
                pressed && styles.exampleCardPressed,
                selectedExample === example.id && styles.exampleCardSelected
              ]}
              onPress={() => {
                setSelectedExample(example.id);
                example.action();
              }}
            >
              <Text style={styles.exampleTitle}>{example.title}</Text>
              <Text style={styles.exampleDescription}>{example.description}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable 
          style={styles.continueButton}
          onPress={onNext}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

// Example of using the HOC
// const FallbackUIExampleWithHOC = withFallbackUI(
//   ({ fallbackUI }: any) => {
//     // This component automatically gets fallback UI injected
//     // and will show fallback states instead of rendering if needed
//     return (
//       <View style={styles.container}>
//         <Text style={styles.title}>Component with Fallback HOC</Text>
//         <Pressable
//           style={styles.exampleCard}
//           onPress={() => fallbackUI.showLoading('Loading...')}
//         >
//           <Text style={styles.exampleTitle}>Trigger Loading</Text>
//         </Pressable>
//       </View>
//     );
//   },
//   {
//     requiredData: { user: null }, // This will trigger missing state
//     checkAuth: true,
//     timeout: 10000
//   }
// );

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    padding: spacing.medium,
    paddingBottom: spacing.xxlarge,
  },
  title: {
    fontSize: typography.fontSizes.xxlarge,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.small,
  },
  subtitle: {
    fontSize: typography.fontSizes.medium,
    color: colors.text.secondary,
    marginBottom: spacing.large,
  },
  statusContainer: {
    backgroundColor: colors.background.secondary,
    padding: spacing.medium,
    borderRadius: 12,
    marginBottom: spacing.medium,
  },
  statusText: {
    fontSize: typography.fontSizes.medium,
    color: colors.text.primary,
    marginBottom: spacing.tiny,
  },
  controlsContainer: {
    marginBottom: spacing.large,
  },
  control: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    padding: spacing.medium,
    borderRadius: 12,
  },
  controlLabel: {
    fontSize: typography.fontSizes.medium,
    color: colors.text.primary,
  },
  examplesContainer: {
    marginBottom: spacing.xlarge,
  },
  exampleCard: {
    backgroundColor: colors.background.secondary,
    padding: spacing.medium,
    borderRadius: 12,
    marginBottom: spacing.small,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  exampleCardPressed: {
    opacity: 0.8,
  },
  exampleCardSelected: {
    borderColor: colors.primary,
  },
  exampleTitle: {
    fontSize: typography.fontSizes.medium,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.tiny,
  },
  exampleDescription: {
    fontSize: typography.fontSizes.small,
    color: colors.text.secondary,
  },
  continueButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.medium,
    paddingHorizontal: spacing.xlarge,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: typography.fontSizes.medium,
    fontWeight: '600',
  },
});

// Export with resilience wrapper for complete bulletproofing
export default withResilience(FallbackUIExampleScreen, 'fallback_ui_example'); 