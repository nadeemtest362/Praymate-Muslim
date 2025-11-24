import React, { useMemo } from 'react';
import { Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Animated, { 
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { PRAYER_TOPICS, PrayerTopicId } from '../../constants/prayerConstants';
import { NeedSelectorProps } from './types';
import useResponsive from '../../hooks/useResponsive';



export const NeedSelector: React.FC<NeedSelectorProps> = ({
  selectedNeedId,
  onSelect,
}) => {
  const gridTranslateX = useSharedValue(0);
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);
  
  const gridAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: gridTranslateX.value }],
  }));

  const handleSelect = (needId: PrayerTopicId) => {
    // Shake animation
    gridTranslateX.value = withSequence(
      withTiming(-5, { duration: 50 }),
      withTiming(5, { duration: 50 }),
      withTiming(-3, { duration: 50 }),
      withTiming(3, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
    
    onSelect(needId);
  };

  return (
    <Animated.View style={[styles.needsGrid, gridAnimatedStyle]}>
      {Object.values(PRAYER_TOPICS).map(need => (
        <TouchableOpacity
          key={need.id}
          style={[
            styles.needButton,
            selectedNeedId === need.id && styles.selectedNeedButton,
          ]}
          onPress={() => handleSelect(need.id)}
        >
          {need.emoji && <Text style={styles.needEmoji}>{need.emoji}</Text>}
          <Text
            style={[
              styles.needText,
              selectedNeedId === need.id && styles.selectedNeedText,
            ]}
          >
            {need.label}
          </Text>
        </TouchableOpacity>
      ))}
    </Animated.View>
  );
};

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  needsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingTop: R.h(1),
    paddingBottom: R.h(2),
  },
  needButton: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: R.w(5),
    paddingHorizontal: R.w(1.5),
    paddingVertical: R.h(1),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: R.h(1.5),
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 6,
      },
    }),
  },
  selectedNeedButton: {
    backgroundColor: 'rgba(108, 99, 255, 0.45)',
    borderColor: '#6C63FF',
    borderWidth: 2,
    transform: [{ scale: 1.02 }],
    ...Platform.select({
      ios: {
        shadowColor: '#6C63FF',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 8,
      },
    }),
  },
  needEmoji: {
    fontSize: R.font(32),
    marginBottom: R.h(0.5),
  },
  needText: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '700',
    fontSize: R.font(14),
    textAlign: 'center',
    lineHeight: R.font(16),
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  selectedNeedText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
}); 