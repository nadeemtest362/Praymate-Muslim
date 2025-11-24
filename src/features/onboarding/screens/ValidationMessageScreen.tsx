import React, { useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  FadeIn, 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming,
  withSequence,
  withDelay,
  Easing,
  SlideInUp,
  ZoomIn
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import OnboardingGradientBackground from '../../../components/shared/OnboardingGradientBackground';
import { FloatingParticles } from '../../../components/shared/FloatingParticles';
import useResponsive from '../../../hooks/useResponsive';

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  illustrationOverlayLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  illustrationContainer: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationGlow: {
    position: 'absolute',
    width: R.w(46),
    height: R.w(46),
    borderRadius: R.w(25),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: R.w(5),
    zIndex: -1,
  },
  emojiContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: R.h(0.5) },
    textShadowRadius: R.w(2.5),
  },
  emojiText: {
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: R.h(0.5) },
    textShadowRadius: R.w(2.5),
  },

  textContainer: {
    width: '100%',
    zIndex: 2,
    marginTop: R.h(20),
  },
  cardContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: R.w(5),
    paddingHorizontal: R.w(5),
    paddingVertical: R.h(3),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: R.h(0.7) },
    shadowOpacity: 0.15,
    shadowRadius: R.w(2.5),
    elevation: 6,
  },
  title: {
    fontSize: R.font(34),
    fontFamily: 'SNPro-Heavy',
    color: '#FFFFFF',
    marginBottom: R.h(2.5),
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: R.font(42),
  },
  message: {
    fontSize: R.font(19),
    lineHeight: R.font(30),
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: R.h(4.5),
    textAlign: 'center',
    fontFamily: 'SNPro-Regular',

  },
  buttonContainer: {
    alignItems: 'center',
    marginBottom: R.h(1),
  },
  button: {
    borderRadius: R.w(7),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: R.h(1) },
    shadowOpacity: 0.25,
    shadowRadius: R.w(3),
    elevation: 8,
    minWidth: R.w(70),
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: R.h(2.5),
    paddingHorizontal: R.w(8),
  },
  buttonText: {
    fontSize: R.font(19),
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  buttonArrow: {
    marginLeft: R.w(3),
    opacity: 0.7,
  },
  buttonArrowText: {
    fontSize: R.font(18),
    fontWeight: '600',
    color: '#1a1a1a',
  },
});


// Map of local illustration identifiers to their require paths
const localIllustrations: Record<string, NodeRequire> = {
  'jesus-iphone': require('../../../../assets/images/jesus-iphone.png'),
  // Add other predefined local illustrations here if needed:
  // 'seedling': require('../../../../assets/images/seedling.png'), 
};

// Define the config types to match our new design
interface ValidationMessageScreenConfig {
  // Main content
  title: string;
  message: string;
  
  // Visual elements
  illustration?: {
    source: string; // Can be a URL, an emoji, or an identifier for a local asset
    position?: 'top' | 'center' | 'bottom';
    size?: number;
    animation?: 'pulse' | 'float' | 'none';
  };
  
  // Action
  actionButton: {
    text: string;
    action: string;
    navigateTo: string;
  };
  
  // Optional tracking
  tracking?: {
    screenViewEvent: string;
  };
}

interface ValidationMessageScreenProps {
  config: ValidationMessageScreenConfig;
  onNext: () => void;
}

