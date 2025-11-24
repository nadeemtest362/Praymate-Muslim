import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors, spacing, typography } from '../../../../theme';
import { Ionicons } from '@expo/vector-icons';

interface FallbackProps {
  onRetry?: () => void;
  onGoBack?: () => void;
  onContinue?: () => void;
  message?: string;
  title?: string;
}

/**
 * Base fallback container with gradient background
 */
const FallbackContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#003366', '#B94A5A', '#FF8C42']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[
        styles.content,
        {
          paddingTop: insets.top + spacing.xlarge,
          paddingBottom: insets.bottom + spacing.xlarge,
        }
      ]}>
        {children}
      </View>
    </View>
  );
};

/**
 * Missing State Fallback - When required data is missing
 */
export const MissingStateFallback: React.FC<FallbackProps & {
  missingItem?: string;
}> = ({ 
  onGoBack, 
  onRetry,
  title = "Missing Information",
  message,
  missingItem = "required data"
}) => {
  return (
    <FallbackContainer>
      <View style={styles.iconContainer}>
        <Ionicons name="warning-outline" size={64} color={colors.warning} />
      </View>
      
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>
        {message || `We couldn't find the ${missingItem} needed for this step. This might happen if you navigated here directly.`}
      </Text>
      
      <View style={styles.buttonContainer}>
        {onGoBack && (
          <Pressable style={styles.secondaryButton} onPress={onGoBack}>
            <Text style={styles.secondaryButtonText}>Go Back</Text>
          </Pressable>
        )}
        {onRetry && (
          <Pressable style={styles.primaryButton} onPress={onRetry}>
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </Pressable>
        )}
      </View>
    </FallbackContainer>
  );
};

/**
 * Loading State Fallback - Consistent loading UI
 */
export const LoadingStateFallback: React.FC<{
  message?: string;
  showProgress?: boolean;
  progress?: number;
}> = ({ message = "Loading...", showProgress = false, progress = 0 }) => {
  const rotation = useSharedValue(0);

  React.useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 2000 }),
      -1,
      false
    );
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <FallbackContainer>
      <Animated.View style={[styles.loadingIcon, animatedStyle]}>
        <Text style={styles.prayerEmoji}>🙏</Text>
      </Animated.View>
      
      <Text style={styles.loadingText}>{message}</Text>
      
      {showProgress && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${Math.min(100, Math.max(0, progress))}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        </View>
      )}
    </FallbackContainer>
  );
};

/**
 * Permission Denied Fallback - When user denies permissions
 */
export const PermissionDeniedFallback: React.FC<FallbackProps & {
  permissionType: 'contacts' | 'notifications' | 'camera';
  onSkip?: () => void;
}> = ({
  permissionType,
  onRetry,
  onSkip,
  onContinue,
  title,
  message
}) => {
  const icons = {
    contacts: 'people-outline',
    notifications: 'notifications-outline',
    camera: 'camera-outline',
  };

  const defaultMessages = {
    contacts: "We need access to your contacts to help you add people to pray for. You can still add them manually.",
    notifications: "Notifications help remind you to pray. You can always enable them later in settings.",
    camera: "Camera access lets you add photos. You can skip this for now.",
  };

  return (
    <FallbackContainer>
      <View style={styles.iconContainer}>
        <Ionicons 
          name={icons[permissionType] as any} 
          size={64} 
          color={colors.text.primary} 
        />
        <View style={styles.deniedBadge}>
          <Ionicons name="close-circle" size={24} color={colors.error} />
        </View>
      </View>
      
      <Text style={styles.title}>
        {title || `${permissionType.charAt(0).toUpperCase() + permissionType.slice(1)} Access Denied`}
      </Text>
      <Text style={styles.message}>
        {message || defaultMessages[permissionType]}
      </Text>
      
      <View style={styles.buttonContainer}>
        {onRetry && (
          <Pressable style={styles.primaryButton} onPress={onRetry}>
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </Pressable>
        )}
        {(onSkip || onContinue) && (
          <Pressable style={styles.secondaryButton} onPress={onSkip || onContinue}>
            <Text style={styles.secondaryButtonText}>
              {onSkip ? 'Skip for Now' : 'Continue Without'}
            </Text>
          </Pressable>
        )}
      </View>
    </FallbackContainer>
  );
};

/**
 * Offline State Fallback - When network is unavailable
 */
export const OfflineStateFallback: React.FC<FallbackProps & {
  canContinueOffline?: boolean;
}> = ({
  onRetry,
  onContinue,
  canContinueOffline = true,
  title = "You're Offline",
  message
}) => {
  return (
    <FallbackContainer>
      <View style={styles.iconContainer}>
        <Ionicons name="cloud-offline-outline" size={64} color={colors.text.primary} />
      </View>
      
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>
        {message || (canContinueOffline 
          ? "Don't worry! Your data will be saved and synced when you're back online."
          : "This step requires an internet connection. Please check your connection and try again."
        )}
      </Text>
      
      <View style={styles.buttonContainer}>
        {onRetry && (
          <Pressable style={styles.primaryButton} onPress={onRetry}>
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        )}
        {canContinueOffline && onContinue && (
          <Pressable style={styles.secondaryButton} onPress={onContinue}>
            <Text style={styles.secondaryButtonText}>Continue Offline</Text>
          </Pressable>
        )}
      </View>
    </FallbackContainer>
  );
};

/**
 * Error State Fallback - Generic error display
 */
