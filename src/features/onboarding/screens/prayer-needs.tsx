import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  TextInput, Keyboard, TouchableWithoutFeedback,
  Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { useOnboardingStore } from '../../../stores/onboardingStore';
import Animated, { 
  FadeIn, useSharedValue,
  useAnimatedStyle, withSpring, withSequence,
  Layout, ZoomIn, SlideInRight, FadeInDown
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import OnboardingGradientBackground from '../../../components/shared/OnboardingGradientBackground';
import { FloatingParticles } from '../../../components/shared/FloatingParticles';
import useResponsive from '../../../hooks/useResponsive';
import { OnboardingFlowContext } from '../../../contexts/OnboardingFlowContext';
import { Button } from '../../../shared/ui';

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: R.font(32),
    fontFamily: 'SNPro-Heavy',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: R.h(1),
    letterSpacing: -1.4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    lineHeight: R.lineHeight(30),
  },
  subtitle: {
    fontSize: R.font(16),
    fontFamily: 'SNPro-SemiBold',
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: R.font(22),
    marginBottom: R.h(1.5),
    paddingHorizontal: R.w(5),
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  categoryContainer: {
    marginBottom: R.h(2.5),
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: R.h(1.5),
    paddingHorizontal: R.w(1),
  },
  categoryIcon: {
    marginRight: R.w(3),
  },
  categoryTitle: {
    fontSize: R.font(20),
    fontFamily: 'SNPro-Heavy',
    color: '#FFFFFF',
    flex: 1,
    letterSpacing: -0.2,
  },
  optionsContainer: {
    gap: R.h(1.2),
  },
  optionCard: {
    borderRadius: R.w(4),
    overflow: 'hidden',
    marginHorizontal: R.w(1),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  selectedOptionCard: {
    shadowColor: '#4CAF50',
    shadowOpacity: 0.4,
    elevation: 12,
  },
  disabledOptionCard: {
    opacity: 0.5,
    shadowOpacity: 0.1,
    elevation: 2,
  },
  optionBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: R.w(4),
    overflow: 'hidden',
  },
  selectedOptionBlur: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderColor: 'rgba(76, 175, 80, 0.4)',
  },
  disabledOptionBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: R.w(4),
  },
  optionIconContainer: {
    width: R.w(12),
    height: R.w(12),
    borderRadius: R.w(6),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: R.w(4),
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: R.font(16),
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: R.h(0.5),
    letterSpacing: -0.1,
  },
  selectedOptionTitle: {
    color: '#FFFFFF',
  },
  disabledOptionTitle: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  optionDescription: {
    fontSize: R.font(14),
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: R.font(18),
  },
  selectedOptionDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  disabledOptionDescription: {
    color: 'rgba(255, 255, 255, 0.3)',
  },
  checkmarkContainer: {
    marginLeft: R.w(3),
  },
  customSection: {
    marginTop: R.h(3),
    marginBottom: R.h(2),
  },
  addCustomButton: {
    borderRadius: R.w(4.5),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  addCustomBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: R.h(2),
    paddingHorizontal: R.w(5),
  },
  addCustomButtonText: {
    color: '#FFFFFF',
    fontSize: R.font(15),
    fontWeight: '600',
    marginLeft: R.w(2.5),
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  customDetailSection: {
    marginTop: R.h(1),
    marginBottom: R.h(0.5),
  },
  detailsBlurContainer: {
    borderRadius: R.w(6),
    overflow: 'hidden',
    marginBottom: R.h(0.5),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  detailsContainer: {
    backgroundColor: 'transparent',
    padding: R.w(5),
  },
  detailsPrompt: {
    fontSize: R.font(16),
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: R.h(1.5),
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  textInputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: R.w(4),
    padding: R.w(1.5),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
      },
      android: {
        elevation: 4,
      },
    }),
  },
  textInput: {
    color: '#FFFFFF',
    fontSize: R.font(15),
    fontWeight: '500',
    padding: R.w(3),
    minHeight: R.h(6),
    maxHeight: R.h(12),
    textAlignVertical: 'top',
  },
  charCount: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: R.font(13),
    fontWeight: '500',
    textAlign: 'right',
    marginTop: R.h(1),
    marginRight: R.w(1.5),
  },
  detailsButtonContainer: {
    flexDirection: 'row',
    gap: R.w(3),
    marginTop: R.h(2),
  },
  detailsCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: R.w(4),
    paddingVertical: R.h(1.2),
    paddingHorizontal: R.w(4),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  detailsCancelButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: R.font(14),
    fontWeight: '600',
  },
  detailsSaveButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: R.w(4),
    paddingVertical: R.h(1.2),
    paddingHorizontal: R.w(4),
    alignItems: 'center',
  },
  detailsSaveButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  detailsSaveButtonText: {
    color: '#1A1B4B',
    fontSize: R.font(14),
    fontWeight: '700',
  },
  detailsSaveButtonTextDisabled: {
    color: 'rgba(26, 27, 75, 0.5)',
  },
  customNeedDisplay: {
    borderRadius: R.w(4.5),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  customNeedBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: R.w(4),
  },
  customNeedTitle: {
    fontSize: R.font(15),
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: R.h(0.8),
  },
  customNeedContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  customNeedText: {
    fontSize: R.font(14),
    color: '#FFFFFF',
    flex: 1,
    marginRight: R.w(3),
    fontStyle: 'italic',
  },
  editCustomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: R.h(0.6),
    paddingHorizontal: R.w(3),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: R.w(3),
  },
  editCustomButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: R.font(13),
    marginLeft: R.w(1.5),
    fontWeight: '500',
  },
  footerContainer: {
    width: '100%',
    marginTop: R.h(2),
  },
});


