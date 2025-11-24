import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { PRAYER_TOPICS } from '../../constants/prayerConstants';
import { PrayerIntention } from './types';
import useResponsive from '../../hooks/useResponsive';

interface IntentionItemProps {
  intention: PrayerIntention;
  onEdit: (intentionId: string) => void;
  onToggleActive: (intentionId: string) => void;
  onDelete: (intentionId: string) => void;
}

export const IntentionItem: React.FC<IntentionItemProps> = ({
  intention,
  onEdit,
  onToggleActive,
}) => {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);
  const categoryInfo = (PRAYER_TOPICS as any)[intention.category];
  const emoji = categoryInfo?.emoji || '🙏';

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onEdit(intention.id);
  };

  return (
    <TouchableOpacity
      style={[styles.intentionRow, !intention.is_active && styles.intentionInactive]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.emojiContainer}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <View style={styles.intentionText}>
        <Text style={styles.details} numberOfLines={2}>{intention.details}</Text>
      </View>
      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation();
          onToggleActive(intention.id);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        style={styles.toggleBtn}
      >
        <View style={[styles.toggleDot, intention.is_active ? styles.toggleActive : styles.toggleInactive]} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  intentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: R.w(4),
    paddingVertical: R.h(1.5),
    paddingHorizontal: R.w(3),
    minHeight: R.h(5.5),
  },
  intentionInactive: {
    opacity: 0.5,
  },
  emoji: {
    fontSize: R.font(16),
    margin: R.w(0.5),
    textAlign: 'center',
  },
  emojiContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: R.w(4),
    paddingVertical: R.h(0.5),
    paddingHorizontal: R.w(1.5),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: R.w(2),
  },
  intentionText: {
    flex: 1,
  },
  details: {
    fontSize: R.font(16),
    color: '#FFFFFF',
    fontFamily: 'SNPro-SemiBold',
    lineHeight: R.lineHeight(18),
    paddingRight: R.w(1),
  },
  toggleBtn: {
    padding: R.w(1.5),
  },
  toggleDot: {
    width: R.w(3),
    height: R.w(3),
    borderRadius: R.w(1.5),
  },
  toggleActive: {
    backgroundColor: '#8BED4F',
  },
  toggleInactive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
}); 