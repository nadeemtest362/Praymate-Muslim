import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import OnboardingGradientBackground from '../../../components/shared/OnboardingGradientBackground';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  FadeIn,
  SlideInUp,
} from 'react-native-reanimated';
import { useOnboardingStore } from '../../../stores/onboardingStore';
import { Avatar } from '../../../shared/ui';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PrayerCardCoverScreenProps {
  config: {
    title: string;
    subtitle: string;
    backgroundGradient: string[];
    card: {
      title: string;
      subtitle: string;
      shadowColor: string;
      shadowOpacity: number;
      borderRadius: number;
    };
    faithImagery: {
      enabled: boolean;
      style: string;
    };
    avatars: {
      enabled: boolean;
      maxVisible: number;
      size: number;
      borderColor: string;
    };
    animation: {
      type: string;
      duration: number;
      intensity: number;
    };
    cta: {
      text: string;
      style: string;
      gradient: string[];
    };
    tracking: {
      screenViewEvent: string;
      cardTappedEvent: string;
    };
  };
  onNext: () => void;
}

function PrayerCardCoverScreenCore({ 
  config, 
  onNext 
}: PrayerCardCoverScreenProps) {
  const insets = useSafeAreaInsets();
  
  const onboardingData = useOnboardingStore();
  
  // Animation values
  const glowIntensity = useSharedValue(0.3);
  const cardScale = useSharedValue(0.9);
  
  // Get time of day for dynamic content
  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
  };
  
  // Process dynamic content
  const processText = (text: string) => {
    return text
      .replace('{timeOfDay}', getTimeOfDay())
      .replace('{faithTradition}', onboardingData.faithTradition || 'spiritual');
  };
  
  // Start animations
  useEffect(() => {
    // Card scale animation
    cardScale.value = withTiming(1, { 
      duration: 800, 
      easing: Easing.out(Easing.back(1.5)) 
    });
    
    // Glow animation
    glowIntensity.value = withRepeat(
      withSequence(
        withTiming(0.6, { 
          duration: config.animation.duration / 2, 
          easing: Easing.inOut(Easing.sin) 
        }),
        withTiming(0.3, { 
          duration: config.animation.duration / 2, 
          easing: Easing.inOut(Easing.sin) 
        })
      ),
      -1,
      true
    );
  }, [cardScale, config.animation.duration, glowIntensity]);
  
  // Animated styles
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));
  
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowIntensity.value,
  }));
  
  // Get visible prayer people
  const visiblePeople = onboardingData.prayerFocusPeople.slice(0, config.avatars.maxVisible);
  
  const handleContinue = async () => {
    onNext();
  };
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <OnboardingGradientBackground />
      
      <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
        {/* Header */}
        <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.subtitle}>{config.subtitle}</Text>
        </Animated.View>
        
        {/* Prayer Card */}
        <Animated.View style={[styles.cardContainer, cardStyle]}>
          {/* Glow Effect */}
          <Animated.View style={[styles.cardGlow, glowStyle]} />
          
          {/* Card */}
          <View 
            style={[
              styles.prayerCard,
              {
                borderRadius: config.card.borderRadius,
                shadowColor: config.card.shadowColor,
                shadowOpacity: config.card.shadowOpacity,
              }
            ]}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[styles.cardBackground, { borderRadius: config.card.borderRadius }]}
            />
            
            {/* Card Content */}
            <View style={styles.cardContent}>
              {/* Faith Symbol */}
              {config.faithImagery.enabled && (
                <View style={styles.faithSymbolContainer}>
                  <Text style={styles.faithSymbol}>🙏</Text>
                </View>
              )}
              
              {/* Card Title */}
              <Text style={styles.cardTitle}>
                {processText(config.card.title)}
              </Text>
              
              {/* Card Subtitle */}
              <Text style={styles.cardSubtitle}>
                {processText(config.card.subtitle)}
              </Text>
              
              {/* Prayer People Avatars */}
              {config.avatars.enabled && visiblePeople.length > 0 && (
                <Animated.View 
                  entering={SlideInUp.delay(400).duration(600)}
                  style={styles.avatarsContainer}
                >
                  <Text style={styles.avatarsLabel}>Praying for:</Text>
                  <View style={styles.avatarsRow}>
                    {visiblePeople.map((person, index) => (
                      <View 
                        key={person.id || index}
                        style={[
                          styles.avatarItem,
                          { 
                            zIndex: visiblePeople.length - index,
                            marginLeft: index > 0 ? -12 : 0
                          }
                        ]}
                      >
                                                 <Avatar
                           image_uri={person.image_uri}
                           name={person.name}
                           size={config.avatars.size}
                           borderWidth={2}
                           borderColor={config.avatars.borderColor}
                         />
                      </View>
                    ))}
                    {onboardingData.prayerFocusPeople.length > config.avatars.maxVisible && (
                      <View style={[styles.avatarItem, styles.moreAvatars]}>
                        <Text style={styles.moreAvatarsText}>
                          +{onboardingData.prayerFocusPeople.length - config.avatars.maxVisible}
                        </Text>
                      </View>
                    )}
                  </View>
                </Animated.View>
              )}
              
              {/* Decorative elements */}
              <View style={styles.decorativeElements}>
                <View style={styles.sparkle}>✨</View>
                <View style={styles.sparkle}>✨</View>
                <View style={styles.sparkle}>✨</View>
              </View>
            </View>
          </View>
        </Animated.View>
        
        {/* CTA Button */}
        <Animated.View 
          entering={FadeIn.delay(800).duration(600)}
          style={styles.ctaContainer}
        >
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={config.cta.gradient as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>{config.cta.text}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
        
        {/* Hint Text */}
        <Animated.View 
          entering={FadeIn.delay(1200).duration(600)}
          style={styles.hintContainer}
        >
          <Text style={styles.hintText}>
            Tap to continue your spiritual journey
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
  cardContainer: {
    position: 'relative',
    marginBottom: 60,
  },
  cardGlow: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    borderRadius: 32,
    zIndex: 0,
  },
  prayerCard: {
    width: SCREEN_WIDTH - 48,
    minHeight: 320,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 8,
    zIndex: 1,
  },
  cardBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  cardContent: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 320,
  },
  faithSymbolContainer: {
    marginBottom: 24,
  },
  faithSymbol: {
    fontSize: 48,
    textAlign: 'center',
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1B4B',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  cardSubtitle: {
    fontSize: 16,
    color: '#4A4E83',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  avatarsContainer: {
    alignItems: 'center',
  },
  avatarsLabel: {
    fontSize: 14,
    color: '#6B7DB8',
    marginBottom: 16,
    fontWeight: '500',
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarItem: {
    position: 'relative',
  },
  moreAvatars: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -12,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  moreAvatarsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  decorativeElements: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
  },
  sparkle: {
    marginLeft: 8,
    fontSize: 16,
  },
  ctaContainer: {
    width: '100%',
    marginBottom: 24,
  },
  ctaButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
  },
  hintContainer: {
    alignItems: 'center',
  },
  hintText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default PrayerCardCoverScreenCore; 