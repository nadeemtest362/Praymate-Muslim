import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import useResponsive from '../../hooks/useResponsive';
import AvatarUpload from './AvatarUpload';
import StreakBadge from './StreakBadge';
import MetricsCard from './MetricsCard';

interface JourneyCardProps {
  profile: any;
  displayName: string;
  joinDate: string;
  streak: number;
  prayerCount: number;
  peopleCount: number;
  onAvatarPress: () => void;
  isUploadingAvatar?: boolean;
  onStreakPress?: () => void;
}

export default function JourneyCard({
  profile,
  displayName,
  joinDate,
  streak,
  prayerCount,
  peopleCount,
  onAvatarPress,
  isUploadingAvatar = false,
  onStreakPress,
}: JourneyCardProps) {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);

  const metrics = [
    { number: prayerCount, label: 'prayers completed' },
    { number: peopleCount, label: 'people you pray for' },
  ];

  return (
    <View style={styles.journeyCard}>
      <View style={styles.journeyCardGradient}>
        <View style={styles.journeyHeader}>
          <View style={styles.profileContainer}>
            <View style={styles.identityGroup}>
              <AvatarUpload
              avatarUrl={profile?.avatar_url}
              displayName={displayName}
              isUploading={isUploadingAvatar}
              onPress={onAvatarPress}
                size={56}
            />
              
              <View style={styles.nameInfo}>
                <Text style={styles.displayName}>{displayName}</Text>
                <Text style={styles.faithfulSince}>Faithful since {joinDate}</Text>
              </View>
            </View>
            
            <StreakBadge streak={streak} onPress={onStreakPress} />
          </View>
        </View>

        <MetricsCard metrics={metrics} />
      </View>
    </View>
  );
}

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  journeyCard: {
    marginHorizontal: R.w(4),
    marginBottom: R.h(2),
  },
  journeyCardGradient: {
    padding: 0,
  },
  journeyHeader: {
    marginBottom: R.h(2),
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  identityGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: R.w(2.5),
  },
  nameInfo: {
  },
  displayName: {
    fontSize: R.font(28),
    fontFamily: "SNPro-Black",
    color: '#FFFFFF',
    
    marginBottom: R.h(0.5),
  },
  faithfulSince: {
    fontSize: R.font(13),
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: "SNPro-Medium",
  },
}); 
