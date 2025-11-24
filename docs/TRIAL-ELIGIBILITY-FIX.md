# Trial Eligibility Fix - Implementation Plan

## Problem Statement

Currently, brand new users who have never purchased anything are incorrectly labeled as `'expired'` and routed to `RenewalBottomSheet`, which shows them messaging intended for users who previously had subscriptions. This results in:

1. **Incorrect messaging**: New users see "Welcome Back" or renewal language
2. **Confusing UX**: Trial-eligible users may or may not see trial badges depending on component state
3. **Broken routing**: New users should go to `PaymentBottomSheet` with proper trial offers

## Root Cause

In `src/utils/subscriptionManager.ts`, the `getSimpleSubscriptionStatus()` function returns `'expired'` for users with:
- Empty `entitlements.active` object
- Empty `entitlements.all` object  
- Empty `allPurchasedProductIdentifiers` array

This state describes a **brand new user**, not an expired user.

## RevenueCat Customer States

Based on RevenueCat documentation:

| User State | `allPurchasedProductIdentifiers` | `entitlements.all` | Should Return |
|------------|----------------------------------|-------------------|---------------|
| Brand new user (never purchased) | `[]` (empty) | `{}` (empty) | `'never_subscribed'` |
| Active trial | `['product_id']` | Has entry with `periodType='TRIAL'`, `isActive=true` | `'trial_active'` |
| Trial expired | `['product_id']` | Has entry with `periodType='TRIAL'`, `isActive=false` | `'trial_expired'` |
| Active paid subscription | `['product_id']` | Has entry, `isActive=true` | `'active'` |
| Paid subscription expired | `['product_id']` | Has entry, `isActive=false` | `'expired'` |
| Grace period | `['product_id']` | Has entry, recently expired (<7 days) | `'grace_period'` |
| Cancelled but active | `['product_id']` | Has entry, `willRenew=false`, `isActive=true` | `'cancelled_but_active'` |

## Trial Eligibility Rules

**Apple's rule**: One trial per subscription group, ever.

**Our logic**:
- **Never subscribed** → Trial ELIGIBLE → Show `PaymentBottomSheet` with trial
- **Trial expired** → Trial INELIGIBLE → Show `RenewalBottomSheet` without trial
- **Paid expired** → Trial INELIGIBLE → Show `RenewalBottomSheet` without trial
- **Grace period** → Trial INELIGIBLE → Show `RenewalBottomSheet` without trial

## Implementation Plan

### Step 1: Add New Status Type

**File**: `src/utils/subscriptionManager.ts`

Add `'never_subscribed'` to the type:

```typescript
export type SimpleSubscriptionStatus = 
  | 'active' 
  | 'trial_active'
  | 'trial_expired'
  | 'expired' 
  | 'cancelled_but_active'
  | 'grace_period'
  | 'billing_issue'
  | 'never_subscribed'  // NEW
  | 'unknown';
```

### Step 2: Fix Status Detection

**File**: `src/utils/subscriptionManager.ts`

Update `getSimpleSubscriptionStatus()` to detect brand new users:

```typescript
// After checking for active entitlements...
// No active entitlements - distinguish between new users and expired users

const hasEverPurchased = customerInfo.allPurchasedProductIdentifiers && 
                        customerInfo.allPurchasedProductIdentifiers.length > 0;

const allEntitlements = Object.keys(customerInfo.entitlements.all);

// NEW: Check if user has never purchased anything
if (!hasEverPurchased && allEntitlements.length === 0) {
  console.log('[subscriptionManager] Brand new user - never purchased');
  return 'never_subscribed';
}

// Rest of existing logic for expired/trial_expired/grace_period...
```

### Step 3: Update Routing Logic

**Files**: 
- `app/(app)/(tabs)/intentions/index.tsx` (line ~137)
- `app/(app)/(tabs)/profile/index.tsx` (line ~148)

**Current (broken)**:
```typescript
if (status === "grace_period" || status === "expired") {
  setShowRenewalSheet(true);
} else {
  setShowPaymentSheet(true);
}
```

**Fixed**:
```typescript
// Only show renewal sheet for users who previously had subscriptions
if (status === "grace_period" || status === "expired" || status === "trial_expired") {
  console.log("[Screen] Showing renewal sheet for returning user");
  setShowRenewalSheet(true);
} else {
  // New users, active users, or unknown → show payment sheet with trial
  console.log("[Screen] Showing payment sheet for new/active user");
  setShowPaymentSheet(true);
}
```

### Step 4: Clean Up RenewalBottomSheet

**File**: `src/components/shared/RenewalBottomSheet.tsx`

Remove trial logic since this component is ONLY for ineligible users:

1. Remove `showTrial` field from content objects
2. Remove trial badge conditional rendering
3. Update pricing text to always show regular pricing (no "after trial")
4. Simplify to 2 messaging variants: grace_period vs expired/trial_expired

**Reasoning**: After routing fix, only ineligible users reach this component.

### Step 5: Update Access Checks

**Files** where `getSimpleSubscriptionStatus` is used for access control:

Search for: `["active", "trial_active", "cancelled_but_active", "grace_period"]`

Add logic to handle `never_subscribed`:
- For paywall triggers: Should see paywall
- For feature access: No access, should see paywall

## Testing Matrix

After implementation, verify these flows:

### 1. Brand New User (Never Purchased)
- **Status returned**: `'never_subscribed'`
- **Route**: `PaymentBottomSheet`
- **Display**: "FREE 3-DAY TRIAL" badge + trial messaging
- **Button**: "Start Free Trial"

### 2. Trial Expired User
- **Status returned**: `'trial_expired'`
- **Route**: `RenewalBottomSheet`
- **Display**: NO trial badge, regular pricing
- **Button**: "Subscribe Now" or "Renew Subscription"

### 3. Paid Subscription Expired
- **Status returned**: `'expired'`
- **Route**: `RenewalBottomSheet`
- **Display**: NO trial badge, regular pricing
- **Button**: "Renew Subscription"

### 4. Grace Period User
- **Status returned**: `'grace_period'`
- **Route**: `RenewalBottomSheet`
- **Display**: NO trial badge, regular pricing
- **Button**: "Continue My Journey" or "Update Payment"

### 5. Active Trial User
- **Status returned**: `'trial_active'`
- **Route**: No paywall (has access)
- **Display**: N/A

### 6. Active Paid User
- **Status returned**: `'active'`
- **Route**: No paywall (has access)
- **Display**: N/A

## Files to Modify

1. ✅ `src/utils/subscriptionManager.ts` - Add status type, fix detection
2. ✅ `app/(app)/(tabs)/intentions/index.tsx` - Fix routing
3. ✅ `app/(app)/(tabs)/profile/index.tsx` - Fix routing  
4. ✅ `src/components/shared/RenewalBottomSheet.tsx` - Remove trial logic
5. ⚠️ Search codebase for other uses of status checks that need updating

## Expected Outcomes

- **Better UX**: New users see appropriate onboarding with trial offers
- **Clear messaging**: Returning users see renewal messaging without confusing trial badges
- **Accurate routing**: Right paywall for right user state
- **No false promises**: Never show trial offers to ineligible users

## Rollback Plan

If issues arise, the change is isolated to:
1. Revert subscriptionManager status type and detection
2. Revert routing conditions in intentions/profile screens
3. Revert RenewalBottomSheet content changes

All changes are backward compatible since we're adding a new status, not removing existing ones.
