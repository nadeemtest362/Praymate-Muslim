# Developer Onboarding Guide

Welcome to the Just Pray codebase! This guide will get you from zero to productive in 20 minutes.

## 🚀 Quick Setup (5 minutes)

### Prerequisites
- **Node.js 18+** and **npm**
- **Xcode** (for iOS development) 
- **Git** and access to the repository

### 1. Clone and Install
```bash
git clone https://github.com/defi-degen/personal-prayers.git
cd personal-prayers
npm install
```

### 2. Environment Setup
```bash
# Copy environment template (create from .env.example if it exists)
# Set up Supabase connection, OpenAI keys, etc.
```

### 3. Start Development
```bash
# Start Expo development server (port 8082)
npm start

# In another terminal, run on simulator
npm run ios        # iOS simulator
npm run android    # Android emulator
```

## 🏗️ Architecture Overview (10 minutes read)

### Modern State Management (2025)
**We use a clean separation of server state vs UI state:**

```typescript
// ✅ React Query for SERVER STATE (automatic caching & invalidation)
const { user, profile, signOut } = useAuth();              // Authentication
const { data: prayers, isLoading } = usePrayers();         // Prayer data
const { data: people } = usePeople();                      // Contacts/prayer people
const { data: intentions } = useIntentions();              // Prayer intentions

// ✅ Zustand for UI STATE ONLY
const { isVisible, show, hide } = useModalStore();         // Modal visibility
const { currentStep, next, previous } = useOnboardingStore(); // Onboarding flow
const { isBlocking, enable, disable } = usePraylockStore(); // iOS app blocking
```

### Key Concepts

#### 1. **File-Based Routing** (Expo Router)
```bash
app/
├── (app)/              # Main authenticated app
│   ├── (tabs)/         # Tab navigation (home, people, etc.)
│   ├── settings.tsx    # Settings screen
│   └── prayer-display.tsx
├── (auth)/             # Authentication flows
└── (onboarding)/       # SDUI onboarding system
```

#### 2. **Repository Pattern** 
Clean data access layer separating UI from business logic:
```typescript
// src/repositories/prayersRepository.ts
export const prayersRepository = {
  async getPrayers(userId: string) { /* Supabase call */ },
  async completePrayer(prayerId: string) { /* Edge Function call */ }
};

// src/hooks/usePrayers.ts (React Query wrapper)
export const usePrayers = () => useQuery({
  queryKey: ['prayers', user.id],
  queryFn: () => prayersRepository.getPrayers(user.id)
});
```

#### 3. **SDUI Onboarding System**
Server-Driven UI enables A/B testing without app releases:
- **28-step onboarding flow** defined in database
- **Edge Functions** serve JSON configurations  
- **Client renders** based on `screen_type` and `config` data

#### 4. **PRAYLOCK Feature** (iOS Family Controls)
Blocks distracting apps during prayer windows:
- **Apple Family Controls API** integration with **background task enforcement**
- **24-hour monitoring** with prayer window logic (4am/4pm changeovers)
- **Redundant blocking system** ensures reliability when app is backgrounded
- **Deep linking** from blocked app shields to prayer

## 🛠️ Development Workflows (5 minutes)

### Testing Prayer Generation
```bash
# Test against different environments
npm run test:prayer        # Development
npm run test:prayer:staging # Staging  
npm run test:prayer:prod   # Production
```

### Building for Production
```bash
# Clean prebuild (when native dependencies change)
npm run prebuild

# Test production build locally before TestFlight
npx expo run:ios --configuration Release

# Production build via EAS
npm run build:ios
```

### Database Work
```bash
# Create new migration
supabase migration new migration_name

# Apply migration locally
supabase db push

# Reset local database
supabase db reset
```

### Debugging Common Issues

#### **Metro/Expo Issues**
```bash
# Clear Metro cache
npx expo start -c

# Reset Expo cache completely  
rm -rf node_modules/.cache
rm -rf .expo
npm start
```

#### **iOS Simulator Issues**
```bash
# Reset iOS simulator
xcrun simctl erase all

# Rebuild iOS folder
npx expo run:ios
```

#### **React Query Devtools**
The app includes React Query devtools for inspecting cache state:
- **Flipper integration** for debugging queries/mutations
- **Query invalidation** patterns for data consistency

## 📁 Code Organization & Patterns

### Import Order (Follow this pattern)
```typescript
// 1. External libraries
import React from 'react';
import { View, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';

// 2. Internal imports (absolute paths preferred)
import { useAuth } from 'src/hooks/useAuth';
import { Button } from 'src/components/ui/Button';

// 3. Relative imports
import { styles } from './styles';
import { helpers } from '../utils/helpers';
```

### Naming Conventions
- **Components**: PascalCase (`PrayerCard.tsx`)
- **Hooks**: camelCase starting with `use` (`useAuth.ts`)
- **Stores**: camelCase ending with `Store` (`onboardingStore.ts`)
- **Database fields**: snake_case (keep as-is, no camelCase mapping)
- **File structure**: kebab-case for directories (`prayer-display/`)

### Component Patterns
```typescript
// ✅ Good: Functional component with TypeScript
interface PrayerCardProps {
  prayer: Prayer;
  onComplete: (prayerId: string) => void;
}

export const PrayerCard: React.FC<PrayerCardProps> = ({ 
  prayer, 
  onComplete 
}) => {
  // React Query hooks at the top
  const { mutate: completePrayer } = useCompletePrayer();
  
  // Event handlers
  const handleComplete = () => {
    completePrayer(prayer.id);
    onComplete(prayer.id);
  };

  return (
    <View style={styles.container}>
      {/* Component JSX */}
    </View>
  );
};

// Styles using StyleSheet
const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff'
  }
});
```

## 🎯 Common Tasks

### Adding a New Screen
1. Create file in `app/` directory following Expo Router conventions
2. Add TypeScript interface for route params if needed
3. Use React Query hooks for data fetching
4. Follow existing styling patterns

### Adding a New API Endpoint
1. Create Edge Function in `supabase/functions/`
2. Add repository method in `src/repositories/`
3. Create React Query hook in `src/hooks/`
4. Wire up to components

### Modifying Database Schema
1. Create migration: `supabase migration new description`
2. Write SQL in the generated file
3. Test locally: `supabase db push`
4. Deploy: Migrations auto-apply in production

## 📚 Key Documentation

- **[AGENT.md](../AGENT.md)** - Build commands, architecture notes, coding standards
- **[Architecture Decision Records](./architecture/)** - Why we chose React Query, etc.
- **[API Documentation](./api/)** - Edge Functions and repository methods
- **[Supabase Schema](../supabase/README.md)** - Database structure and relationships

## 🚨 Important Safety Notes

### Production Safety
- **NEVER** use `array.filter(Boolean)`, `array.includes()`, `Array.from()` - use safe alternatives from `src/utils/safeArrayMethods.ts`
- **Always** use user's timezone from `profiles.timezone`, not UTC for date calculations
- **Test Release builds** locally before TestFlight: `npx expo run:ios --configuration Release`

### Security
- **Never commit** secrets or API keys
- **All environment variables** should be in `.env` (not tracked in git)
- **Sensitive data** should use redaction markers in logs

## 🎉 You're Ready!

After following this guide, you should be able to:
- ✅ Run the app on iOS/Android simulators
- ✅ Understand the React Query + Zustand architecture  
- ✅ Add new screens and API endpoints
- ✅ Debug common development issues
- ✅ Follow code conventions and safety practices

**Need help?** Check the existing code patterns, AGENT.md, or ask the team!

---

*This guide is maintained as part of our codebase cleanup initiative. Last updated: January 2025*
