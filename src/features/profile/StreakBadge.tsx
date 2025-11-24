import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import useResponsive from '../../hooks/useResponsive';

interface StreakBadgeProps {
  streak: number;
  emoji?: string;
  onPress?: () => void;
}

export default function StreakBadge({ 
  streak, 
  emoji = '🙏',
  onPress,
}: StreakBadgeProps) {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);

  const badgeContent = (
    <>
      <Text style={styles.streakEmoji}>{emoji}</Text>
      <Text style={styles.streakNumber}>{streak}</Text>
    </>
  );

  if (onPress) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.85}
          style={styles.streakBadge}
        >
          {badgeContent}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.streakBadge}>{badgeContent}</View>
    </View>
  );
}

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  container: {
    alignItems: 'flex-start',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 227, 124, 0.24)',
    paddingHorizontal: R.w(3),
    paddingVertical: R.h(0.75),
    borderRadius: R.w(4),
    borderWidth: 1.5,
    borderColor: 'rgba(28, 176, 83, 0.8)',
    shadowColor: 'rgba(28, 176, 83, 0.4)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 3,
  },
  streakEmoji: {
    fontSize: R.font(16),
    marginRight: R.w(1.5),
  },
  streakNumber: {
    fontSize: R.font(20),
    fontFamily: "SNPro-Black",
    color: '#FFFFFF',
  },
  streakLabel: {
    fontSize: R.font(14),
    fontWeight: '600',
    color: '#FFFFFF',
  },
}); 