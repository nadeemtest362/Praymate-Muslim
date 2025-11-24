> **LEGACY DOCUMENT**: This document refers to the pre-2025 component layout (`src/components/**`). Paths are preserved for historical accuracy but are no longer valid. See current architecture in README.md.

# Image System Documentation

## Current Architecture (Post-Cleanup)

The Just Pray app uses a simplified public image storage system built on Supabase Storage with user-scoped organization.

### Key Components

#### 1. Storage Structure
- **Bucket**: `user-images` (public access)
- **Path Pattern**: `{userId}/{imageType}/{filename}`
- **Image Types**: `avatar`, `contact`, `prayer`
- **Example**: `8b13de11-0d70-4530-bd6d-91efb384c4b1/contact/contact-1751356356008.png`

#### 2. Core Files

**`src/utils/imageStorage.ts`**
- `uploadSecureImage()`: Uploads local files to user-scoped paths
- `getSecureImageUrl()`: Generates public URLs from storage paths
- `getPublicImageUrl()`: Direct conversion from path to public URL
- `deleteSecureImage()`: Removes images from storage

**`src/utils/imageUploadUtils.ts`**
- `uploadLocalImageToSupabase()`: Handles local file uploads
- `ensureImageUploaded()`: Processes URIs (local files or existing URLs)
- `isLocalFileUri()`: Detects files needing upload
- `isValidRemoteUrl()`: Validates remote URLs

**`src/components/ui/Avatar.tsx`**
- Displays images or colored initials fallback
- Uses `getPublicImageUrl()` to convert storage paths to URLs
- Handles image errors gracefully

### Data Flow

#### New Image Upload
1. User selects image → `uploadLocalImageToSupabase()`
2. Upload to `user-images/{userId}/{imageType}/{filename}`
3. Store **storage path** in database (not URL)
4. Display via `getPublicImageUrl(path)` → public URL

#### Image Display
1. Component receives `image_uri` from database
2. `Avatar.tsx` calls `getPublicImageUrl(image_uri)`
3. If path → convert to public URL
4. If already URL → use directly
5. If error → show colored initials

### Database Schema

Images are stored as **storage paths** in these tables:
- `profiles.avatar_url`: User profile pictures
- `prayer_focus_people.image_uri`: Contact images for prayer people

```sql
-- Example storage paths (NOT URLs)
"8b13de11-0d70-4530-bd6d-91efb384c4b1/contact/contact-1751356356008.png"
"cc535b46-2b2d-4295-b4af-5527ac3e312d/avatar/avatar-1748907643679.jpg"
```

### Error Handling

The system handles three scenarios:
1. **Valid Files**: Generate public URLs and display images
2. **Missing Files**: Return null → Avatar shows colored initials
3. **Network Errors**: Catch exceptions → Avatar shows colored initials

### Performance Features

- **Public URLs**: No signed URL generation overhead
- **Direct Access**: Images load immediately without auth
- **Graceful Fallback**: Beautiful initials instead of broken images
- **User-Scoped**: Organized storage prevents conflicts

## Migration History

### Previous System (Removed)
- Used signed URLs with 1-hour expiration
- Had complex migration system for "old" vs "new" images
- Stored temporary URLs in database causing expiration issues

### Cleanup (January 2025)
- **Removed**: `migratePublicImageToSecure()`, `isInsecureImageUrl()` functions
- **Simplified**: Direct public URL access only
- **Database**: Zero users with old bucket URLs (verified)
- **Result**: Much simpler, more maintainable system

## Best Practices

### ✅ Do
- Store storage paths in database, not URLs
- Use `getPublicImageUrl()` for display
- Handle null/error cases gracefully with initials
- Use user-scoped paths for organization

### ❌ Don't
- Store URLs in database (store paths instead)
- Assume images always exist
- Skip error handling for missing images

## File Naming Convention

```
{userId}/{imageType}/{prefix}-{timestamp}.{extension}

Examples:
- avatar-1748907643679.jpg
- contact-1751356356008.png
- prayer-1746298386452.jpg
```

## Future Considerations

- **CDN**: Could add CloudFront for global image delivery
- **Compression**: Could add image optimization pipeline
- **Cleanup**: Could implement unused image garbage collection
- **Caching**: Could add local image caching for performance

## Troubleshooting

### Images Not Loading
1. Check if `image_uri` is a storage path or URL
2. Verify file exists in `user-images` bucket
3. Check console for Avatar component errors
4. Ensure `getPublicImageUrl()` returns valid URL

### Upload Failures
1. Check file size (10MB limit)
2. Verify user authentication
3. Check network connectivity
4. Review `uploadSecureImage()` error logs

### Database Issues
1. Ensure `image_uri` fields contain storage paths
2. Check for null/empty values
3. Verify user ID matches storage path structure
