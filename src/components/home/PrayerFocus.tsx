import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import useResponsive from '../../hooks/useResponsive';
import { createDesignSystem } from '../../styles/designSystem';
// Prayer need categories from onboarding SDUI system
const PRAYER_NEED_CATEGORIES = [
  {
    id: 'spiritual_growth',
    title: 'Growing Closer to God',
    options: [
      { id: 'faith_deepening', text: 'Strengthen My Faith', description: 'Help me trust God more deeply in all areas of life' },
      { id: 'spiritual_discipline', text: 'Prayer & Bible Study', description: 'Develop consistent habits of connecting with God' },
      { id: 'discernment', text: 'Hearing God\'s Voice', description: 'Learn to recognize and follow God\'s guidance' },
      { id: 'worship', text: 'Heart of Worship', description: 'Cultivate a spirit of praise and thanksgiving' }
    ]
  },
  {
    id: 'inner_peace',
    title: 'Finding Peace & Healing',
    options: [
      { id: 'anxiety_peace', text: 'Calm My Anxious Heart', description: 'Find God\'s peace in the midst of worry and stress' },
      { id: 'emotional_healing', text: 'Emotional Healing', description: 'Healing from past hurts, grief, or emotional pain' },
      { id: 'mental_clarity', text: 'Clear Mind & Focus', description: 'Mental clarity and freedom from overwhelming thoughts' },
      { id: 'rest', text: 'True Rest', description: 'Finding soul rest and renewal in God\'s presence' }
    ]
  },
  {
    id: 'relationships',
    title: 'Love & Relationships',
    options: [
      { id: 'family_harmony', text: 'Family Unity', description: 'Peace, understanding, and love in family relationships' },
      { id: 'forgiveness', text: 'Forgiveness & Reconciliation', description: 'Grace to forgive others and seek reconciliation' },
      { id: 'compassion', text: 'Love Like Jesus', description: 'A heart full of compassion and love for others' },
      { id: 'community', text: 'Christian Community', description: 'Meaningful connections with fellow believers' }
    ]
  },
  {
    id: 'purpose_direction',
    title: 'Purpose & Direction',
    options: [
      { id: 'life_purpose', text: 'God\'s Purpose for My Life', description: 'Understanding how God wants to use my gifts and talents' },
      { id: 'wisdom_decisions', text: 'Wisdom in Decisions', description: 'Divine wisdom for important life choices and decisions' },
      { id: 'breakthrough', text: 'Breakthrough & Open Doors', description: 'God\'s favor and breakthrough in challenging situations' },
      { id: 'provision', text: 'God\'s Provision', description: 'Trust in God\'s provision for all my needs' }
    ]
  }
];

interface PrayerFocusProps {
  prayerNeeds: string[] | null;
  onEditFocus?: () => void;
}

const createStyles = (R: ReturnType<typeof useResponsive>) => {
  const ds = createDesignSystem(R);
  
  return StyleSheet.create({
    container: {
      marginBottom: ds.spacing.md,
    },
    card: {
      backgroundColor: ds.card.background,
      borderRadius: ds.radius.card,
      padding: ds.card.padding,
      borderWidth: 1,
      borderColor: ds.card.border,
      ...ds.card.shadow,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: ds.spacing.sm,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: ds.spacing.sm,
    },
    headerIcon: {
      color: ds.colors.whiteAlpha70,
    },
    title: {
      ...ds.typography.h4,
      color: ds.colors.white,
    },
    editIconButton: {
      padding: ds.spacing.sm,
      borderRadius: ds.radius.badge,
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
      width: 32,
      height: 32,
    },
    focusGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: ds.spacing.sm,
    },
    focusChip: {
      backgroundColor: ds.colors.whiteAlpha10,
      paddingHorizontal: ds.spacing.md,
      paddingVertical: ds.spacing.sm,
      borderRadius: ds.radius.badge,
      borderWidth: 1,
      borderColor: ds.colors.whiteAlpha15,
    },
    focusChipText: {
      ...ds.typography.bodySmall,
      color: ds.colors.whiteAlpha90,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: ds.spacing.md,
    },
    emptyText: {
      ...ds.typography.body,
      color: ds.colors.whiteAlpha70,
      textAlign: 'center',
      marginBottom: ds.spacing.sm,
    },
  });
};

const PrayerFocus: React.FC<PrayerFocusProps> = ({
  prayerNeeds,
  onEditFocus,
}) => {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);

  // Get human-readable labels for prayer needs
  const focusLabels = useMemo(() => {
    console.log('[PrayerFocus] prayerNeeds:', prayerNeeds);
    
    // For debugging - if no prayer needs, show some test data
    if (!prayerNeeds || prayerNeeds.length === 0) {
      // Uncomment the line below to test the component with mock data
      // return ['Strengthen My Faith', 'Calm My Anxious Heart', 'God\'s Provision'];
      return [];
    }
    
    const allOptions = PRAYER_NEED_CATEGORIES.flatMap(category => category.options);
    return prayerNeeds
      .map(needId => allOptions.find(option => option.id === needId)?.text)
      .filter(Boolean) as string[];
  }, [prayerNeeds]);

  const hasValidFocus = focusLabels.length > 0;

  const handleEditPress = () => {
    if (onEditFocus) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onEditFocus();
    }
  };

  return (
    <Animated.View
      style={styles.container}
      entering={FadeInDown.duration(400).delay(200)}
    >
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons 
              name="heart" 
              size={18} 
              style={styles.headerIcon}
            />
            <Text style={styles.title}>Prayer Focus</Text>
          </View>
          {onEditFocus && (
            <TouchableOpacity
              style={styles.editIconButton}
              onPress={handleEditPress}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="pencil" 
                size={16} 
                color="rgba(255, 255, 255, 0.7)"
              />
            </TouchableOpacity>
          )}
        </View>

        {hasValidFocus ? (
          <View style={styles.focusGrid}>
            {focusLabels.map((label, index) => (
              <View key={index} style={styles.focusChip}>
                <Text style={styles.focusChipText}>{label}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No prayer focus set yet
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

export default PrayerFocus;
