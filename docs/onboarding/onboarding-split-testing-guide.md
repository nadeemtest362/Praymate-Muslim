# Onboarding Split Testing Guide

## Overview

The onboarding system supports A/B/n testing, allowing you to run multiple flows simultaneously and compare their effectiveness.

## Setting Up a Split Test

### 1. Create Test Variants in Flow Studio

1. **Create Flow A:**
   - Name: "Onboarding - Variant A"
   - Design your first variant
   - Test thoroughly in preview mode
   - Save as draft

2. **Create Flow B:**
   - Name: "Onboarding - Variant B"  
   - Design your alternative variant
   - Test thoroughly in preview mode
   - Save as draft

3. **Deploy Both:**
   - Deploy Flow A → Status becomes "Active"
   - Deploy Flow B → Status becomes "Active"
   - Both flows are now live!

### 2. How Users Are Assigned

The system uses **deterministic assignment** based on user ID:
- Consistent: Same user always gets same flow
- Balanced: Distribution approximates even split
- No external dependencies or random seeds needed

```typescript
// Assignment logic (simplified)
const userIdHash = userId.split('').reduce((acc, char) => {
  return acc + char.charCodeAt(0);
}, 0);
const flowIndex = userIdHash % numberOfActiveFlows;
```

### 3. Tracking & Analytics

Every onboarding event includes:
- `flow_id`: Which variant the user experienced
- `event_type`: What happened (step_completed, drop_off, etc.)
- `event_data`: Additional context

Key events to monitor:
- `ab_test_assigned`: Initial assignment
- `step_completed`: Progress through flow
- `flow_completed`: Successful completion
- `drop_off`: Where users quit

## Analyzing Results

### SQL Queries for Analysis

#### 1. Overall Completion Rates
```sql
WITH flow_starts AS (
  SELECT 
    flow_id,
    COUNT(DISTINCT user_id) as users_started
  FROM onboarding_analytics_events
  WHERE event_type = 'ab_test_assigned'
  GROUP BY flow_id
),
flow_completions AS (
  SELECT 
    flow_id,
    COUNT(DISTINCT user_id) as users_completed
  FROM onboarding_analytics_events
  WHERE event_type = 'flow_completed'
  GROUP BY flow_id
)
SELECT 
  f.name as flow_name,
  f.version,
  fs.users_started,
  COALESCE(fc.users_completed, 0) as users_completed,
  ROUND(COALESCE(fc.users_completed, 0)::numeric / fs.users_started * 100, 2) as completion_rate
FROM flow_starts fs
JOIN onboarding_flows f ON f.id = fs.flow_id
LEFT JOIN flow_completions fc ON fc.flow_id = fs.flow_id
WHERE f.status = 'active'
ORDER BY completion_rate DESC;
```

#### 2. Drop-off Analysis by Step
```sql
WITH step_funnel AS (
  SELECT 
    oae.flow_id,
    ofs.step_order,
    ofs.screen_type,
    COUNT(DISTINCT oae.user_id) as users_reached
  FROM onboarding_analytics_events oae
  JOIN onboarding_flow_steps ofs ON ofs.id = oae.step_id
  WHERE oae.event_type = 'step_completed'
  GROUP BY oae.flow_id, ofs.step_order, ofs.screen_type
)
SELECT 
  f.name as flow_name,
  sf.step_order,
  sf.screen_type,
  sf.users_reached,
  LAG(sf.users_reached, 1) OVER (PARTITION BY sf.flow_id ORDER BY sf.step_order) as previous_step_users,
  ROUND(
    (1 - sf.users_reached::numeric / LAG(sf.users_reached, 1) OVER (PARTITION BY sf.flow_id ORDER BY sf.step_order)) * 100, 
    2
  ) as drop_off_rate
FROM step_funnel sf
JOIN onboarding_flows f ON f.id = sf.flow_id
WHERE f.status = 'active'
ORDER BY f.name, sf.step_order;
```

#### 3. Average Time to Complete
```sql
SELECT 
  f.name as flow_name,
  f.version,
  COUNT(DISTINCT oae.user_id) as users,
  AVG(
    EXTRACT(EPOCH FROM (MAX(oae.created_at) - MIN(oae.created_at))) / 60
  )::integer as avg_minutes_to_complete
FROM onboarding_analytics_events oae
JOIN onboarding_flows f ON f.id = oae.flow_id
WHERE f.status = 'active'
  AND oae.user_id IN (
    SELECT DISTINCT user_id 
    FROM onboarding_analytics_events 
    WHERE event_type = 'flow_completed'
  )
GROUP BY f.id, f.name, f.version;
```

## Best Practices

### 1. **Test One Variable at a Time**
- Don't change everything between variants
- Focus on specific hypotheses
- Example: Test different mood selection approaches

### 2. **Run Tests Long Enough**
- Wait for statistical significance
- Consider day-of-week effects
- Minimum: 1-2 weeks or 1000+ users per variant

### 3. **Monitor Early Indicators**
- Watch for major drop-offs immediately
- Don't wait weeks if one variant is clearly failing
- Can archive poorly performing flows

### 4. **Document Your Tests**
```markdown
## Test: Mood Selection Methods
- **Hypothesis:** Grid layout will have higher engagement than list
- **Variant A:** List of moods with descriptions  
- **Variant B:** 3x3 grid of mood emojis
- **Success Metric:** Completion rate of mood selection step
- **Result:** Grid had 15% higher completion (92% vs 80%)
```

### 5. **Consider Segmentation**
Future enhancement: Test different flows for different user segments
- New vs returning users
- Different geographic regions
- Platform (iOS vs Android)

## Ending a Test

1. **Analyze Results:**
   - Ensure statistical significance
   - Consider all metrics, not just completion

2. **Pick a Winner:**
   - Archive the losing variant(s)
   - Keep winner as sole active flow
   - OR iterate further with new test

3. **Apply Learnings:**
   - Document what worked and why
   - Apply insights to future flows
   - Share results with team

## Advanced: Multi-Variant Testing

The system supports A/B/C/D... testing:
```sql
-- Deploy multiple variants
UPDATE onboarding_flows 
SET status = 'active' 
WHERE name IN (
  'Onboarding - Variant A',
  'Onboarding - Variant B', 
  'Onboarding - Variant C'
);
```

Users will be evenly distributed across all active flows.

## Gotchas & Limitations

1. **Can't Change Active Flows**
   - Once deployed, flows are immutable
   - Must create new version to make changes

2. **Assignment is Permanent**
   - Users stick to their assigned flow
   - Can't switch users between variants mid-test

3. **No Weighted Distribution**
   - Currently only supports even splits
   - Future: Could add weight configuration

4. **Manual Analysis**
   - No built-in dashboard yet
   - Use SQL queries above
   - Future: Build analytics dashboard 