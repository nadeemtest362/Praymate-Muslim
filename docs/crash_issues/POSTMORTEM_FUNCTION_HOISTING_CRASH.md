# Postmortem: Production Crash - Function Hoisting Issue

## Date: January 21, 2025

## Summary
The manage-modal.tsx file was crashing in production builds with "undefined is not a function" error when users granted contact permissions. The crash only occurred in Release configuration, not in development.

## Impact
- Users who initially denied contact permissions and later granted them experienced app crashes
- The manage people modal was completely unusable in production for users with granted permissions
- TestFlight builds 98-103 were affected

## Root Cause
The `isContactSelected` function was being called in the filtering logic BEFORE it was defined in the code. In JavaScript, function expressions using `const` are not hoisted, meaning they cannot be used before their declaration.

```javascript
// This was causing the crash:
const filteredContacts = contacts.filter(contact => {
  return !isContactSelected(contact); // Called here (line 270)
});

// Function defined later (line 277)
const isContactSelected = (contact: Contact) => {
  // function implementation
};
```

## Why It Only Happened in Production
1. Development builds likely had different bundling/minification that didn't expose the hoisting issue
2. The React Native production minifier (Terser) optimized the code in a way that made the execution order issue fatal
3. Source maps and debugging tools masked the real issue location

## Timeline
1. Initial issue: Users reported crash when switching from denied to allowed contacts
2. First hypothesis: Array method minification issues (based on previous postmortem)
3. Extensive debugging: Replaced all array methods with production-safe alternatives
4. Discovered: Crash persisted even with minimal UI
5. Root cause found: Function hoisting issue with `isContactSelected`

## Fix
Moved the `isContactSelected` function definition BEFORE any code that uses it:

```javascript
// Function defined first
const isContactSelected = (contact: Contact) => {
  // function implementation
};

// Now safe to use in filtering
const filteredContacts = contacts.filter(contact => {
  return !isContactSelected(contact);
});
```

## Lessons Learned
1. **Always define functions before use**: When using `const` function expressions, ensure they're defined before any usage
2. **Test production builds locally**: Use `npx expo run:ios --configuration Release` to catch production-only issues
3. **Don't assume similar symptoms have the same cause**: This crash looked identical to the array method issues but had a completely different root cause
4. **Systematic debugging works**: By progressively simplifying the component, we isolated the exact issue

## Prevention
1. Consider using function declarations (`function name() {}`) for functions that need to be available throughout the component
2. Enable stricter linting rules to catch usage before declaration
3. Regularly test Release builds during development
4. Be mindful of JavaScript hoisting rules when using `const` for function expressions

## Related Issues
- Previous array method minification issues (POSTMORTEM_PRODUCTION_CRASH.md)
- Debug session documented in MANAGE_MODAL_CRASH_DEBUG.md