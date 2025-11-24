import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Image, Animated, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import useResponsive from '../../hooks/useResponsive';
import { useAuth } from '../../hooks/useAuth';
import { usePrayers } from '../../features/prayer-display/hooks/usePrayers';
import { useIntentions as useIntentionsQuery } from '../../features/prayer-display/hooks/useIntentions';
import { usePeople } from '../../features/people/hooks/usePeople';
import { extractPeopleFromSnapshot } from '../../utils/prayerUtils';
import { Avatar } from '../../shared/ui/core';
import { APP_MOOD_OPTIONS } from '../../constants/moodConstants';
import { PRAYER_TOPICS } from '../../constants/prayerConstants';
import { getPrayerDayStart, getCanonicalTimezone } from '../../lib/time/Clock';
import { trackEvent, mergeAnalyticsProperties } from '../../lib/analytics';

interface TopPerson {
  name: string;
  count: number;
  image_uri?: string | null;
  relationship?: string | null;
}

interface TopCategoryMetric {
  id: string;
  label: string;
  emoji: string;
  count: number;
}

interface TimePatternResult {
  morning: number;
  evening: number;
  total: number;
  morningPct: number;
  eveningPct: number;
}

interface ActivityWindow {
  dayData: { date: string; count: number }[];
  completed: number;
  totalPossible: number;
  percentage: number;
  daysActive: number;
  startLabel?: string;
  endLabel?: string;
}

interface MoodDistributionItem {
  mood: string;
  count: number;
  percentage: number;
  widthPct: number;
}

type MoodLookup = {
  id: string;
  label: string;
  emoji?: string | null;
};

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
};

type PrayerTopicLookup = {
  id: string;
  label: string;
  emoji?: string | null;
};

interface IntentionsHeroMetrics {
  topPeople: TopPerson[];
  topCategories: TopCategoryMetric[];
  maxCategoryCount: number;
  timePattern: TimePatternResult;
  activity14: ActivityWindow;
  moodDistribution: MoodDistributionItem[] | null;
}

const MOOD_EMOJI_BY_KEY: Record<string, string> = {};
const MOOD_LABEL_BY_KEY: Record<string, string> = {};

const moodOptions = APP_MOOD_OPTIONS as readonly MoodLookup[];

moodOptions.forEach((mood) => {
  const emoji = mood.emoji || '🙏';
  const label = mood.label || mood.id;
  MOOD_EMOJI_BY_KEY[mood.id.toLowerCase()] = emoji;
  MOOD_EMOJI_BY_KEY[label.toLowerCase()] = emoji;
  MOOD_LABEL_BY_KEY[mood.id.toLowerCase()] = label;
  MOOD_LABEL_BY_KEY[label.toLowerCase()] = label;
});

const PRAYER_TOPIC_META: Record<string, { label: string; emoji: string }> = {};

const prayerTopics = Object.values(PRAYER_TOPICS) as readonly PrayerTopicLookup[];

prayerTopics.forEach((topic) => {
  const label = topic.label || topic.id;
  const emoji = topic.emoji || '🙏';
  PRAYER_TOPIC_META[topic.id.toLowerCase()] = { label, emoji };
  PRAYER_TOPIC_META[label.toLowerCase()] = { label, emoji };
});

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

