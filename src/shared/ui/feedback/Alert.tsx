/**
 * Alert Component
 * 
 * Dialog for confirmations, warnings, and messages
 * Uses the Modal component internally with center variant
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Modal } from './Modal';
import { Button } from '../core/Button';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

export interface AlertAction {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  icon?: React.ReactNode;
  type?: 'info' | 'success' | 'warning' | 'error';
  actions?: AlertAction[];
  closeOnBackdrop?: boolean;
}

const typeIcons = {
  info: <Ionicons name="information-circle" size={48} color="#3D83E8" />,
  success: <Ionicons name="checkmark-circle" size={48} color="#4ADE80" />,
  warning: <Ionicons name="warning" size={48} color="#FFB800" />,
  error: <Ionicons name="close-circle" size={48} color="#EF4444" />,
};

export const Alert: React.FC<AlertProps> = React.memo(({
  visible,
  onClose,
  title,
  message,
  icon,
  type,
  actions = [{ text: 'OK', onPress: onClose }],
  closeOnBackdrop = false,
}) => {
  const renderIcon = () => {
    if (icon) return icon;
    if (type) return typeIcons[type];
    return null;
  };

  const handleAction = (action: AlertAction) => {
    action.onPress?.();
    if (action.style !== 'cancel') {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={closeOnBackdrop ? onClose : () => {}}
      variant="center"
      showCloseButton={false}
      showHandle={false}
    >
      <Animated.View 
        entering={FadeIn.duration(200)}
        style={styles.content}
      >
        {renderIcon() && (
          <View style={styles.iconContainer}>
            {renderIcon()}
          </View>
        )}
        
        <Text style={styles.title}>{title}</Text>
        
        {message && (
          <Text style={styles.message}>{message}</Text>
        )}
        
        <View style={styles.actions}>
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={
                action.style === 'destructive' ? 'ghost' : 
                action.style === 'cancel' ? 'secondary' : 
                'primary'
              }
              size="medium"
              onPress={() => handleAction(action)}
              style={[
                styles.actionButton,
                actions.length === 1 && styles.singleActionButton,
                action.style === 'destructive' && styles.destructiveButton,
              ]}
            >
              <Text style={[
                styles.actionText,
                action.style === 'destructive' && styles.destructiveText,
              ]}>
                {action.text}
              </Text>
            </Button>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  actionButton: {
    minWidth: 100,
    flex: 1,
  },
  singleActionButton: {
    maxWidth: 200,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  destructiveButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  destructiveText: {
    color: '#EF4444',
  },
});

Alert.displayName = 'Alert'; 