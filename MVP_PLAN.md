# MVP Plan - Goal-Based App Blocker

## 🎯 **Goal**

Launch an app where users can:

1. Create goals/habits
2. Block apps until goal is completed
3. Track streaks
4. Basic subscription
5. Use a new, clean UI flow (no onboarding) with its own route group

---

## ✅ **MVP Features (8 Features)**

| Feature                    | Time                                | Platform |
| -------------------------- | ----------------------------------- | -------- |
| **1. Authentication**      | 1 week                              | Both     |
| **2. Goal Creation**       | 2 weeks                             | Both     |
| **3. App Blocking**        | 4-6 weeks (iOS) / 2 weeks (Android) | Both     |
| **4. Goal Completion**     | 1 week                              | Both     |
| **5. Home Screen**         | 1 week                              | Both     |
| **6. Streak Tracking**     | 3-5 days                            | Both     |
| **7. Blocked App Overlay** | 1 week                              | Both     |
| **8. Basic Subscription**  | 1 week                              | Both     |

**Total Time**: 10-12 weeks (iOS), 8-10 weeks (Android)

---

## 📋 **Feature Details**

### **1. Authentication**

- Email/password sign up & login
- Password reset
- Session management
- New routing: after auth, go directly to the new `(focus)` stack (skip onboarding and old tabs)

### **2. Goal Creation**

- **Templates** (3-5 options):
  - Daily Prayer (5 times)
  - Gym/Workout
  - Study/Homework
  - Reading
  - Meditation
- **Custom Goal** option
- Schedule setup (times/days)
- App selection (categories or specific apps)

### **3. App Blocking**

- **iOS**: Device Activity API (full blocking)
- **Android**: Overlay/reminder mode (MVP)
- Block at scheduled time
- Unblock when goal completed

### **4. Goal Completion**

- "Mark Complete" button (on card & overlay)
- Manual check-in
- Auto-unlock apps

### **5. Home Screen**

- Goal cards list
- Status: "Blocked" or "Unlocked"
- "Mark Complete" button
- Add goal button

### **6. Streak Tracking**

- Current streak (per goal)
- Longest streak
- Display on goal card

### **7. Blocked App Overlay**

- Full-screen when app blocked
- "Complete [Goal] to unlock" message
- "Mark Complete" button
- Emergency unlock (limited)

### **8. Basic Subscription**

- **Free**: 2 goals max, 1 emergency unlock/day
- **Premium** ($4.99/month): Unlimited goals, 3 emergency unlocks/day

---

## 📱 **Platform Strategy**

**Phase 1: iOS MVP** (Start here)

- Better blocking (Device Activity API)
- 10-12 weeks

**Phase 2: Android MVP** (After iOS)

- Overlay mode initially
- 8-10 weeks

**Routing & Structure**
- Add new route group `app/(focus)/` for the new UI (Home, Add Goal, Settings, Paywall, Blocked Overlay).
- Keep existing code intact; use a feature flag (`NEW_APP_MODE`) to route authenticated users to `/(focus)` instead of legacy tabs/onboarding.

---

## 🚫 **Not in MVP**

- Multiple goals simultaneously (limit to 1-2)
- Advanced stats
- Photo verification
- Push notifications
- Widgets
- Social features
- Old onboarding flows (skip entirely)

---

## 🔧 **Tech Stack**

- **Frontend**: React Native + Expo, TypeScript
- **Backend**: Supabase (Auth, Database)
- **Blocking**: iOS Device Activity API, Android Overlay
- **Monetization**: RevenueCat
- **Analytics**: PostHog (basic)
- **Monitoring**: Sentry

---

## 🚀 **Development Phases**

1. **Weeks 1-2**: Foundation (Auth screens, feature flag, route to new `(focus)` stack, basic UI scaffold)
2. **Weeks 3-5**: Core Features (Goal creation wizard, Home cards, Streaks)
3. **Weeks 6-9**: Blocking (iOS Device Activity, Android overlay), Blocked Overlay UI
4. **Week 10**: Monetization (RevenueCat, Paywall)
5. **Weeks 11-12**: Polish & Launch

---

## 💰 **Costs**

**Monthly (Post-Launch)**:

- Supabase: $0-25 (free tier initially)
- RevenueCat: Free (until volume)
- PostHog: Free tier
- Sentry: Free tier
- App Store: $99/year
- **Total**: ~$100-150/month

---

## ✅ **Definition of Done**

Must work:

- ✅ Sign up/login
- ✅ Create goal
- ✅ Select apps to block
- ✅ Apps block at scheduled time
- ✅ Mark goal complete
- ✅ Apps unlock after completion
- ✅ Streak tracking
- ✅ Subscription purchase

---

## 📝 **Quick Checklist**

**Before Development:**

- [ ] Finalize goal templates (3-5)
- [ ] Set up Supabase
- [ ] Set up RevenueCat
- [ ] Create App Store account
- [ ] Add `NEW_APP_MODE` flag and `(focus)` route group scaffold

**Before Launch:**

- [ ] Beta testing (10-20 users)
- [ ] Bug fixes
- [ ] App Store assets
- [ ] Privacy policy

---

**Timeline**: 10-12 weeks (iOS) | **Team**: 1-2 developers | **Budget**: ~$100-150/month
