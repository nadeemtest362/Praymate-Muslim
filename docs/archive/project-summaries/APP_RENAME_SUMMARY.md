> **LEGACY DOCUMENT**: This document refers to the pre-2025 component layout (`src/components/**`). Paths are preserved for historical accuracy but are no longer valid. See current architecture in README.md.

# App Rename Summary: Personal Prayers → Just Pray

## Completed Changes

### 1. Configuration Files
- ✅ **app.json**: Updated name, slug, bundle identifiers, and all usage descriptions
- ✅ **package.json**: Updated package name
- ✅ **eas.json**: No changes needed (uses relative references)

### 2. iOS Files
- ✅ **Info.plist**: Updated display name, bundle URL schemes, and all usage descriptions
- ✅ **personalprayers.entitlements**: No changes needed (no hardcoded names)

### 3. Android Files
- ✅ **AndroidManifest.xml**: Updated deep link scheme
- ✅ **settings.gradle**: Updated root project name
- ✅ **strings.xml**: Updated app name

### 4. Source Code
- ✅ **src/lib/auth.ts**: Updated deep link for password reset
- ✅ **Deep link examples**: Updated all references to use `justpray://`

### 5. Documentation
- ✅ **README.md**: Updated project name
- ✅ **CLAUDE.md**: Updated project description
- ✅ **personal_prayers_PRD.md**: Updated title
- ✅ **personal_prayers_Project_Overview.md**: Updated title
- ✅ **Deep link documentation**: Updated all examples

### 6. Service Configuration
- ✅ **prayer-api-service/package.json**: Updated description
- ✅ **Screen config files**: Updated app name references in SDUI configs

## Additional Steps Needed for Complete Rebrand

### 1. iOS Directory Renaming (Requires Xcode)
The following directories need to be renamed:
- `ios/PersonalPrayers/` → `ios/JustPray/`
- `ios/PersonalPrayers.xcodeproj/` → `ios/JustPray.xcodeproj/`
- `ios/PersonalPrayers.xcworkspace/` → `ios/JustPray.xcworkspace/`

### 2. Android Package Renaming
- `android/app/src/main/java/com/md90210/personalprayers/` → `android/app/src/main/java/com/md90210/justpray/`

### 3. Build System Updates
After renaming directories:
1. Update `ios/Podfile` target name
2. Update all references in `ios/JustPray.xcodeproj/project.pbxproj`
3. Run `cd ios && pod deintegrate && pod install`
4. Clean and rebuild the project

### 4. App Store/Play Store Considerations
- Update app name in App Store Connect
- Update app name in Google Play Console
- Generate new app icons with "Just Pray" branding
- Update any marketing materials

## Testing Checklist
- [ ] Run `npm install` to ensure package.json changes work
- [ ] Test iOS build: `npm run ios`
- [ ] Test Android build: `npm run android`
- [ ] Verify deep links work with new scheme
- [ ] Test password reset flow with new deep link
- [ ] Verify app displays "Just Pray" everywhere

## Notes
- The bundle identifier was changed from `com.md90210.personal-prayers` to `com.md90210.justpray`
- The Android package was changed from `com.md90210.personalprayers` to `com.md90210.justpray`
- All user-facing text now says "Just Pray" instead of "Personal Prayers"