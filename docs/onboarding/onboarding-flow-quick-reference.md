# Onboarding Flow Quick Reference

## Complete Flow: Studio → User → Analytics

### 1. 🎨 **Flow Studio (Command Center)**
```
Create Draft → Edit → Test → Deploy (Immutable)
```

### 2. 🚀 **Deployment**
```sql
-- What happens when you click "Deploy"
1. Creates NEW flow record (never modifies existing)
2. Copies all steps to new flow
3. Sets status = 'active'
4. Archives other flows (but users keep using them)
```

### 3. 🔀 **User Assignment (Edge Function)**
```typescript
// New User Flow
if (!profile.onboarding_flow_id) {
  // Get all active flows
  const flows = getActiveFlows()
  
  // A/B test assignment
  const assigned = selectFlowForUser(flows, userId)
  
  // Store assignment
  updateProfile({ 
    onboarding_flow_id: assigned.id,
    onboarding_started_at: now(),
    onboarding_current_step: 1
  })
}
```

### 4. 📱 **App Experience**
```typescript
// App calls edge function
const flow = await onboardingApiService.getOnboardingFlow()
// Returns user's assigned flow + current step

// Navigate through steps
await flowIntegration.navigateNext(stepData)
// Updates profile.onboarding_current_step
```

### 5. 📊 **Analytics Tracking**
Every action tracked with:
- `user_id`: Who
- `flow_id`: Which variant
- `step_id`: Where in flow
- `event_type`: What happened
- `event_data`: Additional context

### 6. 📈 **Analysis**
```sql
-- See completion rates by flow
SELECT flow_name, 
       COUNT(*) as users,
       SUM(completed) as completions,
       AVG(completed) * 100 as completion_rate
FROM user_flow_metrics
GROUP BY flow_name
```

## Key Tables

### `onboarding_flows`
- `id`: UUID (primary key)
- `name`: "Onboarding v1"
- `version`: "1", "2", "3"...
- `status`: 'draft' | 'active' | 'archived'

### `onboarding_flow_steps`
- `id`: UUID
- `flow_id`: References flows
- `step_order`: 1, 2, 3...
- `screen_type`: "WelcomeScreen"
- `config`: JSON configuration

### `profiles`
- `onboarding_flow_id`: Which flow they're using
- `onboarding_current_step`: Where they are (1-based)
- `onboarding_started_at`: When they started

### `onboarding_analytics_events`
- `flow_id`: Which flow
- `user_id`: Which user
- `event_type`: What happened
- `event_data`: Details

## Common Scenarios

### User Starts Fresh
1. Opens app → No `onboarding_flow_id`
2. Edge function assigns active flow
3. Saves assignment to profile
4. Returns flow + steps

### User Returns
1. Opens app → Has `onboarding_flow_id`
2. Edge function loads their flow
3. Returns flow + `current_step`
4. App resumes from that step

### A/B Test Running
1. Two flows both `status = 'active'`
2. Users distributed by ID hash
3. Each user locked to their variant
4. Compare metrics after test period

### Deploy New Version
1. Active flow → Create New Version
2. Creates draft copy
3. Edit in Flow Studio
4. Deploy → New users get it
5. Old users continue on old version

## Quick Commands

### Check Active Flows
```sql
SELECT * FROM onboarding_flows 
WHERE status = 'active';
```

### See User Distribution
```sql
SELECT 
  f.name,
  COUNT(p.id) as user_count
FROM profiles p
JOIN onboarding_flows f ON f.id = p.onboarding_flow_id
GROUP BY f.name;
```

### Deploy Edge Function
```bash
npx supabase functions deploy get-onboarding-flow
```

### Apply Migration
```sql
-- In Supabase Dashboard SQL Editor
-- Paste migration from migrations-backup/
``` 