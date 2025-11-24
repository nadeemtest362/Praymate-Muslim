import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useOnboardingStore } from '../../../stores/onboardingStore';
import * as Haptics from 'expo-haptics';
import { PRAYER_TOPICS, PrayerTopicId } from '../../../constants/prayerConstants';
import { APP_MOOD_OPTIONS } from '../../../constants/moodConstants';
import { BlurView } from 'expo-blur';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Feather } from '@expo/vector-icons';
import { Button } from '../../../shared/ui';
import { StatusBar } from 'expo-status-bar';
import OnboardingGradientBackground from '../../../components/shared/OnboardingGradientBackground';
import { FloatingParticles } from '../../../components/shared/FloatingParticles';

import Animated, { 
  FadeIn, 
} from 'react-native-reanimated';
import useResponsive from '../../../hooks/useResponsive';
import { OnboardingFlowContext } from '../../../contexts/OnboardingFlowContext';

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: R.w(5), 
    paddingBottom: R.h(2.5),
  },
  header: {
    marginBottom: R.h(7.5), 
    alignItems: 'flex-start',
  },
  pageTitle: {
    fontSize: R.font(32),
    fontFamily: 'SNPro-Heavy',
    color: '#FFFFFF',
    marginBottom: R.h(1.2),
    letterSpacing: -0.8,
    textAlign: 'center',
    width: '100%',
  },
  celebrationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: R.w(5),
    paddingVertical: R.h(1),
    paddingHorizontal: R.w(4),
    alignSelf: 'center',
    marginTop: R.h(1.2),
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.4)',
  },
  celebrationText: {
    color: '#4CAF50',
    fontSize: R.font(14),
    fontFamily: 'SNPro-SemiBold',
    marginLeft: R.w(2),
  },
  columnsContainer: {
    flexDirection: 'row',
    position: 'relative',
  },
  leftColumn: {
    width: '57%',
    paddingRight: R.w(2.5), 
    zIndex: 1,
  },
  statsBox: {
    flexDirection: 'row',
    borderRadius: R.w(3),
    paddingVertical: R.h(1.7),
    paddingHorizontal: R.w(2.5),
    marginBottom: R.h(1.7),
    justifyContent: 'space-around',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  statItem: {
    alignItems: 'center',
    flex:1, 
    minWidth: R.w(15), // Ensure minimum width for labels
  },
  statValue: {
    fontSize: R.font(24), 
    fontFamily: 'SNPro-Heavy',
    color: '#FFFFFF',
  },
  statEmojiValue: {
    fontSize: R.font(20), 
    color: '#FFFFFF',
    lineHeight: R.font(28), 
  },
  statLabel: {
    fontSize: R.font(8.5), 
    fontFamily: 'SNPro-SemiBold',
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    marginTop: R.h(0.4),
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1.5, 
    height: '60%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignSelf: 'center',
  },
  infoCard: {
    borderRadius: R.w(3),
    paddingVertical: R.h(1.5),
    paddingHorizontal: R.w(3.5),
    marginBottom: R.h(1.5),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: R.h(1),
  },
  sectionHeaderIcon: {
    marginRight: R.w(2),
  },
  infoCardLabel: {
    fontSize: R.font(11),
    fontFamily: 'SNPro-Heavy',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  infoCardValue: {
    fontSize: R.font(15),
    fontFamily: 'SNPro-SemiBold',
    color: '#FFFFFF',
    marginLeft: R.w(6.5), // Aligns with the text after the icon
  },
  infoCardValueBold: {
    fontSize: R.font(17),
    fontFamily: 'SNPro-Heavy',
    color: '#FFFFFF',
    marginLeft: R.w(6.5), // Aligns with the text after the icon
  },
  infoCardValueMuted: {
    fontSize: R.font(15),
    color: 'rgba(255, 255, 255, 0.5)',
    fontStyle: 'italic',
    marginLeft: R.w(6.5), // Aligns with the text after the icon
  },
  peoplePillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: R.h(1),
    marginHorizontal: -R.w(0.5),
  },
  personPill: {
    backgroundColor: 'rgba(106, 76, 156, 0.5)',
    borderRadius: R.w(3),
    paddingVertical: R.h(0.8),
    paddingLeft: R.w(2.5),
    paddingRight: R.w(2.5),
    marginHorizontal: R.w(0.5),
    marginBottom: R.h(0.8),
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  personPillText: {
    color: '#FFFFFF',
    fontSize: R.font(14),
    fontFamily: 'SNPro-Black',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  emojiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: R.w(0.8),
  },
  emojiSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    marginHorizontal: R.w(1),
  },
  emojiBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: R.w(2.5),
    width: R.w(5),
    height: R.w(5),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  emojiText: {
    fontSize: R.font(11),
    lineHeight: R.font(16),
  },
  warningContainer: {
    borderRadius: R.w(4),
    overflow: 'hidden',
    marginTop: -R.h(4.5),
    marginBottom: R.h(2.2),
    marginHorizontal: 0,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  warningGradient: {
    borderRadius: R.w(4),
    overflow: 'hidden',
  },
  warningContent: {
    paddingHorizontal: R.w(5),
    paddingVertical: R.h(3),
    alignItems: 'center',
  },
  warningTitle: {
    fontSize: R.font(20),
    fontFamily: 'SNPro-Heavy',
    color: '#FFFFFF',
    marginBottom: R.h(1.5),
    textAlign: 'left',
    width: '100%',
    letterSpacing: 0.5,
  },
  continuePrompt: {
    fontSize: R.font(16),
    lineHeight: R.font(22),
    color: '#FFFFFF',
    fontFamily: 'SNPro-SemiBold',
    textAlign: 'left',
    width: '100%',
  },
  noteContainer: {
    position: 'relative',
    marginBottom: R.h(3),
  },
  jesusImage: {
    position: 'absolute',
    width: R.w(80),
    height: R.h(34),
    right: -R.w(20), // Moved left from -30 to -20
    bottom: '100%', // Position above the note box with bottom edge touching the top
    zIndex: 0,
  },
  noteBox: {
    position: 'relative',
    zIndex: 1, // Ensure note box is above Jesus image if they overlap
  },
  continueButtonContainer: {
    width: '90%',
    alignSelf: 'center',
    paddingVertical: R.h(1.2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
});


interface OnboardingSummaryScreenConfig {
  tracking?: {
    screenViewEvent?: string;
  };
}

interface OnboardingSummaryScreenProps {
  config: OnboardingSummaryScreenConfig;
  onNext: () => void;
  isTestMode?: boolean;
}





function SummaryScreenCore({ config, onNext }: OnboardingSummaryScreenProps) {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);
  const flowContext = React.useContext(OnboardingFlowContext);
  const logEvent = flowContext?.logEvent;
  
  const prayerFocusPeopleFromStore = useOnboardingStore(state => state.prayerFocusPeople);
  const mood = useOnboardingStore(state => state.mood) as any; // Can be string "id|emoji" or Mood object
  const initialMotivation = useOnboardingStore(state => state.initialMotivation);
  const currentBatchOfIntentions = useOnboardingStore(state => state.currentBatchOfIntentions);

  // Trigger celebration haptics on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1200);
    
    return () => clearTimeout(timer);
  }, []);


  const getMoodDisplay = () => {
    if (!mood) return { emoji: '😊', label: 'Ready' };
    
    // Handle legacy string format like "joyful|😊"
    if (typeof mood === 'string') {
      if (mood.includes('|')) {
        const [moodId, moodEmoji] = mood.split('|');
        // Find the label from the mood constants
        const moodOption = APP_MOOD_OPTIONS.find(m => m.id === moodId);
        return {
          emoji: moodEmoji || '😊',
          label: moodOption?.label || moodId.charAt(0).toUpperCase() + moodId.slice(1)
        };
      }
      // Just a mood ID without emoji
      const moodOption = APP_MOOD_OPTIONS.find(m => m.id === mood);
      return {
        emoji: moodOption?.emoji || '😊',
        label: moodOption?.label || mood.charAt(0).toUpperCase() + mood.slice(1)
      };
    }
    
    // Handle object format (if mood is stored as object)
    if (typeof mood === 'object' && 'emoji' in mood && 'label' in mood) {
      return { emoji: mood.emoji, label: mood.label };
    }
    
    // Fallback
    return { emoji: '😊', label: 'Ready' };
  };
  
  const getMotivationDisplay = () => {
    switch(initialMotivation) {
      case 'consistency': return 'Build a prayer routine';
      case 'personalization': return 'Make prayers personal';
      case 'closer': return 'Feel closer to God';
      case 'restart': return 'Start praying again';
      case 'intercession': return 'Pray for others';
      case 'inspiration': return 'Renew spiritual life';
      case 'start': return 'Begin faith journey';
      default: return 'Grow spiritually';
    }
  };
  
  // Navigation to home
  const handleFinishOnboarding = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (logEvent) {
      logEvent('summary_next_clicked', {
        people_count: prayerFocusPeopleFromStore.length,
        intention_count: currentBatchOfIntentions.length,
        mood_label: moodInfo.label,
        mood_emoji: moodInfo.emoji,
      });
    }
    onNext();
  };


  const moodInfo = getMoodDisplay();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background gradient */}
      <OnboardingGradientBackground />
      
      {/* Enhanced floating particles */}
      <FloatingParticles />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContentContainer} 
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View 
          entering={FadeIn.duration(400)}
          style={[styles.header, { marginTop: R.insets.top + R.h(1.8) }]}
        >
          <Text style={styles.pageTitle}>🙏 My Prayer Profile</Text>
        </Animated.View>
        
        <View style={styles.columnsContainer}>
          <View style={styles.leftColumn}>
            {/* Stats Box */}
            <Animated.View entering={FadeIn.duration(400).delay(100)}>
              <BlurView intensity={20} tint="dark" style={styles.statsBox}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{prayerFocusPeopleFromStore.length}</Text>
                  <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>PEOPLE</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{currentBatchOfIntentions.length}</Text>
                  <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>INTENTS</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statEmojiValue}>{moodInfo.emoji}</Text>
                  <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>MOOD</Text>
                </View>
              </BlurView>
            </Animated.View>
            
            {/* Goal Card */}
            <Animated.View entering={FadeIn.duration(400).delay(200)}>
              <BlurView intensity={20} tint="dark" style={styles.infoCard}>
                <View style={styles.sectionHeaderRow}>
                  <MaterialCommunityIcons name="star" size={R.font(18)} color="rgba(255, 255, 255, 0.9)" style={styles.sectionHeaderIcon} />
                  <Text style={styles.infoCardLabel}>GOAL</Text>
                </View>
                <Text style={styles.infoCardValueBold}>
                  {getMotivationDisplay()}
                </Text>
              </BlurView>
            </Animated.View>
            

            
            {/* Prayer People Card */}
            <Animated.View entering={FadeIn.duration(400).delay(300)}>
              <BlurView intensity={20} tint="dark" style={styles.infoCard}>
                <View style={styles.sectionHeaderRow}>
                  <MaterialCommunityIcons name="account-heart" size={R.font(18)} color="rgba(255, 255, 255, 0.9)" style={styles.sectionHeaderIcon} />
                  <Text style={styles.infoCardLabel}>PRAYER PEOPLE</Text>
                </View>
                {prayerFocusPeopleFromStore.length === 0 ? (
                  <Text style={styles.infoCardValueMuted}>
                    None added yet
                  </Text>
                ) : (
                  <View style={styles.peoplePillsContainer}>
                    {prayerFocusPeopleFromStore.map((person, index) => {
                      // Find intention for this person
                      const personIntention = currentBatchOfIntentions.find(
                        intention => !intention.isSelf && intention.personName === person.name
                      );
                      
                      const topicEmoji = personIntention 
                        ? PRAYER_TOPICS[personIntention.category as PrayerTopicId]?.emoji || ''
                        : '';
                      
                      return (
                        <View 
                          key={person.id} 
                          style={styles.personPill}
                        >
                          <Text style={styles.personPillText}>{person.name}</Text>
                          {topicEmoji && (
                            <View style={styles.emojiContainer}>
                              <View style={styles.emojiSeparator} />
                              <View style={styles.emojiBadge}>
                                <Text style={styles.emojiText}>{topicEmoji}</Text>
                              </View>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </BlurView>
            </Animated.View>
          </View>
        </View>

        {/* Note with Jesus Image */}
        <View style={styles.noteContainer}>
          {/* Jesus Image - positioned to touch the Note box */}
          <Image 
            source={require('../../../../assets/images/jesus-halo-3.png')}
            style={styles.jesusImage}
            resizeMode="contain"
          />
          
        <Animated.View 
          entering={FadeIn.duration(400).delay(400)}
            style={styles.noteBox}
        >
          <BlurView
            intensity={80}
            tint="default"
            style={{
                borderRadius: R.w(5),
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.15)',
              overflow: 'hidden',
            }}
          >
            <LinearGradient
              colors={['rgba(34, 197, 94, 0.15)', 'rgba(22, 163, 74, 0.1)']}
              style={{
                  padding: R.w(5),
                flexDirection: 'row',
                alignItems: 'center',
                  gap: R.w(3),
              }}
            >
              <View
                style={{
                    width: R.w(11),
                    height: R.w(11),
                    borderRadius: R.w(5.5),
                  backgroundColor: 'rgba(34, 197, 94, 0.2)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(34, 197, 94, 0.3)',
                }}
              >
                  <Feather name="info" size={R.font(20)} color="#22C55E" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                      fontSize: R.font(16),
                    fontFamily: 'SNPro-Heavy',
                    color: '#FFFFFF',
                      marginBottom: R.h(0.5),
                  }}
                >
                  Closer to God in just 3-mins a day
                </Text>
                <Text
                  style={{
                      fontSize: R.font(14),
                    color: 'rgba(255, 255, 255, 0.9)',
                      lineHeight: R.font(20),
                  }}
                >
                  Now we'll build your foundation for a powerful personal prayer habit.
                </Text>
              </View>
            </LinearGradient>
          </BlurView>
        </Animated.View>
        </View>

        {/* Note */}
        
        {/* Continue Button */}
        <View 
          style={[styles.continueButtonContainer, { marginBottom: R.insets.bottom > 0 ? R.insets.bottom : R.h(2.5) }]}
        >
          <Button
            onPress={handleFinishOnboarding}
            variant="primary"
            fullWidth
          >
            Next Step
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

// Remove fixed offsets since we'll position relative to the note box


export default SummaryScreenCore; 