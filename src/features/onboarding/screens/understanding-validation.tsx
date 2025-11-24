import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useOnboardingStore } from '../../../stores/onboardingStore';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';



// Logo Component (simple version for now)
const Logo = () => (
  <View style={styles.logoWrapper}>
    <Text style={styles.logoText}>🙏personal</Text>
    <Text style={styles.logoAccent}>prayers</Text>
  </View>
);

// More focused, meaningful options with visual elements
const ConsistencyOptions = [
  { id: 'mornings', icon: 'sunny-outline', label: 'Morning rush', description: 'I struggle to pray when my day starts' },
  { id: 'evenings', icon: 'moon-outline', label: 'Evening fatigue', description: "I'm too tired by the end of the day" },
  { id: 'busyness', icon: 'calendar-outline', label: 'Too busy', description: 'Life gets in the way of my prayer time' },
  { id: 'distracted', icon: 'notifications-outline', label: 'Distractions', description: 'My mind wanders during prayer' },
  { id: 'other', icon: 'create-outline', label: 'Something else', description: 'I want to explain in my own words' }
];

const PersonalOptions = [
  { id: 'memorized', icon: 'book-outline', label: 'Rehearsed words', description: 'Memorized prayers feel empty to me' },
  { id: 'authentic', icon: 'heart-outline', label: 'Not authentic', description: 'I want to speak from my heart' },
  { id: 'unsure', icon: 'help-circle-outline', label: "Don't know what to say", description: "I freeze up when I try to pray" },
  { id: 'disconnected', icon: 'person-outline', label: 'Just going through motions', description: 'Prayer feels like checking a box' },
  { id: 'other', icon: 'create-outline', label: 'Something else', description: 'I want to explain in my own words' }
];

const CloserOptions = [
  { id: 'unheard', icon: 'ear-outline', label: 'Not heard', description: 'God seems silent when I pray' },
  { id: 'unsure', icon: 'help-circle-outline', label: "Unsure how", description: "I don't know if I'm praying right" },
  { id: 'doubt', icon: 'cloud-outline', label: 'Doubts', description: "I struggle with questions about faith" },
  { id: 'presence', icon: 'body-outline', label: "Can't feel presence", description: "God feels distant to me" },
  { id: 'other', icon: 'create-outline', label: 'Something else', description: "I want to explain in my own words" }
];

const TryingOptions = [
  { id: 'curious', icon: 'bulb-outline', label: 'Curiosity', description: 'I want to explore spirituality' },
  { id: 'stress', icon: 'water-outline', label: 'Seeking peace', description: 'Looking for relief from stress' },
  { id: 'meaning', icon: 'compass-outline', label: 'Finding meaning', description: 'Searching for purpose in life' },
  { id: 'guidance', icon: 'map-outline', label: 'Need guidance', description: 'Looking for direction' },
  { id: 'other', icon: 'create-outline', label: 'Something else', description: 'I want to explain in my own words' }
];

function DeeperUnderstandingScreenCore() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const { 
    initialMotivation,
    setHasCompletedDeeperUnderstanding
  } = useOnboardingStore();

  const handleContinue = async () => {
    console.log("UnderstandingValidationScreen: handleContinue triggered");
    
    setHasCompletedDeeperUnderstanding(true);
   
    try {
      router.push('/onboarding/first-name');
      console.log("Navigation to /onboarding/first-name requested successfully.");
    } catch (error) {
      console.error("Error during navigation:", error);
    }
  };

  // Determine which text to show based on initial motivation
  const getValidationText = () => {
    switch (initialMotivation) {
      case 'consistency':
        return "it's totally normal to struggle with consistency. life gets busy! we'll help you build a rhythm that works for you.";
      case 'personal':
        return "many people feel like their prayers could be more personal. we'll work together to connect your prayers to your heart.";
      case 'closer':
        return "feeling distant sometimes is part of the journey. we're here to help you explore ways to deepen that connection.";
      case 'trying':
        return "it's great that you're exploring! there's no one right way to pray. we'll support you as you figure out what resonates.";
      case 'start':
        return "starting your faith journey is beautiful! we'll guide you step by step as you discover what prayer means to you.";
      default:
        return "acknowledging where you are is the first step. we're here to support your prayer journey.";
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
          you're not alone
        </Animated.Text>
                
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            entering={FadeIn.delay(600).duration(800)} 
            style={styles.validationBox}
          >
            <Text style={styles.iconEmoji}>🤝</Text>
            <Text style={styles.validationText}> 
              {getValidationText()}
            </Text>
             <Text style={styles.closingText}> 
              we'll keep this in mind as we help you craft your prayers.
            </Text>
          </Animated.View>
        </ScrollView>
        
        {/* Navigation Button */}
        <View style={styles.buttonContainer}>
           <TouchableOpacity
            style={styles.button}
            onPress={handleContinue}
          >
            <Text style={styles.buttonText}>got it, let's continue</Text> 
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
    alignItems: 'center',
  },
  logoContainer: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
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
    marginTop: 70,
    marginBottom: 30,
    letterSpacing: -1,
  },
  scrollContainer: {
    width: '100%',
    marginBottom: 20,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  validationBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    padding: 25,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    alignItems: 'center',
  },
  icon: {
    marginBottom: 20,
  },
  iconEmoji: {
    fontSize: 50,
    marginBottom: 20,
  },
  validationText: {
    fontSize: 18,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    lineHeight: 25,
    marginBottom: 25,
  },
  closingText: {
     fontSize: 15,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 10,
    marginTop: 'auto',
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
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#003366',
    textAlign: 'center',
    textTransform: 'lowercase',
  },
});

export default DeeperUnderstandingScreenCore; 