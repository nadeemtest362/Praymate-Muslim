# Trial vs Grace Period Implementation Audit

## Definitions (Apple/Google/RevenueCat Standards)

### Trial Period
- **What it is**: A free introductory period BEFORE the first charge
- **When it happens**: At initial subscription sign-up
- **Duration**: Configured in App Store Connect / Play Console (e.g., 3 days, 7 days)
- **User access**: Full access during trial, no payment required
- **RevenueCat detection**: `entitlement.periodType === 'TRIAL'` while `isActive === true`
- **Example**: User signs up → gets 3 days free → then charged

### Grace Period
- **What it is**: Continued access AFTER a renewal payment failure while the store retries payment
- **When it happens**: When a subscription renewal payment fails
- **Duration**: Store-defined (Apple: configurable in App Store Connect, Google: automatic account hold)
- **User access**: Full access continues while store retries billing
- **RevenueCat detection**: `entitlement.isActive === true` AND `billingIssueDetectedAt !== null`
- **Example**: User's card expires → payment fails → gets 7-16 days to update payment while keeping access

### Key Difference
- **Trial**: Before first payment (new user getting free access)
- **Grace Period**: After payment failure (existing user keeping access while billing issues are resolved)

---

## Current Implementation Analysis

### ✅ What's CORRECT

1. **Trial Detection (Active)**
   ```typescript
   if (entitlement.periodType === 'TRIAL') {
     return 'trial_active';
   }
   ```
   ✅ Correct - properly detects active trial users

2. **Trial Expiration Detection**
   ```typescript
   if (latestEntitlement.periodType === 'TRIAL') {
     return 'trial_expired';
   }
   ```
   ✅ Mostly correct - detects users whose trial ended

3. **Never Subscribed Detection**
   ```typescript
   if (!hasEverPurchased && allEntitlements.length === 0) {
     return 'never_subscribed';
   }
   ```
   ✅ Correct - our new fix properly identifies brand new users

### ❌ What's WRONG

#### Problem 1: Grace Period is Misnamed/Misimplemented

**Current code**:
```typescript
// Check if in grace period (expired recently but might still restore)
const expirationDate = latestEntitlement.expirationDate ? new Date(latestEntitlement.expirationDate) : null;
if (expirationDate) {
  const now = new Date();
  const daysSinceExpiry = (now.getTime() - expirationDate.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysSinceExpiry <= 7) {
    return 'grace_period';
  }
}
```

**Issues**:
- This is NOT a store grace period - it's a custom "recently expired" window
- Real grace period is when entitlement is STILL ACTIVE but has billing issues
- This checks INACTIVE entitlements and gives them 7 days
- No lower bound check (could classify future dates as grace)
- Uses arbitrary first entitlement, not latest

**What it should be**:
```typescript
// Store grace period = active entitlement with billing issue
if (entitlement.billingIssueDetectedAt) {
  return 'grace_period';
}
```

#### Problem 2: Wrong Field Name

**Current code (line 215)**:
```typescript
if (entitlement.billingIssueDetectedAtMillis) {
  return 'billing_issue';
}
```

**Issues**:
- Field name is wrong: `billingIssueDetectedAtMillis` doesn't exist
- Should be: `billingIssueDetectedAt` (returns a date string)
- Returns `'billing_issue'` instead of `'grace_period'`

#### Problem 3: Wrong Entitlement Selection

**Current code (line 247)**:
```typescript
const latestEntitlement = customerInfo.entitlements.all[allEntitlements[0]];
```

**Issues**:
- Selects arbitrary first key, not the latest entitlement
- Should use `customerInfo.latestExpirationDate` or iterate to find max

#### Problem 4: Missing Bounds Check

**Current code (line 259)**:
```typescript
if (daysSinceExpiry <= 7) {
  return 'grace_period';
}
```

**Issues**:
- No check for `daysSinceExpiry >= 0`
- Could classify future expiration dates as "grace period"
- Should be: `if (daysSinceExpiry >= 0 && daysSinceExpiry <= 7)`

---

## Recommended Fixes

### Fix 1: Correct Grace Period Detection (Active Users)

```typescript
// In the active entitlements branch (around line 214)

// Check if it's a trial
if (entitlement.periodType === 'TRIAL') {
  return 'trial_active';
}

// Check for billing issues (TRUE GRACE PERIOD)
if (entitlement.billingIssueDetectedAt) {
  return 'grace_period';
}

// Check if subscription is cancelled but still active
if (!entitlement.willRenew && entitlement.isActive) {
  return 'cancelled_but_active';
}

return 'active';
```

