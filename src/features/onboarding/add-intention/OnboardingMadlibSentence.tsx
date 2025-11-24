import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Animated, { 
  FadeIn,
  LinearTransition,
} from 'react-native-reanimated';
import { Avatar } from '../../../shared/ui';
import { AddIntentionScreenConfig, DisplayCategory } from './types';
import { PrayerFocusPerson } from '../../../stores/onboardingStore';
import useResponsive from '../../../hooks/useResponsive';

const customTransition = LinearTransition.springify()
  .damping(26)
  .mass(1.2)
  .stiffness(100);

interface OnboardingMadlibSentenceProps {
  isSelfMode: boolean;
  currentPerson: PrayerFocusPerson | null;
  currentCategory: DisplayCategory | null;
  needDetails: string;
  showDetailsInput: boolean;
  config: AddIntentionScreenConfig;
  onNeedClick: () => void;
  onDetailsClick: () => void;
}

export const OnboardingMadlibSentence: React.FC<OnboardingMadlibSentenceProps> = ({
  isSelfMode,
  currentPerson,
  currentCategory,
  needDetails,
  showDetailsInput,
  config,
  onNeedClick,
  onDetailsClick,
}) => {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);
  const { intentionPrompt } = config.intentionCollectionPhase;
  
  // Extract first name only, handling suffixes
  const getFirstName = (fullName: string) => {
    if (!fullName) return '';
    
    // If it starts with an emoji, return as is
    if (/\p{Emoji}/u.test(Array.from(fullName.trim())[0] || '')) {
      return fullName;
    }
    
    // Split by spaces and get the first part
    const parts = fullName.trim().split(' ');
    return parts[0] || fullName;
  };

  return (
    <Animated.View
      entering={FadeIn.delay(200).duration(600)}
      style={styles.madlibContainer}
      layout={customTransition}
    >
      {/* Person Display - Only show for non-self mode */}
      {!isSelfMode && currentPerson && (
        <View style={styles.madlibPill}>
          {/* Only show avatar if name doesn't start with emoji */}
          {!/\p{Emoji}/u.test(Array.from(currentPerson.name.trim())[0] || '') && (
            <Avatar size={R.w(4.5)} image_uri={currentPerson.image_uri} name={currentPerson.name} />
          )}
          <Text style={[
            styles.pillText, 
            { marginLeft: /\p{Emoji}/u.test(Array.from(currentPerson.name.trim())[0] || '') ? 0 : R.w(1.5) }
          ]}>
            {getFirstName(currentPerson.name)}
          </Text>
        </View>
      )}

      <Text style={styles.madlibText}>
        {isSelfMode 
          ? (intentionPrompt.madlibConnectorNeeds || 'I want to focus on')
          : (intentionPrompt.madlibConnectorNeeds || 'needs')}
      </Text>

      {/* What Component */}
      <TouchableOpacity
        style={styles.madlibPill}
        onPress={onNeedClick}
        activeOpacity={0.7}
      >
        {currentCategory ? (
          <>
            {currentCategory.emoji && <Text style={styles.pillEmoji}>{currentCategory.emoji}</Text>}
            <Text style={styles.pillText}>
              {currentCategory.id === 'other' ? 'Prayers' : currentCategory.label}
            </Text>
          </>
        ) : (
          <Text style={styles.emptyPillText}>
            {intentionPrompt.madlibPlaceholderWhat || 'what...'}
          </Text>
        )}
      </TouchableOpacity>


    </Animated.View>
  );
};

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  madlibContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: R.h(2),
    paddingHorizontal: R.w(3),
    paddingTop: R.h(0.5),
  },
  madlibText: {
    fontSize: R.font(24),
    fontFamily: 'SNPro-Semibold',
    color: '#FFFFFF',
    marginHorizontal: R.w(3),
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  madlibPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 9999,
    paddingHorizontal: R.w(2.5),
    paddingVertical: R.h(1),
    marginVertical: R.h(0.5),
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 6,
      },
    }),
  },
  pillEmoji: {
    fontSize: R.font(20),
    marginRight: R.w(1.5),
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: R.font(22),
    fontFamily: 'SNPro-Heavy',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  emptyPillText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: R.font(20),
    fontFamily: 'SNPro-Regular',
    fontStyle: 'italic',
  },
}); 