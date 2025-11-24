import { Alert, Linking, Platform } from 'react-native';
import { revenueCatService } from '../lib/revenueCatService';

export interface SubscriptionStatus {
  isActive: boolean;
  isTrial: boolean;
  willRenew: boolean;
  expiresAt: Date | null;
  productIdentifier: string | null;
  entitlementIdentifier: string | null;
}

/**
 * Get current subscription status
 */
export const getSubscriptionStatus = async (): Promise<SubscriptionStatus> => {
  try {
    const customerInfo = await revenueCatService.getCustomerInfo();
    
    // Check if user has any active entitlements
    const activeEntitlements = Object.keys(customerInfo.entitlements.active);
    
    if (activeEntitlements.length === 0) {
      return {
        isActive: false,
        isTrial: false,
        willRenew: false,
        expiresAt: null,
        productIdentifier: null,
        entitlementIdentifier: null,
      };
    }

    // Get the first active entitlement (you might have multiple)
    const entitlementId = activeEntitlements[0];
    const entitlement = customerInfo.entitlements.active[entitlementId];
    
    return {
      isActive: true,
      isTrial: entitlement.periodType === 'TRIAL',
      willRenew: entitlement.willRenew,
      expiresAt: entitlement.expirationDate ? new Date(entitlement.expirationDate) : null,
      productIdentifier: entitlement.productIdentifier,
      entitlementIdentifier: entitlementId,
    };
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return {
      isActive: false,
      isTrial: false,
      willRenew: false,
      expiresAt: null,
      productIdentifier: null,
      entitlementIdentifier: null,
    };
  }
};

/**
 * Show cancel subscription instructions to the user
 */
export const showCancelSubscriptionInstructions = () => {
  const title = 'Cancel Subscription';
  const message = Platform.OS === 'ios' 
    ? 'To cancel your subscription:\n\n1. Go to iPhone Settings\n2. Tap your name at the top\n3. Tap "Subscriptions"\n4. Find "Just Pray" and tap it\n5. Tap "Cancel Subscription"\n\nWould you like us to open Settings for you?'
    : 'To cancel your subscription:\n\n1. Open Google Play Store\n2. Go to Account > Subscriptions\n3. Find "Just Pray"\n4. Tap "Cancel subscription"\n\nWould you like us to open Play Store for you?';

  Alert.alert(
    title,
    message,
    [
      { text: 'Not Now', style: 'cancel' },
      { 
        text: 'Open Settings', 
        onPress: () => openSubscriptionSettings() 
      },
    ]
  );
};

/**
 * Open subscription settings for the platform
 */
export const openSubscriptionSettings = () => {
  if (Platform.OS === 'ios') {
    // On iOS, this opens the main Settings app
    // Users will need to navigate to their Apple ID > Subscriptions
    Linking.openURL('app-settings:');
  } else {
    // On Android, this opens Play Store subscriptions
    Linking.openURL('https://play.google.com/store/account/subscriptions');
  }
};

/**
 * Restore purchases (useful for users who cancelled and want to check status)
 */
export const restorePurchases = async (): Promise<{ success: boolean; hasActiveSubscription: boolean }> => {
  try {
    const customerInfo = await revenueCatService.restorePurchases();
    const hasActiveSubscription = Object.keys(customerInfo.entitlements.active).length > 0;
    
    return {
      success: true,
      hasActiveSubscription,
    };
  } catch (error) {
    console.error('Error restoring purchases:', error);
    return {
      success: false,
      hasActiveSubscription: false,
    };
  }
};

/**
 * Format subscription expiry date for display
 */
export const formatExpiryDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Check if subscription will expire soon (within 3 days)
 */
export const isSubscriptionExpiringSoon = (expiresAt: Date | null): boolean => {
  if (!expiresAt) return false;
  
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
  
  return expiresAt <= threeDaysFromNow;
};

/**
 * Get user-friendly subscription status text
 */
export const getSubscriptionStatusText = (status: SubscriptionStatus): string => {
  if (!status.isActive) {
    return 'No active subscription';
  }
  
  if (status.isTrial) {
    if (status.willRenew) {
      return `Free trial (auto-renews ${status.expiresAt ? formatExpiryDate(status.expiresAt) : ''})`;
    } else {
      return `Free trial (ends ${status.expiresAt ? formatExpiryDate(status.expiresAt) : ''})`;
    }
  }
  
  if (status.willRenew) {
    return `Active (renews ${status.expiresAt ? formatExpiryDate(status.expiresAt) : ''})`;
  } else {
    return `Active (ends ${status.expiresAt ? formatExpiryDate(status.expiresAt) : ''})`;
  }
};

/**
 * Subscription status types for easy conditional rendering
 */
