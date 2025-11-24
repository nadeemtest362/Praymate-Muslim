# TestFlight Deployment Checklist for Personal Prayers

## ✅ Completed Items
- [x] Basic iOS project configuration
- [x] Bundle identifier: `com.md90210.personal-prayers`
- [x] Privacy manifest (PrivacyInfo.xcprivacy)
- [x] Push notification entitlements
- [x] Splash screen configuration
- [x] App permissions in Info.plist
- [x] EAS configuration file (eas.json)
- [x] App display name updated to "Personal Prayers"

## 🔴 Critical Items Needed

### 1. Apple Developer Account Setup
- [ ] Apple Developer Program membership ($99/year)
- [ ] App Store Connect account created
- [ ] App ID registered in Apple Developer Portal
- [ ] Push Notification service enabled for App ID
- [ ] Distribution certificate created
- [ ] App Store provisioning profile created

### 2. App Store Connect Configuration
- [ ] Create new app in App Store Connect
- [ ] Fill in app information:
  - [ ] App name: "Personal Prayers"
  - [ ] Primary language
  - [ ] Bundle ID selection
  - [ ] SKU (unique identifier)
- [ ] Add app description (4000 characters max)
- [ ] Add keywords (100 characters max)
- [ ] Select app category (likely "Lifestyle" or "Health & Fitness")
- [ ] Set content rating questionnaire
- [ ] Add support URL
- [ ] Add privacy policy URL
- [ ] Add marketing URL (optional)

### 3. Missing Assets
- [ ] App icon sizes for all required dimensions:
  - [ ] 20x20 (2x, 3x)
  - [ ] 29x29 (2x, 3x)
  - [ ] 40x40 (2x, 3x)
  - [ ] 60x60 (2x, 3x)
  - [ ] 1024x1024 (App Store)
- [ ] Notification icon (assets/notification-icon.png)
- [ ] App Store screenshots:
  - [ ] iPhone 6.7" (1290 x 2796)
  - [ ] iPhone 6.5" (1284 x 2778 or 1242 x 2688)
  - [ ] iPhone 5.5" (1242 x 2208)
  - [ ] iPad 12.9" (2048 x 2732) if supporting iPad

### 4. EAS Build Setup
- [ ] Install EAS CLI: `npm install -g eas-cli`
- [ ] Login to EAS: `eas login`
- [ ] Update eas.json with:
  - [ ] Your Apple ID
  - [ ] App Store Connect App ID
  - [ ] Apple Team ID
- [ ] Configure credentials: `eas credentials`

### 5. Code & Configuration Updates
- [ ] Update CFBundleDisplayName in Info.plist to "Personal Prayers"
- [ ] Increment build number for each TestFlight upload
- [ ] Ensure all API endpoints point to production
- [ ] Remove any development/debug code
- [ ] Test deep linking configuration

### 6. Build & Submit Process
```bash
# First-time setup
eas build:configure

# Build for iOS
eas build --platform ios --profile production

# Submit to TestFlight
eas submit --platform ios --latest
```

### 7. TestFlight Configuration
- [ ] Add TestFlight test information:
  - [ ] What to test
  - [ ] App description
  - [ ] Beta app review information
- [ ] Add internal testers (up to 100)
- [ ] Configure external testing groups
- [ ] Submit for Beta App Review (for external testers)

### 8. Final Checks Before Submission
- [ ] Test on real device
- [ ] Verify all permissions work correctly
- [ ] Check push notifications (production environment)
- [ ] Ensure no crashes or memory leaks
- [ ] Verify all third-party services are production-ready
- [ ] Test app performance on older devices
- [ ] Review analytics implementation
- [ ] Confirm IDFA usage (if applicable)

## 🟡 Recommended Improvements

### Performance & Quality
- [ ] Add proper app icon for all sizes
- [ ] Implement proper error tracking (Sentry/Bugsnag)
- [ ] Add analytics (Firebase/Mixpanel)
- [ ] Optimize image assets
- [ ] Add offline support where applicable

### User Experience
- [ ] Implement proper onboarding flow
- [ ] Add app rating prompt (using expo-store-review)
- [ ] Implement proper loading states
- [ ] Add proper error messages

### Security
- [ ] Ensure all API keys are properly secured
- [ ] Implement proper authentication token refresh
- [ ] Add certificate pinning for API calls
- [ ] Review data encryption practices

## Environment Variables
Make sure these are properly configured in EAS:
- [ ] EXPO_PUBLIC_SUPABASE_URL
- [ ] EXPO_PUBLIC_SUPABASE_ANON_KEY
- [ ] Any other API endpoints

## Post-TestFlight Steps
- [ ] Monitor crash reports
- [ ] Gather beta tester feedback
- [ ] Plan iteration based on feedback
- [ ] Prepare for App Store submission
- [ ] Create App Store marketing materials

## Notes
- Build numbers must be incremented for each TestFlight upload
- TestFlight builds expire after 90 days
- Beta App Review is required for external testers
- Keep provisioning profiles and certificates up to date 