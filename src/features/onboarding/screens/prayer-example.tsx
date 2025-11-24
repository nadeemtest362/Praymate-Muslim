import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';


import { Avatar } from '../../../shared/ui';

const { width } = Dimensions.get('window');

// Define the PrayerPersonType interface based on EmptyPrayerCard's requirements
interface PrayerPersonType {
  id: string;
  name: string;
  image_uri?: string | null;
}

interface PrayerExampleScreenConfig {
  title?: string;
  message: string;
  buttonText: string;
  tracking?: {
    screenViewEvent?: string;
  };
}

interface PrayerExampleScreenProps {
  config: PrayerExampleScreenConfig;
  onNext: () => void;
}

// Simplified Example Prayer Card JSX
const ExamplePrayerCard = () => {
  const mockPrayerPeople: PrayerPersonType[] = [
    { id: '1', name: 'Mom' },
    { id: '2', name: 'Grandpa' },
    { id: '3', name: 'Bestie' },
  ];
  const peopleToShow = mockPrayerPeople.slice(0, 4);
  const peopleCount = mockPrayerPeople.length;

  return (
    <View style={cardStyles.container}>
      <Animated.View style={cardStyles.card}>
        <ImageBackground
          source={require('../../../../assets/images/evening-bg.png')}
          style={cardStyles.imageBackground}
          imageStyle={cardStyles.backgroundImage}
        >
          <LinearGradient
            colors={['rgba(0, 0, 0, 0.1)', 'rgba(0, 0, 0, 0.5)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          
          <View style={cardStyles.contentContainer}>
            <View style={cardStyles.titleSection}>
              <View style={cardStyles.unavailableBadge}>
                <Text style={cardStyles.unavailableText}>
                  Heartfelt prayers delivered twice daily
                </Text>
              </View>
              <Text style={cardStyles.titleText}>
                🌙 Your Evening Prayer
              </Text>
            </View>
            
            <View style={{ flex: 1 }} />
            
            <View>
              {peopleCount > 0 && (
                <View style={cardStyles.peopleContainer}>
                  <View style={cardStyles.avatarRow}>
                    {peopleToShow.map((person, index) => (
                      <View 
                        key={person.id} 
                        style={[
                          cardStyles.avatarWrapper, 
                          { marginLeft: index > 0 ? -12 : 0, zIndex: 10 - index }
                        ]}
                      >
                        <Avatar 
                          image_uri={person.image_uri}
                          name={person.name} 
                          size={28} 
                        />
                      </View>
                    ))}
                    {peopleCount > 4 && (
                      <View style={[cardStyles.avatarWrapper, cardStyles.moreAvatarContainer]}>
                        <Text style={cardStyles.moreAvatarText}>+{peopleCount - 4}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={cardStyles.peopleText}>
                    {`Included: ${peopleToShow.map(p => p.name).join(', ')}`}
                  </Text>
                </View>
              )}
              
              <TouchableOpacity
                style={[
                  cardStyles.actionButton,
                  cardStyles.secondaryButton
                ]}
                activeOpacity={0.8}
             
              >
                <Text style={cardStyles.buttonText}>
                  Review My Intentions
                </Text>
                
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>
      </Animated.View>
    </View>
  );
};

function PrayerExampleScreenCore({ config, onNext }: PrayerExampleScreenProps) {
  const insets = useSafeAreaInsets();
  
  const { title, message, buttonText } = config;
  
  const handleContinue = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    onNext();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#003366', '#B94A5A', '#FF8C42']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom + 20,
            paddingLeft: insets.left + 20,
            paddingRight: insets.right + 20
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          entering={FadeIn.duration(600)}
          style={styles.headerContainer}
        >
          {title && (
            <Animated.Text style={styles.title}>{title}</Animated.Text>
          )}
        </Animated.View>
        
        <Animated.View 
          entering={FadeInDown.delay(200).duration(500)}
          style={styles.cardContainer}
        >
          <ExamplePrayerCard />
        </Animated.View>
        
        <Animated.Text 
          entering={FadeInDown.delay(400).duration(500)} 
          style={styles.message}
        >
          {message}
        </Animated.Text>

        <Animated.View 
          entering={FadeInDown.delay(600).duration(500)}
          style={styles.buttonContainer}
        >
          <TouchableOpacity
            style={styles.button}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>{buttonText}</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    alignItems: 'center',
   
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 36,  
    width: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 42,
    letterSpacing: -1,
  },
  cardContainer: {
    width: width - 48,
    alignSelf: 'center',
    marginBottom: 24,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  message: {
    fontSize: 20,
    lineHeight: 28,
    color: '#FFFFFF',
    textAlign: 'center',
    marginHorizontal: 10,
    marginTop: 24,
    marginBottom: 36,
    fontWeight: '700',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 20,
  },
  button: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#003366',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
});

// Styles for the inlined ExamplePrayerCard, adapted from EmptyPrayerCard.tsx
// Some styles might be duplicated or need adjustment if the main `styles` object has overlaps
const cardStyles = StyleSheet.create({
  container: {
    width: '100%',
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    height: 260,
  },
  imageBackground: {
    flex: 1,
  },
  backgroundImage: {
    borderRadius: 24,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  titleSection: {
    alignItems: 'center',
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    letterSpacing: -1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
    marginRight: 4,
  },
  availableText: {
    color: '#4ADE80',
    fontSize: 12,
    fontWeight: '500',
  },
  unavailableBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  unavailableText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '500',
  },
  peopleContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 5,
  },
  avatarWrapper: {
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
  },
  moreAvatarContainer: {
    width: 28,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreAvatarText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  peopleText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    textAlign: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 220,
  },
  primaryButton: {
    backgroundColor: 'rgba(73, 94, 212, 0.9)',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    opacity: 0.6,
  },
  buttonIcon: {
    marginLeft: 8,
  },
});

// Export directly without error boundary
export default PrayerExampleScreenCore; 