# RevenueCat Database Redundancy Research

## Problem Statement
RevenueCat recently experienced a multi-hour outage. During such outages, paying customers cannot access premium features because the app cannot verify their subscription status. We need a redundancy strategy.

---

## Solution: Database-Backed Subscription Status

### Architecture Pattern

```
┌─────────────────┐
│   Mobile App    │
│                 │
└────────┬────────┘
         │
         ├──────────────┐
         │              │
         v              v
┌────────────────┐  ┌──────────────┐
│  RevenueCat    │  │   Supabase   │
│   (Primary)    │  │  (Fallback)  │
└────────────────┘  └──────────────┘
         │                  ^
         │                  │
         │   Webhooks       │
         └──────────────────┘
```

### How It Works

1. **Primary Check**: App checks RevenueCat SDK first (fastest, most accurate)
2. **Database Fallback**: If RevenueCat fails/is down, query Supabase
3. **Webhook Sync**: RevenueCat webhooks keep Supabase updated in real-time
4. **Periodic Verification**: Background job reconciles database with RevenueCat API

---

## Database Schema Design

### Table: `subscription_status`

```sql
CREATE TABLE subscription_status (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  
  -- Subscription state
  subscription_status TEXT NOT NULL CHECK (subscription_status IN (
    'active',
    'trial_active', 
    'expired',
    'trial_expired',
    'never_subscribed'
  )),
  
  -- RevenueCat data
  rc_subscriber_id TEXT,
  product_id TEXT,
  entitlement_id TEXT,
  store TEXT CHECK (store IN ('app_store', 'play_store', 'stripe')),
  
  -- Timing
  purchased_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  will_renew BOOLEAN DEFAULT true,
  
  -- Billing
  billing_issue_detected_at TIMESTAMPTZ,
  grace_period_expires_at TIMESTAMPTZ,
  
  -- Sync metadata
  last_synced_from_rc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_webhook_event_id TEXT, -- For idempotency
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_subscription_status_rc_id ON subscription_status(rc_subscriber_id);
CREATE INDEX idx_subscription_expires_at ON subscription_status(expires_at);

-- RLS policies
ALTER TABLE subscription_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own subscription"
  ON subscription_status FOR SELECT
  USING (auth.uid() = user_id);
```

---

## RevenueCat Webhook Integration

### Available Webhook Events

Based on RevenueCat documentation, key events include:

- `INITIAL_PURCHASE` - First subscription purchase
- `RENEWAL` - Subscription renewed
- `CANCELLATION` - User cancelled (still active until expiry)
- `EXPIRATION` - Subscription expired
- `BILLING_ISSUE` - Payment failed
- `PRODUCT_CHANGE` - Upgraded/downgraded plan
- `UNCANCELLATION` - User re-enabled auto-renewal
- `NON_RENEWING_PURCHASE` - Lifetime/consumable purchase
- `TRIAL_STARTED` - Free trial began
- `TRIAL_CONVERTED` - Trial converted to paid
- `TRIAL_CANCELLED` - Trial cancelled

### Webhook Handler (Edge Function)

```typescript
// supabase/functions/revenuecat-webhook/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    // 1. Verify webhook authorization
    const authHeader = req.headers.get('Authorization')
    if (authHeader !== Deno.env.get('RC_WEBHOOK_AUTH_TOKEN')) {
      return new Response('Unauthorized', { status: 401 })
    }

    const payload = await req.json()
    
    // 2. Check for duplicate (idempotency)
    const eventId = payload.id
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    const { data: existing } = await supabase
      .from('subscription_status')
      .select('last_webhook_event_id')
      .eq('last_webhook_event_id', eventId)
      .single()
    
    if (existing) {
      console.log('Duplicate webhook ignored:', eventId)
      return new Response('OK', { status: 200 }) // Already processed
    }
    
    // 3. Extract subscriber info
    const event = payload.event
    const subscriberId = event.app_user_id
    
    // 4. Call RevenueCat GET /subscribers API for latest state
    // (RevenueCat best practice: don't parse webhook directly)
    const rcResponse = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${subscriberId}`,
      {
        headers: {
          'Authorization': `Bearer ${Deno.env.get('RC_API_KEY')}`,
        }
      }
    )
    
    const subscriberData = await rcResponse.json()
    
    // 5. Determine subscription status
    const status = determineStatus(subscriberData.subscriber)
    
    // 6. Update database
    await supabase
      .from('subscription_status')
      .upsert({
        user_id: subscriberId, // Assumes RC app_user_id = Supabase user_id
        subscription_status: status.simpleStatus,
        rc_subscriber_id: subscriberData.subscriber.subscriber_id,
        product_id: status.productId,
        entitlement_id: status.entitlementId,
        store: status.store,
        purchased_at: status.purchasedAt,
        expires_at: status.expiresAt,
        will_renew: status.willRenew,
        billing_issue_detected_at: status.billingIssueAt,
        last_synced_from_rc: new Date().toISOString(),
        last_webhook_event_id: eventId,
        updated_at: new Date().toISOString(),
      })
    
    console.log('Subscription updated for user:', subscriberId)
    
    // 7. Respond quickly (< 60 seconds)
    return new Response('OK', { status: 200 })
    
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
})

