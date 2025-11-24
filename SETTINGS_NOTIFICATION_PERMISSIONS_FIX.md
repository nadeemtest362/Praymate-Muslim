# Settings Screen Notification Permissions Fix

## Problem Statement

The settings screen (`app/(app)/settings.tsx`) allows users to toggle prayer reminders ON/OFF but **never requests iOS notification permissions**. This causes silent failure:

- User toggles reminder ON → UI shows "enabled"
- OneSignal tags are set to `'true'`
- **iOS never shows permission prompt**
- User receives zero notifications (permissions denied by default)
- User believes reminders are working but they're not

### Current Broken Flow
1. User toggles morning/evening reminder ON
2. `handleReminderToggle` immediately sets local state (`setMorningReminder(true)`)
3. OneSignal tag updated (`OneSignal.User.addTag(tagKey, 'true')`)
4. **No permission check or request happens**
5. Toggle shows ON but notifications will never fire

---

## Solution Overview

Implement the same permission handling pattern used in the **working** onboarding screen (`src/features/onboarding/screens/times.tsx`):

1. Track iOS notification permission status
2. Check permissions on component mount
3. Request permissions when user toggles reminder ON (if not already granted)
4. Show permission denied UI with "Open Settings" button
5. Only update OneSignal tags AFTER successful permission grant
6. Revert toggle state if user denies permissions

---

## Technical Specification

### 1. New State Variables

Add permission tracking state:

```typescript
const [permissionStatus, setPermissionStatus] = useState<Notifications.PermissionStatus | null>(null);
```

### 2. Permission Check on Mount

Add `useEffect` to check current permission status when screen loads:

```typescript
useEffect(() => {
  checkPermissions();
}, []);

const checkPermissions = async () => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionStatus(status);
  } catch (error) {
    console.warn('[Settings] Permission check failed:', error);
  }
};
```

**Reference:** `times.tsx` lines 317-328

### 3. Permission Request Function

Add async permission request handler:

```typescript
const requestPermissionsIfNeeded = async (): Promise<boolean> => {
  // Already granted
  if (permissionStatus === Notifications.PermissionStatus.GRANTED) {
    return true;
  }
  
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    
    setPermissionStatus(status);
    
    if (status === Notifications.PermissionStatus.GRANTED) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return true;
    } else {
      // User denied
      Alert.alert(
        "Notifications Disabled",
        "Prayer reminders require notification permissions. Enable them in Settings to receive reminders.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() }
        ]
      );
      return false;
    }
  } catch (error) {
    console.warn('[Settings] Permission request failed:', error);
    return false;
  }
};
```

**Reference:** `times.tsx` lines 331-396

### 4. Update `handleReminderToggle` Logic

**Current broken logic:**
```typescript
// Immediately updates UI, never checks permissions
setReminderState(value);
OneSignal.User.addTag(tagKey, 'true');
```

**New permission-aware logic:**
```typescript
const handleReminderToggle = useCallback(
  async (reminder: 'morning' | 'evening', value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const tagKey = REMINDER_TAG_KEYS[reminder];
    const setReminderState = reminder === 'morning' ? setMorningReminder : setEveningReminder;
    const previousValue = reminder === 'morning' ? morningReminder : eveningReminder;

    // TURNING ON: Request permissions first
    if (value) {
      const granted = await requestPermissionsIfNeeded();
      if (!granted) {
        // User denied - do NOT update state or tags
        return;
      }
    }

    // Update local state (only after permissions succeed when turning ON)
    setReminderState(value);

    // Update OneSignal tags ONLY if permissions granted (or turning OFF)
    if (!hasOneSignal || !(OneSignal as any)?.User) {
      return;
    }

    try {
      if (value) {
        await OneSignal.User.addTag(tagKey, 'true');
      } else if (typeof OneSignal.User.removeTag === 'function') {
        await OneSignal.User.removeTag(tagKey);
      } else {
        await OneSignal.User.addTag(tagKey, 'false');
      }
    } catch (error) {
      console.warn('[Settings] Failed to update OneSignal reminder tag', error);
      // Revert state on tag update failure
      setReminderState(previousValue);
      Alert.alert(
        'Reminder Update Failed', 
        'We could not update your prayer reminder preference. Please try again.'
      );
    }
  },
  [eveningReminder, hasOneSignal, morningReminder, permissionStatus],
);
```

**Key changes:**
- Made async (`async (reminder, value)`)
- Calls `requestPermissionsIfNeeded()` when toggling ON
- Early returns if permission denied (does not update state/tags)
- Only proceeds with OneSignal updates after permission check passes

### 5. Permission Denied UI

Add visual indicator when permissions are denied (between prayer reminders section and account section):

