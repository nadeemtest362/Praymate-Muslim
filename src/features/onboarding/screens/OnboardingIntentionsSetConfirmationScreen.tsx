import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Contacts from 'expo-contacts';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { 
  FadeIn, 
  FadeInDown, 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat, 
  Easing, 
  ZoomIn,
} from 'react-native-reanimated';
import { Avatar as AvatarUI, Button } from '../../../shared/ui';
import { useOnboardingStore, LastAddedIntention } from '../../../stores/onboardingStore';
import { PRAYER_TOPICS, PrayerTopicId } from '../../../constants/prayerConstants';
import { StatusBar } from 'expo-status-bar';
import OnboardingGradientBackground from '../../../components/shared/OnboardingGradientBackground';
import { FloatingParticles } from '../../../components/shared/FloatingParticles';
import useResponsive from '../../../hooks/useResponsive';
import * as StoreReview from 'expo-store-review';
import { OnboardingFlowContext } from '../../../contexts/OnboardingFlowContext';

interface OnboardingIntentionsSetConfirmationScreenConfig {
  isForSelfConfirmation?: boolean;
  imageName?: string;
  title: string;
  infoText: string;
  enableMessaging?: boolean;
  doneButton: {
    text?: string;
    action: string; 
  };
  tracking?: {
    screenViewEvent?: string;
  };
}

interface OnboardingIntentionsSetConfirmationScreenProps {
  config: OnboardingIntentionsSetConfirmationScreenConfig;
  onNext: () => void;
}

// Map of local images that might be used by this screen
const localImages: Record<string, NodeRequire> = {
  'jesus-hand': require('../../../../assets/images/jesus-hand.png'),
  // Add other potential images here if needed in the future
};

