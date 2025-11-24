import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { withResilience } from '../services/onboarding/resilient-wrapper';
import { deepLinkHandler } from '../services/onboarding/deep-link-handler';
import { colors, spacing, typography } from '../../../theme';
import * as Linking from 'expo-linking';

/**
 * Example screen demonstrating deep link handling
 * Shows how to:
 * 1. Generate deep links for onboarding steps
 * 2. Handle incoming deep links
 * 3. Resume interrupted onboarding
 * 4. Skip to specific steps
 */
function DeepLinkExampleScreen() {
  const [lastLink, setLastLink] = useState<string>('');
  
  // Example deep links
  const exampleLinks = [
    {
      title: 'Resume Onboarding',
      path: '/onboarding/resume',
      description: 'Continue where you left off',
    },
    {
      title: 'Restart Onboarding',
      path: '/onboarding/restart',
      description: 'Start fresh from the beginning',
    },
    {
      title: 'Go to Mood Selection',
      path: '/onboarding/mood',
      description: 'Jump to mood selection (if allowed)',
    },
    {
      title: 'Skip to Step',
      path: '/onboarding/skip-to?step=prayer_needs',
      description: 'Skip to prayer needs step',
    },
    {
      title: 'Force Navigate',
      path: '/onboarding/first-prayer?force=true',
      description: 'Force navigation to first prayer',
    },
  ];
  
  const handleDeepLink = async (path: string) => {
    const baseUrl = Linking.createURL('');
    const fullUrl = `${baseUrl}${path}`;
    
    setLastLink(fullUrl);
    
    // Handle the deep link
    const result = await deepLinkHandler.handleDeepLink(fullUrl, 'external');
    
    if (result.success) {
      Alert.alert(
        'Deep Link Handled',
        `Successfully navigated to: ${result.targetState || 'target'}${
          result.recoveredFromInterruption ? ' (recovered from interruption)' : ''
        }`
      );
    } else {
      Alert.alert('Deep Link Failed', result.error || 'Unknown error');
    }
  };
  
  const copyLink = (path: string) => {
    const baseUrl = Linking.createURL('');
    const fullUrl = `${baseUrl}${path}`;
    
    // In a real app, you'd copy to clipboard
    Alert.alert('Link Generated', fullUrl);
  };
  
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Deep Link Handler Example</Text>
      <Text style={styles.subtitle}>
        Test deep linking functionality for onboarding
      </Text>
      
      {lastLink ? (
        <View style={styles.lastLinkContainer}>
          <Text style={styles.lastLinkLabel}>Last Link:</Text>
          <Text style={styles.lastLinkText}>{lastLink}</Text>
        </View>
      ) : null}
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Example Deep Links</Text>
        
        {exampleLinks.map((link, index) => (
          <View key={index} style={styles.linkCard}>
            <Text style={styles.linkTitle}>{link.title}</Text>
            <Text style={styles.linkDescription}>{link.description}</Text>
            <Text style={styles.linkPath}>{link.path}</Text>
            
            <View style={styles.buttonRow}>
              <Pressable
                style={[styles.button, styles.primaryButton]}
                onPress={() => handleDeepLink(link.path)}
              >
                <Text style={styles.buttonText}>Test Link</Text>
              </Pressable>
              
              <Pressable
                style={[styles.button, styles.secondaryButton]}
                onPress={() => copyLink(link.path)}
              >
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                  Copy URL
                </Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How It Works</Text>
        <Text style={styles.infoText}>
          1. Deep links can navigate to specific onboarding steps{'\n'}
          2. State is automatically saved when interrupted{'\n'}
          3. Prerequisites are validated before navigation{'\n'}
          4. Force parameter can bypass validation{'\n'}
          5. Resume link restores interrupted progress
        </Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>URL Schemes</Text>
        <Text style={styles.codeText}>
          justpray://onboarding/[step]{'\n'}
          justpray://onboarding/resume{'\n'}
          justpray://onboarding/restart{'\n'}
          justpray://onboarding/skip-to?step=[state]
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    padding: spacing.large,
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
    marginBottom: spacing.xlarge,
  },
  lastLinkContainer: {
    backgroundColor: colors.background.secondary,
    padding: spacing.medium,
    borderRadius: 12,
    marginBottom: spacing.xlarge,
  },
  lastLinkLabel: {
    fontSize: typography.fontSizes.small,
    color: colors.text.secondary,
    marginBottom: spacing.small,
  },
  lastLinkText: {
    fontSize: typography.fontSizes.small,
    color: colors.primary,
    fontFamily: 'monospace',
  },
  section: {
    marginBottom: spacing.xlarge,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.large,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.medium,
  },
  linkCard: {
    backgroundColor: colors.background.secondary,
    padding: spacing.medium,
    borderRadius: 12,
    marginBottom: spacing.medium,
  },
  linkTitle: {
    fontSize: typography.fontSizes.medium,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.small,
  },
  linkDescription: {
    fontSize: typography.fontSizes.small,
    color: colors.text.secondary,
    marginBottom: spacing.small,
  },
  linkPath: {
    fontSize: typography.fontSizes.small,
    color: colors.primary,
    fontFamily: 'monospace',
    marginBottom: spacing.medium,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.small,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.small,
    paddingHorizontal: spacing.medium,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonText: {
    fontSize: typography.fontSizes.small,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    color: colors.primary,
  },
  infoText: {
    fontSize: typography.fontSizes.small,
    color: colors.text.secondary,
    lineHeight: typography.fontSizes.small * 1.5,
  },
  codeText: {
    fontSize: typography.fontSizes.small,
    color: colors.text.secondary,
    fontFamily: 'monospace',
    backgroundColor: colors.background.secondary,
    padding: spacing.medium,
    borderRadius: 8,
  },
});

export default withResilience(DeepLinkExampleScreen, 'deep_link_example'); 