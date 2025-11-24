# PRAYLOCK UX Flow Design

## Overview
PRAYLOCK is a faith-focused app blocking feature that requires users to complete their morning prayer before accessing distracting apps for the day. It combines the best practices from Opal (structured blocking), One Sec (mindful friction), and Bible Mode (faith-based unlocking).

**Key Technical Feature**: Automatic background enforcement ensures apps lock at prayer times (4am/4pm) even when the app is backgrounded, providing seamless "Turn Distraction Into Devotion" experience.

## 1. Setup Flow Options

### Option A: Dedicated Settings Section (Recommended)
**Location**: Settings → PRAYLOCK (new section below Prayer Reminders)

**Flow**:
1. Settings screen shows new "PRAYLOCK" section with lock icon 🔒
2. Tap to enter PRAYLOCK settings
3. Onboarding mini-flow:
   - Screen 1: "Turn distraction into devotion" - explains the concept
   - Screen 2: Shows how it works (3 steps visual)
   - Screen 3: Select apps to lock (see App Selection below)
   - Screen 4: Choose difficulty level
   - Screen 5: Enable and confirm

### Option B: Home Screen Integration
**Location**: New card on home screen below Daily Prayer Tasks

**Visual**: 
- Card with lock icon and "PRAYLOCK: OFF" status
- Tap to enable/configure
- Shows locked app count when active

### Option C: Dedicated Tab
**Location**: New tab in bottom navigation

**Pros**: High visibility, dedicated space for stats/progress
**Cons**: Takes valuable tab bar real estate

## 2. App Selection Interface

### Smart Categories (Primary Method)
```
┌─────────────────────────────────┐
│  Select Apps to Lock            │
│                                 │
│  ⚡ Quick Select                │
│  ┌─────────────────────────┐   │
│  │ 📱 Social Media         │   │
│  │ Instagram, TikTok, X... │   │
│  │ [Toggle: ON]           │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ 🎮 Games                │   │
│  │ All gaming apps         │   │
│  │ [Toggle: OFF]          │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ 🛍️ Shopping            │   │
│  │ Amazon, eBay, etc.      │   │
│  │ [Toggle: ON]           │   │
│  └─────────────────────────┘   │
│                                 │
│  📱 All Apps (A-Z)            │
│  [Search bar]                  │
│  • Amazon [Toggle]             │
│  • Calculator [Toggle]         │
│  • Instagram [Toggle: ON]      │
│  ...                          │
└─────────────────────────────────┘
```

### Smart Suggestions
- "Most Used Distractions" section at top
- AI-powered suggestions based on screen time data
- One-tap to add top 5 time-wasters

## 3. Daily Unlock Flow

### Morning Prayer Required State

**Scenario 1: User tries to open locked app**
```
┌─────────────────────────────────┐
│                                 │
│         🔒 PRAYLOCK            │
│                                 │
│   Instagram is locked until     │
│   you complete your morning     │
│   prayer                        │
│                                 │
│  ┌─────────────────────────┐   │
│  │   Go to Morning Prayer   │   │
│  └─────────────────────────┘   │
│                                 │
│  [Emergency Unlock]             │
│                                 │
└─────────────────────────────────┘
```

**Scenario 2: Automatic redirect**
- Tapping locked app immediately opens Just Pray
- Shows morning prayer screen with banner: "Complete your prayer to unlock apps"
- After prayer completion, shows unlock confirmation

### Post-Prayer Unlock Options

**Option A: Immediate Unlock (Simple)**
- Prayer marked complete → All apps unlock instantly
- Notification: "✅ Apps unlocked! You prayed first today 🙏"

**Option B: Confirmation Screen (Recommended)**
```
┌─────────────────────────────────┐
│                                 │
│        🎉 Prayer Complete!      │
│                                 │
│   You've put God first today.   │
│   Your apps are now unlocked.   │
│                                 │
│   Time saved: 2h 15m            │
│   Streak: 7 days 🔥             │
│                                 │
│  ┌─────────────────────────┐   │
│  │      Continue to App     │   │
│  └─────────────────────────┘   │
│                                 │
│  [Stay in Just Pray]            │
│                                 │
└─────────────────────────────────┘
```

**Option C: Gradual Unlock**
- Apps unlock in stages throughout the day
- Premium feature: customize unlock schedule

## 4. Visual Design Elements

### Home Screen Indicators

**PRAYLOCK Status Widget** (if on home screen):
```
┌─────────────────────────────┐
│ 🔒 PRAYLOCK Active          │
│ 5 apps locked • Pray first  │
└─────────────────────────────┘
```

**When Unlocked**:
```
┌─────────────────────────────┐
│ ✅ PRAYLOCK Complete        │
│ All apps unlocked • 7 day 🔥│
└─────────────────────────────┘
```

### iOS Integration
- Use Screen Time API (iOS 16+) for native blocking
- Locked apps show with prayer hands overlay icon
- Apps disappear from Spotlight search when locked

### Shield Screen Design
```
┌─────────────────────────────────┐
│                                 │
│         [App Icon]              │
│          🙏                     │
│                                 │
│    "Seek first the kingdom     │
│     of God..." - Matt 6:33     │
│                                 │
│  ┌─────────────────────────┐   │
│  │    Complete Prayer       │   │
│  └─────────────────────────┘   │
│                                 │
│  Time locked: 2h 15m today      │
│                                 │
└─────────────────────────────────┘
```

