import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, spacing } from '../../theme';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function SkeletonLoader({ 
  width = '100%', 
  height = 20, 
  borderRadius: customBorderRadius,
  style 
}: SkeletonLoaderProps) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0, { duration: 1000 })
      ),
      -1
    );
  }, [shimmer]);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      shimmer.value,
      [0, 0.5, 1],
      [0.3, 0.5, 0.3]
    );
    
    return {
      opacity,
    };
  });

  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius: customBorderRadius ?? borderRadius.medium,
        },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <LinearGradient
          colors={['#E0E0E0', '#F0F0F0', '#E0E0E0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

interface SkeletonTextProps {
  lines?: number;
  widths?: (number | string)[];
  style?: any;
}

export function SkeletonText({ 
  lines = 3, 
  widths = ['100%', '80%', '60%'],
  style 
}: SkeletonTextProps) {
  return (
    <View style={style}>
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonLoader
          key={index}
          width={widths[index] || widths[widths.length - 1]}
          height={16}
          style={index > 0 ? { marginTop: spacing.small } : undefined}
        />
      ))}
    </View>
  );
}

interface SkeletonCardProps {
  showAvatar?: boolean;
  showTitle?: boolean;
  showDescription?: boolean;
  style?: any;
}

export function SkeletonCard({
  showAvatar = true,
  showTitle = true,
  showDescription = true,
  style,
}: SkeletonCardProps) {
  return (
    <View style={[styles.card, style]}>
      {showAvatar && (
        <SkeletonLoader
          width={60}
          height={60}
          borderRadius={30}
          style={styles.avatar}
        />
      )}
      <View style={styles.cardContent}>
        {showTitle && (
          <SkeletonLoader
            width="60%"
            height={24}
            style={styles.title}
          />
        )}
        {showDescription && (
          <SkeletonText
            lines={2}
            widths={['100%', '90%']}
            style={styles.description}
          />
        )}
      </View>
    </View>
  );
}

interface OnboardingSkeletonScreenProps {
  variant?: 'default' | 'withCards' | 'withForm' | 'withOptions';
}

export function OnboardingSkeletonScreen({ 
  variant = 'default' 
}: OnboardingSkeletonScreenProps) {
  const renderContent = () => {
    switch (variant) {
      case 'withCards':
        return (
          <>
            <SkeletonCard style={styles.skeletonCard} />
            <SkeletonCard style={styles.skeletonCard} />
            <SkeletonCard style={styles.skeletonCard} />
          </>
        );
      
      case 'withForm':
        return (
          <>
            <SkeletonLoader
              width="100%"
              height={56}
              style={styles.input}
            />
            <SkeletonLoader
              width="100%"
              height={56}
              style={styles.input}
            />
            <SkeletonLoader
              width="100%"
              height={120}
              style={styles.input}
            />
          </>
        );
      
      case 'withOptions':
        return (
          <View style={styles.optionsGrid}>
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonLoader
                key={index}
                width="48%"
                height={80}
                style={styles.option}
              />
            ))}
          </View>
        );
      
      default:
        return (
          <>
            <SkeletonText
              lines={3}
              widths={['100%', '90%', '80%']}
              style={styles.content}
            />
            <SkeletonLoader
              width="100%"
              height={200}
              style={styles.mainContent}
            />
          </>
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Header skeleton */}
      <View style={styles.header}>
        <SkeletonLoader
          width="70%"
          height={32}
          style={styles.headerTitle}
        />
        <SkeletonText
          lines={2}
          widths={['90%', '70%']}
          style={styles.headerSubtitle}
        />
      </View>

      {/* Content skeleton */}
      <View style={styles.body}>
        {renderContent()}
      </View>

      {/* Button skeleton */}
      <View style={styles.footer}>
        <SkeletonLoader
          width="100%"
          height={56}
          borderRadius={12}
          style={styles.button}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E0E0E0',
    overflow: 'hidden',
  },
  card: {
    flexDirection: 'row',
    padding: spacing.medium,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.large,
  },
  avatar: {
    marginRight: spacing.medium,
  },
  cardContent: {
    flex: 1,
  },
  title: {
    marginBottom: spacing.small,
  },
  description: {
    marginTop: spacing.small,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    paddingHorizontal: spacing.large,
    paddingTop: spacing.xxlarge,
    paddingBottom: spacing.large,
  },
  headerTitle: {
    marginBottom: spacing.medium,
  },
  headerSubtitle: {
    marginTop: spacing.small,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.large,
  },
  content: {
    marginBottom: spacing.large,
  },
  mainContent: {
    marginBottom: spacing.large,
  },
  skeletonCard: {
    marginBottom: spacing.medium,
  },
  input: {
    marginBottom: spacing.medium,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  option: {
    marginBottom: spacing.medium,
  },
  footer: {
    paddingHorizontal: spacing.large,
    paddingBottom: spacing.xlarge,
  },
  button: {
    marginTop: spacing.medium,
  },
}); 