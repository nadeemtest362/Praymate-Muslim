import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  Alert, ScrollView,
  Linking
} from 'react-native';
import Animated, { 
  FadeIn, 
  FadeInDown,
  useSharedValue, 
  useAnimatedStyle, 
  withSequence,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';

import { OneSignal } from 'react-native-onesignal';
import { useOnboardingStore } from '../../../stores/onboardingStore';
import { StatusBar } from 'expo-status-bar';
import OnboardingGradientBackground from '../../../components/shared/OnboardingGradientBackground';
import { FloatingParticles } from '../../../components/shared/FloatingParticles';
import useResponsive from '../../../hooks/useResponsive';
import { Button } from '../../../shared/ui';
import { OnboardingFlowContext } from '../../../contexts/OnboardingFlowContext';

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: R.font(32),
    fontFamily: 'SNPro-Heavy',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: R.font(18),
    fontFamily: 'SNPro-SemiBold',
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    marginBottom: R.h(2),
    paddingHorizontal: R.w(5),
    opacity: 0.95,
    lineHeight: R.font(24),
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  scrollArea: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: R.insets.bottom + R.h(3.5),
  },
  timeSlotCard: {
    marginBottom: R.h(1.5),
  },
  timeSlotTouchable: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  timeSlotButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 18,
    padding: R.w(4),
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    overflow: 'hidden',
  },
  selectedTimeSlot: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  timeSlotIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: R.w(3),
  },
  timeSlotContent: {
    flex: 1,
  },
  timeSlotTitle: {
    fontSize: R.font(17),
    fontFamily: 'SNPro-Heavy',
    color: '#FFFFFF',
    marginBottom: 3,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  selectedTimeSlotTitle: {
    fontSize: R.font(18),
    fontFamily: 'SNPro-Black',
  },
  timeSlotRange: {
    fontSize: R.font(14),
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
    fontWeight: '600',
  },
  selectedTimeSlotRange: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '700',
  },
  timeSlotDescription: {
    fontSize: R.font(13),
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: R.font(18),
  },
  selectedTimeSlotDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  checkboxContainer: {
    marginLeft: R.w(2),
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  messageCard: {
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  messageBlur: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0, 51, 102, 0.3)',
    borderRadius: 16,
    padding: R.w(4),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  messageText: {
    fontSize: R.font(14),
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: R.w(2),
    flex: 1,
    lineHeight: R.font(20),
    fontWeight: '500',
  },
  permissionDeniedCard: {
    marginBottom: R.h(1.8),
    borderRadius: R.w(4.5),
    overflow: 'hidden',
  },
  permissionDeniedBlur: {
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.3)',
    borderRadius: R.w(4.5),
    padding: R.w(4.5),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  permissionDeniedText: {
    fontSize: R.font(15),
    color: '#FFFFFF',
    flex: 1,
    marginRight: R.w(3.8),
    fontWeight: '500',
  },
  settingsButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: R.h(1.2),
    paddingHorizontal: R.w(4),
    borderRadius: R.w(5.5),
  },
  settingsButtonText: {
    color: '#FFFFFF',
    fontSize: R.font(14),
    fontWeight: '600',
  },
  footerContainer: {
    width: '100%',
    marginTop: 'auto',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 'auto',
  },
});

// Define interface for timeSlot items from config
interface TimeSlot {
  id: string;
  icon: {
    type: string;
    name: string;
  };
  title: string;
  timeRange: string;
  description: string;
}

interface PrayerScheduleScreenConfig {
  title: string;
  subtitle: string;
  timeSlots: TimeSlot[];
  infoMessage: {
    icon: {
      type: string;
      name: string;
    };
    text: string;
  };
  permissionDeniedCard: {
    text: string;
    settingsButtonText: string;
  };
  continueButton: {
    text: string;
    loadingText: string;
    action: string;
    navigateTo: string;
  };
  alerts: {
    notificationsDisabledTitle: string;
    notificationsDisabledMessage: string;
    noTimeSelectedTitle: string;
    noTimeSelectedMessage: string;
  };
  tracking?: {
    screenViewEvent?: string;
    permissionsRequestedEvent?: string;
    permissionsGrantedEvent?: string;
    permissionsDeniedEvent?: string;
    timeSlotSelectedEventPrefix?: string;
  };
}

interface PrayerScheduleScreenProps {
  config: PrayerScheduleScreenConfig;
  onNext: () => void;
  logSduiEvent?: (eventName: string, eventData?: Record<string, any>) => void;
}

