import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Platform,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { AddIntentionScreenConfig, DisplayCategory, DETAILS_MAX_LENGTH } from './types';
import useResponsive from '../../../hooks/useResponsive';

const customTransition = LinearTransition.springify()
  .damping(26)
  .mass(1.2)
  .stiffness(100);

interface OnboardingDetailsInputProps {
  needDetails: string;
  currentCategory: DisplayCategory | null;
  config: AddIntentionScreenConfig;
  onChangeText: (text: string) => void;
}

export const OnboardingDetailsInput: React.FC<OnboardingDetailsInputProps> = ({
  needDetails,
  currentCategory,
  config,
  onChangeText,
}) => {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);
  
  if (!currentCategory) return null;

  return (
    <BlurView intensity={20} tint="dark" style={styles.detailsBlurContainer}>
      <Animated.View
        style={styles.selectorContainer}
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        layout={customTransition}
      >
        <View style={styles.detailsContainer}>
          <Text style={styles.detailsPrompt}>
            {currentCategory.customDetailPrompt ||
              `Details about this ${currentCategory.label} need:`}
          </Text>

          <View style={styles.textInputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder={
                currentCategory.customDetailPlaceholder || 
                config.intentionCollectionPhase.intentionPrompt.detailsInputPlaceholder ||
                "Add specific details here..."
              }
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              multiline
              value={needDetails}
              onChangeText={onChangeText}
              autoFocus
              cursorColor="#FFFFFF"
              selectionColor="#FFFFFF"
              textAlignVertical="top"
              maxLength={DETAILS_MAX_LENGTH}
            />
          </View>
          <Text style={styles.charCount}>
            {DETAILS_MAX_LENGTH - needDetails.length}
          </Text>
        </View>
      </Animated.View>
    </BlurView>
  );
};

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  detailsBlurContainer: {
    borderRadius: R.w(6),
    overflow: 'hidden',
    marginBottom: R.h(0.5),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  selectorContainer: {
    backgroundColor: 'transparent',
    borderRadius: R.w(5),
    padding: R.w(5),
  },
  detailsContainer: {
    width: '100%',
  },
  detailsPrompt: {
    fontSize: R.font(18),
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: R.h(2),
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
    fontSize: R.font(16),
    fontWeight: '500',
    padding: R.w(4),
    minHeight: R.h(5),
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
}); 