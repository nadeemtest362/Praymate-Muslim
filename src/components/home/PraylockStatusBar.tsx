import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import useResponsive from '../../hooks/useResponsive';
import { usePraylock } from '../../features/praylock/hooks/usePraylockSimple';

const praylockIcon = require('../../../assets/images/praylock-icon.png');

const PraylockStatusBar: React.FC = () => {
  const router = useRouter();
  const R = useResponsive();
  // PRAYLOCK hook
  const { settings, isNativeMonitoringActive, syncCompletionStatus } = usePraylock();
  
  // Sync on mount and focus
  useEffect(() => {
    syncCompletionStatus();
  }, [syncCompletionStatus]);
  
  if (!settings?.enabled || Platform.OS !== 'ios') {
    return null;
  }
  
  // Only show when native monitoring is active (apps are actually locked)
  if (!isNativeMonitoringActive) {
    return null;
  }
  
  // Determine current prayer window
  const now = new Date();
  const currentHour = now.getHours();
  const isMorningWindow = currentHour >= 4 && currentHour < 16;
  const timeOfDay = isMorningWindow ? 'morning' : 'evening';
  
  // Check if prayer completed for current window
  const isCompleted = timeOfDay === 'morning' ? settings.morning_completed : settings.evening_completed;
  if (isCompleted) {
    return null;
  }
  
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/praylock-setup');
  };
  
  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: R.w(3),
      borderRadius: R.w(4),
      backgroundColor: 'rgba(255, 183, 77, 0.15)',
      paddingVertical: R.h(1.8),
      paddingHorizontal: R.w(5),
 
      marginBottom: R.h(2),
      borderWidth: 1.5,
      borderColor: 'rgba(255, 183, 77, 0.4)',
      shadowColor: '#FFB74D',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
    },
    icon: {
      width: R.w(6),
      height: R.w(6),
    },
    textContainer: {
      flex: 1,
    },
    title: {
      fontSize: R.font(16),
      fontFamily: 'SNPro-Heavy',
      color: '#FFB74D',
      marginBottom: R.h(0.25),
    },
    subtitle: {
      fontSize: R.font(14),
      fontFamily: 'SNPro-Medium',
      color: '#FFFFFF',
      lineHeight: R.lineHeight(18),
    },
    chevron: {
     
    },
  });
  
  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      exiting={FadeOutUp.duration(300)}
    >
      <TouchableOpacity
        style={styles.container}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Image 
          source={praylockIcon}
          style={styles.icon}
        />
        <View style={styles.textContainer}>
          <Text style={styles.title}>PRAYBLOCK ENABLED</Text>
          <Text style={styles.subtitle}>
            Apps are locked until you complete your {timeOfDay} prayer
          </Text>
        </View>
        <Ionicons 
          name="chevron-forward" 
          size={16} 
          color="#D97706" 
          style={styles.chevron}
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

export default PraylockStatusBar;