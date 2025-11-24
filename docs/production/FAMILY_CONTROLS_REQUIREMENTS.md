# Family Controls Implementation Requirements for Just Pray iOS App

## Overview
This document outlines the technical requirements for implementing Family Controls (app blocking) functionality in the Just Pray iOS app, based on the PRAYLOCK feature concept. Includes background task enforcement for reliable changeover blocking.

## Current iOS Project State

### Existing Configuration
- **Bundle Identifier**: `com.md90210.justpray`
- **Minimum iOS Version**: 12.0
- **Architecture**: React Native 0.79.3 with Expo
- **Swift Version**: Compatible with Swift 5 (LastSwiftMigration: 1250)
- **Current Entitlements**:
  - Push Notifications (`aps-environment: development`)
  - Sign in with Apple (`com.apple.developer.applesignin`)

### Missing Components for Family Controls
The project currently has no Family Controls infrastructure. The following must be added:

## Required Info.plist Entries

Add the following to `/ios/JustPray/Info.plist`:

```xml
<key>NSFamilyControlsUsageDescription</key>
<string>Just Pray uses Family Controls to help you focus on prayer by temporarily limiting access to distracting apps until you complete your morning prayer.</string>
<key>UIBackgroundModes</key>
<array>
    <string>background-fetch</string>
</array>
```

## Required Entitlements

Update `/ios/JustPray/JustPray.entitlements` to include:

```xml
<key>com.apple.developer.family-controls</key>
<true/>
<key>com.apple.security.application-groups</key>
<array>
    <string>group.com.md90210.justpray</string>
</array>
```

## Xcode Project Configuration

### 1. Enable Family Controls Capability
In Xcode project settings:
- Select the JustPray target
- Go to "Signing & Capabilities"
- Click "+" to add capability
- Add "Family Controls"

### 2. Add App Groups Capability
- Add "App Groups" capability
- Create group: `group.com.md90210.justpray`
- This enables data sharing between main app and extensions

### 3. Update TargetAttributes in project.pbxproj
The following will be automatically added when capabilities are enabled:
```
SystemCapabilities = {
    com.apple.ApplicationGroups.iOS = {
        enabled = 1;
    };
    com.apple.FamilyControls = {
        enabled = 1;
    };
};
```

## Required App Extensions

### 1. Shield Configuration Extension
**Purpose**: Customizes the shield UI that appears when blocked apps are accessed

**Setup**:
1. File → New → Target → "Shield Configuration Extension"
2. Name: `JustPrayShieldConfig`
3. Bundle ID: `com.md90210.justpray.shield-config`

**Required Files**:
- `ShieldConfigurationDataSource.swift`
- `Info.plist` with extension configuration
- Entitlements file with Family Controls and App Groups

### 2. Shield Action Extension  
**Purpose**: Handles user interactions with the shield (e.g., "Go to Prayer" button)

**Setup**:
1. File → New → Target → "Shield Action Extension"
2. Name: `JustPrayShieldAction`
3. Bundle ID: `com.md90210.justpray.shield-action`

**Required Files**:
- `ShieldActionExtension.swift`
- `Info.plist` with extension configuration
- Entitlements file with Family Controls and App Groups

## Native iOS Module Requirements

Since React Native doesn't have built-in Family Controls support, create a native module:

### FamilyControlsModule Structure
```
/ios/JustPray/FamilyControls/
├── FamilyControlsModule.swift
├── FamilyControlsModule.m (Objective-C bridge)
├── AppBlockingManager.swift
├── AuthorizationManager.swift
└── SharedDataManager.swift
```

### Key Components

1. **Authorization Manager**
   - Request Family Controls authorization
   - Check authorization status
   - Handle parent/guardian authentication

2. **App Blocking Manager**
   - Select apps to block
   - Apply/remove restrictions
   - Schedule blocking windows (4 AM - prayer completion)
   - Background task enforcement for changeover reliability

