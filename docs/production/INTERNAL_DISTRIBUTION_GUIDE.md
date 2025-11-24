# Internal Distribution Guide - Pre-TestFlight Testing

This guide explains how to distribute your iOS app to testers BEFORE going through TestFlight, using EAS Build's internal distribution feature.

## Overview

Internal distribution allows you to:
- Share builds directly with testers (no App Store review needed)
- Test production-like builds without TestFlight's 90-day limit
- Iterate quickly with instant distribution
- Support up to 100 devices per provisioning profile

## Two Types of Internal Builds

### 1. **Preview Builds** (Recommended for Testers)
- Production-like builds without developer tools
- Smaller size, faster performance
- Best for QA testing and stakeholder review

### 2. **Development Builds** (For Active Development)
- Includes expo-dev-client for hot reloading
- Allows loading JavaScript updates from your dev server
- Best for developers and technical testers

## Step-by-Step Process

### Step 1: Register Test Devices

**IMPORTANT**: iOS devices must be registered BEFORE creating the build!

```bash
# Register a new device
eas device:create
```

This will give you options:
1. **Website**: Opens a page where testers can register their device
2. **QR Code**: Generates a QR code for testers to scan
3. **Manual**: Enter device UDID manually

Share the URL/QR code with your testers. They'll:
1. Open the link on their iPhone
2. Install a configuration profile
3. Their device gets registered automatically

### Step 2: Create a Preview Build

```bash
# Create a preview build for internal distribution
eas build --platform ios --profile preview
```

This will:
- Create an ad hoc provisioned .ipa file
- Include all registered devices in the provisioning profile
- Upload the build to EAS servers
- Generate a shareable installation URL

### Step 3: Share the Build

Once the build completes, you'll get:
- A direct download link for the .ipa file
- An installation page URL (easiest for testers)
- QR code for the installation page

Testers can:
1. Open the installation URL on their iPhone
2. Tap "Install" 
3. The app downloads and installs directly

## Managing Devices

```bash
# List all registered devices
eas device:list

# Rename a device (helpful for tracking)
eas device:rename

# Remove a device
eas device:delete
```

## For Development Builds

If you want testers to connect to your local development server:

```bash
# Create a development build
eas build --platform ios --profile development

# Start your dev server
npx expo start

# Testers can connect to your dev server by:
# 1. Opening the development build
# 2. Entering your dev server URL
```

## Quick Commands Reference

```bash
# Register devices
eas device:create

# Build for internal testing
eas build --platform ios --profile preview

# List builds and get URLs
eas build:list --platform ios

# Download a specific build
eas build:download --platform ios --id <build-id>
```

## Tips & Best Practices

1. **Device Registration Timing**: Always register devices BEFORE creating builds
2. **Device Limits**: Apple allows 100 devices max for ad hoc distribution
3. **Build Expiration**: Unlike TestFlight (90 days), these builds last 1 year
4. **Provisioning Profiles**: Automatically managed by EAS
5. **Multiple Testers**: Create a spreadsheet to track device registrations

## Sharing Builds with Non-Technical Users

1. **Simplest Method**:
   - Send them the device registration URL first
   - Wait for confirmation their device is registered
   - Build and send the installation URL
   - They tap "Install" on their phone

2. **For Teams**:
   - Use `eas build:list` to get previous build URLs
   - Share via Slack, email, or your team chat
   - Builds remain available until you delete them

## Troubleshooting

**"Unable to install" error**:
- Device wasn't registered before the build was created
- Solution: Register device, create new build

**"Untrusted Developer" error**:
- Go to Settings > General > VPN & Device Management
- Trust your developer certificate

**Can't open registration URL**:
- Must be opened in Safari on the iPhone (not Chrome/other browsers)
- Can't be done from a computer

## Advantages Over TestFlight

- **No Review Process**: Instant distribution after build completes
- **No Expiration Anxiety**: Builds last 1 year vs 90 days
- **Faster Iteration**: New builds available immediately
- **Direct Installation**: No TestFlight app required
- **Better for Early Testing**: Perfect for pre-beta testing

## When to Move to TestFlight

Consider TestFlight when:
- You need more than 100 testers
- You want automatic updates for testers
- You're preparing for App Store submission
- You need detailed crash reports and analytics
- You want to test In-App Purchases

## Example Workflow

```bash
# Monday: Register team devices
eas device:create
# Share registration URL in Slack

# Tuesday: Create preview build
eas build --platform ios --profile preview
# EAS Output: Build URL: https://expo.dev/accounts/your-account/projects/personal-prayers/builds/xxxxx

# Share in team channel:
# "New build ready! Install here: [build URL]"

# Wednesday: Fix bugs, create new build
eas build --platform ios --profile preview

# Repeat as needed!
```

This approach lets you test with real users on real devices without the TestFlight approval process, making it perfect for rapid iteration during development! 