## 5. Difficulty Levels

### Gentle (Default)
- 1-tap emergency unlock (limited to 3/day)
- Apps unlock after prayer
- Can snooze for 5 minutes

### Balanced
- Emergency unlock requires 30-second wait
- Must complete full prayer (no skipping)
- 1 emergency unlock per day

### Committed
- No emergency unlocks
- Must complete prayer + 1 minute reflection
- Apps stay locked if you miss morning prayer

### Deep Focus (Premium)
- No bypasses whatsoever
- Extends through lunch if morning prayer missed
- Accountability partner notifications

## 6. Edge Cases & Solutions

### Missed Morning Prayer
**Gentle/Balanced**: 
- Unlock at noon with gentle reminder
- "You missed morning prayer. Your apps are unlocked, but consider praying now 🙏"

**Committed/Deep**: 
- Stay locked until evening prayer
- Show motivational message about commitment

### Travel/Timezone Changes
- Auto-detect timezone changes
- "Vacation Mode" - temporary pause (max 7 days)
- Quick toggle in settings

### Emergency Scenarios
**Emergency Unlock Process**:
1. Long press (3 seconds) on "Emergency Unlock"
2. Confirmation: "This will use 1 of 3 emergency unlocks today"
3. 30-second cooldown timer (Balanced+ only)
4. Log reason (optional but encouraged)

### Technical Failures
- If prayer generation fails, allow unlock after 60 seconds
- Offline mode: Use cached prayers, still require completion
- Fallback: Simple scripture reading requirement

## 7. Gamification & Progress

### Streak System
- PRAYLOCK streak separate from prayer streak
- Visual calendar showing lock history
- Milestones: 7, 30, 100 days

### Statistics Dashboard
```
┌─────────────────────────────────┐
│     PRAYLOCK Statistics         │
│                                 │
│ This Week:                      │
│ • Time saved: 14h 32m           │
│ • Apps blocked: 127 times       │
│ • Perfect days: 6/7             │
│                                 │
│ Top Blocked:                    │
│ 1. Instagram (47 attempts)      │
│ 2. TikTok (31 attempts)         │
│ 3. YouTube (23 attempts)        │
│                                 │
│ Your Progress:                  │
│ [====||||||||----] 68% better   │
│                                 │
└─────────────────────────────────┘
```

## 8. Onboarding Best Practices

### Progressive Disclosure
1. Start with just social media category
2. Show immediate value (time saved projection)
3. Gradually introduce more features

### Social Proof
- "Join 10,000+ Christians starting their day with prayer"
- Success stories in onboarding

### Value Proposition Messaging
- "Transform your biggest distraction into your strongest discipline"
- "What if your phone reminded you to pray instead of scroll?"
- "Start every day with God, not social media"

## 9. Settings & Customization

### PRAYLOCK Settings Menu
```
PRAYLOCK Settings

🔒 Enable PRAYLOCK [Toggle]

⏰ Active Hours
   Start: 4:00 AM
   End: 12:00 PM
   
📱 Locked Apps (12)
   > Manage Apps

💪 Difficulty
   ○ Gentle
   ● Balanced  
   ○ Committed
   ○ Deep Focus 👑

🚨 Emergency Unlocks
   Remaining today: 2/3
   > View History

🏖️ Vacation Mode
   ○ Off
   ○ Pause for trip

📊 Statistics
   > View Dashboard

🔔 Notifications
   Daily reminders [ON]
   Streak alerts [ON]
   
⚡ Quick Actions
   • Reset today's locks
   • Export lock history
```

## 10. Integration Points

### With Existing Features
- Prayer streaks should count PRAYLOCK completions
- Premium features: Advanced stats, Deep Focus mode, custom schedules
- Share PRAYLOCK achievements as prayer cards

### Future Enhancements
- Family/Group PRAYLOCK challenges
- Church leaderboards
- Integration with Apple Focus modes
- Widget for Lock Screen
- Apple Watch companion

## 11. Technical Reliability Features

### Background Enforcement System
**User Experience**: PRAYLOCK automatically activates at prayer times regardless of app state
- **Primary**: iOS DeviceActivity framework triggers blocking at scheduled times
- **Backup**: Background tasks ensure blocking when system callbacks fail
- **Immediate**: App foreground detection enforces blocking on period transitions

### Transparent Operation
**User Messaging**: "PRAYLOCK runs automatically in the background to ensure your prayer time is protected"
- No user configuration needed for background operation
- Seamless experience across all usage patterns
- Battery-optimized background tasks (15-minute intervals)

## Implementation Priority

### Phase 1 (MVP)
1. Basic lock/unlock flow
2. Social media category only
3. Gentle difficulty only
4. Simple statistics

### Phase 2
1. All app categories
2. Multiple difficulty levels
3. Emergency unlocks
4. Streak system

### Phase 3
1. Advanced statistics
2. Vacation mode
3. Premium features
4. Social features

## Success Metrics
- Daily Active PRAYLOCK users
- Average time saved per user
- Streak retention (7-day, 30-day)
- Prayer completion rate increase
- User testimonials/reviews