import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import * as Haptics from 'expo-haptics';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';

import useResponsive from '../../../../hooks/useResponsive';
import ContactPickerBottomSheet from '../../../people/ContactPickerBottomSheet';
import { BottomSheet, Backdrop, Button } from '../../../../shared/ui';
import { supabase } from '../../../../lib/supabaseClient';
import type { UserResponse } from '@supabase/supabase-js';
import OnboardingGradientBackground from '../../../../components/shared/OnboardingGradientBackground';
import { usePrayerPeopleManager } from './hooks/usePrayerPeopleManager';
import { PrayerPersonForm, PrayerPersonFormData } from '../../../people/PrayerPersonForm';
import {
  EmptyStateThreeAvatars,
  LoadingOverlay,
  PeopleAvatarList,
  ConfettiCelebration,
  AddPersonChoiceModal,
} from './components';
import { FloatingParticles } from '../../../../components/shared/FloatingParticles';
import { OnboardingFlowContext } from '../../../../contexts/OnboardingFlowContext';

type FlowState = 'idle' | 'choice' | 'contacts' | 'manual' | 'miniProfile';

interface PrayerPeopleScreenProps {
  config: any;
  onNext: () => void;
}

export const PrayerPeopleScreen: React.FC<PrayerPeopleScreenProps> = ({ config, onNext }) => {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R.width, R.height, R]);
  const insets = useSafeAreaInsets();
  const flowContext = React.useContext(OnboardingFlowContext);
  const logEvent = flowContext?.logEvent;
  const logScreen = flowContext?.logScreen;
  
  // Parse config with proper SDUI parameters
  const maxPeople = config?.maxPeople || 5;
  const title = config?.title || "Who are you praying for?";
  const subtitleTemplate = config?.subtitleTemplate || "Add up to {maxPeople} people you'd like to include in your prayers";
  const subtitle = subtitleTemplate.replace('{maxPeople}', maxPeople.toString());
  
  // Alert messages from config
  const alerts = config?.alerts || {};
  const limitReachedTitle = alerts.limitReachedTitle || "Limit Reached";
  const limitReachedMessage = (alerts.limitReachedMessageTemplate || "You can add up to {maxPeople} people.").replace('{maxPeople}', maxPeople.toString());
  const addSomeoneFirstTitle = alerts.addSomeoneFirstTitle || "Add People";
  const addSomeoneFirstMessage = alerts.addSomeoneFirstMessage || "Please add at least one person to pray for.";
  
  // Continue button config
  const continueButton = config?.finalContinueButton || {};
  const continueButtonText = continueButton.text || "Continue";
  
  // Empty state config
  const emptyState = config?.emptyState || {};
  const emptyStateText = emptyState.text || "tap to add your first person";
  
  // People collection phase config
  const peopleCollectionPhase = config?.peopleCollectionPhase || {};
  const encouragementMessage = peopleCollectionPhase.encouragementMessageWhenMaxReached || {};
  
  // State
  const [flowState, setFlowState] = useState<FlowState>('idle');
  const [selectedContact, setSelectedContact] = useState<Contacts.Contact | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Hook for managing prayer people
  const {
    people,
    addPerson,
    removePerson,
    isLoading,
    isFull,
    isEmpty,
    count,
  } = usePrayerPeopleManager(maxPeople);

  // Generate encouragement text now that count is available
  const encouragementText = (encouragementMessage.textTemplate || "perfect! you've selected {count} people. ❤️ (you can always add more later)").replace('{count}', count.toString());

  // Debug logging
  console.log('[PrayerPeople] Debug - count:', count, 'isEmpty:', isEmpty, 'people:', people.length, 'maxPeople:', maxPeople, 'isFull:', isFull);

  // Session recovery on mount
  useEffect(() => {
    // Simple session check
    supabase.auth.getUser().then((response: UserResponse) => {
      if (!response.data.user) {
        console.error('[PrayerPeople] No authenticated user');
      }
    });
  }, []);

  // Log initial view

  const handleContactSelect = async (contact: any) => {
    const { status } = await Contacts.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Contacts.requestPermissionsAsync();
      if (newStatus !== 'granted') {
        Alert.alert('Permission Required', 'Please grant contacts permission to add people.');
        return;
      }
    }

    setSelectedContact(contact);
    setFlowState('miniProfile');

    if (logEvent) {
      logEvent('prayer_people_contact_selected', {
        source: 'contacts_picker',
      });
    }
  };

  const handlePersonFormSubmit = async (data: PrayerPersonFormData) => {
    try {
      const isReachedMax = await addPerson({
        name: data.name,
        relationship: data.relationship || 'Friend',
        gender: data.gender || 'name',
        image_uri: data.image_uri,
        deviceContactId: data.deviceContactId,
      });

      if (logEvent) {
        logEvent('prayer_people_person_added', {
          relationship: data.relationship || 'Friend',
          gender: data.gender || 'name',
          source: flowState === 'manual' ? 'manual' : 'contacts',
          previous_count: count,
          new_count: count + 1,
          reached_max: isReachedMax,
        });
      }

      if (isReachedMax) {
        setShowConfetti(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setFlowState('idle');
      setSelectedContact(null);
    } catch (error) {
      console.error('[PrayerPeople] Error in handlePersonFormSubmit:', error);
      // Error already handled in hook
      setFlowState('idle');
      setSelectedContact(null);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removePerson(id);

      if (logEvent) {
        logEvent('prayer_people_person_removed', {
          person_id: id,
          previous_count: count,
          new_count: count - 1,
        });
      }
    } catch (error) {
      if (logEvent) {
        logEvent('prayer_people_remove_failed', {
          person_id: id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  };

  const handleContinue = () => {
    if (isEmpty) {
      Alert.alert(addSomeoneFirstTitle, addSomeoneFirstMessage);
      if (logEvent) {
        logEvent('prayer_people_attempt_continue_without_people');
      }
      return;
    }

    if (logEvent) {
      logEvent('prayer_people_continue', {
        total_people: count,
      });
    }
    onNext();
  };

  const handleAddPerson = async () => {
    if (isFull) {
      Alert.alert(limitReachedTitle, limitReachedMessage);
      if (logEvent) {
        logEvent('prayer_people_add_blocked_limit_reached', {
          total_people: count,
          max_people: maxPeople,
        });
      }
      return;
    }

    // Check contacts permission first - if already granted, go straight to picker
    const { status } = await Contacts.getPermissionsAsync();
    if (status === 'granted') {
      setFlowState('contacts');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (logEvent) {
        logEvent('prayer_people_add_flow_started', {
          path: 'contacts',
        });
      }
      return;
    }

    // If permission not granted, show choice modal to explain options
    setFlowState('choice');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (logEvent) {
      logEvent('prayer_people_add_flow_started', {
        path: 'choice_modal',
      });
    }
  };

  const handleChoiceContactsAdd = async () => {
    // Close choice modal and request contacts permission
    setFlowState('idle');
    
    // Try contacts first, fallback to manual
    const { status } = await Contacts.getPermissionsAsync();
    if (status === 'granted') {
      setFlowState('contacts');
      if (logEvent) {
        logEvent('prayer_people_choice_contacts_selected', {
          permission_status: 'granted',
        });
      }
    } else if (status === 'denied') {
      // Permission was previously denied - show alert to go to Settings
      Alert.alert(
        'Contacts Permission Required',
        'Please enable contacts access in Settings to add people from your contacts.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              Linking.openSettings();
              if (logEvent) {
                logEvent('prayer_people_contacts_denied_settings_opened');
              }
            },
          },
        ]
      );
      if (logEvent) {
        logEvent('prayer_people_contacts_denied_alert_shown', {
          permission_status: status,
        });
      }
    } else {
      // Request permission
      const { status: newStatus } = await Contacts.requestPermissionsAsync();
      if (newStatus === 'granted') {
        setFlowState('contacts');
        if (logEvent) {
          logEvent('prayer_people_choice_contacts_selected', {
            permission_status: 'granted_after_request',
          });
        }
      } else {
        // Permission denied after request, show manual add instead
        setFlowState('manual');
        if (logEvent) {
          logEvent('prayer_people_choice_contacts_denied', {
            permission_status: newStatus,
          });
        }
      }
    }
  };

  const handleChoiceManualAdd = () => {
    // Close choice modal and go to manual add
    setFlowState('manual');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (logEvent) {
      logEvent('prayer_people_choice_manual_selected');
    }
  };

  return (
    <View style={styles.container}>
      <OnboardingGradientBackground />

      <SafeAreaView style={styles.safeArea}>
        {/* Floating Particles */}
        <FloatingParticles />

        {/* Main Content */}
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          {/* People Display */}
          <View style={[
            styles.peopleContainer,
            count <= 3 ? styles.peopleContainerEmpty : styles.peopleContainerWithPeople
          ]}>
            {count <= 3 ? (
              <>
                <EmptyStateThreeAvatars
                  people={people}
                  onPress={handleAddPerson}
                  onRemove={handleRemove}
                  isLoading={isLoading}
                  text={emptyStateText}
                />
                {count > 0 && (
                  <View style={styles.encouragementContainer}>
                    <Text style={styles.encouragementText}>
                      {count === 1 
                        ? "Add more people for an even more meaningful prayer experience"
                        : count === 2
                          ? "Building a beautiful prayer circle... maybe add one more?"
                          : isFull 
                            ? encouragementText 
                            : "Each person adds depth to your prayer time"
                      }
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.peopleWithEncouragement}>
                <View style={styles.avatarSection}>
                  <PeopleAvatarList
                    people={people}
                    onRemove={handleRemove}
                    onAdd={handleAddPerson}
                    isLoading={isLoading}
                    isFull={isFull}
                  />
                </View>
                
                <View style={styles.encouragementContainer}>
                  <Text style={styles.encouragementText}>
                    {isFull 
                      ? encouragementText 
                      : "Each person adds depth to your prayer time"
                    }
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Bottom Section */}
          <View style={styles.bottomSection}>
            <Button
              onPress={handleContinue}
              disabled={isEmpty}
              variant="primary"
              fullWidth
            >
              {isEmpty ? "Add people to continue" : continueButtonText}
            </Button>
          </View>
        </View>
      </SafeAreaView>

      {/* Modals/Overlays */}
      <BottomSheet
        isVisible={flowState === 'contacts'}
        onClose={() => setFlowState('idle')}
        title="Add People to Pray For"
      >
        <ContactPickerBottomSheet
          onContactSelect={handleContactSelect}
          onManualAdd={() => setFlowState('manual')}
          onPersonSubmit={handlePersonFormSubmit}
          excludeContactIds={people.map(p => p.device_contact_id || p.name)}
        />
      </BottomSheet>

      {flowState === 'choice' && (
        <AddPersonChoiceModal
          onContactsAdd={handleChoiceContactsAdd}
          onManualAdd={handleChoiceManualAdd}
          onCancel={() => setFlowState('idle')}
        />
      )}

      {/* Add/Edit Person Form Modal with Backdrop */}
      <Backdrop 
        isVisible={flowState === 'manual' || flowState === 'miniProfile'} 
        onPress={() => {
          setFlowState('idle');
          setSelectedContact(null);
        }} 
      />

      {(flowState === 'manual' || flowState === 'miniProfile') && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <Animated.View 
            style={[
              styles.personFormContainer,
              { paddingBottom: insets.bottom > 0 ? insets.bottom : 20 }
            ]}
            entering={SlideInDown.duration(300)}
            exiting={SlideOutDown.duration(200)}
          >
            <PrayerPersonForm
              initialData={
                flowState === 'manual' 
                  ? {}
                  : selectedContact ? {
                      name: selectedContact.name || '',
                      image_uri: selectedContact.imageAvailable && selectedContact.image ? selectedContact.image.uri : undefined,
                      phoneNumber: selectedContact.phoneNumbers?.[0]?.number,
                      email: selectedContact.emails?.[0]?.email,
                      deviceContactId: selectedContact.id,
                    }
                  : {}
              }
              onSubmit={handlePersonFormSubmit}
              onCancel={() => {
                setFlowState('idle');
                setSelectedContact(null);
              }}
              isSubmitting={isLoading}
              mode="create"
              startWithName={flowState === 'manual'}
            />
          </Animated.View>
        </KeyboardAvoidingView>
      )}

      <LoadingOverlay visible={isLoading} />
      <ConfettiCelebration 
        visible={showConfetti} 
        onComplete={() => setShowConfetti(false)} 
      />
    </View>
  );
};

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: R.w(6),
  },
  header: {
    alignItems: 'center',
    marginTop: R.h(4),
    marginBottom: 0,
  },
  title: {
    fontSize: R.font(36),
    fontFamily: 'SNPro-Black',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: R.h(1.5),
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: R.w(-0.3),
  },
  subtitle: {
    fontSize: R.font(20),
    fontFamily: 'SNPro-Semibold',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    paddingHorizontal: R.w(4),
    lineHeight: R.font(28),
  },
  peopleContainer: {
    flex: 1,
  },
  peopleContainerEmpty: {
    justifyContent: 'flex-start',
  },
  peopleContainerWithPeople: {
    justifyContent: 'flex-start',
    paddingTop: R.h(4),
  },
  peopleWithEncouragement: {
    alignItems: 'center',
    width: '100%',
  },
  avatarSection: {
    alignItems: 'center',
    width: '100%',
  },
  bottomSection: {
    paddingBottom: R.h(4),
    alignItems: 'center',
  },
  encouragementContainer: {
    alignItems: 'center',
    marginTop: R.h(3),
    paddingHorizontal: R.w(4),
    paddingVertical: R.h(1.5),
  },
  encouragementText: {
    fontSize: R.font(24),
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    fontFamily: 'SNPro-Bold',
    fontStyle: 'italic',
    lineHeight: R.font(28),
    letterSpacing: -0.5,
    paddingBottom: R.h(2),
  },
  keyboardAvoidingView: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1001,
  },
  personFormContainer: {
    backgroundColor: '#2C2A5E',
    borderTopLeftRadius: R.w(5),
    borderTopRightRadius: R.w(5),
    paddingTop: R.h(1),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
}); 