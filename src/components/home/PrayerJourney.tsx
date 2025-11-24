import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import useResponsive from '../../hooks/useResponsive';
import { createDesignSystem } from '../../styles/designSystem';
import { Image as ExpoImage } from 'expo-image';
import { PRAYER_JOURNEY_JESUS } from '../../utils/warmPlanIcons';

const morningEmoji = require('../../../assets/images/morning1.png');
const eveningEmoji = require('../../../assets/images/evening1.png');

interface PrayerJourneyProps {
  currentStreak: number;
  streakGoalDays: number | null;
  morningCompleted: boolean;
  eveningCompleted: boolean;
  morningAvailable: boolean;
  eveningAvailable: boolean;
  onTaskPress: (task: 'morning' | 'evening') => void;
  isPremium?: boolean; // Optional - defaults to true (premium) for existing functionality
  onUpgrade?: () => void; // Optional - triggers paywall/renewal flow when non-premium
  isPerfectDayToday: boolean; // NEW
  onStreakPress?: () => void; // TEST: fire celebration modal
}

const PrayerJourney: React.FC<PrayerJourneyProps> = ({
  currentStreak,
  streakGoalDays,
  morningCompleted,
  eveningCompleted,
  morningAvailable,
  eveningAvailable,
  onTaskPress,
  isPremium = true, // Default to true for existing functionality
  onUpgrade,
  isPerfectDayToday, // NEW
  onStreakPress, // TEST
}) => {
  const R = useResponsive();
  const router = useRouter();
  const ds = createDesignSystem(R);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(app)/(tabs)/plan');
  };

  const handleUpgrade = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  if (onUpgrade) {
    onUpgrade();
    return;
  }
  console.log('Upgrade button pressed');
};

  return (
    <View>
      {/* Streak Card with Jesus emoji and Morning/Evening status */}
      <View
        style={{
        backgroundColor: morningCompleted && eveningCompleted 
          ? ds.colors.primaryAlpha 
            : 'rgba(255, 255, 255, 0.12)',
          borderRadius: R.w(5),
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: 'rgba(255, 255, 255, 0.15)',
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
          elevation: 2,
          marginTop: R.h(1),
        }}
      >
        <View
          style={{
            paddingHorizontal: R.w(4),
            paddingTop: R.h(2),
            paddingBottom: 0,
            flexDirection: 'row',
            alignItems: 'flex-end',
          }}
        >
          <View style={{ flex: 1, paddingBottom: R.h(2.5) }}>
            {isPremium ? (
              <>
                {/* Premium User Content */}
                <View style={{ marginBottom: R.h(1.5) }}>
                  <Text style={{
                    fontSize: R.font(22),
                    lineHeight: R.font(26),
                    fontFamily: 'SNPro-Heavy',
                  
                    color: '#FFFFFF',
                    letterSpacing: -0.5,
                  }}>
                    {currentStreak === 0 ? (
                      <>Complete a prayer today to start your new prayer streak</>
                    ) : (
                    <>You're <Text style={{ color: '#FFD700', fontFamily: 'SNPro-Black' }} onPress={onStreakPress}>{currentStreak}</Text> {currentStreak === 1 ? 'day' : 'days'} into {streakGoalDays && streakGoalDays > 0 ? (<>
                    your <Text style={{ color: '#FFD700', fontFamily: 'SNPro-Black' }}>{streakGoalDays}</Text>-day prayer streak goal. Keep going!
                    </>) : '...'}</>
                    )}
                  </Text>
                </View>
                
                {/* Morning/Evening horizontal indicators */}
                <View style={{ flexDirection: 'row', gap: R.w(2) }}>
                  {/* Morning indicator */}
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: R.w(1.5),
                      paddingVertical: R.h(0.75),
                      paddingHorizontal: R.w(4),
                      backgroundColor: morningCompleted 
                        ? 'rgba(59, 227, 124, 0.24)' 
                        : morningAvailable 
                          ? 'rgba(255, 215, 0, 0.1)'
                          : 'rgba(255, 255, 255, 0.05)',
                      borderRadius: R.w(4),
                      borderWidth: 1,
                      borderColor: morningCompleted 
                        ? 'rgba(28, 176, 83, 0.8)' 
                        : morningAvailable
                          ? 'rgba(255, 215, 0, 0.2)'
                          : 'rgba(255, 255, 255, 0.08)',
                    }}
                    onPress={() => {
                      if (morningAvailable || morningCompleted) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onTaskPress('morning');
                      }
                    }}
                    disabled={!morningAvailable && !morningCompleted}
                    activeOpacity={0.7}
                  >
                    {morningCompleted ? (
                   
                        <Ionicons
                          name="checkmark-circle"
                          size={R.font(18)}
                          color="#3BE37C"
                        />
                   
                    ) : (
                      <ExpoImage
                        source={morningEmoji}
                        style={{
                          width: R.w(4.5),
                          height: R.w(4.5),
                        }}
                        contentFit="contain"
                        priority="high"
                        cachePolicy="memory"
                        transition={0}
                      />
                    )}
                    <Text style={{
                      fontSize: R.font(14),
                      fontFamily: 'SNPro-Bold',
                      color: morningCompleted 
                        ? '#3BE37C' 
                        : morningAvailable
                          ? '#FFD700'
                          : 'rgba(255, 255, 255, 0.5)',
                    }}>
                      Morning
                    </Text>
                  </TouchableOpacity>

                  {/* Evening indicator */}
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: R.w(1.5),
                      paddingVertical: R.h(0.75),
                      paddingHorizontal: R.w(4),
                      backgroundColor: eveningCompleted 
                        ? 'rgba(59, 227, 124, 0.24)' 
                        : eveningAvailable 
                          ? 'rgba(139, 92, 246, 0.1)'
                          : 'rgba(255, 255, 255, 0.05)',
                      borderRadius: R.w(4),
                      borderWidth: 1,
                      borderColor: eveningCompleted 
                        ? 'rgba(28, 176, 83, 0.8)' 
                        : eveningAvailable 
                          ? 'rgba(214, 188, 250, 0.35)'
                          : 'rgba(255, 255, 255, 0.08)',
                    }}
                    onPress={() => {
                      if (eveningAvailable || eveningCompleted) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onTaskPress('evening');
                      }
                    }}
                    disabled={!eveningAvailable && !eveningCompleted}
                    activeOpacity={0.7}
                  >
                    {eveningCompleted ? (
                    
                        <Ionicons
                          name="checkmark-circle"
                          size={R.font(18)}
                          color="#3BE37C"
                        />
                    
                    ) : (
                      <ExpoImage
                        source={eveningEmoji}
                        style={{
                          width: R.w(4.5),
                          height: R.w(4.5),
                        }}
                        contentFit="contain"
                        priority="high"
                        cachePolicy="memory"
                        transition={0}
                      />
                    )}
                    <Text style={{
                      fontSize: R.font(13),
                      fontWeight: '600',
                      color: eveningCompleted 
                        ? '#3BE37C' 
                        : eveningAvailable
                          ? '#D6BCFA'
                          : 'rgba(255, 255, 255, 0.5)',
                    }}>
                      Evening
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                {/* Non-Premium User Content */}
                <View style={{ marginBottom: R.h(2) }}>
                  <Text style={{
                    fontSize: R.font(18),
                    lineHeight: R.font(22),
                    fontWeight: '800',
                    color: '#FFFFFF',
              
                    textAlign: 'center',
                  }}>
                    Support the mission and begin your positive prayer habit today
                  </Text>
                </View>
                
                {/* Upgrade Now Button */}
                <TouchableOpacity
                  style={{
                    borderRadius: R.w(4),
                    shadowColor: '#FFD700',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                    overflow: 'hidden',
                  }}
                  onPress={handleUpgrade}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#FFD700', '#FF8C42']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={{
                      paddingVertical: R.h(1.8),
                      paddingHorizontal: R.w(8),
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{
                      fontSize: R.font(20),
                      fontFamily: 'SNPro-Black',
                      color: '#1A1B4B',
                      letterSpacing: -0.2,
                    }}>
                      Upgrade Now
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Jesus emoji on the right */}
          <View style={{ alignItems: 'center', gap: R.h(1) }}>
            <ExpoImage
              source={PRAYER_JOURNEY_JESUS}
              style={{
                width: R.w(26),
                height: R.w(26),
              }}
              contentFit="contain"
              priority="high"
              cachePolicy="memory"
              transition={0}
            />
          </View>
        </View>

        {/* Perfect Day Banner */}
        {isPerfectDayToday && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handlePress}
            style={{
              backgroundColor: 'rgba(74, 222, 128, 0.1)',
              paddingVertical: R.h(1),
              paddingHorizontal: R.w(4),
            
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Left side content */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: R.w(2),
            }}>
              {/* Perfect day circle with prayer hands - exact WeeklyCalendar styling */}
              <View style={{
                width: R.w(6),
                height: R.w(6),
                borderRadius: R.w(3),
                backgroundColor: 'rgba(59, 227, 124, 0.24)',
                borderWidth: 1.2,
                borderColor: 'rgba(28, 176, 83, 0.8)',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: 'rgba(28, 176, 83, 0.4)',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.6,
                shadowRadius: 5,
              }}>
                <Text style={{
                  fontSize: R.font(10),
                  fontFamily: 'SNPro-Heavy',
                  color: '#FFFFFF',
                  textAlign: 'center',
                }}>🙏</Text>
              </View>
              <Text style={{
                fontSize: R.font(14),
                fontFamily: 'SNPro-Heavy',
                color: 'rgba(255, 255, 255, 0.9)',
                letterSpacing: 0.5,
              }}>TODAY'S PRAYERS COMPLETE!</Text>
            </View>
            
            {/* Right chevron */}
            <Ionicons 
              name="chevron-forward" 
              size={16} 
              color="rgba(255, 255, 255, 0.5)" 
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default PrayerJourney;