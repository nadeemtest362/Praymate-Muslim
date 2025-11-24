# Onboarding Flow Versioning System

## Overview

The onboarding flow system now uses **immutable versioning** to ensure users have a consistent experience throughout their onboarding journey. Once a flow is deployed and users start using it, it cannot be modified - only new versions can be created.

## Key Concepts

### 1. **Immutable Flows**
- Once a flow is deployed (status = 'active'), it becomes read-only
- Users who start onboarding with a specific flow version will continue with that exact version
- This prevents breaking changes for users mid-onboarding

### 2. **Flow Lifecycle**
```
Draft → Active → Archived
  ↓
Can edit  Read-only  Historical
```

### 3. **User Flow Assignment**
- When a user first loads onboarding, they're assigned to the latest active flow
- This assignment is stored in `profiles.onboarding_flow_id`
- All subsequent onboarding sessions use this assigned flow

## How It Works

### For New Users
1. User opens app and starts onboarding
2. Edge function checks: Do they have an `onboarding_flow_id`? → No
3. Assigns them the latest active flow
4. Records this in their profile
5. They continue with this flow version forever

### For Returning Users
1. User opens app to continue onboarding
2. Edge function checks: Do they have an `onboarding_flow_id`? → Yes
3. Loads their specific flow version
4. They continue from `onboarding_current_step`

### For Developers
1. Create/edit flows in Flow Studio (draft status)
2. Test thoroughly in preview mode
3. Deploy → Creates new immutable version
4. Previous version is archived but still serves existing users

## Database Schema

### profiles table
```sql
onboarding_flow_id UUID       -- Which flow version they're using
onboarding_started_at TIMESTAMPTZ  -- When they started
onboarding_current_step INTEGER    -- Their progress (step_order)
```

### onboarding_flows table
```sql
id UUID PRIMARY KEY
name TEXT
version VARCHAR       -- e.g., "1", "2", "3"
status VARCHAR        -- 'draft', 'active', 'archived'
```

## Flow Studio Changes

### Active Flows Are Read-Only
- Cannot drag/drop steps
- Cannot add/remove screens
- Cannot edit configurations
- Shows "Live (Read-Only)" badge

### Creating New Versions
- Click "Create New Version" on active flows
- Copies all steps to a new draft flow
- Increments version number
- You can now edit the draft

## Edge Function Logic

```typescript
// Pseudocode
if (user.onboarding_flow_id) {
  // Returning user - use their assigned flow
  flow = getFlow(user.onboarding_flow_id)
} else {
  // New user - assign latest active flow
  flow = getLatestActiveFlow()
  updateProfile({ onboarding_flow_id: flow.id })
}
```

## Best Practices

### 1. **Test Before Deploying**
- Use preview mode extensively
- Test all paths and edge cases
- Once deployed, you can't fix it!

### 2. **Version Naming**
- Automatic: "Flow Name v2", "Flow Name v3"
- Keep descriptions meaningful

### 3. **Monitoring**
- Track how many users are on each version
- Monitor completion rates per version
- Archive very old versions when no users remain

### 4. **Emergency Changes**
If you must fix a critical bug:
1. Create new version with fix
2. New users get fixed version
3. Consider migrating existing users (requires careful planning)

## Migration Considerations

### Moving Users Between Versions
Generally NOT recommended, but if necessary:
1. Ensure step compatibility
2. Map their current progress to new flow
3. Update their `onboarding_flow_id`
4. Test thoroughly!

### Sunsetting Old Versions
1. Check analytics for active users per version
2. When a version has 0 active users, safe to ignore
3. Keep for historical reference

## Example Scenario

1. **Monday**: Deploy "Onboarding v1" with 10 steps
2. **Tuesday**: 100 users start onboarding v1
3. **Wednesday**: Realize step 5 needs changes
4. **Create v2**: Fix step 5, deploy as "Onboarding v2"
5. **Result**: 
   - Tuesday's 100 users continue with v1 (unchanged)
   - New users from Wednesday get v2
   - Both groups have consistent experiences

## Troubleshooting

### User Stuck on Old Version?
- Check their `onboarding_flow_id` in profiles table
- Verify that flow still exists
- Check `onboarding_current_step` for progress

### Need to Force Update?
```sql
-- Use with extreme caution!
UPDATE profiles 
SET onboarding_flow_id = 'new-flow-uuid',
    onboarding_current_step = 1
WHERE id = 'user-uuid';
```

### Flow Not Loading?
1. Verify flow status is 'active' or user has it assigned
2. Check edge function logs
3. Ensure flow has steps

## Future Enhancements

1. **A/B Testing**: Randomly assign new users to different active flows
2. **Gradual Rollout**: Deploy to X% of new users
3. **Auto-Migration**: Smart migration for compatible changes
4. **Version Analytics**: Built-in comparison dashboards 