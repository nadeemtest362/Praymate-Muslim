/**
 * Toast Component
 * 
 * Non-blocking notification system with animations
 * Supports multiple toast instances and auto-dismiss
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  SlideInUp,
  SlideOutUp,
  Layout,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export interface ToastProps {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onPress: () => void;
  };
  onDismiss?: (id: string) => void;
}

const typeConfigs = {
  info: {
    icon: <Ionicons name="information-circle" size={20} color="#FFFFFF" />,
    backgroundColor: 'rgba(61, 131, 232, 0.97)',
  },
  success: {
    icon: <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />,
    backgroundColor: 'rgba(74, 222, 128, 0.97)',
  },
  warning: {
    icon: <Ionicons name="warning" size={20} color="#1A1B4B" />,
    backgroundColor: 'rgba(255, 184, 0, 0.97)',
  },
  error: {
    icon: <Ionicons name="close-circle" size={20} color="#FFFFFF" />,
    backgroundColor: 'rgba(239, 68, 68, 0.97)',
  },
};

export const Toast: React.FC<ToastProps> = React.memo(({
  id,
  message,
  type = 'info',
  duration = 4000,
  icon,
  action,
  onDismiss,
}) => {
  const handleDismiss = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss?.(id);
  }, [id, onDismiss]);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onDismiss?.(id);
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [duration, id, onDismiss]);

  const config = typeConfigs[type];
  const renderIcon = icon || config.icon;

  return (
    <AnimatedTouchableOpacity
      entering={SlideInUp.duration(300).springify()}
      exiting={SlideOutUp.duration(200)}
      layout={Layout.springify()}
      style={[
        styles.container,
        { backgroundColor: config.backgroundColor },
      ]}
      onPress={handleDismiss}
      activeOpacity={0.9}
    >
      {renderIcon && (
        <View style={styles.iconContainer}>
          {renderIcon}
        </View>
      )}
      
      <Text style={[
        styles.message,
        type === 'warning' && styles.messageWarning,
      ]}>
        {message}
      </Text>
      
      {action && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            action.onPress();
            handleDismiss();
          }}
        >
          <Text style={[
            styles.actionText,
            type === 'warning' && styles.actionTextWarning,
          ]}>
            {action.label}
          </Text>
        </TouchableOpacity>
      )}
      
      <TouchableOpacity
        style={styles.closeButton}
        onPress={handleDismiss}
      >
        <Ionicons 
          name="close" 
          size={18} 
          color={type === 'warning' ? '#1A1B4B' : '#FFFFFF'} 
        />
      </TouchableOpacity>
    </AnimatedTouchableOpacity>
  );
});

// Toast Container to manage multiple toasts
interface ToastContainerProps {
  toasts: ToastProps[];
  onDismiss: (id: string) => void;
  position?: 'top' | 'bottom';
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
  position = 'top',
}) => {
  const insets = useSafeAreaInsets();
  
  return (
    <View 
      style={[
        styles.containerWrapper,
        position === 'top' ? {
          top: insets.top + 10,
        } : {
          bottom: insets.bottom + 10,
        },
      ]}
      pointerEvents="box-none"
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onDismiss={onDismiss}
        />
      ))}
    </View>
  );
};

// Hook for managing toasts
export const useToast = () => {
  const [toasts, setToasts] = React.useState<ToastProps[]>([]);

  const showToast = useCallback((toast: Omit<ToastProps, 'id' | 'onDismiss'>) => {
    const id = Date.now().toString();
    const newToast: ToastProps = {
      ...toast,
      id,
    };
    
    setToasts((prev) => [...prev, newToast]);
    
    // Haptic feedback
    Haptics.notificationAsync(
      toast.type === 'success' ? Haptics.NotificationFeedbackType.Success :
      toast.type === 'error' ? Haptics.NotificationFeedbackType.Error :
      Haptics.NotificationFeedbackType.Warning
    );
    
    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const dismissAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    showToast,
    dismissToast,
    dismissAllToasts,
  };
};

const styles = StyleSheet.create({
  containerWrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    gap: 8,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    minHeight: 48,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  iconContainer: {
    marginRight: 12,
  },
  message: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  messageWarning: {
    color: '#1A1B4B',
  },
  actionButton: {
    marginLeft: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  actionTextWarning: {
    color: '#1A1B4B',
  },
  closeButton: {
    marginLeft: 8,
    padding: 4,
  },
});

Toast.displayName = 'Toast'; 