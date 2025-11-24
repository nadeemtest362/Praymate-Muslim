═══════════════════════════════════════════════════════════════
PRAYMATE - APP REVIEW NOTES FOR APPLE REVIEW TEAM
═══════════════════════════════════════════════════════════════

APP OVERVIEW
────────────────────────────────────────────────────────────────
Praymate is a prayer companion app that helps people develop consistent daily prayer habits through personalized prayers tailored to their life circumstances.

Core Features:
• Personalized Prayers: Twice-daily prayers customized to user's mood, life situations, and prayer needs
• Prayer People Management: Track people and specific intentions to pray for
• PRAYLOCK: Faith-based digital wellness feature using Family Controls API to help users overcome phone addiction
• Streaks & Achievements: Daily prayer tracking and milestone celebrations
• Premium Subscriptions: Weekly ($4.99) with a free 3-day trial. (Discount offer of $3.99/week with trial also offered)

Privacy & Data Handling: Complete details about data collection, third-party services, and user privacy are available in our Privacy Policy at https://trypraymate.com/privacy


HOW TO ACCESS THE APP
────────────────────────────────────────────────────────────────
RECOMMENDED TESTING APPROACH:
1. Use Apple Sign-In (instant, one-tap authentication)
2. OR enter an email address you have access to:
   - Account is created instantly, no password required during signup
   - For returning sign-ins, a Magic Link is sent to the email

During onboarding, the app will:
- Collect mood, prayer people, and intentions
- Generate and display your first personalized prayer
- Guide you through key features

For in-app purchases testing, use your Apple sandbox test account.


HOW TO TEST THE APP
────────────────────────────────────────────────────────────────

1. ONBOARDING FLOW
   - App starts (anonymous authentication happens automatically)
   - Answer questions about mood and spiritual life
   - Add prayer people → **Contacts Permission** requested if user taps "Import from Contacts"
     (Users can decline and add people manually instead - permission is optional)
   - Add prayer intentions for each person
   - Select prayer reminder times → **Notifications Permission** requested
     (Users can decline - app functions without notifications)
   - Paywall screen (can subscribe or skip)
   - Account creation (Apple Sign-In or email) to save your data
   - View your first personalized prayer
   - Additional subscription prompts (can skip)
   - Home screen

2. CORE PRAYER FEATURES:  After onboarding, home screen shows user's completed first prayer. Tap "🙏 View My Prayer" to read it again
   
My Journey Screen: View prayer history and calendar with progress markers
  
Prayer Focus Screen: Tap people cards to add more intentions (affects future prayers)

Profile Screen: Account Update, Settings access, First time user To-do list, Sign out
   
Settings Screen: Notification management, subscription management interface (using RevenueCat integration), FAQ/Support links, legal (Privacy Policy, Terms, EULA), and Delete account option. (system is designed to sign them out of Apple connect and delete data on use of Delete Account feature)
   
   Note: Prayer generation is limited to time windows (morning 4 AM-4 PM, evening 4 PM-4 AM).
   The onboarding prayer demonstrates the generation experience and quality.

3. PRAYER PEOPLE & INTENTIONS
   - Navigate to "Prayer Focus" (Heart with + sign) tab
   - Tap "+" to add person
   - Choose "Import from Contacts"  or "Add Manually"
   - If adding photo: triggers **Photo Library permission** (choose from library)
   - Tap person to add a prayer intention 
   - Toggle intentions active/paused by tapping on the green dot on each one once created.

