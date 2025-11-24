# Manage Modal Production Crash Debug Session

## Date: January 21, 2025

## Summary
The manage-modal.tsx file crashes in production builds with "undefined is not a function" error. This only happens in Release configuration, not in development.

## What We Know Works
1. Basic component structure with hooks (useState, useEffect, useRef)
2. LinearGradient component
3. Styles created with createStyles(R)
4. Header with back button and title
5. Permission request UI (unknown/requesting state)
6. Permission denied UI
7. All UI renders fine UNTIL permission is granted

## The Crash Pattern
- Error: "undefined is not a function" at ManagePrayerPeopleModal (main.jsbundle:197124:55)
- Happens ONLY when contactPermission becomes "granted"
- Even with minimal granted state UI (just a Text component), it still crashes
- Crash happens even with loadContacts() commented out

## What We've Fixed So Far

### 1. Array Methods (from POSTMORTEM_PRODUCTION_CRASH.md)
- Replaced all `filter()`, `map()`, `includes()`, `some()`, `find()`, `slice()`, `push()` with manual loops
- Replaced `Array.from(new Set())` with manual deduplication
- Replaced string `.toLowerCase()` with manual character code conversion

### 2. Spread Operators
- Replaced all `setDebugInfo(prev => [...prev, newItem])` with manual array copying:
```javascript
setDebugInfo(prev => {
  const newArray = [];
  for (let i = 0; i < prev.length; i++) {
    newArray[newArray.length] = prev[i];
  }
  newArray[newArray.length] = newItem;
  return newArray;
});
```

### 3. Optional Chaining
- Replaced `data?.length` with `data && data.length`
- Replaced `data?.[0]` with `data && data[0]`
- Replaced `contact.image?.uri` with `contact.image && contact.image.uri ? contact.image.uri : undefined`
- Replaced `authUser?.id` with `authUser && authUser.id`

### 4. Logical OR Operator
- Replaced `contact.name || ''` with `contact.name ? contact.name : ''`
- Replaced `data && data.length || 0` with `data && data.length ? data.length : 0`

### 5. Other Attempts
- Removed useMemo wrapper from styles
- Changed useEffect dependency from `[authUser?.id]` to `[authUser]`
- Commented out loadContacts() entirely

## Current Test State
```javascript
) : (
  <View style={{ flex: 1, padding: 20 }}>
    <Text style={{ color: 'white', textAlign: 'center' }}>
      TESTING: Permission is {contactPermission}
    </Text>
  </View>
)
```
This STILL crashes when permission is granted!

## Systematic Debug Approach Used
1. Started with minimal component that worked (just gradient + text)
2. Added hooks one by one - worked
3. Added state variables - worked
4. Added store hooks - worked
5. Added header UI - worked
6. Added permission states - worked for unknown/denied
7. Crash happens ONLY when entering granted state

## Dead Code Issue
There's a large amount of code AFTER the component's return statement that is never executed:
- The filteredContacts calculation
- The isContactSelected function
- Various handlers (handleContactSelect, handlePersonFormSubmit, etc.)
- The full FlatList implementation

This dead code contains many more problematic patterns but shouldn't affect the crash since it's never executed.

## Next Steps to Try
1. ~~Check if the crash is related to the conditional rendering itself~~ TESTED - Still crashes with IIFE
2. Look for any other ES6+ features that might be breaking:
   - Template literals in the UI
   - Destructuring in function parameters
   - Arrow functions (IIFE with arrow function might be the issue!)
   - Async/await
   - Object shorthand properties
   - Default parameters

## Key Finding
The crash happens at the exact moment the UI tries to render the granted permission state, even with the simplest possible content. This suggests the issue might be:
1. In the conditional rendering logic itself
2. In some initialization that happens when that branch is taken
3. Related to how the minifier handles the ternary operators or JSX fragments (<>)

## SOLUTION FOUND!
The issue was that `isContactSelected` function was being called in the filtering logic (line 270) BEFORE it was defined (line 277). In JavaScript, function expressions using `const` are not hoisted, so they must be defined before use.

Fix: Move the `isContactSelected` function definition BEFORE the filtering logic that uses it.

This explains why it only crashed in production - the minifier likely made the hoisting issue more severe or changed the execution order.

## Build Command
```bash
npx expo run:ios --configuration Release
```

## Environment
- React Native: 0.79.3
- Expo SDK: 53
- Platform: iOS (Release builds only)