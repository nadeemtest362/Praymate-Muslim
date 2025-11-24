/**
 * Utility functions for normalizing and handling errors across the app
 */

export interface NormalizedError {
  message: string;
  code?: string;
  details?: any;
}

/**
 * Normalizes various error types into a consistent format
 * Handles Supabase errors, network errors, and generic errors
 */
export function normalizeError(error: any): NormalizedError {
  // Handle null/undefined
  if (!error) {
    return { message: 'An unknown error occurred' };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return { message: error };
  }

  // Handle Error objects and Supabase errors
  if (typeof error === 'object') {
    const message = error.message || error.msg || error.error_description || 'An error occurred';
    const code = error.code || error.error || error.status;
    
    return {
      message: String(message),
      code: code ? String(code) : undefined,
      details: error.details || error.hint,
    };
  }

  // Fallback for any other type
  return { message: String(error) };
}

/**
 * Extracts user-friendly error messages for common scenarios
 */
export function getUserFriendlyMessage(error: any): string {
  const normalized = normalizeError(error);
  
  // Handle common Supabase error codes
  switch (normalized.code) {
    case '23505':
      return 'This item already exists';
    case '23503':
      return 'Cannot delete item - it is referenced by other data';
    case 'PGRST116':
      return 'Item not found';
    case '42501':
      return 'Permission denied - please check your access rights';
    case '23502':
      return 'Required field is missing';
    default:
      return normalized.message;
  }
}

/**
 * Logs errors in a consistent format with context
 */
export function logError(context: string, error: any, additionalData?: any) {
  const normalized = normalizeError(error);
  
  console.error(`[${context}] ${normalized.message}`, {
    code: normalized.code,
    details: normalized.details,
    additionalData,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Detects the common React Native fetch "Network request failed" error.
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;

  const message =
    typeof error === 'string'
      ? error
      : typeof error?.message === 'string'
        ? error.message
        : typeof error?.msg === 'string'
          ? error.msg
          : '';

  return message.toLowerCase().includes('network request failed');
}
