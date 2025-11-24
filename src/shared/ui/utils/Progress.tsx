import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  useAnimatedProps,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';
import { baseTheme } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Linear Progress Component
export interface LinearProgressProps {
  /**
   * Progress value (0-100)
   */
  value: number;
  /**
   * Height of the progress bar
   */
  height?: number;
  /**
   * Background color
   */
  backgroundColor?: string;
  /**
   * Progress color
   */
  progressColor?: string;
  /**
   * Show percentage text
   */
  showPercentage?: boolean;
  /**
   * Additional styles
   */
  style?: ViewStyle;
  /**
   * Animation duration
   */
  animationDuration?: number;
}

export function LinearProgress({
  value,
  height = 4,
  backgroundColor = 'rgba(255, 255, 255, 0.2)',
  progressColor = baseTheme.colors.primary,
  showPercentage = false,
  style,
  animationDuration = 300,
}: LinearProgressProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(value, {
      duration: animationDuration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, animationDuration, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return (
    <View style={[styles.linearContainer, { height }, style]}>
      <View style={[styles.linearBackground, { backgroundColor, height }]}>
        <Animated.View
          style={[
            styles.linearProgress,
            { backgroundColor: progressColor, height },
            animatedStyle,
          ]}
        />
      </View>
      {showPercentage && (
        <Text style={styles.percentageText}>{Math.round(value)}%</Text>
      )}
    </View>
  );
}

// Circular Progress Component
export interface CircularProgressProps {
  /**
   * Progress value (0-100)
   */
  value: number;
  /**
   * Size of the circle
   */
  size?: number;
  /**
   * Stroke width
   */
  strokeWidth?: number;
  /**
   * Background stroke color
   */
  backgroundColor?: string;
  /**
   * Progress stroke color
   */
  progressColor?: string;
  /**
   * Show percentage text in center
   */
  showPercentage?: boolean;
  /**
   * Custom center content
   */
  centerContent?: React.ReactNode;
  /**
   * Additional styles
   */
  style?: ViewStyle;
  /**
   * Text style
   */
  textStyle?: TextStyle;
  /**
   * Animation duration
   */
  animationDuration?: number;
}

export function CircularProgress({
  value,
  size = 100,
  strokeWidth = 4,
  backgroundColor = 'rgba(255, 255, 255, 0.2)',
  progressColor = baseTheme.colors.primary,
  showPercentage = true,
  centerContent,
  style,
  textStyle,
  animationDuration = 300,
}: CircularProgressProps) {
  const progress = useSharedValue(0);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    progress.value = withTiming(value / 100, {
      duration: animationDuration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, animationDuration, progress]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - progress.value);
    return {
      strokeDashoffset,
    };
  });

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFillObject}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={progressColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      
      {/* Center content */}
      <View style={styles.circularCenter}>
        {centerContent ? (
          centerContent
        ) : showPercentage ? (
          <Text style={[styles.circularText, textStyle]}>
            {Math.round(value)}%
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// Progress Ring Component (simplified circular for small indicators)
export interface ProgressRingProps {
  /**
   * Progress value (0-1)
   */
  value: number;
  /**
   * Size of the ring
   */
  size?: number;
  /**
   * Ring thickness
   */
  thickness?: number;
  /**
   * Ring color
   */
  color?: string;
}

export function ProgressRing({
  value,
  size = 24,
  thickness = 3,
  color = baseTheme.colors.primary,
}: ProgressRingProps) {
  return (
    <CircularProgress
      value={value * 100}
      size={size}
      strokeWidth={thickness}
      progressColor={color}
      showPercentage={false}
    />
  );
}

const styles = StyleSheet.create({
  // Linear Progress styles
  linearContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  linearBackground: {
    flex: 1,
    borderRadius: 2,
    overflow: 'hidden',
  },
  linearProgress: {
    borderRadius: 2,
  },
  percentageText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '600',
    color: baseTheme.colors.text.primary,
  },
  
  // Circular Progress styles
  circularCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularText: {
    fontSize: 20,
    fontWeight: '700',
    color: baseTheme.colors.text.primary,
  },
}); 