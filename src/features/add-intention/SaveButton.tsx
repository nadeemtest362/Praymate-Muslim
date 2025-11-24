import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  ActivityIndicator, 
  StyleSheet, 
  Platform 
} from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { FloatingActionButtonProps } from './types';

const customTransition = LinearTransition.springify()
  .damping(26)
  .mass(1.2)
  .stiffness(100);

export const SaveButton: React.FC<FloatingActionButtonProps> = ({
  isCompletable,
  isLoading,
  isEditing,
  onSave,
}) => {
  return (
    <Animated.View
      layout={customTransition}
      style={styles.saveButtonContainer}
    >
      <TouchableOpacity
        style={[
          styles.saveButton,
          !isCompletable && styles.disabledButton
        ]}
        onPress={onSave}
        disabled={!isCompletable || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#1A1B4B" />
        ) : (
          <Text style={styles.saveButtonText}>
            {isEditing ? 'Save Changes' : 'Add Intention'}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  saveButtonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    width: '100%',
  },
  saveButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
  disabledButton: {
    opacity: 0.6,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  saveButtonText: {
    color: '#1A1B4B',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
}); 