### Fix 2: Rename Custom Window (Expired Users)

```typescript
// In the no active entitlements branch

// Find the latest expiration
const latestExpirationDate = customerInfo.latestExpirationDate 
  ? new Date(customerInfo.latestExpirationDate)
  : null;

// Find the latest entitlement by expiration
let latestEntitlement = null;
let maxExpiration = null;
for (const key of allEntitlements) {
  const ent = customerInfo.entitlements.all[key];
  const expDate = ent.expirationDate ? new Date(ent.expirationDate) : null;
  if (expDate && (!maxExpiration || expDate > maxExpiration)) {
    maxExpiration = expDate;
    latestEntitlement = ent;
  }
}

// Use the determined latest
if (latestEntitlement) {
  const expirationDate = latestEntitlement.expirationDate 
    ? new Date(latestEntitlement.expirationDate) 
    : null;
    
  // Trial expired
  if (latestEntitlement.periodType === 'TRIAL' && expirationDate && expirationDate < new Date()) {
    return 'trial_expired';
  }
  
  // Recently expired (custom 7-day window for win-back)
  if (expirationDate && expirationDate < new Date()) {
    const now = new Date();
    const daysSinceExpiry = (now.getTime() - expirationDate.getTime()) / (1000 * 60 * 60 * 24);
    
    // RENAMED: This is not grace period, it's a win-back window
    if (daysSinceExpiry >= 0 && daysSinceExpiry <= 7) {
      return 'recently_expired';  // Or keep 'grace_period' but document it's NOT store grace
    }
  }
}

return 'expired';
```

### Fix 3: Update Type Definition

Either:
- Add `'recently_expired'` status type, OR
- Document that `'grace_period'` means "recently expired win-back window" not "store grace period"

---

## State Flow Diagram

```
NEW USER
  ↓
never_subscribed → [starts trial] → trial_active
  ↓
trial_active → [trial expires, converts to paid] → active
  ↓
trial_active → [trial expires, no conversion] → trial_expired
  
PAID USER
  ↓
active → [payment fails] → grace_period (STORE GRACE - still active!)
  ↓
grace_period → [payment succeeds] → active
grace_period → [payment still fails after grace] → recently_expired
  ↓
active → [user cancels] → cancelled_but_active
  ↓
cancelled_but_active → [expires] → recently_expired (7 days)
  ↓
recently_expired → [7 days pass] → expired
```

---

## Summary of Issues

| Issue | Current Behavior | Correct Behavior |
|-------|-----------------|------------------|
| Grace period detection | Checks expired entitlements for 7-day window | Should check ACTIVE entitlements with `billingIssueDetectedAt` |
| Field name | `billingIssueDetectedAtMillis` | Should be `billingIssueDetectedAt` |
| Entitlement selection | Uses first key `[0]` | Should use `latestExpirationDate` or find max |
| Bounds checking | `daysSinceExpiry <= 7` | Should be `>= 0 && <= 7` |
| Naming confusion | "Grace period" for custom window | Should be "recently_expired" or documented clearly |

---

## Testing Matrix

After fixes, verify these states:

| User State | Expected Status | How to Test |
|------------|----------------|-------------|
| Brand new user | `never_subscribed` | Fresh install, no purchases |
| Active trial | `trial_active` | Within 3-day trial period |
| Trial expired, no conversion | `trial_expired` | Trial ended, didn't subscribe |
| Active paid | `active` | Paying subscriber |
| Cancelled but still has time | `cancelled_but_active` | Cancelled but access until period end |
| Payment failed (in store grace) | `grace_period` | Payment issue, still has access |
| Expired within 7 days | `recently_expired` | Subscription ended < 7 days ago |
| Expired > 7 days | `expired` | Subscription ended > 7 days ago |

---

## Recommendation

**Priority: HIGH**

The current "grace_period" implementation is fundamentally wrong and could cause:
- Users in TRUE store grace (billing issues) not being detected
- Wrong UI/messaging shown to recently expired users
- Confusion between trial and grace concepts

**Action Items**:
1. Fix `billingIssueDetectedAt` field name (typo causing null check to always fail)
2. Move grace period detection to ACTIVE entitlements branch
3. Rename custom 7-day window to `'recently_expired'` or document heavily
4. Add proper bounds checking and latest entitlement selection
5. Update UI components to handle both `grace_period` (real) and `recently_expired` (custom)
