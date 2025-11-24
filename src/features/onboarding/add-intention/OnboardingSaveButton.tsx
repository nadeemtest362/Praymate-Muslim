import React, { useMemo } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Animated, {
  LinearTransition,
} from 'react-native-reanimated';
import { AddIntentionScreenConfig } from './types';
import useResponsive from '../../../hooks/useResponsive';

const customTransition = LinearTransition.springify()
  .damping(26)
  .mass(1.2)
  .stiffness(100);

interface OnboardingSaveButtonProps {
  isCompletable: boolean;
  isLoading: boolean;
  isSelfMode: boolean;
  currentPersonIndex: number;
  prayerFocusPeopleLength: number;
  config: AddIntentionScreenConfig;
  showDetailsInput?: boolean;
  onSave: () => void;
}

export const OnboardingSaveButton: React.FC<OnboardingSaveButtonProps> = ({
  isCompletable,
  isLoading,
  isSelfMode,
  currentPersonIndex,
  prayerFocusPeopleLength,
  config,
  showDetailsInput = false,
  onSave,
}) => {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);
  
  const getButtonText = () => {
    if (isSelfMode) {
      return config.intentionCollectionPhase.finishButtonText || 'Save & Continue';
    }
    if (currentPersonIndex < prayerFocusPeopleLength - 1) {
      return config.intentionCollectionPhase.nextButtonText || 'Next Person';
    }
    return config.intentionCollectionPhase.finishButtonText || 'Finish & Continue';
  };

  // Show button when details input is visible OR when it's completable
  if (!showDetailsInput && !isCompletable && !isLoading) {
    return null;
  }

  return (
    <Animated.View
      layout={customTransition}
      style={styles.saveButtonContainer}
    >
      <TouchableOpacity
        style={[
          styles.saveButton,
          (!isCompletable || isLoading) && styles.saveButtonDisabled
        ]}
        onPress={onSave}
        disabled={!isCompletable || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#1A1B4B" />
        ) : (
          <Text style={[
            styles.saveButtonText,
            !isCompletable && styles.saveButtonTextDisabled
          ]}>
            {getButtonText()}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  saveButtonContainer: {
    paddingHorizontal: R.w(4),
    paddingBottom: R.h(2.5),
    width: '100%',
  },
  saveButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: R.w(8),
    paddingVertical: R.h(2.5),
    paddingHorizontal: R.w(6),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: R.h(1),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    ...Platform.select({
      ios: {
        shadowOpacity: 0.1,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  saveButtonText: {
    color: '#1A1B4B',
    fontSize: R.font(22),
    fontFamily: "SNPro-Heavy",
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  saveButtonTextDisabled: {
    color: 'rgba(26, 27, 75, 0.4)',
  },
}); 