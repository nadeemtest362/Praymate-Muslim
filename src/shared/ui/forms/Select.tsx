/**
 * Select Component
 * 
 * Custom dropdown/select with modal picker following the app's design
 */

import React, { useState } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import Animated, {
  SlideInDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import type { Size } from '../types';

const AnimatedView = Animated.createAnimatedComponent(View);

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  error?: string;
  size?: Size;
  disabled?: boolean;
  haptic?: boolean;
  style?: any;
}

export const Select: React.FC<SelectProps> = React.memo(({
  value,
  onValueChange,
  options,
  placeholder = 'Select an option',
  label,
  error,
  size = 'medium',
  disabled = false,
  haptic = true,
  style,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedOption = options.find(opt => opt.value === value);
  
  const handlePress = () => {
    if (disabled) return;
    
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    setIsOpen(true);
  };
  
  const handleSelect = (optionValue: string, optionDisabled?: boolean) => {
    if (optionDisabled) return;
    
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    onValueChange?.(optionValue);
    setIsOpen(false);
  };
  
  const handleClose = () => {
    setIsOpen(false);
  };
  
  const containerStyles = [
    styles.container,
    styles[`container_${size}`],
    error && styles.containerError,
    disabled && styles.containerDisabled,
  ];
  
  return (
    <View style={[styles.wrapper, style]}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.8}
        style={containerStyles}
      >
        <View style={styles.content}>
          {selectedOption?.icon && (
            <View style={styles.iconLeft}>{selectedOption.icon}</View>
          )}
          <Text style={[
            styles.text,
            styles[`text_${size}`],
            !selectedOption && styles.placeholder,
          ]}>
            {selectedOption?.label || placeholder}
          </Text>
        </View>
        <Ionicons 
          name="chevron-down" 
          size={size === 'small' ? 18 : size === 'medium' ? 20 : 22} 
          color="rgba(255, 255, 255, 0.5)" 
        />
      </TouchableOpacity>
      
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
      
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleClose}
        >
          <AnimatedView 
            entering={SlideInDown.duration(300).springify()}
            style={styles.modalContent}
          >
            <SafeAreaView>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {label || 'Select an option'}
                </Text>
                <TouchableOpacity onPress={handleClose}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              
              <ScrollView 
                style={styles.optionsList}
                showsVerticalScrollIndicator={false}
              >
                {options.map((option) => {
                  const isSelected = option.value === value;
                  const isDisabled = option.disabled;
                  
                  return (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => handleSelect(option.value, option.disabled)}
                      disabled={isDisabled}
                      activeOpacity={0.8}
                      style={[
                        styles.option,
                        isSelected && styles.optionSelected,
                        isDisabled && styles.optionDisabled,
                      ]}
                    >
                      {option.icon && (
                        <View style={styles.optionIcon}>{option.icon}</View>
                      )}
                      <Text style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected,
                        isDisabled && styles.optionTextDisabled,
                      ]}>
                        {option.label}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark" size={20} color="#7C71E0" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </SafeAreaView>
          </AnimatedView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    paddingLeft: 4,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
  },
  container_small: {
    height: 44,
  },
  container_medium: {
    height: 56,
  },
  container_large: {
    height: 64,
  },
  containerError: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  containerDisabled: {
    opacity: 0.6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  text_small: {
    fontSize: 14,
  },
  text_medium: {
    fontSize: 16,
  },
  text_large: {
    fontSize: 18,
  },
  placeholder: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
    paddingLeft: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1B4B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  optionsList: {
    padding: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  optionSelected: {
    backgroundColor: 'rgba(124, 113, 224, 0.15)',
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionIcon: {
    marginRight: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  optionTextSelected: {
    color: '#7C71E0',
    fontWeight: '600',
  },
  optionTextDisabled: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
});

Select.displayName = 'Select'; 