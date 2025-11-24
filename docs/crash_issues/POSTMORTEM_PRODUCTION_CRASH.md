# Postmortem: Production-Only "undefined is not a function" Crash

## Date: January 18, 2025

## Summary
The iOS app crashed immediately on launch in production builds (TestFlight) with "undefined is not a function" error at line 98743:68, but worked perfectly in development. This was one of the most frustrating bugs in the project's history.

## Timeline
- **Initial Report**: App crashes on TestFlight with vague error
- **Debug Process**: ~3 hours of systematic isolation
- **Root Cause**: Metro bundler minification breaking modern array methods
- **Resolution**: Replace problematic array methods with safe alternatives

## Root Cause Analysis

### The Problem
The production JavaScript minifier was mangling certain array method calls, causing them to become undefined at runtime. This only happened in Release builds because:
1. Development builds don't minify code
2. The minifier had issues with specific array method patterns
3. Error messages were obfuscated (line 98743 in a minified bundle)

### Affected Code Patterns
The following array methods caused crashes when minified:

1. **`filter(Boolean)`**
   ```javascript
   // BREAKS IN PRODUCTION
   const ids = data.map(item => item.id).filter(Boolean);
   
   // SAFE ALTERNATIVE
   const ids = data.map(item => item.id).filter(id => !!id);
   ```

2. **`Array.from(new Set())`**
   ```javascript
   // BREAKS IN PRODUCTION
   const unique = Array.from(new Set(array));
   
   // SAFE ALTERNATIVE
   const unique = [];
   for (let i = 0; i < array.length; i++) {
     if (unique.indexOf(array[i]) === -1) {
       unique.push(array[i]);
     }
   }
   ```

3. **`includes()`**
   ```javascript
   // BREAKS IN PRODUCTION
   if (array.includes(value)) { ... }
   
   // SAFE ALTERNATIVE
   if (array.indexOf(value) !== -1) { ... }
   ```

4. **`find()` and `some()`**
   ```javascript
   // BREAKS IN PRODUCTION
   const item = array.find(x => x.id === targetId);
   const hasItem = array.some(x => x.active);
   
   // SAFE ALTERNATIVE
   let item = null;
   for (let i = 0; i < array.length; i++) {
     if (array[i].id === targetId) {
       item = array[i];
       break;
     }
   }
   
   let hasItem = false;
   for (let i = 0; i < array.length; i++) {
     if (array[i].active) {
       hasItem = true;
       break;
     }
   }
   ```

5. **`Promise.allSettled()`**
   ```javascript
   // BREAKS IN PRODUCTION
   const results = await Promise.allSettled(promises);
   
   // SAFE ALTERNATIVE
   // Use sequential try-catch blocks instead
   ```

## Debug Process

### 1. Enable Local Production Builds
```bash
npx expo run:ios --configuration Release
```
This was crucial - reproducing the production crash locally.

### 2. Systematic Isolation
Created multiple versions of the problematic hook:
- `useHomeScreenMinimal.ts` - Bare minimum that worked
- `useHomeScreenDebug.ts` - Progressive feature addition
- `useHomeScreenSafe.ts` - Error boundary wrapper

### 3. Binary Search Debugging
Progressively added functionality back until the error occurred, identifying exact problematic lines.

## Lessons Learned

1. **Always test Release builds locally** before pushing to TestFlight
2. **Modern array methods can break** with certain minifiers
3. **React Native 0.79.3 + React 19** is bleeding edge and may have edge cases
4. **Error boundaries are essential** for production apps
5. **Progressive enhancement debugging** is effective for minification issues

## Prevention Measures

1. Added minification-safe coding conventions to CLAUDE.md
2. Created safe wrapper pattern for critical hooks
3. Documented problematic patterns for future reference
4. Consider adding ESLint rules to catch these patterns

## Technical Details

- **React Native**: 0.79.3
- **React**: 19.0.0
- **Expo SDK**: 53
- **Metro Bundler**: Default config
- **Platform**: iOS (production builds only)

## Impact
- Complete app failure on production launch
- Blocked TestFlight releases
- ~3 hours of debugging time
- User frustration: "this is the most frustrating thing ive ever dealt with in programming"

## Action Items
- [x] Fix all array method usage in useHomeScreen hook
- [x] Document safe patterns in CLAUDE.md
- [x] Create postmortem document
- [ ] Consider Metro bundler configuration tweaks
- [ ] Add pre-release production build testing to workflow