```typescript
{permissionStatus === Notifications.PermissionStatus.DENIED && (
  <View style={styles.permissionDeniedCard}>
    <View style={styles.permissionDeniedContent}>
      <Feather name="bell-off" size={R.font(20)} color="#FF6B8B" />
      <Text style={styles.permissionDeniedText}>
        Prayer reminders are disabled in your device settings.
      </Text>
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          Linking.openSettings();
        }}
      >
        <Text style={styles.settingsButtonText}>Open Settings</Text>
      </TouchableOpacity>
    </View>
  </View>
)}
```

**Reference:** `times.tsx` lines 463-480

### 6. Add Required Styles

```typescript
permissionDeniedCard: {
  marginBottom: R.h(2),
  backgroundColor: 'rgba(255, 107, 139, 0.1)',
  borderColor: 'rgba(255, 107, 139, 0.2)',
  borderWidth: 1,
  borderRadius: R.w(4),
  padding: R.w(4),
},
permissionDeniedContent: {
  flexDirection: 'row',
  alignItems: 'center',
  columnGap: R.w(2),
},
permissionDeniedText: {
  flex: 1,
  fontSize: R.font(14),
  color: '#FFFFFF',
  fontFamily: 'SNPro-SemiBold',
},
settingsButton: {
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  paddingVertical: R.h(1),
  paddingHorizontal: R.w(3),
  borderRadius: R.w(2),
},
settingsButtonText: {
  color: '#FFFFFF',
  fontSize: R.font(14),
  fontFamily: 'SNPro-Bold',
},
```

### 7. Re-check Permissions When Screen Gains Focus

When a user denies notifications and later enables them via iOS Settings, we should refresh the local permission state as soon as they return to the Settings screen. Use `useFocusEffect` (from `expo-router`/`@react-navigation/native`) or an `AppState` listener to call `checkPermissions()` whenever the screen gains focus.

### 8. Add Missing Import

```typescript
import * as Notifications from 'expo-notifications';
```

---

## Implementation Checklist

- [ ] Add `permissionStatus` state variable
- [ ] Add `checkPermissions()` function and `useEffect` hook
- [ ] Add `requestPermissionsIfNeeded()` async function
- [ ] Update `handleReminderToggle` to be async and request permissions when toggling ON
- [ ] Add permission denied UI card to render when `permissionStatus === DENIED`
- [ ] Add new styles for permission denied card (use `columnGap` for compatibility)
- [ ] Re-check permissions when the screen regains focus (`useFocusEffect` calling `checkPermissions`)
- [ ] Import `expo-notifications` (Linking already available)
- [ ] Test toggle ON flow (should show iOS permission prompt on first enable)
- [ ] Test toggle OFF flow (should work without permission checks)
- [ ] Test denial flow (toggle should not enable, alert should show, card should appear)
- [ ] Test "Open Settings" button (should deep link to iOS Settings app)

---

## Testing Scenarios

### Scenario 1: Fresh Install (No Permissions Set)
1. Open Settings screen
2. Toggle morning reminder ON
3. **Expected:** iOS permission prompt appears
4. Grant permission
5. **Expected:** Toggle stays ON, OneSignal tag set to `'true'`

### Scenario 2: Permissions Previously Denied
1. Open Settings screen (permissionStatus = DENIED)
2. **Expected:** Permission denied card visible
3. Toggle morning reminder ON
4. **Expected:** Alert appears: "Notifications Disabled..."
5. **Expected:** Toggle does NOT turn on
6. Tap "Open Settings" in alert
7. **Expected:** iOS Settings app opens

### Scenario 3: Permissions Already Granted
1. Open Settings screen (permissionStatus = GRANTED)
2. Toggle morning reminder ON
3. **Expected:** No prompt, toggle immediately enables, tag updated

### Scenario 4: Toggle OFF
1. Morning reminder currently ON
2. Toggle OFF
3. **Expected:** No permission check, toggle immediately disables, tag removed

---

## Files Modified

- `app/(app)/settings.tsx`

## Files for Reference

- `src/features/onboarding/screens/times.tsx` (working implementation)

---

## Analytics Considerations

Optional: Add analytics events to track permission flow:
- `settings_notification_permission_requested`
- `settings_notification_permission_granted`
- `settings_notification_permission_denied`

(Not required for MVP fix but recommended for monitoring)

---

## Edge Cases

1. **OneSignal not available**: Existing `hasOneSignal` check already handles this
2. **User enables in iOS Settings after denying**: Re-check permissions when screen gains focus (implemented via `useFocusEffect` calling `checkPermissions`)
3. **Network failure on tag update**: Already handled with try-catch and state revert
4. **Analytics failures**: Must remain silent (per AGENTS.md production rules)

---

## Success Criteria

✅ User cannot enable prayer reminders without granting iOS notification permissions  
✅ iOS permission prompt appears when toggling reminder ON for first time  
✅ Permission denied state shows helpful UI with "Open Settings" button  
✅ OneSignal tags only update AFTER successful permission grant (awaited so errors can revert state)  
✅ Toggle state accurately reflects actual notification capability  
✅ No silent failures—user always knows if reminders will work or not
