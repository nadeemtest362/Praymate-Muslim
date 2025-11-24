import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import OnboardingGradientBackground from '../../../components/shared/OnboardingGradientBackground';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  SlideInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useOnboardingStore } from '../../../stores/onboardingStore';
import { revenueCatService } from '../../../lib/revenueCatService';
// Adapty imports removed - using RevenueCat instead



interface SubscriptionOption {
  id: string;
  title: string;
  description: string;
  price: string;
  features: string[];
  recommended: boolean;
  gradient: string[];
}

interface CuriosityPaywallScreenProps {
  config: {
    title: string;
    subtitle: string;
    backgroundGradient: string[];
    curiosityMessage: {
      headline: string;
      description: string;
      emphasis: string;
    };
    preview: {
      enabled: boolean;
      type: string;
      opacity: number;
    };
    urgency: {
      enabled: boolean;
      type: string;
      message: string;
      countdown: boolean;
    };
    subscriptionOptions: SubscriptionOption[];
    alternatives: {
      continueWithLimitations: {
        enabled: boolean;
        text: string;
        description: string;
      };
      restorePurchases: {
        enabled: boolean;
        text: string;
      };
    };
    tracking: {
      screenViewEvent: string;
      subscriptionTappedEventPrefix: string;
      continueWithLimitationsEvent: string;
      restoreTappedEvent: string;
    };
  };
  onNext: () => void;
}

