# Production Crash Bug Report: "undefined is not a function" in HomeScreen

## Critical Issue Summary
The JustPray React Native app crashes with "undefined is not a function" error when loading HomeScreen in TestFlight production builds ONLY. The app works perfectly in:
- Local development mode
- Local production builds (`npx expo start --no-dev --minify`)
- All simulator environments

## Error Details
```
TypeError: undefined is not a function

This error is located at:
    at HomeScreen (main.jsbundle:98743:68)
```

## Environment & Configuration

### Package.json Key Dependencies
```json
{
  "name": "justpray",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "dependencies": {
    "expo": "53.0.11",
    "react": "19.0.0",
    "react-native": "0.79.3",
    "react-native-reanimated": "~3.17.4",
    "expo-haptics": "~14.1.4",
    "expo-router": "~5.0.7",
    "zustand": "^5.0.3"
  }
}
```

### EAS Configuration (eas.json)
```json
{
  "build": {
    "production": {
      "ios": {
        "buildConfiguration": "Release",
        "image": "latest"
      },
      "autoIncrement": true,
      "channel": "production",
      "env": {
        "EXPO_PUBLIC_APP_VARIANT": "production",
        "EXPO_NEW_ARCH_ENABLED": "false",  // ADDED IN BUILD 57
        "EXPO_PUBLIC_SUPABASE_URL": "...",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "..."
      }
    }
  }
}
```

### Metro Configuration (metro.config.js)
```javascript
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.resolver.unstable_enablePackageExports = false;
module.exports = config;
```

## User Context
- User "Henny" (ID: ec0c6423-aefc-463d-84f8-39ee67b95c37)
- Profile: `is_anonymous: false`, `onboarding_completed_at: "2025-06-17 00:53:26.321+00"`
- Has completed onboarding with 1 prayer, 1 self-intention, and user_stats record

## Fixes Attempted (Builds 41-58)

### 1. Hoisting Issues Fixed ✅
Fixed function declaration order issues in 29+ components:
- `createStyles` being used before declaration in multiple files
- `createModalStyles` in DailyPrayerTasks.tsx (used line 160, defined line 783)
- Standalone `styles` constant at bottom of DailyPrayerTasks.tsx
- ProgressBar component creating undefined styles
- PersonCardItem.tsx styles hoisting

### 2. Babel Configuration Added ✅ (Build 51)
Created missing `babel.config.js`:
```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],  // CRITICAL FOR REANIMATED
  };
};
```

### 3. Haptics Import Fixed ✅ (Build 53)
- **Problem**: useHomeScreen imported from custom `../utils/haptics` wrapper with complex dynamic require
- **Solution**: Changed to direct import from `expo-haptics` (matching all working onboarding screens)
```javascript
// Before
import { triggerHaptic } from '../utils/haptics';

// After  
import * as Haptics from 'expo-haptics';
```

### 4. Zustand Store Access Pattern Fixed ✅ (Build 54)
Changed from selector pattern to destructuring:
```javascript
// Before
const prayerPeople = usePrayerPeopleStore(state => state.prayerPeople);

// After
const { prayerPeople: allPrayerPeople, ... } = usePrayerPeopleStore();
```

### 5. New Architecture Flag Added ✅ (Build 57/58)
- **Critical Discovery**: Production profile was missing `"EXPO_NEW_ARCH_ENABLED": "false"`
- Preview profile had it, production didn't
- This could cause native module compatibility issues

## Key Observations

1. **The crash ONLY occurs in actual TestFlight/production builds**
   - Local production builds work perfectly
   - This suggests bundling/optimization differences

2. **Error location is consistent**: HomeScreen line 98743:68 in bundle

3. **All onboarding screens work fine in production**
   - They import haptics directly from expo-haptics
   - They use similar responsive design patterns

4. **EAS CLI Corruption Issue (Resolved)**
   - EAS CLI was corrupted, entering commands as Apple ID
   - Fixed by deleting `~/.config/eas-cli` and re-logging in

## Current Status
- Build 63 is being created with ALL fixes applied
- Includes babel.config.js, haptics fix, Zustand fix, and EXPO_NEW_ARCH_ENABLED flag

## Build 64 Fixes Applied (2025-06-17)

### 1. Fixed Set Constructor with Undefined Values
- **File**: `src/hooks/useHomeScreen.ts`
- **Fix**: Split optional chaining to prevent undefined.filter() errors
```javascript
// Before:
const activeIds = new Set(
  intentionsData?.map(i => i.person_id).filter(Boolean) as string[]
);

// After:
const mappedIds = intentionsData?.map(i => i.person_id).filter(Boolean) || [];
const activeIds = new Set(mappedIds as string[]);
```

### 2. Added Array Safety Checks
- **File**: `src/hooks/useHomeScreen.ts`
- **Fix**: Added explicit Array.isArray checks before .find() operations
```javascript
// Before:
const fetchedMorningPrayer = todayData?.find(p => p.slot === 'morning') || null;

// After:
const fetchedMorningPrayer = Array.isArray(todayData) ? todayData.find(p => p.slot === 'morning') : null;
```

### 3. Enhanced Metro Configuration
- **File**: `metro.config.js`
- **Fix**: Added minifier configuration to preserve function names and improve source maps
```javascript
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
  source_map: {
    includeSources: true,
  },
};
```

### 4. Added Production Build Verification
- **File**: `src/lib/supabaseClient.ts`
- **Fix**: Added runtime checks for critical Supabase methods in production builds

## Remaining Theories

1. **Bundle optimization issue**: Something in the production bundler is breaking a specific function call
2. **Missing polyfill**: A function that exists in dev but needs explicit import in production
3. **React Native 0.79.3 + Expo 53 compatibility**: Possible edge case with this specific version combination

## Next Debugging Steps If Build 63 Fails

1. **Source map analysis**: Get the exact line from the bundle to identify the failing function
2. **Check for dynamic imports**: Look for any require() or import() that might fail in production
3. **Verify all native module registrations**: Ensure all Expo modules are properly linked
4. **Add explicit error boundaries**: Wrap HomeScreen components to isolate the exact failing component

## Critical Files to Review
- `app/(app)/(tabs)/home/index.tsx` (HomeScreen)
- `src/hooks/useHomeScreen.ts`
- `src/features/home/DailyPrayerTasks.tsx`
- `src/stores/prayerPeopleStore.ts`
- `babel.config.js` (newly added)

## Build History
- Builds 41-50: Various hoisting fixes
- Build 51: Added babel.config.js
- Build 53: Fixed haptics import
- Build 54: Fixed Zustand pattern
- Build 57-58: Added EXPO_NEW_ARCH_ENABLED
- Build 63: Current build with all fixes 