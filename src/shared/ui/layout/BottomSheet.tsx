import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
  Extrapolate,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_TRANSLATE_Y = SCREEN_HEIGHT * 0.92;
const MIN_TRANSLATE_Y = SCREEN_HEIGHT * 0.1;

interface BottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const BottomSheet: React.FC<BottomSheetProps> = ({
  isVisible,
  onClose,
  title,
  children,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(MAX_TRANSLATE_Y);
  const context = useSharedValue({ y: 0 });
  const [isRendered, setIsRendered] = React.useState(isVisible);

  const scrollTo = useCallback((destination: number) => {
    'worklet';
    translateY.value = withSpring(destination, {
      damping: 45,
      stiffness: 350,
      overshootClamping: true,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 0.01,
    });
  }, [translateY]);

  const handleClose = useCallback(() => {
    scrollTo(MAX_TRANSLATE_Y);
    // Delay the actual close to allow animation to complete
    setTimeout(() => {
      runOnJS(onClose)();
    }, 300);
  }, [onClose, scrollTo]);

  useEffect(() => {
    if (isVisible && !isRendered) {
      setIsRendered(true);
    }
    
    if (isVisible) {
      // Start animation from slightly visible to create smoother keyboard appearance
      translateY.value = MAX_TRANSLATE_Y * 0.8;
      scrollTo(0);
    } else if (isRendered) {
      scrollTo(MAX_TRANSLATE_Y);
      // Delay unmounting to allow closing animation
      const timer = setTimeout(() => {
        setIsRendered(false);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isVisible, isRendered, scrollTo, translateY]);

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      translateY.value = Math.max(event.translationY + context.value.y, -MIN_TRANSLATE_Y);
    })
    .onEnd((event) => {
      if (translateY.value > MAX_TRANSLATE_Y / 3 || event.velocityY > 500) {
        runOnJS(handleClose)();
      } else {
        scrollTo(0);
      }
    });

  const animatedSheetStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const animatedBackdropStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [0, MAX_TRANSLATE_Y],
      [0.6, 0],
      Extrapolate.CLAMP
    );
    return {
      opacity: withTiming(opacity, { duration: 300 }),
    };
  });

  if (!isRendered) return null;

  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? -20 : 0}
      >
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View style={[styles.backdrop, animatedBackdropStyle]} />
        </TouchableWithoutFeedback>

        {/* Sheet */}
        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.sheetContainer, animatedSheetStyle]}>
          <View style={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
              {/* Drag Handle */}
              <View style={styles.handleContainer}>
                <View style={styles.handle} />
              </View>
            
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
            </View>
              
            {children}
          </View>
          </Animated.View>
        </GestureDetector>
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: MAX_TRANSLATE_Y,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    backgroundColor: '#1B1740',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOpacity: 0.40,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2.5,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default BottomSheet; 