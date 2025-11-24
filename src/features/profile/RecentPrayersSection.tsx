import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import useResponsive from '../../hooks/useResponsive';
import PrayerListItem from './PrayerListItem';
import EmptyPrayersState from './EmptyPrayersState';

interface Prayer {
  id: string;
  content: string | null;
  generated_at: string | null;
  slot: string | null;
  verse_ref: string | null;
  liked: boolean | null;
}

interface RecentPrayersSectionProps {
  prayers: Prayer[];
  onViewAll: () => void;
}

export default function RecentPrayersSection({ 
  prayers, 
  onViewAll 
}: RecentPrayersSectionProps) {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);
  
  const handlePrayerPress = (prayer: Prayer) => {
    router.push({
      pathname: '/prayer-display',
      params: {
        verseRef: prayer.verse_ref || '',
        prayerId: prayer.id,
        initialLiked: prayer.liked ? 'true' : 'false',
        slot: prayer.slot || ''
      }
    });
  };

  const handleStartPraying = () => {
    router.push('/intention-review');
  };

  return (
    <View style={styles.prayersSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Prayers</Text>
        {prayers.length > 0 && (
          <TouchableOpacity 
            style={styles.sectionAction}
            onPress={onViewAll}
          >
            <Text style={styles.sectionActionText}>View All</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {prayers.length > 0 ? (
        <View style={styles.prayersList}>
          {prayers.slice(0, 3).map((prayer) => (
            <PrayerListItem
              key={prayer.id}
              prayer={prayer}
              onPress={handlePrayerPress}
            />
          ))}
        </View>
      ) : (
        <EmptyPrayersState onStartPraying={handleStartPraying} />
      )}
    </View>
  );
}

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  prayersSection: {
    marginHorizontal: R.w(4),
    marginBottom: R.h(3),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: R.h(2),
  },
  sectionTitle: {
    fontSize: R.font(22),
    fontFamily: "SNPro-Black",
    color: '#FFFFFF',
  },
  sectionAction: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: R.w(3),
    paddingVertical: R.h(0.75),
    borderRadius: R.w(3),
  },
  sectionActionText: {
    fontSize: R.font(14),
    fontFamily: "SNPro-Bold",
    color: 'rgba(255, 255, 255, 0.8)',
  },
  prayersList: {
    gap: R.h(1.5),
  },
}); 
