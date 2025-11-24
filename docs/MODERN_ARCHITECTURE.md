# Just Pray Modern Architecture (2025)

## Overview

Just Pray has evolved from a monolithic Zustand-based architecture to a modern, hybrid React Query + Zustand system that provides:

- **Separation of Concerns**: Server state vs UI state clearly separated
- **Automatic Caching**: React Query handles all server data caching and invalidation
- **Real-time Updates**: Event-driven architecture with multi-device synchronization
- **Type Safety**: Full TypeScript coverage with proper server state typing
- **Performance**: Eliminates unnecessary re-renders and duplicate network requests

## Architecture Layers

### 1. Frontend Layer
- **React Native/Expo 53** with TypeScript and file-based routing (Expo Router)
- **Component Structure**: Clean separation between screens (`app/`) and reusable components (`src/components/`)

### 2. State Management Layer

#### React Query (Server State)
- **Authentication**: `useAuth()` hook manages session, profile, and auth actions
- **Data Domains**: `usePrayers()`, `usePeople()`, `useIntentions()` hooks with automatic caching
- **Infrastructure**: Query client with persistence, event bus for invalidation, realtime sync

#### Zustand (UI State Only)
- **Device Integration**: `praylockStore.ts` manages iOS Family Controls state
- **Flow Management**: `onboardingStore.ts` handles SDUI onboarding flow state machine

### 3. Data Access Layer
- **Repository Pattern**: Clean abstraction over Supabase operations
  - `authRepository.ts` - Session and profile management
  - `prayersRepository.ts` - Prayer CRUD operations
  - `peopleRepository.ts` - Contact management
  - `intentionsRepository.ts` - Intention management

### 4. Backend Services

#### Supabase Infrastructure
- **PostgreSQL**: Primary database with proper schema design
- **Edge Functions**: `generate-prayer`, `complete-prayer` for AI integration
- **Realtime**: Live updates across multiple devices
- **Auth Service**: Session management and user authentication

#### AI Services
- **NestJS Service**: Railway-hosted prayer generation service
- **OpenAI GPT-4o**: Stateful conversations via Responses API

#### External Services
- **Adapty**: Premium subscription management
- **Apple Family Controls**: iOS app blocking integration

## Key Architectural Benefits

### 1. Automatic Cache Management
```typescript
// Before: Manual store management
const loadData = async () => {
  await usePrayersStore.getState().loadPrayers();
  // Manual cache invalidation, loading states, error handling
};

// After: Automatic React Query management
const { data: prayers, isLoading, error } = usePrayers();
// Automatic caching, background refresh, optimistic updates
```

### 2. Event-Driven Updates
```typescript
// Prayer completion automatically invalidates related caches
emitDataChange('prayers', 'completed', { userId, id: prayerId });
// Event bus automatically invalidates:
// - prayers cache
// - home screen data
// - user stats
```

### 3. Real-time Synchronization
- Supabase Realtime monitors database changes
- Event bus translates database events to cache invalidations
- Multiple devices stay synchronized automatically

### 4. Type-Safe Data Access
```typescript
interface Prayer {
  id: string;
  user_id: string;
  content: string;
  completed_at: string | null;
  // ... fully typed from database schema
}

const { data: prayers } = usePrayers(); // Prayer[] | undefined
```

## Migration Benefits Achieved

### Performance Improvements
- ✅ Eliminated unnecessary re-renders through proper React Query selectors
- ✅ Reduced network requests via intelligent caching
- ✅ Background data refresh without user interaction
- ✅ Optimistic updates for immediate UI feedback

### Code Quality Improvements
- ✅ Clear separation between server state and UI state
- ✅ Proper error handling and loading states throughout
- ✅ Consistent data access patterns via repository layer
- ✅ Full TypeScript coverage with proper typing

### Maintainability Improvements
- ✅ Single responsibility principle in hooks and repositories
- ✅ Event-driven architecture reduces coupling
- ✅ Centralized cache invalidation logic
- ✅ Clean testing patterns with React Query test utilities

## Future Architecture Considerations

### Scalability
- React Query's automatic deduplication prevents duplicate requests
- Infinite queries ready for pagination when needed
- Background refresh keeps data current without user intervention

### Offline Support
- Built-in cache persistence via AsyncStorage
- Network-aware retry logic for failed operations
- Queue system for offline mutations (already implemented for prayer completion)

### Real-time Features
- Foundation established for live collaboration features
- Event bus can handle complex multi-user scenarios
- Optimistic updates provide immediate feedback

## Development Guidelines

### State Management Rules
1. **Server State**: Always use React Query hooks (`useAuth`, `usePrayers`, etc.)
2. **UI State**: Use Zustand only for pure UI state (modals, form state, device integration)
3. **Data Access**: Always go through repository layer, never direct Supabase calls in components
4. **Events**: Use event bus for cross-component communication and cache invalidation

### Performance Best Practices
1. Use React Query's built-in selectors to prevent unnecessary re-renders
2. Leverage background refresh for seamless user experience  
3. Implement optimistic updates for immediate UI feedback
4. Use infinite queries for large datasets when pagination is needed

### Error Handling
1. React Query provides consistent error boundaries
2. Repository layer handles and transforms Supabase errors
3. Loading states are automatically managed by React Query
4. Retry logic is built into the query client configuration

This modern architecture provides a solid foundation for rapid feature development while maintaining excellent performance and user experience.
