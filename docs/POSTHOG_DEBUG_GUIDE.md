# PostHog Debug Guide

## Quick Start

1. **Rebuild the development build** with the latest changes:
   ```bash
   npm run prebuild  # Clean rebuild
   npm run ios       # or android
   ```

2. **Open Xcode console or device logs** to see detailed PostHog logging

3. **In the Xcode console**, you can access debug tools by typing in the Safari Web Inspector (if using Expo Go) or directly via device logs:
   ```javascript
   // These commands will be available globally in dev mode
   PostHogDebug.diagnos()    // Full diagnostics
   PostHogDebug.checkNetwork()  // Network connectivity test
   PostHogDebug.runAll()    // All checks at once
   ```

## What You'll See

### Initialization Logs
When the app starts, you should see:
```
[PostHog] Initialization check: {
  hasApiKeyEnv: true,
  hasApiKeyExtra: false,
  apiKeyPrefix: "phc_xxxxx",
  host: "https://us.i.posthog.com",
  platform: "ios"
}
[PostHog] Initializing PostHog client with key starting with: phc_xxxxx
[PostHog] Client initialized in DEV mode - debug enabled
[PostHog Debug] Tools available globally
```

### User Identification Logs
When you log in, you should see:
```
[PostHog] Identifying user: { userId: "xxx-xxx-xxx", traitsKeys: ["email"] }
[PostHog] User identified successfully
```

### Event Capture Logs
When events are captured:
```
[PostHog] Capturing event: { event: "Application Opened", propertiesKeys: [...] }
```

## Common Issues & Fixes

### Issue: "Missing EXPO_PUBLIC_POSTHOG_API_KEY; analytics disabled"

**Cause**: The API key isn't being read from your environment

**Fix**:
1. Verify the key is in your `.env` file:
   ```bash
   cat .env | grep POSTHOG
   ```
   Should show: `EXPO_PUBLIC_POSTHOG_API_KEY=phc_xxxxx`

2. Rebuild with the env var:
   ```bash
   npm run prebuild
   npm run ios
   ```

3. For development build, verify in app.config.js that it's picking up the env:
   ```bash
   node -e "console.log(process.env.EXPO_PUBLIC_POSTHOG_API_KEY)"
   ```

### Issue: Client says "initialized" but no events in PostHog dashboard

**Cause**: Events are being captured locally but not sent to the server

**Debug Steps**:
1. Run `PostHogDebug.checkNetwork()` to verify network connectivity
2. Run `PostHogDebug.diagnos()` to send a test event
3. Wait 2-3 seconds and check PostHog dashboard for `PostHog_Diagnostic_Test` event
4. If you don't see it, check:
   - Network connectivity on device (airplane mode off, VPN disabled)
   - Firewall rules blocking PostHog endpoints
   - API key format (should start with `phc_`, not `pat_`)

### Issue: Events sent but user data not showing

**Cause**: User identification may not be working

**Debug Steps**:
1. Check logs for "Identifying user" message when logging in
2. Verify user ID is being passed: look for `userId: "xxx"` in logs
3. Check email is being passed as trait

## Network Verification

PostHog events go to: `https://us.i.posthog.com/`

Verify your device can reach it:
1. Open device browser
2. Navigate to: `https://us.posthog.com/`
3. Should load without error

## PostHog Dashboard Checks

1. Go to https://us.posthog.com/
2. Check **Inbox** or **Events** tab
3. Look for:
   - `PostHog_Diagnostic_Test` events (if you ran diagnostics)
   - `Application Opened` events
   - Your user ID in the Persons tab

## Environment Variables Checklist

```
✓ EXPO_PUBLIC_POSTHOG_API_KEY=phc_xxxxx     (public key, starts with phc_)
✓ NOT in .env: POSTHOG_PRIVATE_KEY          (private keys never go in client)
✓ In app.config.js: Conditionally set based on env var
✓ No hardcoded keys in source code
```

## Development Build vs Expo Go

- **Development Build**: Uses your local `.env` file ✓ Recommended for testing
- **Expo Go**: Must use app.config.js extras ✗ Limited env var support

Always use development build for proper PostHog testing:
```bash
npm run ios  # Creates dev build
```

## Next Steps

If diagnostics pass but no data appears in 5 minutes:
1. Check PostHog project settings for correct API key
2. Verify organization/team ownership
3. Check browser dev tools for any network errors
4. Review PostHog error logs in dashboard