export type SimpleSubscriptionStatus = 
  | 'active' 
  | 'expired' 
  | 'trial_active' 
  | 'trial_expired'
  | 'cancelled_but_active'
  | 'never_subscribed'
  | 'unknown';

/**
 * Get simple subscription status for bottom sheet triggers and UI logic
 */
export const getSimpleSubscriptionStatus = async (): Promise<SimpleSubscriptionStatus> => {
  try {
    // Check if service is ready and working
    if (!revenueCatService.isReady()) {
      console.warn('RevenueCat service is not ready yet');
      return 'unknown';
    }
    
    const customerInfo = await revenueCatService.getCustomerInfo();
    
    // DEBUG: Log what we're actually seeing
    console.log('[subscriptionManager] CustomerInfo DEBUG:', {
      allPurchasedProductIdentifiers: customerInfo.allPurchasedProductIdentifiers,
      activeSubscriptions: customerInfo.activeSubscriptions,
      entitlementsActiveCount: Object.keys(customerInfo.entitlements.active).length,
      entitlementsAllCount: Object.keys(customerInfo.entitlements.all).length,
      nonSubscriptionTransactions: customerInfo.nonSubscriptionTransactions?.length || 0,
    });
    
    // Check if user has any active entitlements
    const activeEntitlements = Object.keys(customerInfo.entitlements.active);
    
    if (activeEntitlements.length > 0) {
      const entitlement = customerInfo.entitlements.active[activeEntitlements[0]];
      
      // Check if it's a trial
      if (entitlement.periodType === 'TRIAL') {
        return 'trial_active';
      }
      
      // Any active entitlement = active (including cancelled but still in billing period)
      // Simplified: no more cancelled_but_active state
      return 'active';
    }
    
    // No active entitlements - distinguish between new users and expired users
    // Check if user has EVER made a purchase (RevenueCat docs: allPurchasedProductIdentifiers)
    const hasEverPurchased = customerInfo.allPurchasedProductIdentifiers && 
                            customerInfo.allPurchasedProductIdentifiers.length > 0;
    
    const allEntitlements = Object.keys(customerInfo.entitlements.all);
    
    console.log('[subscriptionManager] hasEverPurchased:', hasEverPurchased);
    console.log('[subscriptionManager] allEntitlements count:', allEntitlements.length);
    
    // Brand new user - never purchased anything, no entitlements
    if (!hasEverPurchased && allEntitlements.length === 0) {
      console.log('[subscriptionManager] Brand new user - never subscribed');
      return 'never_subscribed';
    }
    
    // User has no purchases but has entitlements (edge case - shouldn't happen)
    if (!hasEverPurchased && allEntitlements.length > 0) {
      console.log('[subscriptionManager] Unusual state: no purchases but has entitlements, treating as never_subscribed');
      return 'never_subscribed';
    }
    
    console.log('[subscriptionManager] User has purchase history, checking entitlement type...');
    
    if (allEntitlements.length > 0) {
      const latestEntitlement = customerInfo.entitlements.all[allEntitlements[0]];
      
      if (latestEntitlement.periodType === 'TRIAL') {
        return 'trial_expired';
      }
    }
    
    // Subscription expired (no grace period logic)
    return 'expired';
    
  } catch (error) {
    console.error('Error getting simple subscription status:', error);
    return 'unknown';
  }
};

/**
 * Helper to check if user has premium access
 */
export const hasPremiumAccess = (status: SimpleSubscriptionStatus): boolean => {
  return status === 'active' || status === 'trial_active' || status === 'cancelled_but_active';
};

/**
 * Helper to determine which paywall to show
 */
export const getPaywallType = (status: SimpleSubscriptionStatus): 'payment' | 'renewal' | 'none' => {
  if (status === 'never_subscribed') return 'payment';
  if (status === 'expired' || status === 'trial_expired') return 'renewal';
  if (status === 'unknown') return 'payment'; // fail-closed
  return 'none';
};

/**
 * Usage example for triggering bottom sheets based on subscription status:
 * 
 * const handleFeatureAccess = async () => {
 *   const status = await getSimpleSubscriptionStatus();
 *   
 *   switch (status) {
 *     case 'active':
 *     case 'trial_active':
 *     case 'cancelled_but_active':
 *       // User has access - proceed with feature
 *       break;
 *       
 *     case 'expired':
 *     case 'trial_expired':
 *       // Show RenewalBottomSheet for users who previously had subscription
 *       setShowRenewalSheet(true);
 *       break;
 *       
 *     case 'never_subscribed':
 *       // Show PaymentBottomSheet for new users
 *       setShowPaymentSheet(true);
 *       break;
 *       
 *     case 'unknown':
 *     default:
 *       // Handle error or show generic subscription sheet
 *       setShowSubscriptionSheet(true);
 *       break;
 *   }
 * };
 */