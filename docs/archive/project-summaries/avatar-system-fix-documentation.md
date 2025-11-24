> **LEGACY DOCUMENT**: This document refers to the pre-2025 component layout (`src/components/**`). Paths are preserved for historical accuracy but are no longer valid. See current architecture in README.md.

# Avatar System Fix Documentation (LEGACY)

> **Note**: This document describes the historical avatar system fixes. For current system documentation, see [image-system-documentation.md](./image-system-documentation.md).

## Problem Statement

Avatars were consistently failing to display across multiple screens in the Just Pray app:
- **Home Screen (PrayerCard)**: Prayer people avatars showing initials instead of images
- **Intentions Screen**: Group avatars and people avatars not loading  
- **Profile Screen**: Prayer Circle avatars displaying initials only

Users reported this as a persistent, long-standing issue that "we've never been able to fix yet."

## Root Cause Analysis (Oracle Investigation)

### Primary Issues Discovered

1. **Property Name Mismatch (Home Screen)**
   - `homeStore.ts` mapped database `image_uri` → `imageUri` 
   - `PrayerCard.tsx` expected `person.imageUri`
   - **But then we changed homeStore to use `image_uri`** causing the mismatch
   - Result: `uri` prop was always undefined → Avatar fell back to initials

2. **Expired Signed URLs (All Other Screens)**  
   - Database stored 1-hour signed URLs instead of permanent storage paths
   - URLs format: `https://...supabase.co/.../sign/user-images/path.jpg?token=abc&expires=123`
   - After 1 hour: URLs expired → Images returned 404 errors
   - Result: `<Image>` component failed → Avatar fell back to initials

3. **Missing Image Files**
   - Some contact images were deleted/moved during previous cleanups
   - Storage paths pointed to non-existent files
   - Result: "Object not found" errors → Avatar fell back to initials

## Solutions Implemented

### 1. Property Name Consistency Fix

**Fixed:** `src/stores/homeStore.ts`
```typescript
// Before (inconsistent)
prayerPeople = (peopleData || []).map(person => ({
  id: person.id,
  name: person.name,
  image_uri: person.image_uri, // Wrong property name
  // ...
}));

// After (consistent) 
prayerPeople = (peopleData || []).map(person => ({
  id: person.id,
  name: person.name,
  imageUri: person.image_uri, // Correct camelCase
  // ...
}));
```

### 2. Dynamic Image URL Resolver System

**Created:** `src/utils/imageUrlResolver.ts`

Key functions:
- `resolveImageUri()`: Converts storage paths to fresh signed URLs
- `resolvePersonImages()`: Batch processes multiple avatars for performance
- Handles expired signed URLs, storage paths, and missing files gracefully

**Implementation Strategy:**
```typescript
// Smart URL detection and resolution
if (/^https?:\/\//.test(path) && !/\/sign\//.test(path)) {
  return path; // Already valid HTTP URL
}

if (/\/sign\/user-images\//.test(path)) {
  // Expired signed URL - extract path and generate fresh URL
  const extracted = extractSecureImagePath(path);
  const { url, error } = await getSecureImageUrl(extracted);
  return error ? null : url;
}

// Plain storage path - generate signed URL
const { url, error } = await getSecureImageUrl(path);
return error ? null : url;
```

### 3. Updated Data Loading Systems

**Modified stores and hooks to use image resolver:**

- **Home Screen**: `homeStore.ts` → `resolvePersonImages()` during data fetch
- **Intentions Screen**: `useIntentions.ts` → Async effects for group/people avatars  
- **Profile Screen**: `prayerPeopleStore.ts` → `resolvePersonImages()` in fetch functions

### 4. Fixed Root Cause: Storage Path vs Signed URL

**Problem:** Upload utilities stored temporary signed URLs in database

**Fixed:** `src/utils/imageUploadUtils.ts`
```typescript
// Before (wrong)
return uploadResult.url; // 1-hour expiring signed URL

// After (correct)  
return uploadResult.path ?? null; // Permanent storage path
```

**Result:**
- **New uploads**: Store permanent paths like `"userId/contact/photo.jpg"`
- **Old data**: Image resolver handles expired URLs gracefully

## Database Migration & Cleanup

### Initial Migration (Successful)
```sql
-- Convert existing signed URLs to storage paths
UPDATE prayer_focus_people 
SET image_uri = regexp_replace(
  image_uri, 
  '.*/storage/v1/object/sign/user-images/([^?]+)\?.*', 
  '\1', 
  'g'
)
WHERE image_uri LIKE '%/sign/user-images/%';

-- Result: 27 total records, 0 remaining signed URLs, 11 with images
```

### Cleanup Mistake & Correction

**Mistake Made:**
```sql
-- TOO BROAD - caught working images
UPDATE prayer_focus_people 
SET image_uri = NULL 
WHERE image_uri LIKE '%contact-17513%';
```

