# Task 40 - Subtask 12: Deep Link Handler with State Recovery

## Overview
We've implemented a comprehensive deep link handling system that manages navigation to specific onboarding states while preserving user progress and validating prerequisites.

## Architecture

### 1. **OnboardingDeepLinkHandler Class** (`deep-link-handler.ts`)
A singleton that manages all deep link operations:

```typescript
class OnboardingDeepLinkHandler {
  // Listens for deep links on app launch and while running
  private setupLinkingListener(): void { ... }
  
  // Main handler that routes links to appropriate handlers
  async handleDeepLink(url, source): Promise<DeepLinkResult> { ... }
  
  // Handles navigation to specific onboarding states
  private async handleOnboardingStateLink(targetState, context) { ... }
}
```

### 2. **URL Scheme Mappings**
```typescript
// Direct state navigation
'/onboarding/welcome' → 'welcome'
'/onboarding/mood' → 'mood'
'/onboarding/first-prayer' → 'first_prayer'

// Special handlers
'/onboarding/resume' → Resume from saved state
'/onboarding/restart' → Start fresh
'/onboarding/skip-to?step=X' → Skip to specific step
```

### 3. **Integration Points**

#### With Interruption Handler
- Saves current state before deep link navigation
- Allows resuming interrupted flow later

#### With Navigation Controller
- Validates prerequisites before navigation
- Handles state transitions properly

#### With State Machine
- Updates context when resuming
- Maintains state consistency

## Features Implemented

### ✅ Direct State Navigation
```typescript
// Navigate to mood selection
justpray://onboarding/mood

// Force navigation (bypass validation)
justpray://onboarding/first-prayer?force=true
```

### ✅ Resume Functionality
```typescript
// Resume from interruption
justpray://onboarding/resume
// - Checks for interrupted state first
// - Falls back to last saved state
// - Shows "Welcome Back" message
```

### ✅ State Preservation
- Current state saved before deep link navigation
- Can return to interrupted flow later
- Full context preserved

### ✅ Validation & Prerequisites
- Checks if user has completed required steps
- Shows error if prerequisites not met
- Force parameter can bypass checks

### ✅ Analytics Integration
- Tracks all deep link events
- Records interruptions and recoveries
- Monitors navigation success/failure

## Usage Examples

### Basic Deep Link
```typescript
// In email or notification
const link = "justpray://onboarding/prayer-people";
```

### With Parameters
```typescript
// Skip to specific step
const link = "justpray://onboarding/skip-to?step=faith_tradition";

// Force navigation
const link = "justpray://onboarding/paywall?force=true";
```

### React Hook Usage
```typescript
function MyScreen() {
  // Auto-initializes deep link handling
  useOnboardingDeepLinks();
  
  // Or handle manually
  const { handleDeepLink } = useOnboardingDeepLinks();
  await handleDeepLink(url);
}
```

## Edge Cases Handled

1. **Deep Link During Onboarding**
   - Current state saved
   - Can resume original flow
   - Analytics track interruption

2. **Invalid Navigation Attempts**
   - Prerequisites validated
   - User-friendly error messages
   - Force parameter available

3. **App Launch from Link**
   - Initial URL detected
   - State restored if needed
   - Proper navigation setup

4. **Concurrent Deep Links**
   - Prevents multiple simultaneous handling
   - Queue not needed (rejected instead)

5. **Session Expiry**
   - Handled by interruption handler
   - Falls back to fresh start

## Security Considerations

- Prerequisites prevent skipping critical steps
- Force parameter should be used carefully
- Analytics track all navigation attempts
- State validation prevents corruption

## Testing Deep Links

### iOS
```bash
xcrun simctl openurl booted "justpray://onboarding/mood"
```

### Android
```bash
adb shell am start -W -a android.intent.action.VIEW -d "justpray://onboarding/mood"
```

### In Development
Use the `deep-link-example.tsx` screen to test various scenarios.

## Benefits

1. **Marketing Campaigns** - Direct users to specific onboarding steps
2. **Support** - Help users resume interrupted onboarding
3. **A/B Testing** - Test different onboarding paths
4. **Re-engagement** - Bring users back to complete onboarding
5. **Debugging** - Jump to specific states during development

## Next Steps

With deep link handling complete, the onboarding flow now supports:
- External navigation from emails/notifications
- State preservation during interruptions
- Flexible navigation with validation
- Easy testing and debugging

Ready for Subtask 13: Fallback UI Components! 