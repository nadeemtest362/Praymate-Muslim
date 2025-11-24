import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';

import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../../shared/ui';
import useResponsive from '../../hooks/useResponsive';

interface HomeHeaderProps {
  currentStreak?: number;
  streakGoalDays?: number | null;
  onStreakPress?: () => void;
  onCelebrateTestPress?: () => void;
  onPraylockTestPress?: () => void;
}

const HomeHeader: React.FC<HomeHeaderProps> = ({
  currentStreak = 0,
  streakGoalDays = null,
  onStreakPress,
  onCelebrateTestPress,
  onPraylockTestPress,
}) => {
  const router = useRouter();
  const { user, profile } = useAuth();
  const R = useResponsive();
  
  const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
    headerContainer: {
      paddingHorizontal: R.w(4),
      marginBottom: R.h(2),
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: R.w(3),
    },
    avatarButton: {
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: R.w(11),
      overflow: 'hidden',
    },
    greetingSection: {
      flex: 1,
    },
    greetingText: {
      fontSize: R.font(20),
      fontFamily: 'SNPro-Heavy',
      textTransform: 'capitalize',
      color: '#FFFFFF',
      letterSpacing: -0.5,
      marginBottom: R.h(0.3),
      lineHeight: R.font(28),
    },
    dateText: {
      fontSize: R.font(14),
      color: 'rgba(255, 255, 255, 0.6)',
      fontFamily: 'SNPro-Medium',
      letterSpacing: 0.3,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: R.w(2),
    },
    streakBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(59, 227, 124, 0.24)',
      paddingHorizontal: R.w(3),
      paddingVertical: R.h(0.75),
      borderRadius: R.w(6),
      borderWidth: R.w(0.5),
      borderColor: 'rgba(28, 176, 83, 0.8)',
      shadowColor: 'rgba(28, 176, 83, 0.35)',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.5,
      shadowRadius: 5,
      elevation: 3,
    },
    streakEmoji: {
      fontSize: R.font(14),
      marginRight: R.w(1.5),
    },
    streakNumber: {
      fontSize: R.font(18),
      fontFamily: 'SNPro-Black',
      color: '#FFFFFF',
    },
    testButton: {
      paddingHorizontal: R.w(3),
      paddingVertical: R.h(0.75),
      borderRadius: R.w(4),
      borderWidth: R.w(0.5),
      borderColor: 'rgba(255, 215, 0, 0.7)',
      backgroundColor: 'rgba(255, 215, 0, 0.15)',
    },
    testButtonText: {
      fontFamily: 'SNPro-Heavy',
      fontSize: R.font(12),
      letterSpacing: 0.5,
      color: '#FFD700',
    },
  });
  
  const styles = useMemo(() => createStyles(R), [R]);

  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute for dynamic greeting
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const todayDate = format(currentTime, 'EEEE, MMMM d');
  
  // Get consistent time-based greeting and emoji
  const getTimeStatus = () => {
    const hour = currentTime.getHours();
    if (hour >= 4 && hour < 12) {
      return { greeting: 'good morning', emoji: '🌤️' };
    } else if (hour >= 12 && hour < 17) {
      return { greeting: 'afternoon', emoji: '🌤️' };
    } else if (hour >= 17 || hour < 4) {
      return { greeting: 'good evening', emoji: '🌖' };
    }
    return { greeting: 'good evening', emoji: '✨' };
  };

  const { greeting: timeGreeting, emoji } = getTimeStatus();

  // Get display name with fallback
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Friend';

  const handleStreakPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onStreakPress?.();
  }, [onStreakPress]);

  return (
    <View 
      style={[styles.headerContainer, { paddingTop: R.insets.top + R.h(1.5) }]}
    >
      <View style={styles.header}>
        {/* User Avatar - Left */}
        <TouchableOpacity 
          style={styles.avatarButton}
          activeOpacity={0.8}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/profile');
          }}
        >
          <Avatar 
            uri={profile?.avatar_url}
            name={displayName}
            size={44}
          />
        </TouchableOpacity>

        {/* Greeting Section - Middle */}
        <View style={styles.greetingSection}>
          <Text
            style={styles.greetingText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {timeGreeting.charAt(0).toUpperCase() + timeGreeting.slice(1)}, {displayName} {emoji}
          </Text>
          <Text style={styles.dateText}>{todayDate}</Text>
        </View>
        
        {/* Streak Badge - Right */}
        <View style={styles.actions}>
          {__DEV__ && onCelebrateTestPress ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onCelebrateTestPress();
              }}
            >
              <View style={styles.testButton}>
                <Text style={styles.testButtonText}>TEST 🎉</Text>
              </View>
            </TouchableOpacity>
          ) : null}
          {__DEV__ && onPraylockTestPress ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPraylockTestPress();
              }}
            >
              <View style={styles.testButton}>
                <Text style={styles.testButtonText}> 🔒</Text>
              </View>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity activeOpacity={0.85} onPress={handleStreakPress}>
            <View style={styles.streakBadge}>
              <Text style={styles.streakEmoji}>🙏</Text>
              <Text style={styles.streakNumber}>{currentStreak}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default HomeHeader; 
