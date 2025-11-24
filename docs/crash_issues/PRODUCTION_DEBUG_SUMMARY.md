# Production Debugging Summary

## What We've Done

### 1. **Enabled Sentry Error Tracking**
- Uncommented Sentry initialization in `app/_layout.tsx`
- Added breadcrumbs throughout HomeScreen to track execution flow
- Enhanced Sentry config with debug mode and better error context
- When the app crashes, check: https://sentry.io/organizations/your-org/issues/

### 2. **Created Multiple Debug Versions**
- `index.minimal.tsx` - Bare minimum component to test if rendering works at all
- `index.debug.tsx` - Extensive console logging version
- `index.sentry.tsx` - Full Sentry error boundary wrapper
- `useHomeScreenDebug.ts` - Hook with production-safe logging

### 3. **Fixed Potential Issues**
- Fixed Set constructor with potentially undefined values
- Added explicit Array.isArray checks before array methods
- Split optional chaining to prevent undefined.filter() errors
- Added metro config to preserve function names during minification
- Added production build verification for Supabase client

### 4. **Building Local Production Version**
Currently building a Release configuration locally to test without TestFlight rate limits.

## How to Debug

### Option 1: Check Sentry Dashboard
Once Build 87 crashes, check Sentry for:
- Exact error message and stack trace
- Breadcrumbs showing execution path
- Line numbers and source maps

### Option 2: Test Minimal Version
```bash
# Backup current
mv app/(app)/(tabs)/home/index.tsx app/(app)/(tabs)/home/index.backup.tsx
# Use minimal
mv app/(app)/(tabs)/home/index.minimal.tsx app/(app)/(tabs)/home/index.tsx
```

### Option 3: Use Debug Version with Logging
```bash
# Use debug version
mv app/(app)/(tabs)/home/index.debug.tsx app/(app)/(tabs)/home/index.tsx
```

### Option 4: Progressive Enhancement
Start with minimal and gradually add features back to find the breaking point.

## Local Production Build
```bash
# Clean and rebuild
rm -rf ios android
npx expo prebuild --clean

# Install dependencies
npm install expo-device

# Build release for simulator
npx expo run:ios --configuration Release
```

## Most Likely Culprits
1. Zustand store selector being called with undefined state
2. Array method chaining where intermediate result is undefined
3. React 19 + React Native 0.79.3 compatibility issues
4. Minification breaking function references

## Next Steps
1. Wait for local build to complete
2. Test on simulator to reproduce crash
3. Check console logs and Sentry
4. Apply targeted fix based on findings