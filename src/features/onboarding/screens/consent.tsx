import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useOnboardingStore } from '../../../stores/onboardingStore';

// Logo Component (assuming reuse or definition elsewhere)
const Logo = () => (
  <View style={styles.logoWrapper}>
    <Text style={styles.logoText}>🙏personal</Text>
    <Text style={styles.logoAccent}>prayers</Text>
  </View>
);

function ConsentScreenCore() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const setConsent = useOnboardingStore((state) => state.setConsent);

  const handleConsent = async (consentGiven: boolean) => {
    setConsent(consentGiven);
    
    if (consentGiven) {
      router.push('/onboarding/spinner'); // Navigate to spinner screen
    } else {
      // Handle scenario where consent is denied (e.g., show an exit message or different path)
      // For now, let's just go back or to a different screen
      console.log("Consent denied by user.");
      // Potentially navigate to an exit screen or disable further progress
      // router.push('/exit'); // Example
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#003366', '#B94A5A', '#FF8C42']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      
      <View style={[
        styles.contentContainer,
        {
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 20,
          paddingLeft: insets.left + 20,
          paddingRight: insets.right + 20
        }
      ]}>
        <Animated.View entering={FadeIn.duration(600)} style={styles.logoContainer}>
          <Logo />
        </Animated.View>
        
        <Animated.Text 
          entering={FadeIn.delay(300).duration(600)} 
          style={styles.titleText}
        >
          privacy & your prayers
        </Animated.Text>
        
        <Animated.Text
          entering={FadeIn.delay(450).duration(600)}
          style={styles.subtitleText}
        >
          important info about how your data is used
        </Animated.Text>
        
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            entering={FadeIn.delay(600).duration(800)} 
            style={styles.consentBox}
          >
            <View style={styles.consentPoint}>
              <MaterialCommunityIcons name="lock-check-outline" size={24} color="#FFFFFF" style={styles.icon} />
              <Text style={styles.consentText}>
                Your prayers are personal. We use AI to help craft them based on your input, but they are not stored long-term or linked to your identity after processing.
              </Text>
            </View>
            <View style={styles.consentPoint}>
              <MaterialCommunityIcons name="brain" size={24} color="#FFFFFF" style={styles.icon} />
              <Text style={styles.consentText}>
                To improve the prayer generation, anonymized and aggregated data about prayer themes and structures might be used for training purposes. No personal details are included.
              </Text>
            </View>
            <View style={styles.consentPoint}>
              <MaterialCommunityIcons name="shield-account-outline" size={24} color="#FFFFFF" style={styles.icon} />
              <Text style={styles.consentText}>
                You own your prayers. We don't share your specific prayer text with third parties, except the AI providers needed to generate the prayer.
              </Text>
            </View>
             <View style={styles.consentPoint}>
              <MaterialCommunityIcons name="cog-outline" size={24} color="#FFFFFF" style={styles.icon} />
              <Text style={styles.consentText}>
                You can manage your data and preferences in the app settings at any time.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
        
        <View style={styles.buttonContainer}>
           <TouchableOpacity
            style={[styles.button, styles.acceptButton]}
            onPress={() => handleConsent(true)}
          >
            <Text style={styles.buttonText}>i understand & accept</Text> 
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.8,
    textTransform: 'lowercase',
  },
  logoAccent: {
    fontSize: 24,
    fontWeight: '800',
    color: '#90CAF9',
    marginLeft: 0,
    letterSpacing: -0.8,
    textTransform: 'lowercase',
  },
  titleText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 8,
    letterSpacing: -1,
  },
  subtitleText: {
    fontSize: 18,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: -0.3,
    opacity: 0.9,
  },
  scrollContainer: {
    flex: 1,
    width: '100%',
    marginVertical: 20,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  consentBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  consentPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  icon: {
    marginRight: 15,
    marginTop: 2,
  },
  consentText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
  },
  buttonContainer: {
    alignItems: 'center',
    width: '100%',
    paddingBottom: 10,
  },
  button: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  acceptButton: {
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#003366',
    textAlign: 'center',
    textTransform: 'lowercase',
  },
});

// Export directly without error boundary
export default ConsentScreenCore; 