3. **Shared Data Manager**
   - Coordinate between main app and extensions using App Groups
   - Store blocking state, prayer completion status

4. **React Native Bridge**
   - Expose methods to JavaScript layer
   - Handle async authorization flows
   - Emit events for shield interactions

## App Group Shared Data Structure

Use UserDefaults with App Group for data sharing:

```swift
let sharedDefaults = UserDefaults(suiteName: "group.com.md90210.justpray")

// Keys:
"praylock_enabled": Bool
"blocked_apps": [String] // Bundle identifiers
"morning_prayer_completed": Bool
"last_prayer_date": Date
"emergency_unlocks_today": Int
"blocking_schedule": Dictionary
```

## React Native Integration Points

### TypeScript Interface
```typescript
interface FamilyControlsModule {
  // Authorization
  requestAuthorization(): Promise<boolean>;
  checkAuthorizationStatus(): Promise<AuthorizationStatus>;
  
  // App Selection
  selectAppsToBlock(): Promise<void>;
  getBlockedApps(): Promise<string[]>;
  
  // Blocking Control
  enablePraylock(schedule: BlockingSchedule): Promise<void>;
  disablePraylock(): Promise<void>;
  
  // Background Task Management
  registerBackgroundTasks(): Promise<void>;
  unregisterBackgroundTasks(): Promise<void>;
  
  // Prayer Completion
  markPrayerCompleted(): Promise<void>;
  
  // Emergency Unlock
  performEmergencyUnlock(appBundleId: string): Promise<void>;
}
```

## Privacy and App Store Considerations

1. **Privacy Information**
   - Add Family Controls usage to `PrivacyInfo.xcprivacy`
   - Document data collection practices

2. **App Store Review Notes**
   - Explain PRAYLOCK feature clearly
   - Emphasize positive use case (spiritual growth)
   - Note that blocking is user-initiated and reversible

3. **Age Restrictions**
   - Family Controls requires guardian approval for users under 18
   - Consider UX flow for adult users vs minors

## Development Workflow

1. **Phase 1**: Set up entitlements and capabilities
2. **Phase 2**: Create shield extensions with basic UI
3. **Phase 3**: Implement native module with authorization
4. **Phase 4**: Add app selection and blocking logic
5. **Phase 5**: Integrate with React Native UI
6. **Phase 6**: Test shield behavior and data sharing
7. **Phase 7**: Polish shield UI to match app design

## Testing Requirements

1. **Device Testing**: Family Controls requires physical device (not simulator)
2. **Multiple Devices**: Test on both parent and child devices if targeting families
3. **Test Scenarios**:
   - Authorization flow
   - App selection and blocking
   - Shield appearance and customization
   - Prayer completion unlock flow
   - Emergency unlock functionality
   - Data persistence across app launches
   - Background changeover blocking (4am/4pm when app backgrounded)
   - Background task reliability and battery impact

## Known Limitations

1. **iOS Version**: Family Controls requires iOS 16.0+, but app supports iOS 12.0
   - Need conditional availability checks
   - Fallback UX for older iOS versions

2. **Simulator**: Cannot test Family Controls in simulator
3. **TestFlight**: Limited Family Controls testing in TestFlight
4. **Regional**: Family Controls availability varies by region

## Next Steps

1. Update minimum iOS version to 16.0 or implement conditional feature
2. Create native module architecture
3. Design shield UI matching Just Pray's design system
4. Implement data flow between app and extensions
5. Create comprehensive testing plan

## Resources

- [Apple Family Controls Documentation](https://developer.apple.com/documentation/familycontrols)
- [ManagedSettings Framework](https://developer.apple.com/documentation/managedsettings)
- [ShieldConfiguration Extension](https://developer.apple.com/documentation/familycontrols/shieldconfigurationdatasource)
- [App Groups Documentation](https://developer.apple.com/documentation/bundleresources/entitlements/com_apple_security_application-groups)