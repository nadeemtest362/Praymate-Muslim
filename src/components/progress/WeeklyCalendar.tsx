import React, { useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { format, startOfWeek, addDays, isSameDay, addWeeks } from 'date-fns';

interface Prayer {
  id: string;
  generated_at: string | null;
  completed_at: string | null;
  slot?: string | null;
  input_snapshot?: {
    slot?: string | null;
    inputSnapshotForDB?: {
      slot?: string | null;
    } | null;
    [key: string]: any;
  } | null;
}

interface WeeklyCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  prayers: Prayer[];
  styles: any; // We'll receive styles from parent for consistency
  isDateFilterActive?: boolean;
}

const WeeklyCalendar = React.memo<WeeklyCalendarProps>(({ 
  selectedDate, 
  onDateSelect, 
  prayers, 
  styles,
  isDateFilterActive = false
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  

  

  
  // Adjust "today" based on 4am boundary - before 4am is still "yesterday"
  const getRealToday = () => {
    const now = new Date();
    const currentHour = now.getHours();
    
    if (currentHour < 4) {
      // Before 4am - still counts as yesterday
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday;
    }
    return now;
  };
  
  const today = getRealToday();
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 0 });
  
  // Generate multiple weeks (3 months back, current, 3 months forward)
  const totalWeeks = 26; // ~6 months total
  const centerWeekIndex = 13; // Middle week (current week)
  
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < totalWeeks; i++) {
      const weekOffset = i - centerWeekIndex;
      const weekStart = addWeeks(currentWeekStart, weekOffset);
      const weekDays: Date[] = [];
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        weekDays.push(addDays(weekStart, dayIndex));
      }
      result.push(weekDays);
    }
    return result;
  }, [currentWeekStart]);

  // Pre-calculate prayer status for all days (optimized)
  const resolveEffectiveSlot = useCallback((prayer: Prayer): 'morning' | 'evening' | null => {
    const raw = prayer.slot?.toLowerCase() || '';

    if (raw.includes('morning') || raw.includes('am')) {
      return 'morning';
    }

    if (raw.includes('evening') || raw.includes('pm')) {
      return 'evening';
    }

    if (raw === 'onboarding-initial') {
      const snapshotSlot = (prayer.input_snapshot?.slot ||
        prayer.input_snapshot?.inputSnapshotForDB?.slot ||
        (typeof prayer.input_snapshot?.clientSnapshot?.slot === 'string' ? prayer.input_snapshot?.clientSnapshot?.slot : undefined))?.toLowerCase();

      if (snapshotSlot === 'morning' || snapshotSlot === 'evening') {
        return snapshotSlot;
      }
    }

    const timestamp = prayer.completed_at || prayer.generated_at;
    if (!timestamp) return null;
    const date = new Date(timestamp);
    const hour = date.getHours();

    if (hour < 4) {
      return 'evening';
    }

    if (hour < 16) {
      return 'morning';
    }

    return 'evening';
  }, []);

  const prayerStatusByDate = useMemo(() => {
    const statusMap = new Map<string, { hasMorning: boolean; hasEvening: boolean; total: number }>();
    
    // Initialize all dates with empty status
    weeks.forEach(week => {
      week.forEach(date => {
        statusMap.set(date.toDateString(), { hasMorning: false, hasEvening: false, total: 0 });
      });
    });
    
    // Process all prayers once - use COMPLETED_AT to determine status, not just generation
    prayers.forEach(prayer => {
      if (!prayer.completed_at) return; // Only count completions
      
      const completedAt = new Date(prayer.completed_at);
      
      // Apply 4am boundary logic - completions before 4am count as previous day
      const currentHour = completedAt.getHours();
      if (currentHour < 4) {
        completedAt.setDate(completedAt.getDate() - 1);
      }
      
      const dateKey = completedAt.toDateString();
      const status = statusMap.get(dateKey);
      
      if (status) {
        status.total++;
        const effectiveSlot = resolveEffectiveSlot(prayer);
        if (effectiveSlot === 'morning') {
          status.hasMorning = true;
        }
        if (effectiveSlot === 'evening') {
          status.hasEvening = true;
        }
      }
    });
    
    return statusMap;
  }, [prayers, weeks, resolveEffectiveSlot]);

  const getPrayerStatusForDate = useCallback((date: Date) => {
    return prayerStatusByDate.get(date.toDateString()) || { hasMorning: false, hasEvening: false, total: 0 };
  }, [prayerStatusByDate]);



  const initialOffsetX = centerWeekIndex * styles.weekContainer.width;

  const renderWeek = (weekDays: Date[], weekIndex: number) => (
    <View key={weekIndex} style={styles.weekContainer}>
      {weekDays.map((day, dayIndex) => {
        const isSelected = isDateFilterActive && isSameDay(day, selectedDate);
        const isToday = isSameDay(day, today);
        const isFuture = day > today;
        const { hasMorning, hasEvening } = getPrayerStatusForDate(day);
        const isPerfectDay = hasMorning && hasEvening;
          
        return (
          <TouchableOpacity
            key={day.toISOString()}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onDateSelect(day);
            }}
            style={styles.dayContainer}
            activeOpacity={1}
          >
            <Text style={[
              styles.dayName,
              isPerfectDay && !isSelected && !isFuture && !isToday && styles.dayNamePerfect,
              isFuture && !isSelected && styles.dayNameFuture,
              isToday && !isSelected && styles.dayNameToday,
              isSelected && styles.dayNameSelected,
            ]}>
              {format(day, 'EEE')}
            </Text>
            
            <View style={styles.dayNumberCircle}>
              {/* Left semicircle border - Morning */}
              {!isPerfectDay && (
                <View style={[
                  styles.semicircleLeft,
                  // hasMorning && styles.semicircleLeftActive,
                ]} />
              )}
              
              {/* Right semicircle border - Evening */}
              {!isPerfectDay && (
                <View style={[
                  styles.semicircleRight,
                  // hasEvening && styles.semicircleRightActive,
                ]} />
              )}
              
              {/* Perfect day full circle */}
              {isPerfectDay && (
                <View style={[
                  styles.circlePerfectBorder,
                ]} />
              )}
              
              <View style={[
                styles.numberContainer,
                isSelected && styles.numberContainerSelected,
              ]}>
                <Text style={[
                  styles.dayNumber,
                  isPerfectDay && !isSelected && !isFuture && styles.dayNumberPerfect,
                  isSelected && styles.dayNumberSelected,
                  isFuture && !isSelected && styles.dayNumberFuture,
                  isPerfectDay && isSelected && styles.dayNumberPerfectSelected,
                ]}>
                  {(hasMorning || hasEvening) && !isFuture ? '🙏' : format(day, 'd')}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View style={styles.calendarContainer}>
      <ScrollView 
        ref={scrollViewRef}
        horizontal 
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={styles.weekContainer.width}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={styles.weeksContainer}
        contentOffset={{ x: initialOffsetX, y: 0 }}
      >
        {weeks.map((weekDays, weekIndex) => renderWeek(weekDays, weekIndex))}
      </ScrollView>
    </View>
  );
});

WeeklyCalendar.displayName = 'WeeklyCalendar';

export default WeeklyCalendar;