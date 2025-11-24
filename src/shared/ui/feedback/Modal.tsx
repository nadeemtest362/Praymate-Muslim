/**
 * Modal Component
 * 
 * Flexible modal with bottom sheet and full screen variants
 * Preserves the app's design patterns with blur backgrounds and animations
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal as RNModal,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  FadeInUp,
  withSpring,
  useAnimatedStyle,
  useSharedValue,
  useAnimatedGestureHandler,
  runOnJS,
} from 'react-native-reanimated';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';


const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  variant?: 'bottom-sheet' | 'full-screen' | 'center';
  title?: string;
  showCloseButton?: boolean;
  showHandle?: boolean;
  animationType?: 'slide' | 'fade' | 'none';
  blurIntensity?: number;
  swipeToClose?: boolean;
  height?: number | string;
  maxHeight?: number | string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  style?: any;
  contentStyle?: any;
}

export const Modal: React.FC<ModalProps> = React.memo(({
  visible,
  onClose,
  variant = 'bottom-sheet',
  title,
  showCloseButton = true,
  showHandle = true,
  animationType = 'slide',
  blurIntensity = 20,
  swipeToClose = true,
  height,
  maxHeight,
  children,
  footer,
  style,
  contentStyle,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(0);

  const handlePressClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    { startY: number }
  >({
    onStart: (_, ctx) => {
      ctx.startY = translateY.value;
    },
    onActive: (event, ctx) => {
      if (variant === 'bottom-sheet' && swipeToClose) {
        translateY.value = Math.max(0, ctx.startY + event.translationY);
      }
    },
    onEnd: () => {
      if (variant === 'bottom-sheet' && swipeToClose) {
        if (translateY.value > 100) {
          translateY.value = withSpring(SCREEN_HEIGHT);
          runOnJS(onClose)();
        } else {
          translateY.value = withSpring(0);
        }
      }
    },
  });

  const animatedContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const renderContent = () => {
    const contentElement = (
      <>
        {showHandle && variant === 'bottom-sheet' && (
          <View style={styles.grabHandle} />
        )}
        
        {(title || showCloseButton) && (
          <View style={styles.header}>
            {title && (
              <Text style={[
                styles.title,
                variant === 'full-screen' && styles.titleFullScreen,
              ]}>
                {title}
              </Text>
            )}
            {showCloseButton && (
              <TouchableOpacity 
                onPress={handlePressClose} 
                style={styles.closeButton}
              >
                <Ionicons 
                  name="close" 
                  size={24} 
                  color={variant === 'full-screen' ? '#333' : '#FFFFFF'} 
                />
              </TouchableOpacity>
            )}
          </View>
        )}
        
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
        
        {footer && (
          <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
            {footer}
          </View>
        )}
      </>
    );

    switch (variant) {
      case 'bottom-sheet':
        return (
          <PanGestureHandler onGestureEvent={gestureHandler} enabled={swipeToClose}>
            <AnimatedView 
              style={[
                styles.bottomSheetContent,
                { 
                  paddingBottom: insets.bottom,
                  height: height,
                  maxHeight: maxHeight || '94%',
                },
                animatedContentStyle,
                contentStyle,
              ]}
              entering={SlideInDown.duration(300).springify()}
              exiting={SlideOutDown.duration(200)}
            >
              {contentElement}
            </AnimatedView>
          </PanGestureHandler>
        );

      case 'full-screen':
        return (
          <AnimatedView 
            style={[
              styles.fullScreenContent,
              { 
                paddingBottom: insets.bottom,
                height: height,
                maxHeight: maxHeight || '94%',
              },
              contentStyle,
            ]}
            entering={FadeInUp.duration(300)}
            exiting={FadeOut.duration(200)}
          >
            {contentElement}
          </AnimatedView>
        );

      case 'center':
        return (
          <AnimatedView 
            style={[
              styles.centerContent,
              contentStyle,
            ]}
            entering={FadeIn.duration(300).springify()}
            exiting={FadeOut.duration(200)}
          >
            {contentElement}
          </AnimatedView>
        );
    }
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {variant === 'center' ? (
          <TouchableOpacity 
            style={styles.backdrop} 
            activeOpacity={1} 
            onPress={handlePressClose}
          >
            <View style={styles.centerContainer}>
              <TouchableOpacity activeOpacity={1}>
                {renderContent()}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ) : variant === 'full-screen' ? (
          <AnimatedBlurView 
            intensity={blurIntensity} 
            style={[styles.container, style]}
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
          >
            <TouchableOpacity 
              style={styles.backdrop} 
              activeOpacity={1} 
              onPress={handlePressClose}
            />
            {renderContent()}
          </AnimatedBlurView>
        ) : (
          <View style={[styles.container, style]}>
            <TouchableOpacity 
              style={styles.backdrop} 
              activeOpacity={1} 
              onPress={handlePressClose}
            />
            {renderContent()}
          </View>
        )}
      </KeyboardAvoidingView>
    </RNModal>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  // Bottom Sheet styles
  bottomSheetContent: {
    backgroundColor: '#1B1740',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.40,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
  // Full Screen styles
  fullScreenContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
  },
  // Center styles
  centerContent: {
    backgroundColor: '#1B1740',
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 20,
    minWidth: 300,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  grabHandle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    minHeight: 44,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    marginRight: 24, // Balance with close button
  },
  titleFullScreen: {
    fontSize: 20,
    color: '#333',
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  footer: {
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
});

Modal.displayName = 'Modal'; 