4. PRAYLOCK (FAMILY CONTROLS)
   ⚠️ REQUIRES PHYSICAL DEVICE - Does not work in simulator
   
   **Setup & Authorization:**
   a) From Home screen, tap the lock icon in the top-right corner of the prayer card OR tap the "ENABLE PRAYBLOCK" card at the bottom of the screen
   b) PRAYBLOCK Settings screen shows detailed info about the feature, how it works, and information about the Family Controls permission. Allows choice of enabling for Evening, Morning, or Both prayers daily.
   c) Tap "Choose Apps To Lock" button at bottom - iOS shows **Family Controls Authorization** prompt 
   d) Authenticate with Face ID/Touch ID to grant permission
   e) Select apps/categories to block from iOS picker (e.g., Instagram, TikTok, YouTube, Social Media category, etc.)
   f) Tap "Done" → PRAYBLOCK is now active

   NOTE: If current prayer is already completed, apps will not lock until next prayer time (4am or 4pm user's time zone)

   TECHNICAL DETAILS OF PRAYBLOCK FEATURE:

   How Automatic Blocking Works:
   1. App registers DeviceActivity schedules with iOS for prayer times (e.g., 4 AM daily for morning prayers)
   2. iOS automatically invokes the DeviceActivityMonitor extension when the schedule starts (at 4 AM)
   3. The extension updates ManagedSettingsStore to block user-selected apps using iOS's managed settings
   4. iOS enforces blocking - when user tries to open blocked app, iOS displays the shield screen
   5. ShieldConfiguration extension provides customized blocking screen UI (title, message, button)
   6. ShieldAction extension handles user interaction - "Go to Prayer" button sends notification with deep link
   7. When prayer is completed in the app, app removes apps from ManagedSettingsStore to unblock
   
   Communication Between Components:
   - All three extensions share data via App Group: group.com.md90210.justpray
   - Extensions use UserDefaults in shared container to coordinate blocking state
   - iOS DeviceActivity framework handles automatic blocking at scheduled times (no app intervention needed)
   - App validates prayer completion state when returning to foreground to ensure blocks are current
   
   Blocking Schedule:
   - Morning schedule (if enabled): Apps blocked starting at 4:00 AM until morning prayer is completed (prayer window 4 AM - 4 PM)
   - Evening schedule (if enabled): Apps blocked starting at 4:00 PM until evening prayer is completed (prayer window 4 PM - 4 AM)
   - User chooses to enable morning, evening, or both schedules during setup
   - Once prayer is completed for a given window, blocked apps unlock immediately
   - All times are in user's local timezone
   
   **Testing the Block:**
   - After enabling PRAYLOCK, blocking starts at the next scheduled time based on what you selected:
     • Morning schedule: blocking starts at 4:00 AM
     • Evening schedule: blocking starts at 4:00 PM
     • If enabling during an active window and prayer is not yet completed, apps will block immediately
   - Try to open a blocked app (e.g., Instagram)
   - You'll see a system shield screen blocking access with message "PRAYBLOCK IS ON 🙏"
   - Tap "Go to Prayer" button on shield screen → closes shield and sends notification "Time to Pray"
   - Tap the notification to open Praymate
   - Complete the prayer for that window to unlock all blocked apps
   
   **Testing the Unlock:**
   - Navigate to home screen and complete the prayer (morning or evening depending on which schedule is active)
   - After prayer completion, try opening the previously blocked app
   - App should now open normally - block is lifted until the next scheduled prayer time
   
   **Disabling PRAYLOCK:**
   Users can disable PRAYLOCK anytime by tapping the PRAYBLOCK status bar on Home screen → Disable PRAYBLOCK

5. SUBSCRIPTIONS
   - Subscription required for full app functionality after onboarding
   - Two weekly subscription options:
     • $4.99/week with 3-day free trial
     • $3.99/week with 3-day free trial (discount offer)
   - Both options unlock: Personalized daily prayers, prayer journey tracking, unlimited prayer intentions, PRAYLOCK
   - Test purchase using your Apple sandbox test account
   - Restore purchases available in Settings → Manage Subscription → Restore Purchases


PERMISSIONS EXPLAINED
────────────────────────────────────────────────────────────────

1. NOTIFICATIONS (Required)
   Purpose: Daily prayer reminders at user-chosen times
   Usage: Morning/evening prayer reminders, streak milestones, PRAYLOCK alerts
   
2. CONTACTS (Optional)
   Purpose: Import people from contacts to pray for
   Usage: Phone numbers are hashed (SHA-256) before storage - raw numbers never stored
   
3. PHOTO LIBRARY (Optional)
   Purpose: Select existing photos for prayer people
   Usage: Photos are uploaded to user's account and only visible to that user - not shared with other users
   
4. FAMILY CONTROLS (Special Entitlement)
   Purpose: PRAYLOCK feature - system-level app blocking
   Usage: Users voluntarily select apps to block until prayer completion
   Note: Opt-in, can be disabled anytime, enforcement handled by iOS


iOS APP EXTENSIONS (4 Total)
────────────────────────────────────────────────────────────────
The app includes 4 app extensions for different functionality:

**PRAYLOCK EXTENSIONS (3 Total) - Family Controls Framework:**

1. ActivityMonitorExtension (DeviceActivityMonitor)
   Bundle ID: com.md90210.justpray.ActivityMonitorExtension
   Purpose: Automatically monitors prayer schedules and triggers app blocking at scheduled times (4 AM, 4 PM)
   Extension Point: com.apple.deviceactivity.monitor-extension
   How it works: iOS invokes this extension at scheduled times to update ManagedSettingsStore and block selected apps
   
2. ShieldConfiguration Extension
   Bundle ID: com.md90210.justpray.ShieldConfiguration
   Purpose: Customizes the blocking screen UI shown when users try to open blocked apps
   Extension Point: com.apple.shieldconfiguration.configuration-ui
   How it works: Provides the title, message, and button text ("PRAYBLOCK IS ON 🙏", "Go to Prayer")
   
3. ShieldAction Extension
   Bundle ID: com.md90210.justpray.ShieldAction
   Purpose: Handles user interaction when "Go to Prayer" button is tapped on blocking screen
   Extension Point: com.apple.shieldconfiguration.action
   How it works: Closes the shield screen and sends a notification with deep link to open Praymate app

All PRAYLOCK extensions share data via App Group: group.com.md90210.justpray

**NOTIFICATIONS EXTENSION (1 Total) - OneSignal Push Notifications:**

4. OneSignalNotificationServiceExtension (Notification Service Extension)
   Bundle ID: com.md90210.justpray.OneSignalNotificationServiceExtension
   Purpose: Rich push notification handling for prayer reminders and engagement notifications
   Extension Point: com.apple.usernotifications.service
   How it works: Processes incoming push notifications before display, enabling features like:
   - Media attachments in notifications (images, badges)
   - Notification analytics and delivery tracking
   - Custom notification content modification
   Third-Party: Uses OneSignal SDK (OneSignalFramework) for notification processing
   
   Why this extension exists: OneSignal requires a Notification Service Extension to:
   - Track notification delivery and engagement metrics
   - Support rich media in push notifications (images, custom UI)
   - Enable advanced notification features like action buttons and confirmed delivery
   - This is a standard requirement for all apps using OneSignal push notifications


DATA PRIVACY & THIRD-PARTY SERVICES
────────────────────────────────────────────────────────────────

HOW PERSONALIZED PRAYERS WORK:
Prayers are generated in real-time based on the user's current mood, prayer intentions, and people they're praying for. This personalization requires sending this prayer-related data to a third-party service (OpenAI) for generation.

WHAT DATA IS SENT TO OPENAI FOR PRAYER GENERATION:
• User's current mood (e.g., "grateful", "stressed")
• Prayer intentions (e.g., "health for Mom", "guidance at work")
• Names of people the user is praying for
• User's first name (if provided, used for personalization only - e.g., "My name is Sarah")

WHAT IS NOT SENT TO OPENAI:
• Email addresses, phone numbers, photos, or account identifiers (user IDs)
• Any data beyond what's needed to generate the prayer

OPENAI DATA PROTECTION:
• OpenAI does NOT use API data to train models (per their enterprise API terms)
• OpenAI retains API data for 30 days for abuse monitoring, then it's deleted
• Generated prayers are stored in the user's account and only visible to that user
• No prayer content is shared between users or with other parties
• Users can delete all their data anytime via in-app account deletion (Settings → Delete Account)

CONTENT SAFETY:
• All prayers follow traditional ACTS prayer model (Adoration, Confession, Thanksgiving, Supplication)
• Prayers are theologically appropriate for Christian faith traditions
• Users can report concerns via in-app reporting: tap prayer → overflow menu (•••) → "Report an Issue" which opens email to support@trypraymate.com with prayer context

OTHER THIRD-PARTY SERVICES & DATA HANDLING:

**PostHog (Anonymous Usage Analytics):**
• Collects anonymous usage data to improve the app (screen views, button taps, feature usage)
• Does NOT collect prayer content, names, or personal identifiers
• Data is anonymized and used only for product improvement
• Users cannot be individually identified from PostHog data

**OneSignal (Push Notifications):**
• Handles prayer reminder notifications and engagement notifications
• Receives device tokens and user preferences (reminder times, notification settings)
• Does NOT receive prayer content or personal prayer data
• Used only to deliver notifications at user-scheduled times

**RevenueCat (Subscription Management):**
• Manages subscription status and purchase validation
• Receives transaction data from Apple/Google
• Does NOT receive prayer content or personal prayer data
• Used only for subscription management and access control

**Sentry (Error Tracking):**
• Collects crash reports and error logs (development/staging environments only)
• Does NOT collect user data in production builds
• Used only for debugging during development

**Supabase (Database & Authentication):**
• Hosts user accounts, prayers, and app data
• All data encrypted in transit and at rest
• Data stored in secure, compliant cloud infrastructure
• Users retain full control and can delete all data via in-app account deletion

COMPLETE PRIVACY DETAILS:
Our Privacy Policy at https://trypraymate.com/privacy fully documents:
• All data we collect and why
• Which third-party services receive what data
• How users can access, export, or delete their data
• User rights under GDPR and CCPA


SUBSCRIPTION VALUE JUSTIFICATION
────────────────────────────────────────────────────────────────
Each prayer is freshly generated twice daily (morning & evening) based on user's current life circumstances, mood, and prayer needs. This requires real-time generation with per-request costs.

Premium subscribers also receive:
• Unlimited prayer people (vs 3 for free)
• Unlimited prayer history (vs 7 days for free)
• Advanced PRAYLOCK difficulty modes

The ongoing value is continuous personalized prayer generation, not a one-time content unlock. Ongoing personalization and backend costs justify the recurring subscription model.


ACCOUNT REQUIREMENT EXPLANATION
────────────────────────────────────────────────────────────────
An account is required because prayers are personalized to user's data (prayer people, intentions, mood). Without an account, the app cannot generate personalized prayers, which is the core value proposition.

Account creation is quick (2 minutes), supports Apple Sign-In, and users can delete accounts anytime via Settings → Delete Account.


COMMON REVIEWER QUESTIONS - ANSWERED
────────────────────────────────────────────────────────────────

Q: How do you ensure generated prayers are appropriate?
A: All prayers follow the traditional ACTS prayer model with system-level instructions that ensure theologically sound, respectful content. Prayers are generated for Christian faith traditions. Users can report any inappropriate content via each prayer, or in-app support.

Q: Does the app upload contacts to a server?
A: The app does NOT upload contacts in bulk or automatically. When a user explicitly selects a specific person from their contacts to add to their prayer circle, we save: (1) that person's name, (2) their contact photo, and (3) a hashed phone number (SHA-256) if available. The phone number hash creates a privacy-preserving identifier for that person in the user's prayer list, used for features like sharing prayers with that person. Raw phone numbers are NEVER transmitted or stored on our servers. The entire contacts list is never uploaded. This is user-initiated action (tapping to add a person), not background syncing.

Q: What data is sent to third-party services for prayer generation?
A: Only prayer-related data is sent: user's current mood, selected prayer intentions (e.g., "health for Mom"), and names of prayer people. We do NOT send: email addresses, phone numbers, photos, or account identifiers. The service does not use this data for training and does not retain it after generation. Full details are in our Privacy Policy at https://trypraymate.com/#privacy

Q: Why do you need Family Controls entitlement?
A: PRAYBLOCK uses Apple's Family Controls framework to help users overcome phone addiction through faith-based motivation. Users voluntarily enable PRAYBLOCK to block distracting apps until they complete their morning/evening prayer. This is opt-in and can be disabled anytime. This is the "In-App Controls" feature referenced in our Age Rating.

Q: Where are the Parental Controls / In-App Controls mentioned in the Age Rating?
A: The PRAYBLOCK feature (detailed in section 4 above) is the "In-App Controls" referenced in our Age Rating. Users enable PRAYBLOCK by tapping the lock icon on the home screen or the "ENABLE PRAYBLOCK" card, then following the setup flow which includes Family Controls authorization. This feature allows users to voluntarily block distracting apps until they complete their daily prayers, helping them build healthier phone usage habits through faith-based motivation.

Q: How does your subscription provide ongoing value?
A: Each prayer is freshly generated twice daily (morning & evening) based on the user's current life circumstances, mood, and prayer needs. This requires real-time generation with per-request costs. Subscribers also get unlimited prayer people, full prayer history, and access to PRAYBLOCK feature. Ongoing personalization and backend costs justify the recurring subscription.

Q: How do you handle content moderation?
A: Prayers are private (never shared between users), so there's no user-generated content feed. Generated prayers follow Christian theological principles (ACTS prayer model). Users can report prayers via in-app support if they ever find content inappropriate. All generated prayers are stored in the user's private account for their prayer history and can be reviewed if issues are reported.


THIRD-PARTY SERVICES
────────────────────────────────────────────────────────────────
• Supabase: Database, authentication, real-time sync
• OpenAI: Prayer personalization service
• RevenueCat: Subscription management and validation
• PostHog: Anonymous usage analytics
• OneSignal: Push notifications
• Sentry: Error tracking (development/staging only)

All third-party data handling is documented in our Privacy Policy at https://trypraymate.com/#privacy


CONTACT INFORMATION
────────────────────────────────────────────────────────────────
Support Email: support@trypraymate.com
Website: https://trypraymate.com
Privacy Policy: https://trypraymate.com/#privacy


═══════════════════════════════════════════════════════════════

We're committed to addressing any additional feedback promptly and maintaining compliance with all App Store guidelines.

Thank you for reviewing Praymate! 🙏

═══════════════════════════════════════════════════════════════