function determineStatus(subscriber: any) {
  const activeEntitlements = subscriber.entitlements || {}
  const entitlementKeys = Object.keys(activeEntitlements)
  
  if (entitlementKeys.length > 0) {
    const entitlement = activeEntitlements[entitlementKeys[0]]
    
    return {
      simpleStatus: entitlement.period_type === 'trial' ? 'trial_active' : 'active',
      productId: entitlement.product_identifier,
      entitlementId: entitlementKeys[0],
      store: entitlement.store,
      purchasedAt: entitlement.purchase_date,
      expiresAt: entitlement.expires_date,
      willRenew: entitlement.will_renew,
      billingIssueAt: entitlement.billing_issues_detected_at,
    }
  }
  
  // Check purchase history for expired/trial_expired
  const allEntitlements = subscriber.non_subscriptions || {}
  // ... logic to determine expired vs trial_expired vs never_subscribed
  
  return {
    simpleStatus: 'never_subscribed',
    productId: null,
    entitlementId: null,
    store: null,
    purchasedAt: null,
    expiresAt: null,
    willRenew: false,
    billingIssueAt: null,
  }
}
```

---

## Client-Side Fallback Logic

### Updated `subscriptionManager.ts`

```typescript
export const getSimpleSubscriptionStatus = async (): Promise<SimpleSubscriptionStatus> => {
  try {
    // 1. Try RevenueCat first (primary source of truth)
    if (!revenueCatService.isReady()) {
      console.warn('[subscriptionManager] RevenueCat not ready, falling back to database')
      return getStatusFromDatabase()
    }
    
    const customerInfo = await revenueCatService.getCustomerInfo()
    
    // Parse status from RevenueCat
    const status = parseRevenueCatStatus(customerInfo)
    
    // 2. Update database cache in background (fire and forget)
    updateDatabaseCache(status).catch(err => 
      console.warn('[subscriptionManager] Failed to update DB cache:', err)
    )
    
    return status
    
  } catch (error) {
    console.error('[subscriptionManager] RevenueCat error:', error)
    
    // 3. Fallback to database
    console.log('[subscriptionManager] Falling back to database')
    return getStatusFromDatabase()
  }
}

async function getStatusFromDatabase(): Promise<SimpleSubscriptionStatus> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'unknown'
    
    const { data, error } = await supabase
      .from('subscription_status')
      .select('subscription_status, expires_at')
      .eq('user_id', user.id)
      .single()
    
    if (error || !data) {
      console.warn('[subscriptionManager] No database record found')
      return 'never_subscribed'
    }
    
    // Check if database record is stale (older than 24 hours)
    const lastSync = new Date(data.last_synced_from_rc)
    const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60)
    
    if (hoursSinceSync > 24) {
      console.warn('[subscriptionManager] Database cache is stale (>24h old)')
      // Still use it, but with caution
    }
    
    return data.subscription_status as SimpleSubscriptionStatus
    
  } catch (dbError) {
    console.error('[subscriptionManager] Database fallback failed:', dbError)
    return 'unknown'
  }
}

