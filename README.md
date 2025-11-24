# Just Pray App

A React Native prayer companion app that helps users develop a consistent prayer habit through AI-generated personalized prayers, social connections, and mindful technology usage.

## Quick Start

```bash
# Install dependencies
npm install

# Fix CocoaPods compatibility (if needed)
./scripts/fix-cocoapods-compatibility.sh

# Install iOS dependencies
cd ios && pod install && cd ..

# Start development server (runs on port 8082)
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android
```

## Troubleshooting

### CocoaPods Compatibility Issue

If you encounter `[Xcodeproj] Unable to find compatibility version string for object version '70'`:

```bash
# Run the compatibility fix script
./scripts/fix-cocoapods-compatibility.sh

# Then install pods
cd ios && pod install && cd ..
```

This is a temporary workaround for Xcode 16.4 compatibility with CocoaPods 1.16.2.

## Architecture (2025)

**Modern React Query + Zustand Hybrid:**

- **React Query** for all server state (prayers, people, intentions) with automatic caching & invalidation
- **Zustand** for UI state only (modals, onboarding flow, device integration)
- **Zero technical debt** - Full React Query migration completed, all compatibility layers removed

**Key Technologies:**

- **App**: React Native + Expo 53 with TypeScript, file-based routing via Expo Router
- **Database**: Supabase with real-time subscriptions and Edge Functions
- **AI**: OpenAI GPT-4o with Responses API for stateful prayer generation
- **Subscriptions**: Adapty for premium features and paywalls
- **iOS Integration**: Family Controls API + background tasks for reliable distraction blocking (PRAYLOCK)

## Development Commands

```bash
# Testing
npm run test:prayer              # Test prayer generation (dev)
npm run test:prayer:staging      # Test prayer generation (staging)
npm run test:prayer:prod         # Test prayer generation (production)

# Building
npm run prebuild                 # Clean prebuild for native builds
npm run build:ios                # Production iOS build via EAS
npx expo run:ios --configuration Release  # Test production build locally
```

## Project Structure

```
├── app/                    # File-based routing (Expo Router)
├── src/                    # Source code
│   ├── features/          # Feature-first business logic
│   ├── shared/
│   │   └── ui/            # Reusable design-system components
│   ├── repositories/      # Data access layer
│   ├── stores/            # Zustand stores (UI state only)
│   └── lib/               # Utilities and integrations
├── supabase/              # Database & Edge Functions
│   ├── functions/         # Prayer generation, completion, etc.
│   └── migrations/        # Database schema
├── services/              # Backend services (NestJS, Admin Dashboard)
└── docs/                  # Documentation
```

## Important Notes

- **Onboarding System**: The mobile app and admin dashboard share the onboarding system through SDUI (Server-Driven UI)
- **Shared Database**: Both apps connect to the same Supabase instance
- **Context Rules**: See `.cursor/rules/` for AI assistant context rules

## Documentation

- [TestFlight Deployment Guide](docs/TESTFLIGHT_CHECKLIST.md)
- [Internal Distribution Guide](docs/INTERNAL_DISTRIBUTION_GUIDE.md)
- [SDUI Production Guide](docs/SDUI_PRODUCTION_GUIDE.md)
- [Reorganization Plan](docs/REORGANIZATION_PLAN.md)
- [First Prayer Implementation Guide](docs/first-prayer-implementation.md)
