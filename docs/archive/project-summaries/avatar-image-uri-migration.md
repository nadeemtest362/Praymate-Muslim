> **LEGACY DOCUMENT**: This document refers to the pre-2025 component layout (`src/components/**`). Paths are preserved for historical accuracy but are no longer valid. See current architecture in README.md.

# Avatar Component image_uri Migration

## Overview
The Avatar component and all related image handling has been migrated from using `imageUri` (camelCase) to `image_uri` (snake_case) to maintain consistency with database field naming conventions.

## Component API
The Avatar component now accepts:
- `image_uri`: The primary prop for passing image URIs (snake_case, matches database)
- `uri`: Legacy prop still supported for backward compatibility (will be removed in future)
- `name`: Required for generating initials when no image is available
- `size`: Optional, defaults to 40
- `borderWidth`: Optional, defaults to 0
- `borderColor`: Optional, defaults to 'rgba(255, 255, 255, 0.3)'
- `onError`: Optional callback for image load errors

## Usage Examples

### Current (Correct) Usage
```tsx
<Avatar 
  image_uri={person.image_uri}
  name={person.name}
  size={48}
/>
```

### Legacy (Still Works but Deprecated)
```tsx
<Avatar 
  uri={person.imageUri}  // Avoid - use image_uri instead
  name={person.name}
  size={48}
/>
```

## Migration Scope
All components and stores have been updated to use `image_uri`:
- ✅ All Zustand stores (prayerPeopleStore, homeStore, onboardingStore)
- ✅ All component interfaces and types
- ✅ All Avatar component usages throughout the app
- ✅ Database field references remain unchanged (already snake_case)
- ✅ Image URL resolver utilities updated

## Implementation Details
The Avatar component internally:
1. Accepts both `uri` and `image_uri` props (preferring `image_uri`)
2. Checks if the provided URI is a full URL or a storage path
3. For storage paths, generates signed URLs from Supabase storage
4. Falls back to initials-based avatar when no image is available or on error
5. Handles image loading errors gracefully with state management

## Best Practices
1. Always use `image_uri` prop when creating new Avatar instances
2. Ensure person/user objects use `image_uri` field (snake_case)
3. When fetching from database, use field names as-is without mapping
4. Storage paths are automatically converted to signed URLs by the Avatar component

## Performance Optimizations
- Signed URLs are generated on-demand with 1-hour expiry
- Image loading errors are handled locally to prevent re-render cascades
- Component uses React.memo for optimization when appropriate