export const ErrorStateFallback: React.FC<FallbackProps & {
  error?: Error | string;
  showDetails?: boolean;
}> = ({
  error,
  onRetry,
  onGoBack,
  title = "Oops! Something went wrong",
  message,
  showDetails = false
}) => {
  const errorMessage = error instanceof Error ? error.message : error;
  
  return (
    <FallbackContainer>
      <View style={styles.iconContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
      </View>
      
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>
        {message || "We encountered an unexpected error. Please try again."}
      </Text>
      
      {showDetails && errorMessage && (
        <ScrollView style={styles.errorDetails}>
          <Text style={styles.errorDetailsText}>{errorMessage}</Text>
        </ScrollView>
      )}
      
      <View style={styles.buttonContainer}>
        {onGoBack && (
          <Pressable style={styles.secondaryButton} onPress={onGoBack}>
            <Text style={styles.secondaryButtonText}>Go Back</Text>
          </Pressable>
        )}
        {onRetry && (
          <Pressable style={styles.primaryButton} onPress={onRetry}>
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </Pressable>
        )}
      </View>
    </FallbackContainer>
  );
};

/**
 * Empty State Fallback - When lists are empty
 */
export const EmptyStateFallback: React.FC<FallbackProps & {
  itemType?: string;
  onAdd?: () => void;
}> = ({
  itemType = "items",
  onAdd,
  onContinue,
  title,
  message
}) => {
  return (
    <FallbackContainer>
      <View style={styles.emptyStateImage}>
        <Text style={styles.emptyStateEmoji}>📋</Text>
      </View>
      
      <Text style={styles.title}>{title || `No ${itemType} yet`}</Text>
      <Text style={styles.message}>
        {message || `Add some ${itemType} to get started with your prayer journey.`}
      </Text>
      
      <View style={styles.buttonContainer}>
        {onAdd && (
          <Pressable style={styles.primaryButton} onPress={onAdd}>
            <Text style={styles.primaryButtonText}>Add {itemType}</Text>
          </Pressable>
        )}
        {onContinue && (
          <Pressable style={styles.secondaryButton} onPress={onContinue}>
            <Text style={styles.secondaryButtonText}>Skip for Now</Text>
          </Pressable>
        )}
      </View>
    </FallbackContainer>
  );
};

/**
 * Timeout Fallback - When operations take too long
 */
export const TimeoutFallback: React.FC<FallbackProps> = ({
  onRetry,
  onGoBack,
  title = "Taking longer than expected",
  message = "This is taking a bit longer than usual. You can keep waiting or try again."
}) => {
  return (
    <FallbackContainer>
      <View style={styles.iconContainer}>
        <Ionicons name="hourglass-outline" size={64} color={colors.warning} />
      </View>
      
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      
      <View style={styles.buttonContainer}>
        {onGoBack && (
          <Pressable style={styles.secondaryButton} onPress={onGoBack}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </Pressable>
        )}
        {onRetry && (
          <Pressable style={styles.primaryButton} onPress={onRetry}>
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </Pressable>
        )}
      </View>
    </FallbackContainer>
  );
};

/**
 * Auth Error Fallback - When user is not authenticated
 */
export const AuthErrorFallback: React.FC<FallbackProps & {
  onSignIn?: () => void;
}> = ({
  onSignIn,
  onRetry,
  title = "Please Sign In",
  message = "You need to be signed in to continue. Let's get you back on track."
}) => {
  return (
    <FallbackContainer>
      <View style={styles.iconContainer}>
        <Ionicons name="lock-closed-outline" size={64} color={colors.text.primary} />
      </View>
      
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      
      <View style={styles.buttonContainer}>
        {onSignIn && (
          <Pressable style={styles.primaryButton} onPress={onSignIn}>
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </Pressable>
        )}
        {onRetry && (
          <Pressable style={styles.secondaryButton} onPress={onRetry}>
            <Text style={styles.secondaryButtonText}>Try Again</Text>
          </Pressable>
        )}
      </View>
    </FallbackContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xlarge,
  },
  iconContainer: {
    marginBottom: spacing.xlarge,
    position: 'relative',
  },
  deniedBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
  },
  title: {
    fontSize: typography.fontSizes.xlarge,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.medium,
  },
  message: {
    fontSize: typography.fontSizes.medium,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xlarge,
    opacity: 0.9,
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: spacing.medium,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.medium,
    paddingHorizontal: spacing.xlarge,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: typography.fontSizes.medium,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: spacing.medium,
    paddingHorizontal: spacing.xlarge,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  secondaryButtonText: {
    color: colors.text.primary,
    fontSize: typography.fontSizes.medium,
    fontWeight: '600',
  },
  loadingIcon: {
    marginBottom: spacing.xlarge,
  },
  prayerEmoji: {
    fontSize: 64,
  },
  loadingText: {
    fontSize: typography.fontSizes.large,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.medium,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '80%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.small,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: typography.fontSizes.small,
    color: colors.text.secondary,
    opacity: 0.8,
  },
  errorDetails: {
    maxHeight: 100,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    padding: spacing.medium,
    marginBottom: spacing.large,
  },
  errorDetailsText: {
    fontSize: typography.fontSizes.small,
    color: colors.text.primary,
    fontFamily: 'monospace',
  },
  emptyStateImage: {
    marginBottom: spacing.large,
    opacity: 0.5,
  },
  emptyStateEmoji: {
    fontSize: 80,
  },
});

export default {
  MissingStateFallback,
  LoadingStateFallback,
  PermissionDeniedFallback,
  OfflineStateFallback,
  ErrorStateFallback,
  EmptyStateFallback,
  TimeoutFallback,
  AuthErrorFallback,
}; 