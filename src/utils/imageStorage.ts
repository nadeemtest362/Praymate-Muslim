import { supabase } from '../lib/supabaseClient';
import { secureLog } from './secureLogger';
import * as FileSystem from 'expo-file-system';

/**
 * Public image storage utilities with user-scoped organization
 * Handles uploads, access, and management of user images
 * 
 * System Architecture:
 * - Bucket: 'user-images' (public access)
 * - Path Pattern: {userId}/{imageType}/{filename}
 * - Storage: Public URLs for performance
 * - Fallback: Avatar component shows initials on error
 */

export interface SecureImageUploadOptions {
  userId: string;
  imageType: 'avatar' | 'contact' | 'prayer';
  localUri: string;
  filename?: string;
}

export interface SecureImageResult {
  url: string | null;
  error: string | null;
  path?: string;
}

/**
 * Upload image to user-scoped storage bucket
 */
export async function uploadSecureImage(options: SecureImageUploadOptions): Promise<SecureImageResult> {
  const { userId, imageType, localUri, filename } = options;
  
  try {
    secureLog.debug('Starting secure image upload', { imageType, hasLocalUri: !!localUri });
    
    // Generate secure file path: userId/imageType/filename
    const timestamp = Date.now();
    const extension = localUri.split('.').pop() || 'jpg';
    const secureFilename = filename || `${imageType}-${timestamp}.${extension}`;
    const securePath = `${userId}/${imageType}/${secureFilename}`;
    
    // Convert local URI to ArrayBuffer
    let arrayBuffer: ArrayBuffer;
    
    // Check if this is a local file path (iOS contacts cache) or a URI
    if (localUri.startsWith('/var/') || localUri.startsWith('/Users/') || localUri.startsWith('file://')) {
      // For local file paths, use expo-file-system
      try {
        const base64 = await FileSystem.readAsStringAsync(localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        // Convert base64 to ArrayBuffer
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        arrayBuffer = bytes.buffer;
      } catch (error) {
        throw new Error(`Failed to read local file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      // For URIs that can be fetched
      const response = await fetch(localUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      arrayBuffer = await response.arrayBuffer();
    }
    const fileSize = arrayBuffer.byteLength;
    
    // Validate file size (10MB limit)
    if (fileSize > 10 * 1024 * 1024) {
      return {
        url: null,
        error: 'Image file too large. Maximum size is 10MB.'
      };
    }
    
    secureLog.debug('Uploading to secure storage', { 
      path: securePath, 
      sizeMB: (fileSize / 1024 / 1024).toFixed(2) 
    });
    
    // Upload to secure bucket with user-scoped path
    const { data, error } = await supabase.storage
      .from('user-images')
      .upload(securePath, arrayBuffer, {
        contentType: getContentType(extension),
        upsert: true // Allow overwriting existing files
      });
    
    if (error) {
      secureLog.error('Secure image upload failed', error);
      return {
        url: null,
        error: `Upload failed: ${error.message}`
      };
    }
    
    secureLog.debug('Secure image upload successful', { path: data.path });
    
    // Generate signed URL for authenticated access
    const signedUrlResult = await getSecureImageUrl(data.path);
    
    return {
      url: signedUrlResult.url,
      error: signedUrlResult.error,
      path: data.path
    };
    
  } catch (error) {
    secureLog.error('Critical error in secure image upload', error);
    return {
      url: null,
      error: error instanceof Error ? error.message : 'Unknown upload error'
    };
  }
}

/**
 * Get public URL for image access (bucket is now public)
 */
export async function getSecureImageUrl(imagePath: string): Promise<SecureImageResult> {
  try {
    const { data } = supabase.storage
      .from('user-images')
      .getPublicUrl(imagePath);
    
    return {
      url: data.publicUrl,
      error: null,
      path: imagePath
    };
    
  } catch (error) {
    secureLog.error('Critical error generating public URL', error);
    return {
      url: null,
      error: error instanceof Error ? error.message : 'Unknown access error'
    };
  }
}

/**
 * Convert storage path to public URL directly
 */
export function getPublicImageUrl(imagePath: string | null): string | null {
  if (!imagePath) return null;
  
  // If already a full URL, return as-is
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // If it's a local file URI, return as-is
  if (imagePath.startsWith('file://') || imagePath.startsWith('/var/') || imagePath.startsWith('/Users/')) {
    return imagePath;
  }
  
  // Convert storage path to public URL
  const { data } = supabase.storage
    .from('user-images')
    .getPublicUrl(imagePath);
  
  return data.publicUrl;
}

/**
 * Delete secure image
 */
export async function deleteSecureImage(imagePath: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.storage
      .from('user-images')
      .remove([imagePath]);
    
    if (error) {
      secureLog.error('Failed to delete secure image', error, { path: imagePath });
      return {
        success: false,
        error: `Failed to delete image: ${error.message}`
      };
    }
    
    secureLog.debug('Secure image deleted successfully', { path: imagePath });
    return {
      success: true,
      error: null
    };
    
  } catch (error) {
    secureLog.error('Critical error deleting secure image', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown deletion error'
    };
  }
}





/**
 * Extract image path from storage URL
 */
export function extractImagePath(url: string): string | null {
  if (!url) return null;
  
  // Match public URL pattern
  const match = url.match(/\/storage\/v1\/object\/public\/user-images\/(.+)/);
  return match ? match[1] : null;
}

/**
 * Get content type based on file extension
 */
function getContentType(extension: string): string {
  const ext = extension.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/jpeg';
  }
}

/**
 * Refresh image URL (no longer needed with public bucket, but kept for compatibility)
 */
export async function refreshImageUrl(imagePath: string): Promise<SecureImageResult> {
  return getSecureImageUrl(imagePath);
}