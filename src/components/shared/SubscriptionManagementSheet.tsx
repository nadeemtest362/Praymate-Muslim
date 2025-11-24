import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { captureException } from '../../lib/sentry';
import {
  getSubscriptionStatus,
  showCancelSubscriptionInstructions,
  restorePurchases,
  getSubscriptionStatusText,
  isSubscriptionExpiringSoon,
  formatExpiryDate,
  getSimpleSubscriptionStatus,
  SubscriptionStatus,
  SimpleSubscriptionStatus,
} from '../../utils/subscriptionManager';
import useResponsive from '../../hooks/useResponsive';

interface SubscriptionManagementSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

const SubscriptionManagementSheet: React.FC<SubscriptionManagementSheetProps> = ({
  isVisible,
  onClose,
}) => {
  const R = useResponsive();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(500);
  
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [simpleStatus, setSimpleStatus] = useState<SimpleSubscriptionStatus>('unknown');
  const [isLoading, setIsLoading] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);

  const loadSubscriptionStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const simpleStatusResult = await getSimpleSubscriptionStatus();
      setSimpleStatus(simpleStatusResult);
      
      // For expired and trial_expired users, getSubscriptionStatus will return inactive
      // We need to handle this case and show appropriate information
      if (['active', 'trial_active', 'cancelled_but_active'].includes(simpleStatusResult)) {
        const fullStatus = await getSubscriptionStatus();
        setSubscriptionStatus(fullStatus);
      } else {
        // For expired users, create a mock status object with the information we have
        setSubscriptionStatus({
          isActive: false,
          isTrial: simpleStatusResult === 'trial_expired',
          willRenew: false,
          expiresAt: null, // We don't have this info for expired subscriptions
          productIdentifier: null,
          entitlementIdentifier: null,
        });
      }
    } catch (error) {
      console.error('Error loading subscription status:', (error as any)?.message || String(error));
      captureException(error as any, { area: 'subscriptionSheet.loadStatus' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isVisible) {
      translateY.value = withSpring(0, { damping: 45, stiffness: 350 });
      loadSubscriptionStatus();
    } else {
      translateY.value = withSpring(500, { damping: 45, stiffness: 350 });
    }
  }, [isVisible, loadSubscriptionStatus]);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleCancelSubscription = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showCancelSubscriptionInstructions();
  };

  const handleRestorePurchases = async () => {
    try {
      setIsRestoring(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const result = await restorePurchases();
      
      if (result.success) {
        if (result.hasActiveSubscription) {
          // Successfully restored subscription - reload status and close modal
          await loadSubscriptionStatus();
          Alert.alert(
            'Restore Complete',
            'Your subscription has been restored! You now have access to all premium features.',
            [{ text: 'OK', onPress: () => {
              // Close the modal after successful restore
              onClose();
            }}]
          );
        } else {
          // No active subscription found - just refresh status and show message
          await loadSubscriptionStatus(); // Refresh status to get current state
          Alert.alert(
            'No Subscriptions Found',
            'No active subscriptions were found to restore. If you believe this is an error, please contact support.',
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert('Restore Failed', 'Unable to restore purchases. Please try again.');
      }
    } catch (error) {
      console.error('Error restoring purchases:', (error as any)?.message || String(error));
      captureException(error as any, { area: 'subscriptionSheet.restore' });
      Alert.alert('Restore Failed', 'Something went wrong. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleOpenSubscriptionSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL('app-settings:');
  };

  const handleContactSupport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL('mailto:support@trypraymate.com?subject=Subscription Support');
  };

  const getStatusColor = (status: SimpleSubscriptionStatus) => {
    switch (status) {
      case 'active':
      case 'trial_active':
        return '#4CAF50';
      case 'cancelled_but_active':
        return '#FF9800';
      case 'expired':
      case 'trial_expired':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusIcon = (status: SimpleSubscriptionStatus) => {
    switch (status) {
      case 'active':
        return 'check-circle';
      case 'trial_active':
        return 'gift';
      case 'cancelled_but_active':
        return 'clock-alert';
      case 'expired':
      case 'trial_expired':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const getStatusMessage = (status: SimpleSubscriptionStatus) => {
    switch (status) {
      case 'active':
        return 'Your subscription is active and will renew automatically';
      case 'trial_active':
        return 'You\'re currently in your free trial period';
      case 'cancelled_but_active':
        return 'Your subscription is cancelled but still active until expiration';
      case 'expired':
        return 'Your subscription has expired';
      case 'trial_expired':
        return 'Your free trial has ended';
      default:
        return 'Unable to determine subscription status';
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!isVisible) return null;

  return (
    <View style={[StyleSheet.absoluteFillObject, styles.overlay]}>
      <TouchableOpacity 
        style={styles.backdrop} 
        activeOpacity={1} 
        onPress={handleClose}
      />
      
      <Animated.View style={[styles.sheet, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }, animatedStyle]}>
        <LinearGradient
          colors={['#2D1854', '#1B1740', '#0F0A2C']}
          style={styles.content}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Manage Subscription</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="rgba(255, 255, 255, 0.8)" />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFD700" />
              <Text style={styles.loadingText}>Loading subscription details...</Text>
            </View>
          ) : (
              <ScrollView 
              style={styles.scrollContainer}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.scrollContent}
              bounces={true}
              // alwaysBounceVertical={false}
              // nestedScrollEnabled={true}
              // keyboardShouldPersistTaps="handled"
            >
                {/* Subscription Status Card */}
                <View style={styles.statusCard}>
                  <View style={styles.statusHeader}>
                    <View style={[styles.statusIconContainer, { backgroundColor: getStatusColor(simpleStatus) + '20' }]}>
                      <MaterialCommunityIcons 
                        name={getStatusIcon(simpleStatus)} 
                        size={R.font(24)} 
                        color={getStatusColor(simpleStatus)} 
                      />
                    </View>
                    <View style={styles.statusInfo}>
                      <Text style={styles.statusTitle}>
                        {simpleStatus === 'active' ? 'Praymate+ Active' : 
                         simpleStatus === 'trial_active' ? 'Free Trial Active' :
                         simpleStatus === 'cancelled_but_active' ? 'Subscription Cancelled' :
                         simpleStatus === 'expired' ? 'Subscription Expired' :
                         simpleStatus === 'trial_expired' ? 'Trial Expired' :
                         'Unknown Status'}
                      </Text>
                      <Text style={styles.statusMessage}>
                        {getStatusMessage(simpleStatus)}
                      </Text>
                    </View>
                  </View>

                  {/* Status Badges */}
                  <View style={styles.badgesContainer}>
                    {subscriptionStatus?.isTrial && (
                      <View style={styles.trialBadge}>
                        <MaterialCommunityIcons name="gift" size={R.font(16)} color="#4CAF50" />
                        <Text style={styles.trialText}>Free Trial</Text>
                      </View>
                    )}

                    {subscriptionStatus?.willRenew && !subscriptionStatus?.isTrial && (
                      <View style={styles.renewalBadge}>
                        <MaterialCommunityIcons name="autorenew" size={R.font(16)} color="#2196F3" />
                        <Text style={styles.renewalText}>Auto-Renewal</Text>
                      </View>
                    )}

                    {isSubscriptionExpiringSoon(subscriptionStatus?.expiresAt ?? null) && (
                      <View style={styles.warningBadge}>
                        <MaterialCommunityIcons name="alert-circle" size={R.font(16)} color="#FF9500" />
                        <Text style={styles.warningText}>Expires Soon</Text>
                      </View>
                    )}

                    {simpleStatus === 'cancelled_but_active' && (
                      <View style={styles.cancelledBadge}>
                        <MaterialCommunityIcons name="clock-alert" size={R.font(16)} color="#FF9800" />
                        <Text style={styles.cancelledText}>Cancelled</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Subscription Details */}
                <View style={styles.detailsCard}>
                  <Text style={styles.detailsTitle}>Subscription Details</Text>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Plan</Text>
                    <Text style={styles.detailValue}>
                      {subscriptionStatus?.productIdentifier || 
                       (simpleStatus === 'trial_expired' ? 'Trial Plan (Expired)' :
                        simpleStatus === 'expired' ? 'Premium Plan (Expired)' :
                        'Premium Plan')}
                    </Text>
                  </View>

                  {subscriptionStatus?.expiresAt && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>
                        {subscriptionStatus.willRenew ? 'Next Billing' : 'Expires'}
                      </Text>
                      <Text style={styles.detailValue}>
                        {formatExpiryDate(subscriptionStatus.expiresAt)}
                      </Text>
                    </View>
                  )}

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <Text style={[styles.detailValue, { color: getStatusColor(simpleStatus) }]}>
                      {simpleStatus === 'expired' ? 'Expired' :
                       simpleStatus === 'trial_expired' ? 'Trial Expired' :
                       subscriptionStatus ? getSubscriptionStatusText(subscriptionStatus) : 'Unknown'}
                    </Text>
                  </View>

                  {subscriptionStatus?.entitlementIdentifier && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Entitlement</Text>
                      <Text style={styles.detailValue}>
                        {subscriptionStatus.entitlementIdentifier}
                      </Text>
                    </View>
                  )}


                </View>

                {/* Action Buttons */}
                <View style={styles.actionsContainer}>
                  {/* Restore Purchases */}
                  <TouchableOpacity
                    style={styles.secondaryAction}
                    onPress={handleRestorePurchases}
                    disabled={isRestoring}
                    activeOpacity={0.8}
                  >
                    {isRestoring ? (
                      <ActivityIndicator size="small" color="rgba(255, 255, 255, 0.8)" />
                    ) : (
                      <MaterialCommunityIcons name="refresh" size={R.font(20)} color="rgba(255, 255, 255, 0.8)" />
                    )}
                    <Text style={styles.secondaryActionText}>
                      {isRestoring ? 'Restoring...' : 'Restore Purchases'}
                    </Text>
                  </TouchableOpacity>
                  {/* Cancel Subscription (only if active) */}
                  {(simpleStatus === 'active' || simpleStatus === 'trial_active') && (
                    <TouchableOpacity
                      style={styles.dangerAction}
                      onPress={handleCancelSubscription}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons name="cancel" size={R.font(20)} color="#FF6B6B" />
                      <Text style={styles.dangerActionText}>Cancel Subscription</Text>
                    </TouchableOpacity>
                  )}

                  {/* Contact Support */}
                  <TouchableOpacity
                    style={styles.supportAction}
                    onPress={handleContactSupport}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="mail" size={R.font(20)} color="rgba(255, 255, 255, 0.8)" />
                    <Text style={styles.supportActionText}>Contact Support</Text>
                  </TouchableOpacity>
                </View>

                {/* Help Text */}
                <View style={styles.helpContainer}>
                  <Text style={styles.helpText}>
                    Need help? Contact our support team or check our FAQ for common questions about subscriptions.
                  </Text>
                </View>
              </ScrollView>
          )}
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    zIndex: 9999,
    elevation: 9999,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    maxHeight: '90%',
    zIndex: 10000,
    elevation: 10000,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  scrollContainer: {
    // flex: 1,
    // height: '60%',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 80,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statusCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statusMessage: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  trialText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  renewalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  renewalText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2196F3',
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  warningText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9500',
  },
  cancelledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  cancelledText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9800',
  },
  detailsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  detailLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  actionsContainer: {
    gap: 12,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 12,
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD700',
    flex: 1,
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 12,
  },
  secondaryActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
  },
  dangerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 12,
  },
  dangerActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
    flex: 1,
  },
  supportAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 12,
  },
  supportActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
  },
  helpContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  helpText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
    textAlign: 'center',
  },
});

export default SubscriptionManagementSheet;