const formatDisplayLabel = (value: string) =>
  value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const useIntentionsHeroMetrics = (
  rawPrayers: any[] | undefined,
  rawIntentions: any[] | undefined,
  rawPeople: any[] | undefined,
  timezone?: string | null,
): IntentionsHeroMetrics => {
  return useMemo(() => {
    const tz = timezone || getCanonicalTimezone();

    const pad = (value: number) => value.toString().padStart(2, '0');

    const getDateParts = (source: Date | string | number): DateParts | null => {
      const date = source instanceof Date ? source : new Date(source);
      if (Number.isNaN(date.getTime())) {
        return null;
      }

      try {
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: tz,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });

        const formattedParts = formatter.formatToParts(date);
        const parse = (type: Intl.DateTimeFormatPartTypes) =>
          parseInt(formattedParts.find((part) => part.type === type)?.value || '0', 10);

        const dateParts: DateParts = {
          year: parse('year'),
          month: parse('month'),
          day: parse('day'),
          hour: parse('hour'),
          minute: parse('minute'),
          second: parse('second'),
        };
        return dateParts;
      } catch (error) {
        console.error('[IntentionsHero] Failed to parse date parts', error);
        return null;
      }
    };

    const formatDateKey = (parts: DateParts) =>
      `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;

    const subtractOneDay = (parts: DateParts): DateParts => {
      const base = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0));
      base.setUTCDate(base.getUTCDate() - 1);
      return {
        year: base.getUTCFullYear(),
        month: base.getUTCMonth() + 1,
        day: base.getUTCDate(),
      };
    };

    const resolvePrayerDayKey = (timestamp: string | number | Date | null | undefined) => {
      if (!timestamp) {
        return null;
      }

      const parts = getDateParts(timestamp);
      if (!parts) {
        return null;
      }

      const hour = parts.hour ?? 0;
      if (hour < 4) {
        const previous = subtractOneDay(parts);
        return formatDateKey(previous);
      }

      return formatDateKey(parts);
    };

    const prayers = Array.isArray(rawPrayers) ? rawPrayers : [];
    const intentions = Array.isArray(rawIntentions) ? rawIntentions : [];
    const people = Array.isArray(rawPeople) ? rawPeople : [];

    const peopleByName = new Map<string, any>();
    people.forEach((person: any) => {
      const key = typeof person?.name === 'string' ? person.name.toLowerCase() : '';
      if (key) {
        peopleByName.set(key, person);
      }
    });

    const topPeopleCounts = new Map<string, number>();
    const categoryCounts = new Map<string, number>();
    const dateCounts = new Map<string, number>();
    const moodCounts = new Map<string, number>();

    let morning = 0;
    let evening = 0;
    let moodSamples = 0;

    prayers.forEach((prayer: any, index: number) => {
      const snapshot = prayer?.input_snapshot || null;
      const extractedPeople = extractPeopleFromSnapshot(snapshot);
      extractedPeople.forEach((person: any) => {
        const key = typeof person?.name === 'string' ? person.name.toLowerCase() : '';
        if (!key) {
          return;
        }
        topPeopleCounts.set(key, (topPeopleCounts.get(key) || 0) + 1);
      });

      const intentionSnapshot = (snapshot?.intentions || snapshot?.activeIntentions || snapshot?.fetchedIntentionsForPrompt || []) as any[];
      if (Array.isArray(intentionSnapshot)) {
        intentionSnapshot.forEach((intention: any) => {
          const rawCategory = typeof intention?.category === 'string' && intention.category.trim() !== ''
            ? intention.category.trim()
            : 'Other';
          const normalizedCategory = rawCategory.toLowerCase();
          categoryCounts.set(normalizedCategory, (categoryCounts.get(normalizedCategory) || 0) + 1);
        });
      }

      const slot = typeof prayer?.slot === 'string' ? prayer.slot.toLowerCase() : '';
      if (slot.indexOf('am') !== -1 || slot.indexOf('morning') !== -1) {
        morning += 1;
      } else if (slot.indexOf('pm') !== -1 || slot.indexOf('evening') !== -1) {
        evening += 1;
      }

      const timestamp = prayer?.completed_at || prayer?.generated_at;
      const dateKey = resolvePrayerDayKey(timestamp);
      if (dateKey) {
        dateCounts.set(dateKey, (dateCounts.get(dateKey) || 0) + 1);
      }

      if (index < 15) {
        const mood = snapshot?.mood || snapshot?.dbProfileMoodAtGeneration || snapshot?.clientSnapshot?.mood || null;
        if (typeof mood === 'string' && mood.trim() !== '') {
          const normalizedMood = mood.trim().toLowerCase();
          moodCounts.set(normalizedMood, (moodCounts.get(normalizedMood) || 0) + 1);
          moodSamples += 1;
        }
      }
    });

    if (categoryCounts.size === 0) {
      intentions.forEach((intention: any) => {
        if (!intention?.is_active) {
          return;
        }
        const rawCategory = typeof intention?.category === 'string' && intention.category.trim() !== ''
          ? intention.category.trim()
          : 'Other';
        const normalizedCategory = rawCategory.toLowerCase();
        categoryCounts.set(normalizedCategory, (categoryCounts.get(normalizedCategory) || 0) + 1);
      });
    }

    const topPeople = Array.from(topPeopleCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([nameKey, count]) => {
        const full = peopleByName.get(nameKey);
        return {
          name: typeof full?.name === 'string' && full.name ? full.name : nameKey,
          count,
          image_uri: full?.image_uri || null,
          relationship: full?.relationship || null,
        } as TopPerson;
      });

    const topCategories = Array.from(categoryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([categoryKey, count]) => {
        const meta = PRAYER_TOPIC_META[categoryKey];
        const label = meta?.label ?? formatDisplayLabel(categoryKey);
        const emoji = meta?.emoji ?? '🙏';
        return {
          id: categoryKey,
          label,
          emoji,
          count,
        } as TopCategoryMetric;
      });

    const maxCategoryCount = topCategories.reduce((max, cat) => (cat.count > max ? cat.count : max), 0);

    const total = morning + evening;
    const timePattern: TimePatternResult = {
      morning,
      evening,
      total,
      morningPct: total > 0 ? Math.round((morning / total) * 100) : 0,
      eveningPct: total > 0 ? Math.round((evening / total) * 100) : 0,
    };

    const days = 14;
    const dayParts: DateParts[] = [];
    let cursorParts = getDateParts(getPrayerDayStart(tz)) || getDateParts(new Date()) || {
      year: 1970,
      month: 1,
      day: 1,
      hour: 4,
      minute: 0,
      second: 0,
    };

    for (let i = 0; i < days; i += 1) {
      dayParts.push(cursorParts);
      cursorParts = subtractOneDay(cursorParts);
    }
    dayParts.reverse();

    const dayData: { date: string; count: number }[] = dayParts.map((parts) => {
      const key = formatDateKey(parts);
      return {
        date: key,
        count: dateCounts.get(key) || 0,
      };
    });
    const completed = dayData.reduce((sum, entry) => sum + entry.count, 0);
    const daysActive = dayData.reduce((sum, entry) => (entry.count > 0 ? sum + 1 : sum), 0);
    const activity14: ActivityWindow = {
      dayData,
      completed,
      totalPossible: 28,
      percentage: Math.round((completed / 28) * 100),
      daysActive,
      startLabel: dayData.length > 0 ? dayData[0].date.slice(5).replace('-', '/') : undefined,
      endLabel: dayData.length > 0 ? dayData[dayData.length - 1].date.slice(5).replace('-', '/') : undefined,
    };

    let moodDistribution: MoodDistributionItem[] | null = null;
    if (moodCounts.size > 0 && moodSamples > 0) {
      const sortedMoods = Array.from(moodCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);
      const maxMoodCount = sortedMoods.reduce((max, [, count]) => (count > max ? count : max), 0) || 1;
      moodDistribution = sortedMoods.map(([mood, count]) => ({
        mood,
        count,
        percentage: Math.round((count / moodSamples) * 100),
        widthPct: Math.max(20, Math.round((count / maxMoodCount) * 100)),
      }));
    }

    return {
      topPeople,
      topCategories,
      maxCategoryCount,
      timePattern,
      activity14,
      moodDistribution,
    };
  }, [rawIntentions, rawPeople, rawPrayers, timezone]);
};

const IntentionsHeroComponent: React.FC = () => {
  const R = useResponsive();
  const horizontalInset = R.w(3);
  const cardWidth = useMemo(() => Dimensions.get('window').width, []);
  const styles = useMemo(() => createStyles(R, cardWidth, horizontalInset), [R, cardWidth, horizontalInset]);
  const { user, profile } = useAuth();
  const scrollX = useRef(new Animated.Value(0)).current;

  // Recent prayers (first page is enough for lightweight insights)
  const prayersQuery = usePrayers(user?.id || null, 'all');
  const firstPagePrayers = (prayersQuery.data?.pages?.[0]?.prayers || []) as any[];

  // All intentions for category mix
  const intentionsQuery = useIntentionsQuery(user?.id || null);
  const allIntentions = intentionsQuery.data || [];

  const { data: allPeople } = usePeople(user?.id || null, { activeOnly: false });

  const metrics = useIntentionsHeroMetrics(firstPagePrayers, allIntentions, allPeople, profile?.timezone);

  useEffect(() => {
    if (!metrics) {
      return;
    }

    const base = mergeAnalyticsProperties(
      {
        has_recent_prayers: firstPagePrayers.length > 0,
        total_intentions: Array.isArray(allIntentions) ? allIntentions.length : 0,
        total_people: Array.isArray(allPeople) ? allPeople.length : 0,
      },
      {
        top_people_count: metrics.topPeople.length,
        top_category_count: metrics.topCategories.length,
        days_active: metrics.activity14.daysActive,
        morning_pct: metrics.timePattern.morningPct,
        evening_pct: metrics.timePattern.eveningPct,
        has_mood_distribution: metrics.moodDistribution ? true : false,
      }
    );

    trackEvent('intentions_hero_shown', base);
  }, [metrics, firstPagePrayers.length, allIntentions, allPeople]);

  const cards = useMemo(() => {
    const next: { key: string; content: React.ReactNode }[] = [];

    if (metrics.activity14.dayData.some((entry) => entry.count > 0)) {
      next.push({
        key: 'activity',
        content: <ActivityCard styles={styles} R={R} activity={metrics.activity14} />,
      });
    }

    if (metrics.topPeople.length > 0) {
      next.push({
        key: 'people',
        content: <TopPeopleCard styles={styles} R={R} people={metrics.topPeople} />,
      });
    }

    next.push({
      key: 'overview',
      content: (
        <MoodCard styles={styles} R={R} distribution={metrics.moodDistribution} />
      ),
    });

    if (metrics.topCategories.length >= 2) {
      next.push({
        key: 'categories',
        content: (
          <TopCategoriesCard
            styles={styles}
            R={R}
            categories={metrics.topCategories}
            maxCount={metrics.maxCategoryCount}
          />
        ),
      });
    }

    if (metrics.timePattern.total > 0) {
      next.push({
        key: 'rhythm',
        content: <PrayerRhythmCard styles={styles} R={R} pattern={metrics.timePattern} />,
      });
    }

    return next;
  }, [metrics, R, styles]);

  const handleScroll = useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        { useNativeDriver: true },
      ),
    [scrollX],
  );

  if (cards.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <AnimatedScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        snapToAlignment="center"
        scrollEnabled={cards.length > 1}
      >
        {cards.map((item) => (
          <View key={item.key} style={styles.cardContainer}>
            {item.content}
          </View>
        ))}
      </AnimatedScrollView>
      {cards.length > 1 && (
        <View style={styles.paginationContainer}>
          {cards.map((_, index) => {
            const inputRange = [
              cardWidth * (index - 1),
              cardWidth * index,
              cardWidth * (index + 1),
            ];

            const dotScale = scrollX.interpolate({
              inputRange,
              outputRange: [1, 1.55, 1],
              extrapolate: 'clamp',
            });

            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.35, 1, 0.35],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.paginationDot,
                  {
                    opacity: dotOpacity,
                    transform: [{ scale: dotScale }],
                  },
                ]}
              />
            );
          })}
        </View>
      )}
    </View>
  );
};

export const IntentionsHero = React.memo(IntentionsHeroComponent);
IntentionsHero.displayName = 'IntentionsHero';

const createStyles = (R: ReturnType<typeof useResponsive>, cardWidth: number, horizontalInset: number) => {
  const rowGap = R.w(1.25);
  const emojiWidth = R.w(6);
  const labelWidth = R.w(18);
  const countWidth = R.w(6);

  return StyleSheet.create({
  container: {
    marginBottom: R.h(2),
    marginHorizontal: -horizontalInset,
  },
  cardContainer: {
    width: cardWidth,
    paddingHorizontal: horizontalInset,
  },
  card: {
    width: '100%',
    height: R.h(18),
    paddingVertical: R.h(1.5),
    paddingHorizontal: R.w(4),
    borderRadius: R.w(4),
    backgroundColor: 'rgba(108, 99, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(139, 128, 249, 0.2)',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: R.h(0.3) },
    shadowRadius: R.w(1.6),
    elevation: 4,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: R.h(1.5),
    gap: R.w(1.5),
    paddingHorizontal: horizontalInset,
  },
  paginationDot: {
    width: R.w(1.1),
    height: R.w(1.1),
    borderRadius: R.w(0.55),
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: R.h(1),
  },
  cardTitle: {
    fontSize: R.font(18),
    fontFamily: 'SNPro-Heavy',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  // Mood distribution
  overviewCard: {},
  moodList: {
    gap: R.h(0.75),
    paddingTop: R.h(0.5),

  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rowGap,
  },
  moodEmoji: {
    fontSize: R.font(18),
    width: emojiWidth,
    textAlign: 'center',
  },
  moodLabel: {
    width: labelWidth,
    fontSize: R.font(14),
    fontFamily: 'SNPro-Heavy',
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'capitalize',
  },
  moodBarBg: {
    flex: 1,
    height: R.h(1.2),
    borderRadius: R.w(2),
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
    
  },
  moodBarFill: {
    height: '100%',
    backgroundColor: 'rgba(139, 128, 249, 0.9)',
  },
  moodCount: {
    fontSize: R.font(14),
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'SNPro-Heavy',
    width: countWidth,
    textAlign: 'right',
  },
  moodEmpty: {
    alignItems: 'center',
    paddingVertical: R.h(5),
  },
  moodEmptyEmoji: {
    fontSize: R.font(48),
    marginBottom: R.h(1),
  },
  moodEmptyText: {
    fontSize: R.font(13),
    fontFamily: 'SNPro-Medium',
    color: 'rgba(255,255,255,0.6)',
  },
  // People card styles
  peopleCard: {},
  peopleRow: {
    flexDirection: 'row',
    gap: R.w(3),
  },
  personPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: R.h(0.5),
  },
  avatarWrapper: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: R.w(6),
    padding: R.w(0.5),
    marginBottom: R.h(0.5),
  },
  avatarCircle: {
    width: R.w(10),
    height: R.w(10),
    borderRadius: R.w(5),
    marginBottom: R.h(0.5),
  },
  personName: {
    fontSize: R.font(16),
    fontFamily: 'SNPro-Semibold',
    color: 'rgba(255,255,255,0.95)',
    marginBottom: R.h(0.25),
    marginTop: R.h(0.5),
  },
  personCount: {
    fontSize: R.font(13),
    fontFamily: 'SNPro-Medium',
    color: 'rgba(255,255,255,0.7)',
  },
  // Category card styles
  categoryCard: {},
  categoryList: {
    gap: R.h(0.75),
    paddingTop: R.h(0.5),
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rowGap,
  },
  categoryEmoji: {
    fontSize: R.font(18),
    width: emojiWidth,
    textAlign: 'center',
  },
  categoryLabel: {
    width: labelWidth,
    fontSize: R.font(14),
    fontFamily: 'SNPro-Heavy',
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'capitalize',
  },
  categoryBarBg: {
    flex: 1,
    height: R.h(1.2),
    borderRadius: R.w(2),
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  
  },
  categoryBarFill: {
    height: '100%',
    backgroundColor: 'rgba(139, 128, 249, 0.9)',
  },
  categoryCount: {
    width: countWidth,
    textAlign: 'right',
    fontSize: R.font(14),
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'SNPro-Heavy',
  },
  // Rhythm card styles
  rhythmCard: {},
  rhythmContent: {
    flex: 1,
    justifyContent: 'center',
    gap: R.h(1),
  },
  rhythmNumbersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: R.w(10),
  },
  rhythmBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.w(2),
  },
  rhythmEndImage: {
    width: R.w(8),
    height: R.w(8),
  },
  rhythmBarContainer: {
    flex: 1,
  },
  rhythmBarTrack: {
    height: R.h(3),
    borderRadius: R.w(3),
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  rhythmBarSection: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rhythmBarText: {
    fontSize: R.font(18),
    fontFamily: 'SNPro-Black',
    color: '#FFFFFF',
  },
  rhythmBottomLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: R.w(10),
  },
  rhythmBottomLabel: {
    fontSize: R.font(11),
    fontFamily: 'SNPro-Semibold',
    color: 'rgba(255,255,255,0.6)',
  },
  // Sparkline styles
  sparkCard: {
    paddingBottom: R.h(1),
  },
  activitySubtitle: {
    fontSize: R.font(14),
    fontFamily: 'SNPro-Medium',
    color: 'rgba(255,255,255,0.65)',
    marginTop: -R.h(0.5),
    marginBottom: R.h(1.1),
  },
  sparkContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sparklineRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexGrow: 1,
    flexShrink: 0,
    minHeight: R.h(5.5),
    gap: R.w(0.5),
  },
  sparkBarContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  sparkBar: {
    width: '100%',
    borderRadius: R.w(0.8),
  },
  sparkLabelsRow: {
    marginTop: R.h(0.6),
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sparkAxisLabel: {
    fontSize: R.font(12),
    fontFamily: 'SNPro-Medium',
    color: 'rgba(255,255,255,0.7)',
  },
  });
};

type IntentionsHeroStyles = ReturnType<typeof createStyles>;
type ResponsiveMetrics = ReturnType<typeof useResponsive>;

interface MoodCardProps {
  styles: IntentionsHeroStyles;
  R: ResponsiveMetrics;
  distribution: MoodDistributionItem[] | null;
}

const MoodCard: React.FC<MoodCardProps> = React.memo(({ styles, R, distribution }) => (
  <View style={[styles.card, styles.overviewCard]}>
    <View style={styles.cardHeaderRow}>
      <Text style={styles.cardTitle}>Your top moods</Text>
      <Ionicons name="heart-circle" size={R.font(20)} color="rgba(255,255,255,0.8)" />
    </View>

    {distribution ? (
      <View style={styles.moodList}>
        {distribution.map((item) => {
          const moodKey = item.mood.toLowerCase();
          const emoji = MOOD_EMOJI_BY_KEY[moodKey] || '🙏';
          const label = MOOD_LABEL_BY_KEY[moodKey] || formatDisplayLabel(item.mood);
          return (
            <View key={item.mood} style={styles.moodRow}>
              <Text style={styles.moodEmoji}>{emoji}</Text>
              <Text style={styles.moodLabel}>{label}</Text>
              <View style={styles.moodBarBg}>
                <View style={[styles.moodBarFill, { width: `${item.widthPct}%` }]} />
              </View>
              <Text style={styles.moodCount}>{item.count}</Text>
            </View>
          );
        })}
      </View>
    ) : (
      <View style={styles.moodEmpty}>
        <Text style={styles.moodEmptyEmoji}>💭</Text>
        <Text style={styles.moodEmptyText}>Your prayer moods will appear here</Text>
      </View>
    )}
  </View>
));
MoodCard.displayName = 'MoodCard';

interface TopPeopleCardProps {
  styles: IntentionsHeroStyles;
  R: ResponsiveMetrics;
  people: TopPerson[];
}

const TopPeopleCard: React.FC<TopPeopleCardProps> = React.memo(({ styles, R, people }) => (
  <View style={[styles.card, styles.peopleCard]}>
    <View style={styles.cardHeaderRow}>
      <Text style={styles.cardTitle}>Most prayed for</Text>
      <Ionicons name="people" size={R.font(20)} color="rgba(255,255,255,0.8)" />
    </View>
    <View style={styles.peopleRow}>
      {people.map((person, index) => (
        <View key={`${person.name}-${index}`} style={styles.personPill}>
          <View style={styles.avatarWrapper}>
            <Avatar
              name={person.name}
              image_uri={person.image_uri || null}
              size={R.w(10)}
              borderWidth={0}
            />
          </View>
          <Text style={styles.personName} numberOfLines={1}>
            {person.name}
          </Text>
          <Text style={styles.personCount}>{person.count} prayers</Text>
        </View>
      ))}
    </View>
  </View>
));
TopPeopleCard.displayName = 'TopPeopleCard';

interface TopCategoriesCardProps {
  styles: IntentionsHeroStyles;
  R: ResponsiveMetrics;
  categories: TopCategoryMetric[];
  maxCount: number;
}

const TopCategoriesCard: React.FC<TopCategoriesCardProps> = React.memo(({ styles, R, categories, maxCount }) => (
  <View style={[styles.card, styles.categoryCard]}>
    <View style={styles.cardHeaderRow}>
      <Text style={styles.cardTitle}>Top focus areas</Text>
      <Ionicons name="albums" size={R.font(20)} color="rgba(255,255,255,0.8)" />
    </View>
    <View style={styles.categoryList}>
      {categories.map((category: TopCategoryMetric) => {
        const widthPct = Math.max(15, Math.round((category.count / Math.max(1, maxCount)) * 100));
        const label = category.label;
        return (
          <View key={category.id || label} style={styles.categoryRow}>
            <Text style={styles.categoryEmoji}>{category.emoji}</Text>
            <Text style={styles.categoryLabel} numberOfLines={1}>
              {label}
            </Text>
            <View style={styles.categoryBarBg}>
              <View style={[styles.categoryBarFill, { width: `${widthPct}%` }]} />
            </View>
            <Text style={styles.categoryCount}>{category.count}</Text>
          </View>
        );
      })}
    </View>
  </View>
));
TopCategoriesCard.displayName = 'TopCategoriesCard';

interface PrayerRhythmCardProps {
  styles: IntentionsHeroStyles;
  R: ResponsiveMetrics;
  pattern: TimePatternResult;
}

const PrayerRhythmCard: React.FC<PrayerRhythmCardProps> = React.memo(({ styles, R, pattern }) => (
  <View style={[styles.card, styles.rhythmCard]}>
    <View style={styles.cardHeaderRow}>
      <Text style={styles.cardTitle}>Prayer rhythm</Text>
      <Ionicons name="time" size={R.font(20)} color="rgba(255,255,255,0.8)" />
    </View>

    <View style={styles.rhythmContent}>
      <View style={styles.rhythmBarRow}>
        <Image
          source={require('../../../assets/images/morning1.png')}
          style={styles.rhythmEndImage}
          resizeMode="contain"
        />
        <View style={styles.rhythmBarContainer}>
          <View style={styles.rhythmBarTrack}>
            <LinearGradient
              colors={['#FFB84D', '#FF9500']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.rhythmBarSection, { width: `${pattern.morningPct}%` }]}
            >
              <Text style={styles.rhythmBarText}>{pattern.morningPct}%</Text>
            </LinearGradient>
            <LinearGradient
              colors={['#8B80F9', '#6C63FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.rhythmBarSection, { width: `${pattern.eveningPct}%` }]}
            >
              <Text style={styles.rhythmBarText}>{pattern.eveningPct}%</Text>
            </LinearGradient>
          </View>
        </View>
        <Image
          source={require('../../../assets/images/evening1.png')}
          style={styles.rhythmEndImage}
          resizeMode="contain"
        />
      </View>
      <View style={styles.rhythmBottomLabels}>
        <Text style={styles.rhythmBottomLabel}>Morning</Text>
        <Text style={styles.rhythmBottomLabel}>Evening</Text>
      </View>
    </View>
  </View>
));
PrayerRhythmCard.displayName = 'PrayerRhythmCard';

interface ActivityCardProps {
  styles: IntentionsHeroStyles;
  R: ResponsiveMetrics;
  activity: ActivityWindow;
}

const ActivityCard: React.FC<ActivityCardProps> = React.memo(({ styles, R, activity }) => (
  <View style={[styles.card, styles.sparkCard]}>
    <View style={styles.cardHeaderRow}>
      <Text style={styles.cardTitle}>You prayed {activity.daysActive} of the past 14 days</Text>
      <Ionicons name="pulse" size={R.font(20)} color="rgba(255,255,255,0.8)" />
    </View>
    <Text style={styles.activitySubtitle}>
      {activity.completed} prayers • {activity.percentage}% completion
    </Text>
    <View style={styles.sparklineRow}>
      {activity.dayData.map((day, index) => {
        const height = day.count === 0 ? R.h(0.8) : day.count === 1 ? R.h(4.5) : R.h(7);
        const opacity = day.count === 0 ? 0.1 : day.count === 1 ? 0.5 : 1;
        return (
          <View key={`day-${index}`} style={styles.sparkBarContainer}>
            <View
              style={[
                styles.sparkBar,
                {
                  height,
                  backgroundColor: '#b44da6',
                  opacity,
                },
              ]}
            />
          </View>
        );
      })}
    </View>
    <View style={styles.sparkLabelsRow}>
      <Text style={styles.sparkAxisLabel}>{activity.startLabel}</Text>
      <Text style={styles.sparkAxisLabel}>{activity.endLabel}</Text>
    </View>
  </View>
));
ActivityCard.displayName = 'ActivityCard';

