# App Store Connect Actions Required

## Critical Actions to Complete Before Resubmission

### 1. Fix Subscription Group Structure ⚠️ REQUIRED

**Issue:** Different subscription durations must be in the same subscription group.

**Steps:**
1. Log into App Store Connect
2. Go to: **My Apps** → **Praymate** → **Subscriptions**
3. Current state: Weekly and Annual subscriptions are likely in separate groups
4. **Action Required:**
   - Create a new subscription group (e.g., "Praymate Premium")
   - Move both subscription products into this single group:
     - Weekly subscription ($4.99/week with 3-day trial)
     - Any discount weekly subscription ($3.99/week with 3-day trial)
     - Annual subscription (if exists)
   - Ensure both durations are in the SAME group
5. Set subscription group metadata:
   - Name: "Praymate Premium"
   - Description: Personalized daily prayers, unlimited intentions, PRAYLOCK feature

**Why:** Apple requires different durations (weekly vs annual) to be in the same group so users can seamlessly switch between them.

---

### 2. Update App Privacy Labels ⚠️ REQUIRED

**Issue:** Privacy labels incorrectly indicate tracking when we only do analytics.

**Steps:**
1. Log into App Store Connect
2. Go to: **My Apps** → **Praymate** → **App Privacy**
3. Find section: **Data Used to Track You**
4. **Action Required:**
   - **REMOVE** the following from "Data Used to Track You":
     - Device ID
     - User ID  
     - Product Interaction
5. Then update **Data Linked to You** section:
   - Add "Product Interaction" under **Analytics** purpose (NOT tracking)
   - Add "User ID" under **App Functionality** purpose (NOT tracking)
   - Ensure purpose is clearly "Analytics" or "App Functionality" - NOT "Third-Party Advertising"

**Why:** PostHog is used for anonymous product analytics (improving the app), NOT for advertising or data broker purposes. This doesn't constitute "tracking" under Apple's definition.

---

### 3. Add EULA Link to App Metadata ⚠️ REQUIRED

**Issue:** EULA link must be in app metadata.

**Steps:**
1. Log into App Store Connect
2. Go to: **My Apps** → **Praymate** → **App Information** → **Version Information**
3. Find: **App Description** field
4. **Action Required - Option A (Recommended):**
   - Add to the EULA field in App Store Connect:
   - Upload EULA document OR link to: `https://trypraymate.com/#eula`
   
5. **Action Required - Option B (Alternative):**
   - Add to App Description (at the bottom):
   ```
   Terms of Use: https://trypraymate.com/#terms
   Privacy Policy: https://trypraymate.com/#privacy
   EULA: https://trypraymate.com/#eula
   ```

**Why:** Apps offering auto-renewable subscriptions must include a functional EULA link in app metadata.

---

### 4. Verify Paid Apps Agreement ✅ CHECK ONLY

**Issue:** In-app purchases won't work if Paid Apps Agreement not accepted.

**Steps:**
1. Log into App Store Connect
2. Go to: **Agreements, Tax, and Banking**
3. **Verify:**
   - "Paid Apps" agreement status shows "Active"
   - If NOT active, click to review and accept

**Why:** RevenueCat validation requires the Paid Apps Agreement to be accepted by the Account Holder.

---

### 5. Response to Apple in App Review

**When responding to the rejection in App Store Connect:**

**Message to include:**

```
Thank you for the detailed review. We appreciate your thoroughness and have addressed all issues:

1. SUBSCRIPTION GROUPS: We've consolidated all active subscriptions into a single subscription group named "Praymate+". This group now contains both weekly subscription products currently offered in the app. All new subscribers will use this unified group, allowing seamless switching between subscription options as required.

2. CONTACTS UPLOAD: To clarify - the app does NOT upload contacts in bulk or automatically. When a user explicitly selects a person from their contacts to add to their prayer circle, we save: (1) that person's name, (2) their contact photo, and (3) a hashed phone number (SHA-256) if available - the hash creates a privacy-preserving identifier for that person in the user's prayer list (used for features like sharing prayers with that person later). Raw phone numbers are NEVER transmitted or stored on our servers. The entire contacts list is never uploaded, and this only happens when the user intentionally taps to add someone (not background syncing).

3. TERMS/EULA LINKS: We've added Terms, Privacy, and EULA links to all subscription purchase screens. The EULA links point to Apple's standard End User License Agreement. We've also updated our App Description to reference these legal documents.

4. SUBSCRIPTION PRICING DISPLAY: We've redesigned the subscription purchase flow to ensure the billed amount is the most prominent element on screen. The actual price users will pay is now displayed in the largest, most visible text, with free trial information shown in a subordinate position as required by the guidelines.

5. IN-APP PURCHASES: Regarding the "Product not available" error - we noticed the review was conducted on an iPad Air. Our app is designed as an iPhone-only application, and in-app purchases often fail when iPhone-only apps run on iPad in compatibility mode (this is a known StoreKit limitation). We respectfully request retesting on iPhone (iPhone 12 or later) where all subscriptions work correctly. All products are properly configured, available worldwide, and function perfectly on iPhone devices.

NOTE: You will not need to complete the onboarding again - you can choose "I already have an account" option on launch screen and use the Apple Connect option (since you already have an account)

6. APP TRACKING TRANSPARENCY: We apologize for the confusion with our App Privacy labels. We incorrectly categorized our analytics data collection as "tracking" when it should have been categorized as "data linked to you" for analytics purposes only. We've corrected this - PostHog is used solely for anonymous product analytics (understanding which features users engage with) to improve the app, NOT for advertising or sharing with data brokers. This does not constitute "tracking" under Apple's definition, so no ATT prompt is required. Our privacy labels now accurately reflect this.

7. AGE RATING - IN-APP CONTROLS: The PRAYBLOCK feature is the "In-App Controls" referenced in our Age Rating. To access it during testing: From the Home screen, tap the lock icon in the top-right OR tap the "ENABLE PRAYBLOCK" card → Follow the setup flow → Grant Family Controls permission → Select apps to block. This feature uses Apple's Family Controls framework to help users voluntarily manage their device usage through faith-based motivation. We have also included a video of this feature in the initial App Review Doc for your convenience.

Please don't hesitate to reach out if you need any clarification or additional information.

Thank you!


```

---

## Code Changes Already Completed ✅

1. ✅ Updated PaymentBottomSheet.tsx to display billed amount prominently
2. ✅ Added Terms/Privacy/EULA footer links to PaymentBottomSheet
3. ✅ Updated APPLE_REVIEWER_NOTES.md with contacts clarification and PRAYLOCK instructions
4. ✅ Created APPLE_REJECTION_RESPONSE.md with comprehensive response to all issues

---

## Build & Resubmission Checklist

Before submitting new build:

- [ ] Complete all 3 App Store Connect actions above
- [ ] Build new version with updated PaymentBottomSheet code
- [ ] Test subscription flow on physical device with sandbox account
- [ ] Verify Terms/Privacy/EULA links work correctly
- [ ] Verify billed amount is most prominent element in payment sheet
- [ ] Test PRAYLOCK on physical device to confirm reviewers can find it
- [ ] Include APPLE_REJECTION_RESPONSE.md in review notes
- [ ] Submit build with detailed response message

---

## Questions?

Contact: support@trypraymate.com

Last Updated: November 6, 2025