// Define icon types to avoid type errors
type MaterialIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];



// Define the props interface for SDUI compatibility
interface PrayerNeedsScreenProps {
  config: {
    title: string;
    subtitle: string;
    prayerNeedCategories: {
      id: string;
      title: string;
      options: {
        id: string;
        text: string;
      }[];
    }[];
    customNeedSection: {
      addButton: {
        text: string;
        icon: {
          type: string;
          name: string;
        };
      };
      inputTitle: string;
      inputPlaceholder: string;
      cancelButtonText: string;
      saveButtonText: string;
      displayTitle: string;
      editButton: {
        text: string;
        icon: {
          type: string;
          name: string;
        };
      };
    };
    continueButton: {
      text: string;
      action: string;
      navigateTo: string;
    };
    validation: {
      selectionRequiredTitle: string;
      selectionRequiredMessage: string;
    };
  };
  onNext: () => void;
  onBack?: () => void;
}

// Enhanced prayer need categories with more meaningful spiritual themes
const PRAYER_NEED_CATEGORIES = [
  {
    id: 'spiritual_growth',
    title: 'Growing Closer to God',
    icon: 'church' as MaterialIconName,
    options: [
      { id: 'faith_deepening', text: 'Strengthen My Faith', icon: 'heart-multiple' as MaterialIconName, description: 'Help me trust God more deeply in all areas of life' },
      { id: 'spiritual_discipline', text: 'Prayer & Bible Study', icon: 'book-open-variant' as MaterialIconName, description: 'Develop consistent habits of connecting with God' },
      { id: 'discernment', text: 'Hearing God\'s Voice', icon: 'ear-hearing' as MaterialIconName, description: 'Learn to recognize and follow God\'s guidance' },
      { id: 'worship', text: 'Heart of Worship', icon: 'music' as MaterialIconName, description: 'Cultivate a spirit of praise and thanksgiving' }
    ]
  },
  {
    id: 'inner_peace',
    title: 'Finding Peace & Healing',
    icon: 'meditation' as MaterialIconName,
    options: [
      { id: 'anxiety_peace', text: 'Calm My Anxious Heart', icon: 'heart-pulse' as MaterialIconName, description: 'Find God\'s peace in the midst of worry and stress' },
      { id: 'emotional_healing', text: 'Emotional Healing', icon: 'heart-plus' as MaterialIconName, description: 'Healing from past hurts, grief, or emotional pain' },
      { id: 'mental_clarity', text: 'Clear Mind & Focus', icon: 'brain' as MaterialIconName, description: 'Mental clarity and freedom from overwhelming thoughts' },
      { id: 'rest', text: 'True Rest', icon: 'sleep' as MaterialIconName, description: 'Finding soul rest and renewal in God\'s presence' }
    ]
  },
  {
    id: 'relationships',
    title: 'Love & Relationships',
    icon: 'account-group' as MaterialIconName,
    options: [
      { id: 'family_harmony', text: 'Family Unity', icon: 'home-heart' as MaterialIconName, description: 'Peace, understanding, and love in family relationships' },
      { id: 'forgiveness', text: 'Forgiveness & Reconciliation', icon: 'handshake' as MaterialIconName, description: 'Grace to forgive others and seek reconciliation' },
      { id: 'compassion', text: 'Love Like Jesus', icon: 'heart-circle' as MaterialIconName, description: 'A heart full of compassion and love for others' },
      { id: 'community', text: 'Christian Community', icon: 'account-multiple' as MaterialIconName, description: 'Meaningful connections with fellow believers' }
    ]
  },
  {
    id: 'purpose_direction',
    title: 'Purpose & Direction',
    icon: 'compass' as MaterialIconName,
    options: [
      { id: 'life_purpose', text: 'God\'s Purpose for My Life', icon: 'map-marker-star' as MaterialIconName, description: 'Understanding how God wants to use my gifts and talents' },
      { id: 'wisdom_decisions', text: 'Wisdom in Decisions', icon: 'lightbulb-on' as MaterialIconName, description: 'Divine wisdom for important life choices and decisions' },
      { id: 'breakthrough', text: 'Breakthrough & Open Doors', icon: 'door-open' as MaterialIconName, description: 'God\'s favor and breakthrough in challenging situations' },
      { id: 'provision', text: 'God\'s Provision', icon: 'gift' as MaterialIconName, description: 'Trust in God\'s provision for all my needs' }
    ]
  }
];