async function updateDatabaseCache(status: SimpleSubscriptionStatus): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  
  await supabase
    .from('subscription_status')
    .upsert({
      user_id: user.id,
      subscription_status: status,
      last_synced_from_rc: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
}
```

---

## Advantages

### ✅ High Availability
- **99.9%+ uptime**: Database (Supabase) + RevenueCat redundancy
- **Offline support**: Database cache works offline
- **Outage resilience**: App continues functioning during RevenueCat outages

### ✅ Performance
- **Faster queries**: Database lookup can be faster than RevenueCat API
- **Reduced API calls**: Less strain on RevenueCat limits
- **Edge caching**: Can use Supabase edge functions for global performance

### ✅ Flexibility
- **Custom queries**: Can query subscription data alongside user data
- **Analytics**: Easy to run subscription reports in SQL
- **Business logic**: Can implement custom validation or grace periods

### ✅ Security
- **Server-side verification**: Webhooks validate on backend
- **Row-level security**: Supabase RLS prevents data leaks
- **Audit trail**: Track all subscription changes

---

## Disadvantages

### ❌ Complexity
- **More moving parts**: Webhooks, edge functions, sync jobs
- **Maintenance**: Need to monitor webhook health and sync accuracy
- **Code complexity**: Fallback logic adds code paths

### ❌ Sync Challenges
- **Eventual consistency**: Database may lag behind RevenueCat by seconds/minutes
- **Webhook delays**: Cancellations can take up to 2 hours to fire
- **Duplicate events**: Need idempotency handling
- **Missed webhooks**: If edge function is down, database can become stale

### ❌ Cost
- **Database storage**: Additional table and indexes
- **Edge function calls**: Per-webhook invocation costs
- **API calls**: Background sync jobs hit RevenueCat API

### ❌ Data Accuracy Risks
- **Source of truth ambiguity**: Which is authoritative - RC or database?
- **Sync bugs**: Logic errors can cause database to diverge from reality
- **Security risk**: If webhooks are compromised, fake subscription grants possible

---

## Implementation Recommendations

### Best Practices

1. **RevenueCat is Primary**: Always treat RevenueCat as source of truth
   - Database is a **cache**, not the authority
   - On conflict, RevenueCat wins

2. **Webhook Best Practices**:
   - ✅ Always call `GET /subscribers` API after webhook (don't parse webhook directly)
   - ✅ Use authorization header validation
   - ✅ Implement idempotency with `event_id`
   - ✅ Respond with 200 within 60 seconds
   - ✅ Log all webhook events for debugging

3. **Fallback Strategy**:
   ```
   Primary: RevenueCat SDK
   ↓ (on error)
   Secondary: Database cache
   ↓ (on error)
   Tertiary: Fail-closed to paywall
   ```

4. **Monitoring**:
   - Alert on webhook failures
   - Monitor database sync freshness
   - Track fallback invocations
   - Compare RC vs DB status mismatches

5. **Reconciliation Job**:
   - Run nightly job to sync all users with RevenueCat API
   - Detect and alert on discrepancies
   - Auto-fix stale records

### When to Use Database Redundancy

**✅ Good fit if:**
- High uptime requirements (SLA commitments)
- Large user base (>100k users)
- Custom subscription logic needed
- Analytics/reporting important

**❌ Overkill if:**
- Small app with <10k users
- RevenueCat's uptime is acceptable
- Limited engineering resources
- Complexity outweighs benefits

---

## Alternative Approaches

### 1. Client-Side Only (Current Approach)
**Pros**: Simple, no backend needed
**Cons**: No redundancy, vulnerable to outages

### 2. Backend Verification Only
**Pros**: More secure, can implement custom logic
**Cons**: Slower, every request hits backend

### 3. Hybrid (Recommended)
**Pros**: Fast client checks + secure server verification
**Cons**: Most complex to implement

---

## Security Considerations

### Webhook Security
```typescript
// Verify webhook signature (if RevenueCat provides it)
const signature = req.headers.get('X-RevenueCat-Signature')
const isValid = verifySignature(body, signature, SECRET_KEY)

if (!isValid) {
  return new Response('Invalid signature', { status: 401 })
}
```

### Database Security
```sql
-- Only allow updates from service role (webhooks)
CREATE POLICY "Only service role can update"
  ON subscription_status FOR UPDATE
  USING (false); -- Users cannot update

-- Prevent privilege escalation
CREATE POLICY "Prevent self-granted premium"
  ON subscription_status FOR INSERT
  USING (false); -- Must come from webhooks only
```

---

## Estimated Implementation Effort

- **Schema + RLS**: 2-4 hours
- **Webhook edge function**: 4-8 hours
- **Client fallback logic**: 2-4 hours
- **Testing**: 4-8 hours
- **Monitoring setup**: 2-4 hours

**Total**: 14-28 hours (2-4 days)

---

## Conclusion

**Database redundancy is a good investment for production apps with >10k users or SLA requirements.**

For Just Pray:
- ✅ Provides peace of mind during RevenueCat outages
- ✅ Improves offline experience
- ✅ Enables subscription analytics in database
- ⚠️ Adds complexity - weigh against benefits

**Recommendation**: Implement as Phase 2 after core features stabilize.
