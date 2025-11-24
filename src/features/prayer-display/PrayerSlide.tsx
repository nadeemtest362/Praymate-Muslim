import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { PLAN_MORNING_ICON, PLAN_EVENING_ICON } from '../../utils/warmPlanIcons';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar } from '../../shared/ui';
import { Logo } from './Logo';
import { CelebrationIcon } from './CelebrationIcon';
import { createHighlightedPrayerText } from '../../utils/prayerUtils';
import { copyToClipboardSecurely } from '../../utils/secureClipboard';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type SlideType = 'intro' | 'prayer' | 'verse' | 'final';

export interface PrayerPerson {
  id: string;
  name: string;
  image_uri?: string | null;
  relationship?: string;
  gender?: string;
}

export interface PrayerSlideData {
  id: string;
  type: SlideType;
  title?: string;
  content: string;
  isLastPrayerSlide?: boolean;
}

interface PrayerSlideProps {
  slide: PrayerSlideData;
  timeOfDay: string;
  prayerPeople: PrayerPerson[];
  verse?: string;
  prayer: string;
  fontSize: 'small' | 'medium' | 'large';
  renderAmenButton?: () => React.ReactNode;
  onSharePress: () => void;
  onShareTikTokPress: () => void;
  onDonePress: () => void;
  isLoadingPeople?: boolean;
}

