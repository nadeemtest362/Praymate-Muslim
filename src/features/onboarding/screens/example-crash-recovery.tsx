import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Button, AppState } from 'react-native';
import { 
  useCrashRecovery,
  withCrashRecovery,
  OnboardingCrashRecovery 
} from '../services/onboarding';
import { useRouter } from 'expo-router';
import { colors, spacing, typography } from '../../../theme';

/**
 * Example: Crash Recovery Integration
 * Shows users where they left off if the app crashed
 */

// Main onboarding layout with crash recovery
export function OnboardingLayoutWithRecovery() {
  const { canRecover, handleRecovery, isChecking } = useCrashRecovery();
  const router = useRouter();

  useEffect(() => {
    // Check for crash on mount
    if (canRecover) {
      handleRecovery((lastScreen: string) => {
        // Navigate back to where they were
        console.log(`[CrashRecovery] Resuming at ${lastScreen}`);
        router.push(`/onboarding/${lastScreen}`);
      });
    }
  }, [canRecover, handleRecovery, router]);

  // Mark clean exit when app backgrounds
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        OnboardingCrashRecovery.markSessionClean();
      }
    });

    return () => subscription?.remove();
  }, []);

  if (isChecking) {
    // Could show a loading state here
    return null;
  }

  return <YourOnboardingStack />;
}

// Individual screen wrapped with crash recovery
// const FirstNameScreen = withCrashRecovery(({ onNext }: any) => {
//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>What's your name?</Text>
//       {/* Screen content */}
//       <Button title="Continue" onPress={onNext} />
//     </View>
//   );
// }, 'first-name'); // Track this screen

// Example of manual progress saving
export function OnboardingScreenWithManualSave({ screenName }: any) {
  useEffect(() => {
    // Save progress when important data changes
    OnboardingCrashRecovery.saveProgress(screenName);
  }, [screenName]);

  const handleImportantAction = async () => {
    // After user completes something important
    await doSomethingImportant();
    
    // Save progress immediately
    await OnboardingCrashRecovery.saveProgress(screenName);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Important Step</Text>
      <Button title="Save Important Data" onPress={handleImportantAction} />
    </View>
  );
}

/**
 * Testing crash recovery:
 * 
 * 1. Start onboarding
 * 2. Get to screen 3 or 4
 * 3. Force quit the app (kill it from app switcher)
 * 4. Reopen app
 * 5. Should see "Welcome Back!" dialog
 * 6. Choose "Continue" to resume where you left off
 */

// Demo screen that simulates a crash
export function CrashTestScreen() {
  const simulateCrash = () => {
    // This will crash the app in development
    // DON'T ship this to production!
    if (__DEV__) {
      throw new Error('Simulated crash for testing recovery');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crash Recovery Test</Text>
      <Text style={styles.subtitle}>
        This demonstrates how crash recovery works
      </Text>
      
      {__DEV__ && (
        <View style={styles.dangerZone}>
          <Text style={styles.warning}>⚠️ Development Only</Text>
          <Button 
            title="Simulate Crash" 
            onPress={simulateCrash}
            color="#FF0000"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.large,
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.fontSizes.xlarge,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.medium,
  },
  subtitle: {
    fontSize: typography.fontSizes.medium,
    color: colors.text.secondary,
    marginBottom: spacing.large,
  },
  dangerZone: {
    marginTop: spacing.xlarge,
    padding: spacing.large,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: 12,
  },
  warning: {
    fontSize: typography.fontSizes.medium,
    color: '#FF0000',
    fontWeight: '600',
    marginBottom: spacing.medium,
    textAlign: 'center',
  },
});

// Placeholder components
function YourOnboardingStack() {
  return <View />;
}

async function doSomethingImportant() {
  // Your important logic here
} 