export default function CuriosityPaywallScreen({ 
  config, 
  onNext 
}: CuriosityPaywallScreenProps) {
  const insets = useSafeAreaInsets();
  const onboardingData = useOnboardingStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [paywall, setPaywall] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  
  // Animation values
  const glowOpacity = useSharedValue(0.3);
  
  // Process dynamic content
  const processText = (text: string) => {
    return text
      .replace('{faithTradition}', onboardingData.faithTradition || 'spiritual')
      .replace('{peopleCount}', String(onboardingData.prayerFocusPeople?.length || 3));
  };
  
  // Load RevenueCat paywall on mount
  useEffect(() => {
    loadPaywall();
    
    // Start glow animation
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.3, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, [glowOpacity]);
  
  const loadPaywall = async () => {
    try {
      setIsLoading(true);
      
      // Get offerings from RevenueCat
      const offerings = await revenueCatService.getOfferings();
      if (offerings.current && offerings.current.availablePackages.length > 0) {
        // Convert RevenueCat packages to our products format
        const revenueCatProducts = offerings.current.availablePackages.map((pkg: any) => ({
          vendorProductId: pkg.identifier,
          price: pkg.product.price,
          currencyCode: pkg.product.currencyCode,
          localizedPrice: pkg.product.priceString,
          title: pkg.product.title,
          description: pkg.product.description,
          packageType: pkg.packageType,
          product: pkg.product
        }));
        
        setProducts(revenueCatProducts);
        console.log('RevenueCat products loaded:', revenueCatProducts.length);
      }
    } catch (error) {
      console.error('Failed to load paywall:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSubscriptionPress = async (option: SubscriptionOption) => {
    try {
      setIsLoading(true);
      
      // Find matching product in RevenueCat
      const product = products.find(p => 
        p.vendorProductId.includes(option.id) || 
        p.vendorProductId.includes(option.id.toLowerCase())
      );
      
      if (!product) {
        Alert.alert('Error', 'Product not found. Please try again.');
        return;
      }
      
      // Make purchase using RevenueCat
      const purchaseResult = await revenueCatService.purchasePackage(product.product);
      if (purchaseResult.customerInfo.entitlements.active && Object.keys(purchaseResult.customerInfo.entitlements.active).length > 0) {
        // Purchase successful - continue to main app
        Alert.alert(
          'Welcome! 🎉',
          'Your subscription is active. Welcome to your spiritual journey!',
          [{ text: 'Continue', onPress: onNext }]
        );
      }
    } catch (error: any) {
      console.error('Purchase failed:', error);
      Alert.alert('Purchase Failed', error.message || 'Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleContinueWithLimitations = () => {
    Alert.alert(
      'Limited Access',
      'You\'ll have access to 3 prayers per week. You can upgrade anytime in settings.',
      [
        { text: 'Upgrade Now', style: 'default' },
        { 
          text: 'Continue Limited', 
          style: 'cancel', 
          onPress: onNext 
        }
      ]
    );
  };
  
  const handleRestorePurchases = async () => {
    try {
      setIsLoading(true);
      const customerInfo = await revenueCatService.restorePurchases();
      
      if (customerInfo.entitlements.active && Object.keys(customerInfo.entitlements.active).length > 0) {
        Alert.alert(
          'Purchases Restored! 🎉',
          'Your subscription has been restored.',
          [{ text: 'Continue', onPress: onNext }]
        );
      } else {
        Alert.alert('No Purchases Found', 'No active subscriptions found to restore.');
      }
    } catch (error: any) {
      Alert.alert('Restore Failed', error.message || 'Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Animated styles
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <OnboardingGradientBackground />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.subtitle}>{processText(config.subtitle)}</Text>
        </Animated.View>
        
        {/* Curiosity Message */}
        <Animated.View 
          entering={SlideInUp.delay(300).duration(600)}
          style={styles.curiosityContainer}
        >
          <Animated.View style={[styles.curiosityGlow, glowStyle]} />
          
          <View style={styles.curiosityContent}>
            <Text style={styles.curiosityHeadline}>
              {config.curiosityMessage.headline}
            </Text>
            
            <Text style={styles.curiosityDescription}>
              {processText(config.curiosityMessage.description)}
            </Text>
            
            <Text style={styles.curiosityEmphasis}>
              {config.curiosityMessage.emphasis}
            </Text>
          </View>
        </Animated.View>
        
        {/* Preview Section */}
        {config.preview.enabled && (
          <Animated.View 
            entering={FadeIn.delay(600).duration(600)}
            style={styles.previewContainer}
          >
            <View style={[styles.previewCard, { opacity: config.preview.opacity }]}>
              <Text style={styles.previewText}>
                "Dear God, as I begin this {onboardingData.faithTradition || 'spiritual'} journey..."
              </Text>
              <View style={styles.blurOverlay}>
                <Ionicons name="eye-off" size={24} color="white" />
                <Text style={styles.blurText}>Unlock to read your full prayer</Text>
              </View>
            </View>
          </Animated.View>
        )}
        
        {/* Urgency Message */}
        {config.urgency.enabled && (
          <Animated.View 
            entering={SlideInUp.delay(900).duration(600)}
            style={styles.urgencyContainer}
          >
            <Text style={styles.urgencyText}>{config.urgency.message}</Text>
          </Animated.View>
        )}
        
        {/* Subscription Options */}
        <Animated.View 
          entering={SlideInUp.delay(1200).duration(600)}
          style={styles.optionsContainer}
        >
          {config.subscriptionOptions.map((option, index) => (
            <TouchableOpacity
              key={option.id}
              style={[styles.optionCard, option.recommended && styles.recommendedCard]}
              onPress={() => handleSubscriptionPress(option)}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {option.recommended && (
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>BEST VALUE</Text>
                </View>
              )}
              
              <LinearGradient
                colors={option.gradient as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.optionGradient}
              >
                <View style={styles.optionContent}>
                  <View style={styles.optionHeader}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionPrice}>{option.price}</Text>
                  </View>
                  
                  <Text style={styles.optionDescription}>{option.description}</Text>
                  
                  <View style={styles.featuresContainer}>
                    {option.features.map((feature, idx) => (
                      <View key={idx} style={styles.featureRow}>
                        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </Animated.View>
        
        {/* Alternatives */}
        <Animated.View 
          entering={FadeIn.delay(1500).duration(600)}
          style={styles.alternativesContainer}
        >
          {config.alternatives.continueWithLimitations.enabled && (
            <TouchableOpacity
              style={styles.alternativeButton}
              onPress={handleContinueWithLimitations}
              disabled={isLoading}
            >
              <Text style={styles.alternativeText}>
                {config.alternatives.continueWithLimitations.text}
              </Text>
              <Text style={styles.alternativeDescription}>
                {config.alternatives.continueWithLimitations.description}
              </Text>
            </TouchableOpacity>
          )}
          
          {config.alternatives.restorePurchases.enabled && (
            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestorePurchases}
              disabled={isLoading}
            >
              <Text style={styles.restoreText}>
                {config.alternatives.restorePurchases.text}
              </Text>
            </TouchableOpacity>
          )}
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
  scrollContent: {
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
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
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
  },
  curiosityContainer: {
    position: 'relative',
    marginBottom: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  curiosityGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    borderRadius: 20,
  },
  curiosityContent: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  curiosityHeadline: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1B4B',
    textAlign: 'center',
    marginBottom: 16,
  },
  curiosityDescription: {
    fontSize: 16,
    color: '#4A4E83',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  curiosityEmphasis: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFD700',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  previewContainer: {
    marginBottom: 32,
  },
  previewCard: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: 20,
    position: 'relative',
  },
  previewText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    textAlign: 'center',
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  blurText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  urgencyContainer: {
    backgroundColor: 'rgba(255, 140, 66, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 66, 0.4)',
  },
  urgencyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF8C42',
    textAlign: 'center',
  },
  optionsContainer: {
    marginBottom: 32,
  },
  optionCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  recommendedCard: {
    transform: [{ scale: 1.02 }],
  },
  recommendedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
  },
  recommendedText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  optionGradient: {
    padding: 20,
  },
  optionContent: {
    alignItems: 'center',
  },
  optionHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  optionPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  optionDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 16,
  },
  featuresContainer: {
    alignSelf: 'stretch',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: 'white',
    marginLeft: 8,
    flex: 1,
  },
  alternativesContainer: {
    alignItems: 'center',
  },
  alternativeButton: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  alternativeText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  alternativeDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 4,
  },
  restoreButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  restoreText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
}); 