import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AddIntentionHeaderProps } from './types';
import useResponsive from '../../hooks/useResponsive';

export const AddIntentionHeader: React.FC<AddIntentionHeaderProps> = ({ 
  isEditing, 
  onBack 
}) => {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);
  
  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBack();
  };

  return (
    <Animated.View 
      entering={FadeIn.duration(800)}
      style={styles.header}
    >
      <TouchableOpacity 
        style={styles.backButton}
        onPress={handleBack}
      >
        <Ionicons name="arrow-back" size={R.font(24)} color="white" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>
        {isEditing ? 'Edit Prayer Focus' : 'Add Prayer Focus'}
      </Text>
      <View style={styles.headerRight} />
    </Animated.View>
  );
};

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: R.w(4),
    paddingVertical: R.h(1.5),
  },
  backButton: {
    width: R.w(10),
    height: R.w(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: R.w(2),
    fontSize: R.font(28),
    fontFamily: "SNPro-Black",
    color: '#FFFFFF',
    lineHeight: R.font(32),
    letterSpacing: -R.w(0.3),
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerRight: {
    width: R.w(10),
  },
}); 