function PrayerScheduleScreenCore({ config, onNext, logSduiEvent }: PrayerScheduleScreenProps) {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);
  const flowContext = React.useContext(OnboardingFlowContext);
  const logEvent = flowContext?.logEvent;
  
  const setPrayerTimes = useOnboardingStore(state => state.setPrayerTimes);

  // State for notification permissions
  const [permissionStatus, setPermissionStatus] = useState<Notifications.PermissionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // State for time slot selections - both morning and evening selected by default
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>(['morning', 'evening']);
  
  // Filter time slots to only show morning and evening if needed
  const displayedTimeSlots = config.timeSlots.filter(slot => 
    slot.id === 'morning' || slot.id === 'evening'
  );
  
  // Enhanced animation values
  const cardScale = useSharedValue(1);
  
  // Shared animated style for time slot cards (fixes hooks order violation)
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }]
  }));



  // Removed headerAnimatedStyle since headline should not scale on selection
  // const headerAnimatedStyle = useAnimatedStyle(() => ({
  //   transform: [{ scale: headerScale.value }]
  // }));

  // Check current permission status on mount
  useEffect(() => {
    checkPermissions();
  }, [logSduiEvent]);
  
  const checkPermissions = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(status);
    } catch (error) {
      console.warn('[PrayerSchedule] Permission check failed:', error);
    }
  };
  
  // Request notification permissions
  const requestPermissionsIfNeeded = async () => {
    // If we already have permissions, no need to request again
    if (permissionStatus === Notifications.PermissionStatus.GRANTED) {
      return true;
    }
    
    try {
      setIsLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      if (config.tracking?.permissionsRequestedEvent && logSduiEvent) {
        logSduiEvent(config.tracking.permissionsRequestedEvent);
      }
      if (logEvent) {
        logEvent('prayer_schedule_permissions_requested');
      }
      
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      
      setPermissionStatus(status);
      setIsLoading(false);
      
      if (status === Notifications.PermissionStatus.GRANTED) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        if (config.tracking?.permissionsGrantedEvent && logSduiEvent) {
          logSduiEvent(config.tracking.permissionsGrantedEvent);
        }
        if (logEvent) {
          logEvent('prayer_schedule_permissions_granted');
        }
        return true;
      } else {
        if (config.tracking?.permissionsDeniedEvent && logSduiEvent) {
          logSduiEvent(config.tracking.permissionsDeniedEvent);
        }
        if (logEvent) {
          logEvent('prayer_schedule_permissions_denied', {
            status,
          });
        }
        if (selectedTimeSlots.length > 0) {
          Alert.alert(
            config.alerts.notificationsDisabledTitle || "Can't Send Reminders",
            config.alerts.notificationsDisabledMessage || "We'll remember your schedule but can't send notifications. Enable them in settings for prayer reminders.",
            [{ text: "Got it" }]
          );
        }
        return false;
      }
    } catch (error) {
      setIsLoading(false);
      if (logEvent) {
        logEvent('prayer_schedule_permission_request_failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return false;
    }
  };


  
  // Open device settings if permissions are denied
  const openSettings = () => {
    if (logEvent) {
      logEvent('prayer_schedule_open_settings');
    }
    Linking.openSettings();
  };
  
  // Handle time slot selection
  const toggleTimeSlot = (slotId: string) => {
    // Enhanced haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Enhanced selection animation
    cardScale.value = withSequence(
      withTiming(0.97, { duration: 90, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) })
    );
    
    // Removed header feedback animation to prevent headline scaling
    
    // Log time slot selection if tracking is enabled
    if (config.tracking?.timeSlotSelectedEventPrefix && logSduiEvent) {
      logSduiEvent(`${config.tracking.timeSlotSelectedEventPrefix}${slotId}`);
    }
    if (logEvent) {
      logEvent('prayer_schedule_time_slot_toggled', {
        slot_id: slotId,
      });
    }

    setSelectedTimeSlots(prev => {
      const hasSlot = prev.indexOf(slotId) !== -1;
      const newSelection = hasSlot
        ? prev.filter(id => id !== slotId)
        : prev.concat(slotId);

      if (newSelection.length > 0 && prev.length === 0) {
        if (permissionStatus !== Notifications.PermissionStatus.GRANTED) {
          setTimeout(() => {
            requestPermissionsIfNeeded();
          }, 300);
        }
      }

      if (logEvent) {
        logEvent('prayer_schedule_time_slots_updated', {
          selected_slots: newSelection,
        });
      }

      return newSelection;
    });
  };
  
  // Removed continue button bounce to keep CTA consistent across onboarding
  // const animateButton = (animValue: Animated.SharedValue<number>) => {
  //   animValue.value = withSpring(1.05, { damping: 15 });
  //   setTimeout(() => {
  //     animValue.value = withSpring(1);
  //   }, 100);
  // };
  
  // Handle continue button press
  const handleContinue = async () => {
    if (selectedTimeSlots.length > 0) {
      // Request permissions if needed when continuing
      await requestPermissionsIfNeeded();
      
      // Save the selected times to the store
      setPrayerTimes(selectedTimeSlots);

      // Set OneSignal tags for reminder preferences (server-driven reminders)
      try {
        OneSignal.User.addTags({
          reminder_morning_enabled: String(selectedTimeSlots.indexOf('morning') !== -1),
          reminder_evening_enabled: String(selectedTimeSlots.indexOf('evening') !== -1),
        });
        if (logEvent) {
          logEvent('prayer_schedule_onesignal_tags_set');
        }
      } catch {}
      
      // Continue regardless of permission result
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (logEvent) {
        logEvent('prayer_schedule_continue_clicked', {
          selected_slots: selectedTimeSlots,
        });
      }
      onNext();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        config.alerts.noTimeSelectedTitle || "No time selected",
        config.alerts.noTimeSelectedMessage || "Please select at least one preferred prayer time.",
        [{ text: "OK" }]
      );
      if (logEvent) {
        logEvent('prayer_schedule_no_time_selected');
      }
    }
  };
  
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Enhanced gradient background matching newer screens */}
      <OnboardingGradientBackground />
      
      {/* Enhanced floating particles */}
      <FloatingParticles />

      <View style={[
        styles.content,
        {
          paddingTop: R.insets.top + R.h(4),
          paddingBottom: 0,
          paddingLeft: R.insets.left + R.w(5),
          paddingRight: R.insets.right + R.w(5)
        }
      ]}>
        {/* Enhanced header with animation */}
        <Animated.View>
          <Animated.Text 
            entering={FadeIn.duration(800)}
            style={styles.title}
          >
            {config.title}
          </Animated.Text>
          
          <Animated.Text
            entering={FadeIn.delay(300)}
            style={styles.subtitle}
          >
            {config.subtitle}
          </Animated.Text>
        </Animated.View>
        
        {/* Enhanced time slot cards in a scrollable container */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {displayedTimeSlots.map((slot, index) => {
            const isSelected = selectedTimeSlots.includes(slot.id);

            return (
              <Animated.View
                key={slot.id}
                entering={FadeInDown.delay(500 + index * 150).duration(600)}
                style={[styles.timeSlotCard, isSelected && cardAnimatedStyle]}
              >
                <TouchableOpacity
                  style={styles.timeSlotTouchable}
                  onPress={() => toggleTimeSlot(slot.id)}
                  activeOpacity={0.8}
                >
                  <BlurView 
                    intensity={25} 
                    tint="dark" 
                    style={[
                      styles.timeSlotButton,
                      isSelected && styles.selectedTimeSlot
                    ]}
                  >
                    <View style={styles.timeSlotIconContainer}>
                      <MaterialCommunityIcons 
                        name={slot.icon.name as any}
                        size={28} 
                        color={isSelected 
                          ? '#FFFFFF'
                          : 'rgba(255, 255, 255, 0.8)'}
                      />
                    </View>
                    <View style={styles.timeSlotContent}>
                      <Text style={[styles.timeSlotTitle, isSelected && styles.selectedTimeSlotTitle]}>
                        {slot.title}
                      </Text>
                      <Text style={[styles.timeSlotRange, isSelected && styles.selectedTimeSlotRange]}>
                        {slot.timeRange}
                      </Text>
                      <Text style={[styles.timeSlotDescription, isSelected && styles.selectedTimeSlotDescription]}>
                        {slot.description}
                      </Text>
                    </View>
                    <View style={styles.checkboxContainer}>
                      <View style={[
                        styles.checkbox,
                        isSelected && styles.checkboxSelected
                      ]}>
                        {isSelected && (
                          <MaterialCommunityIcons 
                            name="check" 
                            size={18} 
                            color="#FFFFFF" 
                          />
                        )}
                      </View>
                    </View>
                  </BlurView>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
          
          {/* Enhanced Info Message */}
          <Animated.View 
            entering={FadeIn.delay(700)}
            style={styles.messageCard}
          >
            <BlurView intensity={20} tint="dark" style={styles.messageBlur}>
              <MaterialCommunityIcons 
                name={config.infoMessage.icon.name as any} 
                size={20} 
                color="rgba(255, 255, 255, 0.7)" 
              />
              <Text style={styles.messageText}>
                {config.infoMessage.text}
              </Text>
            </BlurView>
          </Animated.View>
            
          {/* Enhanced Permission Denied Helper */}
          {permissionStatus === Notifications.PermissionStatus.DENIED && (
            <Animated.View 
              entering={FadeIn.delay(200)}
              style={styles.permissionDeniedCard}
            >
              <BlurView intensity={25} tint="dark" style={styles.permissionDeniedBlur}>
                <Text style={styles.permissionDeniedText}>
                  {config.permissionDeniedCard.text}
                </Text>
                <TouchableOpacity
                  style={styles.settingsButton}
                  onPress={openSettings}
                >
                  <Text style={styles.settingsButtonText}>{config.permissionDeniedCard.settingsButtonText}</Text>
                </TouchableOpacity>
              </BlurView>
            </Animated.View>
          )}
            <View style={styles.buttonContainer}>
              <Button
                onPress={handleContinue}
                variant="primary"
                fullWidth
                disabled={selectedTimeSlots.length === 0}
                loading={isLoading}
              >
                {config.continueButton?.text || "Continue"}
              </Button>
            </View>
          </ScrollView>
          

              </View>
     </View>
   );
}


export default PrayerScheduleScreenCore; 