export default function OnboardingIntentionsSetConfirmationScreen({ config, onNext }: OnboardingIntentionsSetConfirmationScreenProps) {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);
  const flowContext = React.useContext(OnboardingFlowContext);
  const logEvent = flowContext?.logEvent;
  
  const currentBatchOfIntentions = useOnboardingStore(state => state.currentBatchOfIntentions);
  const clearCurrentBatchOfIntentions = useOnboardingStore(state => state.clearCurrentBatchOfIntentions);
  const prayerFocusPeople = useOnboardingStore(state => state.prayerFocusPeople);
  const [hasRequestedReview, setHasRequestedReview] = useState(false);

  // Dev debug logging only - no test data injection
  useEffect(() => {
    if (__DEV__ && currentBatchOfIntentions.length > 0 && currentBatchOfIntentions.some(i => i.personName === 'Sarah')) {
      clearCurrentBatchOfIntentions();
    }
  }, [
    currentBatchOfIntentions,
    clearCurrentBatchOfIntentions,
  ]);

  const starRotate = useSharedValue(0);
  const starOpacity = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      starOpacity.value = withTiming(1, { duration: 600 });
      starRotate.value = withRepeat(withTiming(360, { duration: 10000, easing: Easing.linear }), -1, false);
    }, 300);
    return () => clearTimeout(timer);
  }, [starOpacity, starRotate]);

  // Request store review for self-intention confirmation with Jesus image
  useEffect(() => {
    if (config.isForSelfConfirmation && config.imageName === 'jesus-hand' && !hasRequestedReview) {
      const requestReview = async () => {
        try {
          const isAvailable = await StoreReview.isAvailableAsync();
          if (isAvailable) {
            // Add a delay to ensure the screen is fully rendered
            setTimeout(async () => {
              await StoreReview.requestReview();
              setHasRequestedReview(true);
            }, 1500);
          }
        } catch (error) {
          if (logEvent) {
            logEvent('intentions_review_request_failed', {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      };
      requestReview();
    }
  }, [config.isForSelfConfirmation, config.imageName, hasRequestedReview, logEvent]);

  const starStyle = useAnimatedStyle(() => ({ 
    transform: [{ rotate: `${starRotate.value}deg` }],
    opacity: starOpacity.value
  }));

  const handleDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      if (logEvent) {
        logEvent('intentions_confirmation_done_clicked', {
          is_self_confirmation: !!config.isForSelfConfirmation,
          enable_messaging: !!config.enableMessaging,
          intentions_count: currentBatchOfIntentions.length,
        });
      }

      onNext(); 
    } catch (error) {
      if (logEvent) {
        logEvent('intentions_confirmation_done_failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  };

  const handleMessage = async (personName: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Look up person from prayerFocusPeople to get their device_contact_id
      const person = prayerFocusPeople.find(p => p.name === personName);
      let phoneNumber: string | undefined;
      
      // If they have device_contact_id, look up the contact to get phone number
      if (person?.device_contact_id) {
        const { status } = await Contacts.requestPermissionsAsync();
        if (status === 'granted') {
          const contact = await Contacts.getContactByIdAsync(person.device_contact_id);
          const phoneData = contact?.phoneNumbers?.[0];
          // Use digits field if available, otherwise strip formatting
          const digits = phoneData?.digits || phoneData?.number?.replace(/[\s\(\)\-]/g, '');
          // Add country code if not present (assuming US)
          phoneNumber = digits?.startsWith('+') ? digits : `+1${digits}`;
        }
      }
      
      // App store link with tracking
      const appStoreLink = "https://apps.apple.com/us/app/praymate-personalized-prayers/id6747301595?pt=126491796&ct=onboarding-share&mt=8";
      const message = `Hey, I just added you to my prayers on praymate🙏: ${appStoreLink}`;
      
      // Open SMS with message body always populated
      // If has phone number: pre-fill recipient, otherwise leave blank for user to select
      const smsUrl = phoneNumber 
        ? `sms:${phoneNumber}&body=${encodeURIComponent(message)}`
        : `sms:&body=${encodeURIComponent(message)}`;
      
      const canOpen = await Linking.canOpenURL(smsUrl);
      if (canOpen) {
        await Linking.openURL(smsUrl);
        if (logEvent) {
          logEvent('intentions_confirmation_message_sent', {
            person_name: personName,
            has_phone_number: !!phoneNumber,
          });
        }
      } else {
        if (logEvent) {
          logEvent('intentions_confirmation_message_unavailable', {
            person_name: personName,
          });
        }
      }
    } catch (error) {
      if (logEvent) {
        logEvent('intentions_confirmation_message_failed', {
          person_name: personName,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  };

  // Filter duplicates based on personName for display purposes
  // AND filter out self intentions when this isn't a self confirmation
  const peopleToDisplay = currentBatchOfIntentions.reduce((acc, current) => {
    // Skip self intentions unless this is explicitly a self confirmation screen
    if (!config.isForSelfConfirmation && current.isSelf) {
      return acc;
    }
    
    const x = acc.find(item => item.personName === current.personName);
    if (!x) {
      return acc.concat([current]);
    }
    return acc;
  }, [] as LastAddedIntention[]);

  return (
    <View style={styles.outerContainer}>
      {/* Background gradient - covers entire screen */}
      <OnboardingGradientBackground />
      
      <Animated.View style={styles.container} entering={FadeIn.duration(300)}>
        <StatusBar style="light" />
        
        {/* Floating particles */}
        <FloatingParticles />
      
      <Animated.View style={[styles.starsContainer, starStyle]}>
        <MaterialCommunityIcons name="star-four-points" size={20} color="rgba(255,255,255,0.3)" style={styles.starBg1} />
        <MaterialCommunityIcons name="star-four-points" size={16} color="rgba(255,255,255,0.2)" style={styles.starBg2} />
        <MaterialCommunityIcons name="star-four-points" size={24} color="rgba(255,255,255,0.3)" style={styles.starBg3} />
        <MaterialCommunityIcons name="star-four-points" size={12} color="rgba(255,255,255,0.2)" style={styles.starBg4} />
      </Animated.View>

      <View style={[
        styles.contentWrapper,
        {
          paddingTop: R.insets.top + R.h(5),
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
          <Animated.View 
            style={styles.card}
            entering={FadeIn.duration(600).delay(200)}
          >
            <Animated.Text 
              style={styles.successTitle}
              entering={FadeInDown.duration(600).delay(300)}
            >
              {config.title}
            </Animated.Text>

            <View style={styles.avatarsDisplayContainer}>
              {config.isForSelfConfirmation && config.imageName && localImages[config.imageName] ? (
                <Animated.View entering={ZoomIn.duration(500).delay(400)} style={styles.selfImageContainer}>
                  <Image 
                    source={localImages[config.imageName] as any}
                    style={[styles.selfImage, { width: R.w(60), height: R.h(30) }]} 
                    resizeMode="contain" 
                  />
                </Animated.View>
              ) : peopleToDisplay.length > 0 ? (
                <View style={styles.messagingList}>
                  {peopleToDisplay.map((item, index) => {
                    const topic = PRAYER_TOPICS[item.category as PrayerTopicId];
                    return (
                      <Animated.View 
                        key={`${item.personName}-${item.category}-${index}`}
                        entering={FadeIn.delay(300 + index * 100).duration(400)}
                        style={styles.messageCard}
                      >
                        <View style={styles.personInfo}>
                          {/* Only show avatar if name doesn't start with emoji */}
                          {!/\p{Emoji}/u.test(Array.from(item.personName.trim())[0] || '') && (
                            <AvatarUI 
                              size={R.w(12)} 
                              uri={item.personImageUri} 
                              name={item.personName} 
                            />
                          )}
                          {/* Show emoji as large display if name starts with emoji */}
                          {/\p{Emoji}/u.test(Array.from(item.personName.trim())[0] || '') && (
                            <View style={styles.emojiAvatar}>
                              <Text style={styles.emojiText}>
                                {Array.from(item.personName.trim())[0]}
                              </Text>
                            </View>
                          )}
                          <View style={styles.nameAndTopic}>
                            <Text style={styles.personName}>{item.personName}</Text>
                            {topic && (
                              <View style={styles.topicChip}>
                                {topic.emoji && <Text style={styles.topicEmoji}>{topic.emoji}</Text>}
                                <Text style={styles.topicLabel}>{topic.label}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                        
                        {/* Hero message button */}
                        {config.enableMessaging && !config.isForSelfConfirmation && (
                          <TouchableOpacity
                            style={styles.messageButton}
                            onPress={() => handleMessage(item.personName)}
                          >
                            <MaterialCommunityIcons name="message-text" size={R.w(4)} color="white" />
                            <Text style={styles.messageButtonText}>Message</Text>
                          </TouchableOpacity>
                        )}
                      </Animated.View>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.infoText}>Intentions have been set!</Text>
              )}
            </View>
            
            <Animated.Text 
              style={styles.infoText}
              entering={FadeIn.duration(500).delay(500)}
            >
              {config.infoText}
            </Animated.Text>
          </Animated.View>
        </ScrollView>
        
        {/* Continue Button - fixed at bottom */}
        <View style={styles.buttonContainer}>
          <Button
            onPress={handleDone}
            variant="primary"
            fullWidth
            textStyle={styles.doneButtonText}
          >
            {config.doneButton.text || "Continue"}
          </Button>
        </View>
      </View>
      </Animated.View>
    </View>
  );
}

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  container: { 
    flex: 1,
  },
  contentWrapper: { 
    flex: 1,
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: R.h(3),
  },
  buttonContainer: {
    width: '100%',
    paddingTop: R.h(2),
  },
  starsContainer: { 
    position: 'absolute', 
    width: '100%', 
    height: '100%', 
    zIndex: 2,
    pointerEvents: 'none',
  },
  starBg1: { position: 'absolute', top: '20%', left: '25%' },
  starBg2: { position: 'absolute', top: '35%', right: '20%' },
  starBg3: { position: 'absolute', bottom: '30%', left: '15%' },
  starBg4: { position: 'absolute', bottom: '40%', right: '10%' },
  successTitle: { 
    fontSize: R.font(32),
   fontFamily: 'SNPro-Heavy',
    color: '#FFFFFF', 
    textAlign: 'center', 
    marginBottom: R.h(3),
    letterSpacing: -0.5,
    lineHeight: R.font(38),
  },
  avatarsDisplayContainer: {
    width: '100%',
    marginBottom: R.h(4),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: R.w(2),
  },
  messagingList: {
    width: '100%',
    gap: R.h(1.5),
  },
  messageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: R.w(3),
    padding: R.w(3),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  personInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  nameAndTopic: {
    marginLeft: R.w(2.5),
    flex: 1,
  },
  personName: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: R.font(15),
    fontWeight: '600',
    marginBottom: R.h(0.3),
  },
  emojiAvatar: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: R.w(50),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    width: R.w(12),
    height: R.w(12),
  },
  emojiText: {
    fontSize: R.font(16),
  },
  avatarNameText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: R.font(15),
    fontWeight: '600',
    marginTop: R.h(1.2),
    textAlign: 'center',
    lineHeight: R.font(18),
  },
  infoText: { 
    color: 'rgba(255, 255, 255, 0.8)', 
    fontSize: R.font(16),
    textAlign: 'center', 
    fontStyle: 'italic', 
    marginTop: R.h(2),
    lineHeight: R.font(22),
    paddingHorizontal: R.w(4),
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: R.w(6),
    paddingVertical: R.h(4),
    paddingHorizontal: R.w(4),
    alignItems: 'center',
    zIndex: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 13.16,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: R.w(3),
    paddingVertical: R.h(0.2),
    paddingHorizontal: R.w(1.5),
    alignSelf: 'flex-start',
  },
  topicEmoji: {
    fontSize: R.font(12),
    marginRight: R.w(1.2),
  },
  topicLabel: {
    fontSize: R.font(11),
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    letterSpacing: 0.15,
  },
  selfImageContainer: {
    paddingVertical: R.h(2.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  selfImage: {
    // Size will be set inline with responsive values
  },
  emojiAvatarContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: R.w(50),
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    width: R.w(16),
    height: R.w(16),
  },
  emojiAvatarText: {
    textAlign: 'center',
    fontSize: R.font(20),
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: R.w(5),
    paddingVertical: R.h(1),
    paddingHorizontal: R.w(3),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  messageButtonText: {
    color: 'white',
    fontSize: R.font(13),
    fontWeight: '600',
    marginLeft: R.w(1.5),
  },
  doneButtonText: {
    fontSize: R.font(22),
    fontFamily: "SNPro-Heavy",
  },
}); 