function PrayerNeedsScreenCore({ config, onNext, onBack }: PrayerNeedsScreenProps) {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R.width, R.height, R]);
  const flowContext = React.useContext(OnboardingFlowContext);
  const logEvent = flowContext?.logEvent;
  const logScreen = flowContext?.logScreen;
  
  // Get data from store - Select values individually to prevent infinite loops
  const setPrayerNeeds = useOnboardingStore(state => state.setPrayerNeeds);
  const prayerNeeds = useOnboardingStore(state => state.prayerNeeds);
  const customPrayerNeed = useOnboardingStore(state => state.customPrayerNeed);
  const setCustomPrayerNeed = useOnboardingStore(state => state.setCustomPrayerNeed);
  
  // Local state
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customNeedInput, setCustomNeedInput] = useState(customPrayerNeed || '');
  // Removed keyboardHeight state - not needed with proper KeyboardAvoidingView
  
  // Check if can continue - at least one need selected or custom input provided
  const canContinue = prayerNeeds.length > 0 || (customPrayerNeed && customPrayerNeed.trim().length > 0);
  
  // Limit to maximum 3 selections for focused prayers
  const maxSelections = 3;
  const isAtMaxSelections = prayerNeeds.length >= maxSelections;
  
  // Handle keyboard and scrolling for custom input
  useEffect(() => {
    if (showCustomInput) {
      // Give time for keyboard to appear then scroll to show the input
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [showCustomInput]);

  
  // ScrollView ref for scrolling when keyboard appears
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Animation values
  const headerScale = useSharedValue(1);
  const cardShake = useSharedValue(0);

  // Start button glow animation
  // Animated styles
  const headerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: headerScale.value }]
  }));

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: cardShake.value }]
  }));

  // Handle selection of a need
  const handleSelectNeed = (needId: string) => {
    const isCurrentlySelected = prayerNeeds.includes(needId);
    const wouldExceedLimit = !isCurrentlySelected && prayerNeeds.length >= maxSelections;
    
    // Prevent selection if at max limit (but allow deselection)
    if (wouldExceedLimit) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      if (logEvent) {
        logEvent('prayer_needs_selection_blocked', {
          need_id: needId,
          selected_count: prayerNeeds.length,
          max_selections: maxSelections,
        });
      }
      
      // Shake animation for feedback
      cardShake.value = withSequence(
        withSpring(-3, { damping: 10 }),
        withSpring(3, { damping: 10 }),
        withSpring(-2, { damping: 10 }),
        withSpring(2, { damping: 10 }),
        withSpring(0, { damping: 10 })
      );
      
      Alert.alert(
        "Maximum Reached",
        `You can select up to ${maxSelections} prayer themes to keep your prayers focused. Deselect one to choose a different theme.`,
        [{ text: "OK" }]
      );
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const newPrayerNeeds = isCurrentlySelected
      ? prayerNeeds.filter(id => id !== needId)
      : [...prayerNeeds, needId];
    setPrayerNeeds(newPrayerNeeds);

    if (logEvent) {
      logEvent('prayer_needs_selection_changed', {
        need_id: needId,
        action: isCurrentlySelected ? 'removed' : 'added',
        selected_count: newPrayerNeeds.length,
      });
    }
    
    // Animate the header slightly for feedback
    headerScale.value = withSequence(
      withSpring(1.02, { damping: 15 }),
      withSpring(1, { damping: 15 })
    );
  };
  
  // Toggle custom input visibility
  const toggleCustomInput = () => {
    const nextShowState = !showCustomInput;
    setShowCustomInput(nextShowState);

    if (logEvent) {
      logEvent('prayer_needs_custom_toggle', {
        next_state: nextShowState ? 'open' : 'closed',
      });
    }
    
    if (nextShowState) {
      // Initialize with existing custom need if editing
      if (customPrayerNeed && !customNeedInput) {
        setCustomNeedInput(customPrayerNeed);
      }
    } else {
      // Reset input to empty when closing without saving
      setCustomNeedInput('');
      Keyboard.dismiss(); 
    }
  };
  
  // Cancel custom input without saving
  const cancelCustomInput = () => {
    setShowCustomInput(false);
    // Reset to the existing custom prayer need if canceling an edit
    setCustomNeedInput(customPrayerNeed || '');
    Keyboard.dismiss();
    if (logEvent) {
      logEvent('prayer_needs_custom_cancelled');
    }
  };
  
  // Save custom need and close input
  const saveCustomNeed = () => {
    if (customNeedInput.trim()) {
      setCustomPrayerNeed(customNeedInput.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCustomInput(false);
      Keyboard.dismiss();
      if (logEvent) {
        logEvent('prayer_needs_custom_saved', {
          text_length: customNeedInput.trim().length,
        });
      }
    }
  };
  
  // Handle continue button press
  const handleContinue = async () => {
    if (canContinue) {
      // Save any custom input if it's visible and has content
      if (showCustomInput && customNeedInput.trim()) {
        setCustomPrayerNeed(customNeedInput.trim());
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (logEvent) {
        logEvent('prayer_needs_continue_clicked', {
          selected_count: prayerNeeds.length,
          has_custom_need: !!(customPrayerNeed && customPrayerNeed.trim().length > 0),
        });
      }
      onNext(); // Use the SDUI onNext prop instead of router.push
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      if (logEvent) {
        logEvent('prayer_needs_continue_blocked');
      }
      
      // Animate the card shake for error feedback
      cardShake.value = withSequence(
        withSpring(-5, { damping: 10 }),
        withSpring(5, { damping: 10 }),
        withSpring(-3, { damping: 10 }),
        withSpring(3, { damping: 10 }),
        withSpring(0, { damping: 10 })
      );
      
      Alert.alert(
        config.validation.selectionRequiredTitle,
        config.validation.selectionRequiredMessage,
        [{ text: "OK" }]
      );
    }
  };

  return (
    <View style={styles.outerContainer}>
      {/* Background gradient - covers entire screen including keyboard area */}
      <OnboardingGradientBackground />
      
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <View style={styles.container}>
          <StatusBar style="light" />

          {/* Enhanced floating particles */}
          <FloatingParticles />

        <TouchableWithoutFeedback onPress={() => {
          if (showCustomInput) {
            cancelCustomInput();
          } else {
            Keyboard.dismiss();
          }
        }}>
          <View style={[
              styles.content,
              {
                paddingTop: R.insets.top + R.h(2),
                paddingBottom: R.insets.bottom + R.h(2),
                paddingLeft: R.insets.left + R.w(5),
                paddingRight: R.insets.right + R.w(5)
              }
            ]}>
            {/* Enhanced header */}
            <Animated.View style={headerAnimStyle}>
              <Animated.Text 
                entering={FadeIn.duration(800)}
                style={styles.title}
              >
                {config.title}
              </Animated.Text>
              
              <Animated.Text
                entering={FadeIn.delay(300).duration(800)}
                style={styles.subtitle}
              >
                {config.subtitle}
              </Animated.Text>
              
            </Animated.View>
            
            {/* Main content */}
            <ScrollView 
              ref={scrollViewRef}
              style={styles.scrollArea}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: showCustomInput ? 0 : R.h(1.5) }
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={true}
              scrollEventThrottle={16}
            >
              <Animated.View style={cardAnimStyle}>
                {(config.prayerNeedCategories || PRAYER_NEED_CATEGORIES).map((category, categoryIndex) => {
                  // Use the enhanced options from PRAYER_NEED_CATEGORIES if available, otherwise use config
                  const enhancedCategory = PRAYER_NEED_CATEGORIES.find(c => c.id === category.id);
                  const categoryToUse = enhancedCategory || {
                    ...category,
                    icon: 'help-circle' as MaterialIconName,
                    options: category.options.map(option => ({
                      ...option,
                      icon: 'help-circle' as MaterialIconName,
                      description: option.text
                    }))
                  };

                  return (
                    <Animated.View
                      key={category.id}
                      entering={FadeInDown.duration(600).delay(categoryIndex * 100 + 400)}
                      layout={Layout.springify()}
                      style={styles.categoryContainer}
                    >
                      {/* Category Header - Now just a label, not clickable */}
                      <View style={styles.categoryHeader}>
                        <MaterialCommunityIcons 
                          name={categoryToUse.icon} 
                          size={24} 
                          color="#FFFFFF" 
                          style={styles.categoryIcon} 
                        />
                        <Text style={styles.categoryTitle}>
                          {category.title}
                        </Text>
                      </View>
                      
                      {/* Options - Always visible now */}
                      <View style={styles.optionsContainer}>
                        {categoryToUse.options.map((option, optionIndex) => {
                          const isSelected = prayerNeeds.includes(option.id);
                          const isDisabled = !isSelected && isAtMaxSelections;
                          
                          return (
                          <Animated.View
                            key={option.id}
                            entering={SlideInRight.delay((categoryIndex * 100) + (optionIndex * 75) + 600).duration(400)}
                          >
                            <TouchableOpacity
                              style={[
                                styles.optionCard,
                                isSelected && styles.selectedOptionCard,
                                isDisabled && styles.disabledOptionCard
                              ]}
                              onPress={() => !isDisabled && handleSelectNeed(option.id)}
                              activeOpacity={isDisabled ? 1 : 0.8}
                            >
                              <BlurView intensity={15} tint="dark" style={[
                                styles.optionBlur,
                                isSelected && styles.selectedOptionBlur,
                                isDisabled && styles.disabledOptionBlur
                              ]}>
                                <View style={styles.optionContent}>
                                  <View style={styles.optionIconContainer}>
                                    <MaterialCommunityIcons 
                                      name={option.icon} 
                                      size={22} 
                                      color={isSelected ? "#FFFFFF" : isDisabled ? "rgba(255, 255, 255, 0.5)" : "rgba(255, 255, 255, 0.9)"} 
                                    />
                                  </View>
                                  <View style={styles.optionTextContainer}>
                                    <Text style={[
                                      styles.optionTitle,
                                      isSelected && styles.selectedOptionTitle,
                                      isDisabled && styles.disabledOptionTitle
                                    ]}>
                                      {option.text}
                                    </Text>
                                    <Text style={[
                                      styles.optionDescription,
                                      isSelected && styles.selectedOptionDescription,
                                      isDisabled && styles.disabledOptionDescription
                                    ]}>
                                      {option.description}
                                    </Text>
                                  </View>
                                  
                                  {isSelected && (
                                    <Animated.View 
                                      entering={ZoomIn.duration(200)}
                                      style={styles.checkmarkContainer}
                                    >
                                      <MaterialCommunityIcons name={"check-circle"} size={20} color="#4CAF50" />
                                    </Animated.View>
                                  )}
                                </View>
                              </BlurView>
                            </TouchableOpacity>
                          </Animated.View>
                          );
                        })}
                      </View>
                    </Animated.View>
                  );
                })}
                
                {/* Custom need section */}
                <Animated.View
                  entering={FadeIn.duration(600).delay(800)}
                  layout={Layout.springify()}
                  style={styles.customSection}
                >
                  {!showCustomInput && (
                    <>
                      {customPrayerNeed ? (
                        <Animated.View 
                          entering={ZoomIn.duration(300)}
                          style={styles.customNeedDisplay}
                        >
                          <BlurView intensity={20} tint="dark" style={styles.customNeedBlur}>
                            <Text style={styles.customNeedTitle}>{config.customNeedSection.displayTitle}</Text>
                            <View style={styles.customNeedContent}>
                              <Text style={styles.customNeedText}>{customPrayerNeed}</Text>
                              <TouchableOpacity
                                style={styles.editCustomButton}
                                onPress={() => {
                                  setCustomNeedInput(customPrayerNeed);
                                  setShowCustomInput(true);
                                }}
                              >
                                <MaterialCommunityIcons name={config.customNeedSection.editButton.icon.name as MaterialIconName} size={16} color="rgba(255, 255, 255, 0.8)" />
                                <Text style={styles.editCustomButtonText}>{config.customNeedSection.editButton.text}</Text>
                              </TouchableOpacity>
                            </View>
                          </BlurView>
                        </Animated.View>
                      ) : (
                        <TouchableOpacity
                          style={styles.addCustomButton}
                          onPress={toggleCustomInput}
                          activeOpacity={0.8}
                        >
                          <BlurView intensity={20} tint="dark" style={styles.addCustomBlur}>
                            <MaterialCommunityIcons name={config.customNeedSection.addButton.icon.name as MaterialIconName} size={22} color="#FFFFFF" />
                            <Text style={styles.addCustomButtonText}>{config.customNeedSection.addButton.text}</Text>
                          </BlurView>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </Animated.View>
                
                {/* Details Input - shown when editing custom need */}
                {showCustomInput && (
                  <Animated.View
                    entering={FadeIn.duration(300)}
                    layout={Layout.springify()}
                    style={styles.customDetailSection}
                  >
                    <BlurView intensity={20} tint="dark" style={styles.detailsBlurContainer}>
                      <View style={styles.detailsContainer}>
                        <Text style={styles.detailsPrompt}>
                          {config.customNeedSection.inputTitle}
                        </Text>
                        <View style={styles.textInputContainer}>
                          <TextInput
                            style={styles.textInput}
                            placeholder={config.customNeedSection.inputPlaceholder}
                            placeholderTextColor="rgba(255, 255, 255, 0.4)"
                            multiline
                            value={customNeedInput}
                            onChangeText={setCustomNeedInput}
                            autoFocus
                            cursorColor="#FFFFFF"
                            selectionColor="#FFFFFF"
                            textAlignVertical="top"
                            maxLength={200}
                          />
                        </View>
                        <Text style={styles.charCount}>
                          {200 - customNeedInput.length}
                        </Text>
                        
                        {/* Buttons inside details container */}
                        <View style={styles.detailsButtonContainer}>
                          <TouchableOpacity
                            style={styles.detailsCancelButton}
                            onPress={cancelCustomInput}
                          >
                            <Text style={styles.detailsCancelButtonText}>
                              {config.customNeedSection.cancelButtonText || 'Cancel'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.detailsSaveButton,
                              !customNeedInput.trim() && styles.detailsSaveButtonDisabled
                            ]}
                            onPress={saveCustomNeed}
                            disabled={!customNeedInput.trim()}
                          >
                            <Text style={[
                              styles.detailsSaveButtonText,
                              !customNeedInput.trim() && styles.detailsSaveButtonTextDisabled
                            ]}>
                              {config.customNeedSection.saveButtonText || 'Save'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </BlurView>
                  </Animated.View>
                )}
              </Animated.View>
            </ScrollView>
            
            {/* Footer - Continue button always at bottom */}
            {!showCustomInput && (
              <View style={styles.footerContainer}>
                <Button
                  onPress={handleContinue}
                  variant="primary"
                  fullWidth
                  disabled={!canContinue}
                >
                  {config.continueButton.text}
                </Button>
              </View>
            )}

        </View>
      </TouchableWithoutFeedback>
      </View>
    </KeyboardAvoidingView>
    </View>
  );
}


export default PrayerNeedsScreenCore; 