// Enhanced floating animation component with more sophisticated animations
const AnimatedIllustration = ({ config, R, insets }: { config: ValidationMessageScreenConfig['illustration'], R: ReturnType<typeof useResponsive>, insets: any }) => {
  // Call all hooks before any early returns
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(0);
  
  const styles = useMemo(() => createStyles(R), [R]);
  
  useEffect(() => {
    if (!config) return;
    
    // Entrance animation
    opacity.value = withDelay(800, withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) }));
    
    if (config.animation === 'float') {
      translateY.value = withRepeat(
        withTiming(-20, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        -1, true
      );
      scale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.cubic) }),
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.cubic) })
        ),
        -1, true
      );
    } else if (config.animation === 'pulse') {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 2500, easing: Easing.inOut(Easing.cubic) }),
          withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.cubic) })
        ),
        -1, true
      );
      // Add subtle rotation for more dynamic feel
      rotate.value = withRepeat(
        withSequence(
          withTiming(-3, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
          withTiming(3, { duration: 4000, easing: Easing.inOut(Easing.sin) })
        ),
        -1, true
      );
    } else {
      translateY.value = withTiming(0, { duration: 100 });
      scale.value = withTiming(1, { duration: 100 });
    }
  }, [config, config?.animation, opacity, translateY, scale, rotate]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` }
    ],
    opacity: opacity.value
  }));

  // Early return after all hooks are called
  if (!config) return null;

  // Determine render type based on source
  const isLocalAsset = !!localIllustrations[config.source];
  const isHttpUrl = config.source.startsWith('http');

  // Calculate dynamic positioning - Account for safe area
  const getPositionStyle = () => {
    // Add safe area top to all positions
    const safeTop = insets.top;
    switch (config.position) {
      case 'top':
        return { top: safeTop + R.h(5) }; // Below safe area + 5%
      case 'center':
        return { top: safeTop + R.h(20) }; // Below safe area + 20%
      case 'bottom':
        return { bottom: R.h(45) }; // From bottom (no change needed)
      default:
        return { top: safeTop + R.h(15) }; // Below safe area + 15%
    }
  };

  // Smaller image size to prevent overlap
  const imageSize = config.size ? R.w(config.size / 5) : R.w(50); // Reduce from 70% to 50%

  return (
    <Animated.View style={[
      styles.illustrationContainer,
      getPositionStyle(),
      animatedStyle
    ]}>
      {/* Subtle glow effect behind illustration */}
      <View style={styles.illustrationGlow} />
      
      {isLocalAsset ? (
        <Image 
          source={localIllustrations[config.source] as unknown as number}
          style={{ 
            width: imageSize, 
            height: imageSize,
            resizeMode: 'contain'
          }} 
        />
      ) : isHttpUrl ? (
        <Image 
          source={{ uri: config.source }} 
          style={{ 
            width: imageSize, 
            height: imageSize,
            resizeMode: 'contain'
          }} 
        />
      ) : (
        // Enhanced emoji styling
        <View style={styles.emojiContainer}>
          <Text style={[styles.emojiText, { fontSize: config.size ? R.font(config.size * 0.8) : R.font(100) }]}>
            {config.source}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

function ValidationMessageScreenCore({ config, onNext }: ValidationMessageScreenProps) {
  const insets = useSafeAreaInsets();
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);
  
  // Animation values for content
  const buttonScale = useSharedValue(1);
  
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }]
  }));
  
  const handleButtonPress = async () => {
    // Add haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    buttonScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withTiming(1.05, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
    
    setTimeout(() => {
      onNext();
    }, 300);
  };
  
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background gradient */}
      <OnboardingGradientBackground />
      
      {/* Subtle overlay for depth */}
      <LinearGradient
        colors={['rgba(139, 69, 19, 0.1)', 'transparent', 'rgba(30, 144, 255, 0.1)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
        
      {/* Floating particles for ambiance */}
      <FloatingParticles />
      
      {/* Main Content Container */}
      <View style={[
        styles.contentContainer,
        {
          paddingTop: insets.top + R.h(2.5),
          paddingBottom: insets.bottom + R.h(3.5),
          paddingLeft: insets.left + R.w(6),
          paddingRight: insets.right + R.w(6)
        }
      ]}>
        {/* Animated Illustration Layer */}
        {config.illustration && (
          <View style={styles.illustrationOverlayLayer}>
            <AnimatedIllustration config={config.illustration} R={R} insets={insets} />
          </View>
        )}
        
        {/* Enhanced Text Content with glassmorphism styling like welcome screen options */}
        <Animated.View 
          entering={SlideInUp.delay(500).duration(1000).springify().damping(20)} 
          style={styles.textContainer}
        >
          <View style={styles.cardContainer}>
            <Animated.Text 
              entering={FadeIn.delay(800).duration(1200)} 
              style={styles.title}
            >
              {config.title}
            </Animated.Text>
            
            <Animated.Text 
              entering={FadeIn.delay(1100).duration(1200)} 
              style={styles.message}
            >
              {config.message}
            </Animated.Text>
            
            {/* Enhanced button with better styling */}
            <Animated.View 
              entering={ZoomIn.delay(1400).duration(800).springify().damping(15)} 
              style={[styles.buttonContainer, buttonAnimatedStyle]}
            >
              <TouchableOpacity
                style={styles.button}
                onPress={handleButtonPress}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#FFFFFF', '#F8F9FA']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>{config.actionButton.text}</Text>
                  
                  {/* Subtle arrow icon */}
                  <View style={styles.buttonArrow}>
                    <Text style={styles.buttonArrowText}>→</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}


// Export directly without error boundary
export default ValidationMessageScreenCore; 