export const PrayerSlide: React.FC<PrayerSlideProps> = ({
  slide,
  timeOfDay,
  prayerPeople,
  verse,
  prayer,
  fontSize,
  renderAmenButton,
  onSharePress,
  onShareTikTokPress,
  onDonePress,
  isLoadingPeople = false,
}) => {
  const renderAvatarsSection = () => {
    // Show loading skeleton if people are still loading
    if (isLoadingPeople) {
      return (
        <Animated.View 
          entering={FadeInUp.duration(600).delay(400)}
          style={styles.introAvatarsContainer}
        >
          <View style={styles.avatarRow}>
            {[1, 2, 3].map((i) => (
              <View 
                key={`skeleton-${i}`}
                style={[
                  styles.avatarSkeleton, 
                  { marginLeft: i > 1 ? -8 : 0, zIndex: 4 - i }
                ]}
              />
            ))}
          </View>
          <View style={styles.skeletonTextContainer}>
            <View style={styles.skeletonText} />
          </View>
        </Animated.View>
      );
    }

    // Show actual avatars if we have people
    if (prayerPeople.length > 0) {
      return (
        <Animated.View 
          entering={FadeInUp.duration(600).delay(400)}
          style={styles.introAvatarsContainer}
        >
          <View style={styles.avatarRow}>
            {prayerPeople.slice(0, 4).map((person, index) => (
              <Animated.View 
                key={person.id} 
                entering={FadeIn.duration(400).delay(600 + index * 100)}
                style={[
                  styles.introAvatarWrapper, 
                  { marginLeft: index > 0 ? -8 : 0, zIndex: prayerPeople.length - index }
                ]}
              >
                <Avatar
                  image_uri={person.image_uri}
                  name={person.name}
                  size={40}
                />
              </Animated.View>
            ))}
            {prayerPeople.length > 4 && (
              <Animated.View 
                entering={FadeIn.duration(400).delay(1000)}
                style={[styles.introMoreIndicator, { marginLeft: -8, zIndex: 0 }]}
              >
                <Text style={styles.introMoreText}>+{prayerPeople.length - 4}</Text>
              </Animated.View>
            )}
          </View>
          <Animated.View entering={FadeIn.duration(500).delay(800)}>
            <Text style={styles.prayingForLabel}>
              {prayerPeople.length === 1 
                ? `with ${prayerPeople[0].name}` 
                : `with ${prayerPeople.length} others`
              }
            </Text>
          </Animated.View>
        </Animated.View>
      );
    }

    // Return null if no people and not loading
    return null;
  };

  return (
    <View
      style={[
        styles.slideContainer, 
        { width: SCREEN_WIDTH },
        slide.type === 'final' && styles.finalSlideContainer
      ]}
    >
      <View style={[
        styles.slideContent, 
        slide.type === 'prayer' && styles.prayerSlideContent,
        slide.type === 'intro' && styles.introSlideContent
      ]}>
        {slide.type === 'intro' && (
          <>
            <Animated.View entering={FadeIn.duration(800)} style={styles.emojiContainer}>
              <Image 
                source={timeOfDay === 'morning' ? PLAN_MORNING_ICON : PLAN_EVENING_ICON}
                style={styles.timeEmoji}
                resizeMode="contain"
              />
            </Animated.View>
            
            <Animated.View entering={FadeInUp.duration(600).delay(200)}>
              <Text style={styles.introTitle}>{slide.title}</Text>
            </Animated.View>
            
            <Animated.View entering={FadeInUp.duration(600).delay(300)}>
              <Text style={styles.introSubtitle}>{slide.content}</Text>
            </Animated.View>
            
            {renderAvatarsSection()}
            
            <Animated.View entering={FadeIn.duration(600).delay(700)}>
              <Logo />
            </Animated.View>
          </>
        )}
        
        {slide.type === 'prayer' && (
          <>
            <Text style={[
              styles.prayerText,
              fontSize === 'small' && styles.prayerTextSmall,
              fontSize === 'large' && styles.prayerTextLarge,
            ]}>
              {createHighlightedPrayerText(
                slide.content, 
                prayerPeople,
                { 
                  color: '#FFD700', 
                  fontWeight: '700',
                  textShadowColor: 'rgba(255, 215, 0, 0.4)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 4,
                }
              )}
            </Text>
            {slide.isLastPrayerSlide && renderAmenButton?.()}
          </>
        )}
        
        {slide.type === 'verse' && (
          <>
            <MaterialCommunityIcons name="book-open-page-variant" size={48} color="rgba(255,255,255,0.8)" style={{ marginBottom: 16 }} />
            <Text style={styles.verseText}>"{slide.content}"</Text>
            {slide.isLastPrayerSlide && renderAmenButton?.()}
          </>
        )}
        
        {slide.type === 'final' && (
          <>
            <Animated.View 
              entering={FadeIn.duration(600)}
              style={styles.celebrationContainer}
            >
              <CelebrationIcon />
            </Animated.View>
            
            <Animated.View entering={FadeInUp.duration(600).delay(200)}>
              <Text style={styles.completedTitle}>Prayer Complete</Text>
              <Text style={styles.completedTime}>
                {new Date().toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true 
                })} • {timeOfDay === 'morning' ? 'Morning' : 'Evening'} Prayer
              </Text>
            </Animated.View>
            
            {prayerPeople.length > 0 && (
              <Animated.View 
                entering={FadeInUp.duration(600).delay(400)}
                style={styles.prayedForSection}
              >
                <Text style={styles.prayedForTitle}>You prayed for</Text>
                <View style={styles.prayedForAvatars}>
                  {prayerPeople.map((person, index) => (
                    <View key={person.id} style={styles.prayedForItem}>
                      <Avatar
                        image_uri={person.image_uri}
                        name={person.name}
                        size={48}
                      />
                      <Text style={styles.prayedForName} numberOfLines={1}>
                        {person.name.split(' ')[0]}
                      </Text>
                    </View>
                  ))}
                  {prayerPeople.length > 5 && (
                    <View style={styles.prayedForItem}>
                      <View style={styles.moreCircle}>
                        <Text style={styles.moreNumber}>+{prayerPeople.length - 5}</Text>
                      </View>
                      <Text style={styles.prayedForName}>more</Text>
                    </View>
                  )}
                </View>
              </Animated.View>
            )}
            
            {verse && (
              <Animated.View 
                entering={FadeInUp.duration(600).delay(600)}
                style={styles.verseHighlight}
              >
                <MaterialCommunityIcons name="bookmark" size={20} color="#FFD700" style={{ marginBottom: 4 }} />
                <Text style={styles.verseHighlightText} numberOfLines={2}>
                  {verse}
                </Text>
              </Animated.View>
            )}
            
            <Animated.View 
              entering={FadeInUp.duration(600).delay(700)}
              style={styles.prominentShareContainer}
            >
              <Text style={styles.prominentShareSubtitle}>Inspire others with your moment of faith</Text>
              
              <TouchableOpacity
                style={styles.mainShareButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onShareTikTokPress();
                }}
              >
                <LinearGradient
                  colors={['#FF0050', '#00F2EA']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.mainShareGradient}
                >
                  <Ionicons name="logo-tiktok" size={24} color="#FFFFFF" />
                  <Text style={styles.mainShareText}>Share this prayer on TikTok</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <View style={styles.secondaryShareOptions}>
                <TouchableOpacity 
                  style={styles.secondaryShareButton}
                  onPress={onSharePress}
                >
                  <Ionicons name="share-outline" size={20} color="rgba(255, 255, 255, 0.8)" />
                  <Text style={styles.secondaryShareText}>Share Text</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.secondaryShareButton}
                  onPress={async () => {
                    await copyToClipboardSecurely(prayer + (verse ? `\n\n${verse}` : ''));
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // Success feedback
                  }}
                >
                  <Ionicons name="copy-outline" size={20} color="rgba(255, 255, 255, 0.8)" />
                  <Text style={styles.secondaryShareText}>Copy</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
            
            <Animated.View 
              entering={FadeInUp.duration(600).delay(900)}
              style={styles.doneButtonContainer}
            >
              <TouchableOpacity 
                style={styles.doneButton}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={onDonePress}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </Animated.View>
            
            <Animated.View 
              entering={FadeInUp.duration(600).delay(1000)}
              style={styles.reflectionPrompt}
            >
              <Text style={styles.reflectionText}>
                Take a moment to carry this peace with you
              </Text>
            </Animated.View>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  slideContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  finalSlideContainer: {
    justifyContent: 'flex-start',
    paddingTop: 80,
  },
  slideContent: {
    alignItems: 'center',
  },
  prayerSlideContent: {
    justifyContent: 'center',
  },
  introSlideContent: {
    justifyContent: 'center',
  },
  emojiContainer: {
    marginBottom: 20,
  },
  timeEmoji: {
    width: 80,
    height: 80,
  },
  introTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  introSubtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 24,
  },
  introAvatarsContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  introAvatarWrapper: {
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 22,
    padding: 1,
  },
  introMoreIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  introMoreText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  prayingForLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  avatarSkeleton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  skeletonTextContainer: {
    marginTop: 12,
  },
  skeletonText: {
    width: 120,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  prayerText: {
    fontSize: 20,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 32,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  prayerTextSmall: {
    fontSize: 18,
    lineHeight: 28,
  },
  prayerTextLarge: {
    fontSize: 22,
    lineHeight: 36,
  },
  verseText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    lineHeight: 28,
    fontStyle: 'italic',
    paddingHorizontal: 20,
  },
  celebrationContainer: {
    marginBottom: 20,
  },
  completedTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  completedTime: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 32,
  },
  prayedForSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  prayedForTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
  },
  prayedForAvatars: {
    flexDirection: 'row',
    gap: 16,
  },
  prayedForItem: {
    alignItems: 'center',
  },
  prayedForName: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
    fontWeight: '500',
  },
  moreCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreNumber: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  verseHighlight: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  verseHighlightText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  prominentShareContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  prominentShareSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 16,
    textAlign: 'center',
  },
  mainShareButton: {
    marginBottom: 16,
  },
  mainShareGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 28,
    gap: 8,
  },
  mainShareText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryShareOptions: {
    flexDirection: 'row',
    gap: 16,
  },
  secondaryShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  secondaryShareText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  doneButtonContainer: {
    marginBottom: 20,
  },
  doneButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 12,
    paddingHorizontal: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  reflectionPrompt: {
    marginTop: 8,
  },
  reflectionText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontStyle: 'italic',
  },
}); 