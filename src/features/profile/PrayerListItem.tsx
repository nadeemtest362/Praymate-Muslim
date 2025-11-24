import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import useResponsive from '../../hooks/useResponsive';

interface Prayer {
  id: string;
  content: string | null;
  generated_at: string | null;
  slot: string | null;
  verse_ref: string | null;
  liked: boolean | null;
}

interface PrayerListItemProps {
  prayer: Prayer;
  onPress: (prayer: Prayer) => void;
}

export default function PrayerListItem({ prayer, onPress }: PrayerListItemProps) {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(prayer);
  };

  // Apply 4am boundary logic for display date - prayers before 4am count as previous day
  const prayerDate = prayer.generated_at ? new Date(prayer.generated_at) : new Date();
  const displayDate = new Date(prayerDate);
  const currentHour = prayerDate.getHours();
  if (currentHour < 4) {
    displayDate.setDate(displayDate.getDate() - 1);
  }

  // Check for both morning/evening and am/pm formats
  const isMorning = prayer.slot?.includes('morning') || prayer.slot?.includes('am');
  const imageUri = isMorning
    ? 'https://kfrvxoxdehduqrpcbibl.supabase.co/storage/v1/object/public/assets/app/emojis/morning1.png'
    : 'https://kfrvxoxdehduqrpcbibl.supabase.co/storage/v1/object/public/assets/app/emojis/evening1.png';

  return (
    <TouchableOpacity
      style={styles.prayerItem}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.prayerHeader}>
        <View style={styles.prayerDateContainer}>
          <Image 
            source={{ uri: imageUri }} 
            style={styles.prayerSlotImage}
            resizeMode="contain"
          />
          <View style={styles.prayerDateInfo}>
            <Text style={styles.prayerDate}>
              {format(displayDate, 'MMM d')}
            </Text>
            <Text style={styles.prayerTime}>
              {isMorning ? 'Morning' : 'Evening'}
            </Text>
          </View>
        </View>
      </View>
      <Text style={styles.prayerContent} numberOfLines={2}>
        {prayer.content || 'Prayer content unavailable'}
      </Text>
      {prayer.liked && (
        <View style={styles.likedIndicator}>
          <Ionicons name="heart" size={16} color="#FF6B8B" />
        </View>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  prayerItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
  },
  prayerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  prayerDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  prayerDateInfo: {
    flexDirection: 'column',
  },
  prayerDate: {
    fontSize: R.font(16),
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: "SNPro-Heavy",
    marginLeft: R.w(2),
  },
  prayerTime: {
    fontSize: R.font(12),
    color: 'rgba(255, 255, 255, 0.4)',
    fontFamily: "SNPro-Medium",
    
    marginLeft: R.w(2),
  },
  prayerSlotImage: {
    width: R.w(6),
    height: R.w(6),
  },
  prayerContent: {
    fontSize: R.font(14),
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: R.font(22),
    fontFamily: "SNPro-Medium",
  },
  likedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
}); 