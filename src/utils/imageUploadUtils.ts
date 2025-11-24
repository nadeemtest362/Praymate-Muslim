import { uploadSecureImage } from './imageStorage';
import { secureLog } from './secureLogger';

/**
 * Image upload utilities for handling local files and remote URLs
 * 
 * Key Functions:
 * - uploadLocalImageToSupabase(): Upload local files to user-scoped storage
 * - ensureImageUploaded(): Handle both local files and existing URLs
 * - isLocalFileUri(): Detect files that need uploading
 */

/**
 * Checks if a URI is a local file that needs uploading
 */
export function isLocalFileUri(uri: string | null | undefined): boolean {
  if (!uri) return false;
  return uri.startsWith('file:///') || uri.startsWith('/var/mobile/') || uri.startsWith('/data/');
}

/**
 * Uploads a local image file to user-scoped Supabase storage
 * @param localUri - The local file URI (e.g., file://...)
 * @param userId - The user ID for user-scoped storage
 * @param imageType - Type of image for categorization ('avatar', 'contact', 'prayer')
 * @returns The storage path of the uploaded image, or null if upload fails
 */
export async function uploadLocalImageToSupabase(
  localUri: string | null | undefined,
  userId: string,
  imageType: 'avatar' | 'contact' | 'prayer' = 'avatar'
): Promise<string | null> {
  // Return null for empty URIs
  if (!localUri) {
    return null;
  }
  
  // If already a URL, return as-is
  if (localUri.startsWith('http://') || localUri.startsWith('https://')) {
    return localUri;
  }
  
  // Only process local file URIs
  if (!isLocalFileUri(localUri)) {
    secureLog.warn('Unexpected URI format for image upload', { uri: localUri });
    return null;
  }

  try {
    secureLog.debug('Starting image upload', { 
      imageType, 
      uriPreview: localUri.substring(0, 100) 
    });
    
    // Use user-scoped image storage
    const uploadResult = await uploadSecureImage({
      userId,
      imageType,
      localUri
    });
    
    if (uploadResult.error) {
      secureLog.error('Image upload failed', { error: uploadResult.error });
      return null;
    }
    
    secureLog.debug('Image upload successful');
    // Return the storage path instead of signed URL to prevent expiration
    return uploadResult.path ?? null;

  } catch (error) {
    secureLog.error('Critical error in image upload', error);
    return null;
  }
}

/**
 * Ensures an image URI is uploaded if it's a local file or migrates old URLs
 * @param imageUri - The image URI to process
 * @param userId - The user ID for user-scoped storage
 * @param imageType - Type of image for categorization
 * @returns The storage path if uploaded/valid, or null
 */
export async function ensureImageUploaded(
  imageUri: string | null | undefined,
  userId: string,
  imageType: 'avatar' | 'contact' | 'prayer' = 'contact'
): Promise<string | null> {
  if (!imageUri) return null;
  
  // If it's already a proper URL, return as-is
  if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
    return imageUri;
  }
  
  // If it's a local file, upload it to user-scoped storage
  if (isLocalFileUri(imageUri)) {
    return uploadLocalImageToSupabase(imageUri, userId, imageType);
  }
  
  // If it looks like a storage path (no scheme, contains a slash), accept as-is
  if (!imageUri.includes('://') && imageUri.includes('/')) {
    return imageUri;
  }
  
  // Unknown format, return null
  secureLog.warn('Unknown image URI format', { uri: imageUri });
  return null;
}

/**
 * Validates if a URI is a valid remote URL (not a local file)
 */
export function isValidRemoteUrl(uri: string | null | undefined): boolean {
  if (!uri) return false;
  
  try {
    const url = new URL(uri);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
} 