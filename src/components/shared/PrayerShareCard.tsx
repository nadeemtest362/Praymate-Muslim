import React from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
import { PLAN_MORNING_ICON, PLAN_EVENING_ICON } from '../../utils/warmPlanIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createHighlightedPrayerText } from '../../utils/prayerUtils';
import { Avatar } from '../../shared/ui';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.95; // Base width; height is derived from aspectRatio 9:16

interface PrayerPerson {
  id: string;
  name: string;
  image_uri?: string | null;
}

interface PrayerShareCardProps {
  prayer: string;
  verse?: string;
  timeOfDay: 'morning' | 'evening';
  userName?: string;
  date?: Date;
  people?: PrayerPerson[];
}

export default function PrayerShareCard({ 
  prayer, 
  verse, 
  timeOfDay,
  userName,
  date = new Date(),
  people = []
}: PrayerShareCardProps) {
  const gradientColors: readonly [string, string, string] = timeOfDay === 'morning' 
    ? ['#d71c6d', '#ff7144', '#ffa026']  // Warm sunrise colors
    : ['#2D1854', '#431E6E', '#542687']; // Deep evening colors
  const overlayFadeColors: readonly [string, string] = timeOfDay === 'morning'
    ? ['rgba(253, 183, 119, 0)', 'rgba(201, 97, 222, 0.85)']
    : ['rgba(45, 24, 84, 0)', 'rgba(45, 24, 84, 0.85)'];

  // Apply 4am boundary logic - before 4am counts as previous day
  const getPrayerDate = (date: Date) => {
    const prayerDate = new Date(date);
    const currentHour = prayerDate.getHours();
    
    if (currentHour < 4) {
      // Before 4am - still counts as yesterday
      prayerDate.setDate(prayerDate.getDate() - 1);
    }
    
    return prayerDate;
  };

  const formatDate = (date: Date) => {
    const prayerDate = getPrayerDate(date);
    return prayerDate.toLocaleDateString('en-US', { 
      weekday: 'short',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Dynamic font sizing with minimum size
  const getFontSize = () => {
    const length = prayer.length;
    if (length > 1400) return 14; // Minimum readable size
    if (length > 1200) return 15;
    if (length > 1000) return 16;
    if (length > 800) return 17;
    if (length > 600) return 18;
    return 20;
  };

  const getLineHeight = () => {
    const fontSize = getFontSize();
    return fontSize * 1.5; // Standard line height ratio
  };

  const fontSize = getFontSize();
  const lineHeight = getLineHeight();
  const [displayText, setDisplayText] = React.useState(prayer);
  const [isTruncated, setIsTruncated] = React.useState(false);
  const [paragraphCount, setParagraphCount] = React.useState(999);

  React.useEffect(() => {
    setDisplayText(prayer);
    setIsTruncated(false);
    setParagraphCount(999);
  }, [prayer]);

  return (
    <View style={styles.cardContainer}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Background pattern overlay */}
        <View style={styles.patternOverlay} />
        
        {/* Header */}
        <View style={styles.header}>
          <Image 
            source={timeOfDay === 'morning' ? PLAN_MORNING_ICON : PLAN_EVENING_ICON}
            style={styles.timeIcon}
            resizeMode="contain"
          />
          <View style={styles.topRightContainer}>
            <View style={styles.topBrandingContainer}>
              <Text style={styles.topBrandingText}>pray</Text>
              <Text style={styles.topBrandingAccent}>mate</Text>
              <Text style={styles.topBrandingEmoji}>🙏</Text>
            </View>
            <Text style={styles.dateText}>{formatDate(date)}</Text>
          </View>
        </View>

        {/* People Avatars */}
        {people.length > 0 && (
          <View style={styles.avatarsContainer}>
            <View style={styles.avatarsRow}>
              {people.slice(0, 4).map((person, index) => (
                <View 
                  key={person.id} 
                  style={[styles.avatarWrapper, { marginLeft: index > 0 ? -8 : 0, zIndex: people.length - index }]}
                >
                  <Avatar
                    uri={person.image_uri}
                    name={person.name}
                    size={32}
                    borderWidth={2}
                    borderColor="rgba(255, 255, 255, 0.3)"
                  />
                </View>
              ))}
              {people.length > 4 && (
                <View style={[styles.avatarWrapper, styles.moreAvatarWrapper, { marginLeft: -8 }]}>
                  <View style={styles.moreAvatar}>
                    <Text style={styles.moreAvatarText}>+{people.length - 4}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Prayer Content */}
        <View style={styles.prayerContainer}>
          <View 
            style={{ flex: 1 }}
            onLayout={(e) => {
              const height = e.nativeEvent.layout.height;
              const paragraphs = displayText.split('\n\n');
              const bannerHeight = 50;
              const availableHeight = height - bannerHeight;
              
              let usedHeight = 0;
              let count = 0;
              
              for (let i = 0; i < paragraphs.length; i++) {
                const estimatedLines = Math.ceil(paragraphs[i].length / 120);
                const paraHeight = estimatedLines * lineHeight + (i < paragraphs.length - 1 ? 16 : 0);
                
                if (usedHeight + paraHeight > availableHeight) {
                  setIsTruncated(true);
                  setParagraphCount(count);
                  break;
                } else {
                  usedHeight += paraHeight;
                  count++;
                }
              }
            }}
          >
            {displayText.split('\n\n').slice(0, paragraphCount).map((paragraph, index, arr) => (
              <Text
                key={index}
                style={[
                  styles.prayerText, 
                  { fontSize, lineHeight },
                  index < arr.length - 1 && styles.paragraphSpacing
                ]}
              >
                {people.length > 0 ? createHighlightedPrayerText(
                  paragraph, 
                  people,
                  { 
                    color: '#FFD700', 
                    fontWeight: '700',
                    textShadowColor: 'rgba(255, 215, 0, 0.4)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 4,
                  }
                ) : paragraph}
              </Text>
            ))}
          </View>
        </View>

        {/* Verse Section */}
        {verse && (
          <View style={styles.verseContainer}>
            <MaterialCommunityIcons 
              name="bookmark" 
              size={14} 
              color="rgba(255, 255, 255, 0.8)" 
            />
            <Text style={styles.verseText} numberOfLines={2}>
              {verse}
            </Text>
          </View>
        )}



        {/* Decorative elements */}
        <View style={[styles.decorativeCircle, styles.topLeftCircle]} />
        <View style={[styles.decorativeCircle, styles.bottomRightCircle]} />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: CARD_WIDTH,
    // Enforce exact portrait 9:16
    aspectRatio: 9/16,
  
    overflow: 'hidden',
    backgroundColor: '#FFF',
    // Shadow for preview
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  gradient: {
    flex: 1,
    padding: 24,
  },
  patternOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    // You could add a pattern image here
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  timeIcon: {
    width: 32,
    height: 32,
  },
  topRightContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  topBrandingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  topBrandingEmoji: {
    fontSize: 16,
  },
  topBrandingText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'SNPro-Heavy',
  },
  topBrandingAccent: {
    color: '#FFD700',
    fontSize: 20,
    fontFamily: 'SNPro-Heavy',
  },
  dateText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontFamily: 'SNPro-Regular',
  },
  avatarsContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  moreAvatarWrapper: {
    zIndex: 0,
  },
  moreAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreAvatarText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  prayerContainer: {
    flex: 1,
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 8,
  },
  prayerContainerTruncated: {
    paddingBottom: 0,
  },
  prayerTextWrapper: {
    flexShrink: 1,
    position: 'relative',
  },
  prayerText: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 32,
    fontWeight: '500',
    textAlign: 'left',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  paragraphSpacing: {
    marginBottom: 16,
  },
  verseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
    gap: 6,
  },
  verseText: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 12,
    fontStyle: 'italic',
    flex: 1,
    lineHeight: 18,
  },

  decorativeCircle: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  topLeftCircle: {
    top: -50,
    left: -50,
  },
  bottomRightCircle: {
    bottom: -50,
    right: -50,
  },
  truncatedBanner: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    marginTop: 24,
    alignItems: 'center',
  },
  truncatedBannerText: {
    color: 'rgba(255, 255, 255, 0.92)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
}); 