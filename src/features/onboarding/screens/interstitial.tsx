import React, { useMemo } from 'react';
import { 
  View, Text, StyleSheet, 
  Image, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';

import Animated, { 
  FadeIn, ZoomIn, SlideInUp
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOnboardingStore } from '../../../stores/onboardingStore';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import OnboardingGradientBackground from '../../../components/shared/OnboardingGradientBackground';
import useResponsive from '../../../hooks/useResponsive';
import { Button } from '../../../shared/ui';

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: R.h(3),
  },
  buttonContainer: {
    paddingTop: R.h(2),
  },
  imageContainer: {
    marginBottom: R.h(2),
    transform: [{ scale: 1 }],
  },
  image: {
    width: R.w(50),
    height: R.w(50),
  },
  emoji: {
    fontSize: R.font(60),
    textShadowColor: 'rgba(255, 255, 255, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: R.h(2),
  },
  titleWrapper: {
    marginBottom: R.h(2),
  },
  title: {
    fontSize: R.font(24),
    fontFamily: 'SNPro-Bold',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    textAlign: 'center',
    lineHeight: R.font(28),
    paddingHorizontal: R.w(4),
    paddingBottom: R.h(2),
  },
  inlineLogoText: {
    fontFamily: 'SNPro-Heavy',
    textTransform: 'lowercase',
    fontSize: R.font(32),
  },
  inlineLogoEmoji: {
    // No special styling needed, inherits from parent
  },
  inlineLogoAccent: {
    fontFamily: 'SNPro-Heavy',
    color: '#7DD3FC',
    textTransform: 'lowercase',
    fontSize: R.font(32),
  },
  highlightBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.25)',
    borderRadius: R.w(4),
    paddingHorizontal: R.w(3.5),
    paddingVertical: R.h(0.75),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
    overflow: 'hidden',
    marginVertical: R.h(1),
    alignSelf: 'center',
  },
  highlightBadgeText: {
    fontFamily: 'SNPro-Heavy',
    color: '#FFD700',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    fontSize: R.font(28),
    letterSpacing: -0.3,
  },
  dividerLine: {
    width: R.w(20),
    height: R.h(0.35),
    backgroundColor: 'rgba(125, 211, 252, 0.6)',
    marginBottom: R.h(4),
    borderRadius: 2,
    shadowColor: 'rgba(125, 211, 252, 0.4)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  subtitle: {
    fontSize: R.font(24),
    fontFamily: 'SNPro-Heavy',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: -0.1,
    textAlign: 'center',
    lineHeight: R.font(28),
    paddingHorizontal: R.w(2),
   
  },
    centerContent: {
      alignItems: 'center',
      width: '100%',
    },
    spacer: {
      flex: 1,
    },
});


// Define the expected config structure based on InterstitialScreenConfig.json
interface InterstitialScreenConfig {
  emoji?: string; // Optional, for backwards compatibility
  image?: string; // New: path to image asset
  titleTemplate: string; // e.g., "Great! Your upcoming prayers will include your {count, select, 1{person} other{people}}."
  subtitle: string;
  button: {
    text: string;
    action: string; // e.g., "NAVIGATE_NEXT"
    // navigateTo is used by the host, not directly here
  };
  tracking?: {
    screenViewEvent?: string;
  };
}

interface TransitionToMoodScreenProps {
  config: InterstitialScreenConfig;
  onNext: () => void;
  // logSduiEvent might be passed by the host if needed
}

