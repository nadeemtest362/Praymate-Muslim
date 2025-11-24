import React from 'react';
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { DetailsInputProps } from './types';

const customTransition = LinearTransition.springify()
  .damping(26)
  .mass(1.2)
  .stiffness(100);

export const DetailsInput: React.FC<DetailsInputProps> = ({
  details,
  currentCategory,
  maxLength,
  onChangeText,
}) => {
  if (!currentCategory) return null;

  return (
    <View style={styles.detailsBlurContainer}>
      <Animated.View
        style={styles.detailsContainer}
        entering={FadeIn.duration(300)}
        layout={customTransition}
      >
        <Text style={styles.detailsPrompt}>
          {currentCategory.customDetailPrompt || `Details about this ${currentCategory.label} need:`}
        </Text>

        <View style={styles.textInputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder={currentCategory.customDetailPlaceholder || "Add specific details here..."}
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
            value={details}
            onChangeText={onChangeText}
            autoFocus
            cursorColor="#FFFFFF"
            selectionColor="#FFFFFF"
            returnKeyType="default"
            maxLength={maxLength}
            multiline
            textAlignVertical="top"
          />
        </View>
        <Text style={styles.charCount}>
          {maxLength - details.length}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  detailsBlurContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    overflow: 'hidden',
   
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  detailsContainer: {
    width: '100%',
    padding: 20,
  },
  detailsPrompt: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  textInputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 6,
    borderWidth: StyleSheet.hairlineWidth,
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
    fontSize: 18,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 8,
    lineHeight: 24,
  },
  charCount: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'right',
    marginTop: 8,
    marginRight: 6,
  },
}); 