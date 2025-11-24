# Just Pray - Complete Setup Guide

This guide provides step-by-step instructions to set up and run the Just Pray React Native app.

## Prerequisites

Before starting, ensure you have these installed on your system:

### Required Software
- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** or **yarn** (comes with Node.js)
- **Git** - [Download here](https://git-scm.com/)

### For iOS Development
- **Xcode** (latest version) - Available from Mac App Store
- **iOS Simulator** (comes with Xcode)
- **CocoaPods** - Install with: `sudo gem install cocoapods`

### For Android Development
- **Android Studio** - [Download here](https://developer.android.com/studio)
- **Android SDK** and **Android Virtual Device (AVD)**
- **Java JDK** (v11 or higher)

### Expo CLI
```bash
npm install -g @expo/cli
```

## Step-by-Step Setup

### 1. Clone and Navigate to Project
```bash
git clone <repository-url>
cd personal-prayers
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
The project uses production environment variables by default:
- **Supabase URL**: `https://kfrvxoxdehduqrpcbibl.supabase.co`
- **Development Server**: Port 8081

No additional environment setup needed for development.

### 4. iOS Setup (Mac only)
```bash
# Navigate to iOS directory and install pods
cd ios
pod install
cd ..
```

### 5. Android Setup
- Open Android Studio
- Install SDK platforms (API 33 and 34 recommended)
- Create an Android Virtual Device (AVD)
- Start the AVD or connect a physical Android device

## Running the Project

### Method 1: Start Development Server
```bash
npm start
```
This opens the Expo developer tools. From here you can:
- Press `i` to open iOS simulator
- Press `a` to open Android emulator
- Scan QR code with Expo Go app on physical device

### Method 2: Direct Platform Launch
```bash
# iOS Simulator
npm run ios

# Android Emulator
npm run android

# Web Browser
npm run web
```

### Method 3: Production Build Test (iOS)
```bash
# Test production build locally before TestFlight
npx expo run:ios --configuration Release
```

## Development Commands

### Testing
```bash
# Test prayer generation system
npm run test:prayer              # Development environment
npm run test:prayer:staging      # Staging environment
npm run test:prayer:prod         # Production environment
```

### Code Quality
```bash
# Lint code
npm run lint

# Check for auth store usage (should return no results)
npm run lint:auth
```

### Building for Production
```bash
# Clean prebuild (removes previous builds)
npm run prebuild

# iOS Production Build (requires EAS CLI)
npm run build:ios

# iOS Preview Build
npm run build:ios:preview

# Submit to App Store (after build)
npm run submit:ios
```

## Project Architecture

### Core Technologies
- **React Native 0.79.5** with **Expo 53**
- **TypeScript** for type safety
- **Expo Router** for file-based navigation
- **React Query** for server state management
- **Zustand** for UI state management
- **Supabase** for backend and database
- **OpenAI GPT-4o** for AI-generated prayers

### Key Features
- **PRAYLOCK**: iOS Family Controls integration for distraction blocking
- **Subscription Management**: Adapty integration for premium features
- **Real-time Data**: Supabase real-time subscriptions
- **Offline Support**: React Query caching with persistence

## Troubleshooting

### Common Issues

#### 1. "Metro bundler failed to start"
```bash
# Clear Metro cache
npx expo start --clear

# Or reset project
npm run prebuild
```

#### 2. "iOS Simulator not opening"
```bash
# Ensure Xcode is installed and simulator is available
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

#### 3. "Android emulator not detected"
- Start Android Studio
- Open AVD Manager
- Create/start a virtual device
- Ensure Android SDK is properly configured

#### 4. "Dependencies installation failed"
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules
npm install
```

#### 5. "iOS build fails with CocoaPods error"
```bash
cd ios
pod install --repo-update
cd ..
```

### Production Build Issues
If production builds fail with array method errors, check:
- All array methods use safe alternatives from `src/utils/safeArrayMethods.ts`
- No usage of `.filter(Boolean)`, `.includes()`, etc. in production code

## Development Workflow

### 1. Feature Development
1. Create feature branch from `main`
2. Implement feature using existing patterns
3. Test on both iOS and Android
4. Run linting: `npm run lint`
5. Test production build: `npx expo run:ios --configuration Release`

### 2. Testing Prayer Generation
```bash
# Test with different environments
npm run test:prayer:staging
npm run test:prayer:prod
```

### 3. Deployment
1. Merge to main branch
2. Run production build: `npm run build:ios`
3. Submit to TestFlight: `npm run submit:ios`

## Important Notes

### Database Connection
- **Production Database**: `kfrvxoxdehduqrpcbibl.supabase.co`
- **Real-time Features**: Enabled by default
- **Anonymous Access**: Uses anon key for public operations

### Subscription System
- **Production**: Uses Adapty for subscription management
- **Development**: May show test subscriptions
- **Apple/Google**: Configured for production app stores

### Security
- All sensitive operations use Supabase RLS (Row Level Security)
- User data is protected by profile-based access controls
- API keys are public-safe (anon keys only)

## Getting Help

### Documentation
- [TestFlight Guide](docs/TESTFLIGHT_CHECKLIST.md)
- [SDUI Guide](docs/SDUI_PRODUCTION_GUIDE.md)
- [Production Safety](CLAUDE.md)

### Support
- Check existing GitHub issues
- Review error logs in development tools
- Use Expo dev tools for debugging

---

## Quick Start Checklist

- [ ] Node.js v18+ installed
- [ ] Xcode installed (for iOS)
- [ ] Android Studio setup (for Android)
- [ ] Project cloned and dependencies installed: `npm install`
- [ ] Development server started: `npm start`
- [ ] App running on simulator/emulator
- [ ] Production build tested: `npx expo run:ios --configuration Release`

That's it! You should now have the Just Pray app running successfully. 🙏