# Personal Prayers Project Layout

## Directory Structure

```
personal-prayers/
├── app/                           # Expo Router app directory
│   ├── (app)/                    # Authenticated routes group
│   │   ├── (tabs)/              # Tab navigation
│   │   │   ├── home/            # Home tab
│   │   │   │   └── index.tsx
│   │   │   ├── plan/            # Plan/Challenge tab  
│   │   │   │   └── index.tsx
│   │   │   ├── intentions/      # Intentions tab
│   │   │   │   └── index.tsx
│   │   │   ├── profile/         # Profile tab
│   │   │   │   └── index.tsx
│   │   │   └── _layout.tsx      # Tab layout configuration
│   │   ├── people/              # People management
│   │   └── [other screens]
│   ├── (onboarding)/            # Onboarding flow
│   └── [other routes]
│
├── src/                          # Source code
│   ├── components/              # React components
│   │   ├── home/               # Home screen components
│   │   │   ├── PrayerCard.tsx
│   │   │   ├── HomeHeader.tsx
│   │   │   ├── DailyBread.tsx
│   │   │   ├── PrayerJourney.tsx
│   │   │   ├── ExpandedPrayerOverlay.tsx
│   │   │   └── PrayerHabitPlanScreen.tsx
│   │   ├── ui/                 # Shared UI components
│   │   └── [other components]
│   ├── hooks/                   # React Query hooks
│   │   ├── useAuth.ts
│   │   ├── usePrayers.ts
│   │   ├── usePeople.ts
│   │   └── useIntentions.ts
│   ├── repositories/            # Data access layer
│   │   ├── authRepository.ts
│   │   ├── prayersRepository.ts
│   │   ├── peopleRepository.ts
│   │   └── intentionsRepository.ts
│   ├── stores/                  # Zustand UI stores
│   │   ├── praylockStore.ts
│   │   └── onboardingStore.ts
│   ├── lib/                     # Libraries and utilities
│   │   ├── supabaseClient.ts
│   │   ├── queryClient.ts
│   │   ├── eventBus.ts
│   │   └── realtimeSync.ts
│   ├── constants/               # Constants and configurations
│   ├── types/                   # TypeScript types
│   └── utils/                   # Utility functions
│
├── supabase/                    # Supabase functions and migrations
│   ├── functions/              # Edge functions
│   └── migrations/             # Database migrations
│
├── services/                    # Backend services
│   ├── prayer-api-service/     # NestJS prayer generation API
│   ├── command-center-api/     # Admin API
│   └── command-center-app/     # Admin dashboard
│
├── docs/                        # Documentation
│   ├── feature-specs/          # Feature specifications
│   ├── sdui_screen_configs/    # SDUI configurations
│   └── [other docs]
│
├── ios/                         # iOS native code
├── android/                     # Android native code (if applicable)
└── [config files]              # package.json, tsconfig.json, etc.
```

## Key Architectural Decisions

### Tab Navigation Structure
- Each tab now uses a folder structure (e.g., `home/index.tsx` instead of `home.tsx`)
- This allows for future expansion with tab-specific components and layouts
- Import paths adjusted to account for deeper nesting

### Component Organization
- Screen components broken down into smaller, focused components
- Home screen components extracted into `src/features/home/`
- Shared UI components in `src/shared/ui/`

### State Management
- **React Query**: Server state management in `src/hooks/` with automatic caching and invalidation
- **Repositories**: Clean data access layer in `src/repositories/` for all database operations
- **Zustand stores**: UI state only in `src/stores/` (PRAYLOCK device integration, onboarding flow)
- **Event Bus**: Centralized event system for cache invalidation and cross-component communication

### Routing
- Expo Router for file-based routing
- Authenticated routes grouped under `(app)/`
- Onboarding flow isolated in `(onboarding)/`
- Modal routes handled with proper presentation 