**Problem:** Pattern caught both:
- ❌ `contact-1751347924492` (actually broken)  
- ✅ `contact-1751356356008` (working - Annmarie Legge's avatar)

**Correction Applied:**
```sql
-- Restored working avatars that were accidentally cleared
UPDATE prayer_focus_people 
SET image_uri = '8b13de11-0d70-4530-bd6d-91efb384c4b1/contact/contact-1751356356008.png'
WHERE id = 'aeb02dd4-43ae-4e3a-b3b2-0d9cfab3f9ae'; -- Annmarie Legge

UPDATE prayer_focus_people 
SET image_uri = '8b13de11-0d70-4530-bd6d-91efb384c4b1/contact/contact-1751356397971.png'
WHERE id = '5dda540d-54a0-49a3-95f3-d1bdff0ebedc'; -- Bryan
```

## Implementation Details

### Error Handling Strategy

The system now handles three scenarios gracefully:

1. **Valid Files**: Generate fresh signed URLs and display images
2. **Missing Files**: Return `null` → Avatar shows colored initials  
3. **Network Errors**: Catch exceptions → Avatar shows colored initials

```typescript
const { url, error } = await getSecureImageUrl(path);
if (error) {
  console.log('[ImageUrlResolver] File not found, will fall back to initials:', path);
  return null; // Avatar component handles null gracefully
}
```

### Performance Optimizations

- **Batch Processing**: `Promise.all()` for multiple avatar resolution
- **Async Effects**: Non-blocking UI updates as images resolve
- **Error Resilience**: Individual failures don't break entire UI
- **Fallback Strategy**: Beautiful colored initials instead of broken images

## Current System Architecture

### Flow for New Images
1. User selects contact image → Upload to Supabase storage
2. Store **storage path** in database: `"userId/contact/filename.jpg"`
3. When displaying → Generate fresh signed URL from path
4. Display image or fall back to initials if file missing

### Flow for Existing Images  
1. Database contains mix of storage paths and legacy signed URLs
2. Image resolver detects format and handles appropriately:
   - **Storage path** → Generate fresh signed URL
   - **Expired signed URL** → Extract path, generate fresh URL  
   - **Missing file** → Return null for graceful fallback

### Zustand Integration
- **Home Store**: `resolvePersonImages()` during data fetch
- **Intentions Hook**: Async effects resolve avatars after component mount
- **Prayer People Store**: Batch resolution in fetch functions
- **Optimistic Updates**: UI renders immediately, images load progressively

## Lessons Learned

### ✅ What Worked
- **Oracle Analysis**: Correctly identified both root causes
- **Image Resolver Pattern**: Flexible system handles multiple URL formats
- **Graceful Degradation**: Initials fallback provides good UX
- **Batch Processing**: Efficient performance with Promise.all

### ❌ Mistakes Made
- **Overly Broad Cleanup**: Pattern matching was too aggressive
- **Assumption**: Assumed all `contact-17513*` files were broken
- **Insufficient Testing**: Should have validated specific records before cleanup

### 🎯 Best Practices Identified
- **Always store permanent references** (paths) not temporary ones (signed URLs)
- **Test database patterns** on small datasets before full updates
- **Implement progressive enhancement** (initials → images) not all-or-nothing
- **Use specific patterns** for database cleanup operations

## Final Status

### ✅ What's Fixed
- **Property name consistency** across all components
- **Expired URL handling** via dynamic resolution
- **New uploads** store permanent storage paths  
- **Missing files** handled gracefully with initials fallback
- **Database cleaned** of dead references (carefully)

### 🎯 Expected Behavior
- **Valid avatar files**: Display actual images
- **Missing avatar files**: Show beautiful colored initials based on name
- **New avatar uploads**: Work perfectly going forward
- **No crashes or broken states**: System degrades gracefully

### 📊 Impact
- **Home Screen**: Prayer people avatars work correctly
- **Intentions Screen**: Group and people avatars display properly
- **Profile Screen**: Prayer Circle avatars function as expected
- **Developer Experience**: Reduced error logs, cleaner system

## Technical Debt Resolved

1. **Eliminated temporary URL storage** - architectural fix
2. **Centralized image resolution logic** - maintainability improvement  
3. **Added graceful error handling** - reliability enhancement
4. **Unified property naming** - consistency improvement
5. **Removed dead database references** - performance optimization

This comprehensive fix addresses the persistent avatar loading issues that had been plaguing the application, providing a robust, future-proof solution for image display across all screens.

## System Evolution (Post-2025)

**Important**: After January 2025, the image system was further simplified:

- **Removed**: Complex image resolver system and signed URL logic
- **Simplified**: Direct public URL access only
- **Eliminated**: Migration system for "old" vs "new" images  
- **Result**: Much cleaner, more maintainable system

See [image-system-documentation.md](./image-system-documentation.md) for current implementation.