function TransitionToMoodScreenCore({ config, onNext }: TransitionToMoodScreenProps) {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);
  
  const prayerFocusPeopleCount = useOnboardingStore(state => state.prayerFocusPeople.length);
  const firstName = useOnboardingStore(state => state.firstName);
  
  const handleContinue = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // The primary action should be to call onNext, which the host layout will handle
    // based on the config's 'action' and 'navigateTo' fields.
    if (config.button.action === "NAVIGATE_NEXT") {
      onNext();
    } else {
      // Fallback or other actions if defined differently in config
      // For now, assume NAVIGATE_NEXT is the primary use case.
      console.warn(`Unhandled button action: ${config.button.action}`);
      onNext(); // Still call onNext as a default
    }
  };

  // Process the title template
  const getFormattedTitle = () => {
    if (!config.titleTemplate) return "Great!";
    
    let title = config.titleTemplate.replace(
      "{count, select, 1{person} other{people}}", // This placeholder might no longer be in the template
      prayerFocusPeopleCount === 1 ? "person" : "people"
    );

    // Replace {displayName} with actual first name or a fallback
    title = title.replace("{displayName}", firstName || "friend");
    return title;
  };

  // Render title with APP_LOGO replacement and 3-minutes highlighting
  const renderTitle = () => {
    const title = getFormattedTitle();
    
    if (!title.includes('{APP_LOGO}')) {
            // Handle highlighting 3-minutes a day even without APP_LOGO
      if (title.includes('3-minutes a day')) {
        const parts = title.split('3-minutes a day');
        return (
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{parts[0]}</Text>
            <View style={styles.highlightBadge}>
              <Text style={styles.highlightBadgeText}>3-minutes a day</Text>
            </View>
            {parts[1] && <Text style={styles.title}>{parts[1]}</Text>}
          </View>
        );
      }
      return <Text style={styles.title}>{title}</Text>;
    }

    return (
      <View style={styles.titleContainer}>
        {title.split('{APP_LOGO}').map((part, index, arr) => (
          <React.Fragment key={index}>
                        {/* Handle 3-minutes a day highlighting in each part */}
            {part.includes('3-minutes a day') ? (
              <View key={`part-${index}`}>
                {part.split('3-minutes a day').map((subPart, subIndex, subArr) => (
                <React.Fragment key={`${index}-${subIndex}`}>
                    {subPart && <Text style={styles.title}>{subPart}</Text>}
                  {subIndex < subArr.length - 1 && (
                      <View style={styles.highlightBadge}>
                        <Text style={styles.highlightBadgeText}>3-minutes a day</Text>
                      </View>
                  )}
                </React.Fragment>
                ))}
              </View>
            ) : (
              part && <Text key={`part-${index}`} style={styles.title}>{part}</Text>
            )}
            {index < arr.length - 1 && (
              <Text key={`logo-${index}`} style={styles.title}>
                <Text style={styles.inlineLogoText}>pray</Text>
                <Text style={styles.inlineLogoAccent}>mate</Text>
                <Text style={styles.inlineLogoEmoji}>🙏</Text>
              </Text>
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background gradient */}
      <OnboardingGradientBackground />

      <View style={[
        styles.contentContainer,
        {
          paddingTop: R.insets.top + R.h(6),
          paddingBottom: R.insets.bottom + R.h(2.5),
          paddingLeft: R.insets.left + R.w(5),
          paddingRight: R.insets.right + R.w(5)
        }
      ]}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.centerContent}>
            {/* Animated Image or Emoji */}
            <Animated.View
              entering={ZoomIn.delay(200).duration(1000).springify().damping(12)}
              style={styles.imageContainer}
            >
              {config.image ? (
                <Image
                  source={config.image.startsWith('http') ? { uri: config.image } : { uri: `../../../assets/images/${config.image}` }}
                  style={styles.image}
                  resizeMode="contain"
                />
              ) : (
                <Text style={styles.emoji}>{config.emoji || '✨'}</Text>
              )}
            </Animated.View>

            {/* Header text */}
            <Animated.View 
              entering={FadeIn.delay(500).duration(1000)}
              style={styles.titleWrapper}
            >
              {renderTitle()}
            </Animated.View>
            
            <Animated.View
              entering={SlideInUp.delay(900).duration(800).springify().damping(15)}
              style={styles.dividerLine}
            />
            
            {/* Conditionally render subtitle */}
            {config.subtitle && config.subtitle.trim() !== '' && (
              <Animated.Text
                entering={FadeIn.delay(1200).duration(900)}
                style={styles.subtitle}
              >
                {config.subtitle}
              </Animated.Text>
            )}
          </View>
        </ScrollView>

        {/* Continue button - fixed at bottom */}
        <View style={styles.buttonContainer}>
          <Button
            onPress={handleContinue}
            variant="primary"
            fullWidth
          >
            {config.button.text || "Ok, I'm ready"}
          </Button>
        </View>
      </View>
    </View>
  );
}

// Responsive styles function


// Export directly without error boundary
export default TransitionToMoodScreenCore; 