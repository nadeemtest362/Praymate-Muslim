import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import { captureException } from './sentry';

// Polyfill for Set.prototype.has in case it's missing in production
if (typeof Set !== 'undefined' && !Set.prototype.has) {
  // eslint-disable-next-line no-extend-native
  Set.prototype.has = function (value: any) {
    return Array.from(this).indexOf(value) !== -1;
  };
}

// Metro bundler will replace these at build time with values from eas.json
// Using || operator for fallback values if replacement doesn't happen
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://kfrvxoxdehduqrpcbibl.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmcnZ4b3hkZWhkdXFycGNiaWJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQwNjY0OTgsImV4cCI6MjA0OTY0MjQ5OH0.8G_zF_KzqrGScwZexygZiYZprVWePIvq3M8v3qhiuoM';

/**
 * Custom storage adapter using expo-secure-store for encrypted session storage
 */
const secureStorageAdapter = {
  async getItem(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[SecureStore] getItem error: ${message}`);
      return null;
    }
  },
  async setItem(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[SecureStore] setItem error: ${message}`);
    }
  },
  async removeItem(key: string) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[SecureStore] removeItem error: ${message}`);
    }
  },
};

// Create the client with error handling
let supabase: any;

try {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: secureStorageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  
  // Verify the client was created properly
  if (!supabase) {
    throw new Error('Supabase client is null/undefined');
  }
  
  // Check critical methods - auth is an object, not a function!
  const requiredMethods = ['from', 'rpc'];
  const missingMethods = requiredMethods.filter(method => typeof (supabase as any)[method] !== 'function');
  
  // Check auth object separately
  if (!supabase.auth || typeof supabase.auth !== 'object') {
    const msg = 'Supabase client created but auth is not properly initialized';
    console.error('[SupabaseClient] ' + msg);
    captureException(new Error(msg));
    throw new Error(msg);
  }
  
  if (missingMethods.length > 0) {
    const msg = `Supabase client created but missing critical methods: ${missingMethods.join(', ')}`;
    console.error('[SupabaseClient] ' + msg);
    captureException(new Error(msg));
    throw new Error(msg);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error during client creation';
  console.error(`[SupabaseClient] Failed to create client: ${message}`);
  captureException(new Error('Supabase client creation failed'));
  
  // Try creating without custom storage as fallback
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    // Intentionally quiet on success to reduce console noise
    
    // Verify the fallback client was created properly with same logic
    if (!supabase) {
      throw new Error('Fallback Supabase client is null/undefined');
    }
    
    // Check critical methods - auth is an object, not a function!
    const requiredMethods = ['from', 'rpc'];
    const missingMethods = requiredMethods.filter(method => typeof (supabase as any)[method] !== 'function');
    
    // Check auth object separately
    if (!supabase.auth || typeof supabase.auth !== 'object') {
      const msg = 'Fallback Supabase client created but auth is not properly initialized';
      console.error('[SupabaseClient] ' + msg);
      captureException(new Error(msg));
      throw new Error(msg);
    }
    
    if (missingMethods.length > 0) {
      const msg = `Fallback Supabase client created but missing critical methods: ${missingMethods.join(', ')}`;
      console.error('[SupabaseClient] ' + msg);
      captureException(new Error(msg));
      throw new Error(msg);
    }
  } catch (fallbackError) {
    const fbMsg = fallbackError instanceof Error ? fallbackError.message : 'Unknown error during fallback client creation';
    console.error(`[SupabaseClient] Fallback client creation failed: ${fbMsg}`);
    captureException(new Error('Supabase fallback client creation failed'));
    throw fallbackError;
  }
}

// Export for ES modules
export { supabase };
// Also export for CommonJS compatibility
module.exports.supabase = supabase;

// Initialization banner removed to reduce production console noise

// Production build verification
if (process.env.NODE_ENV === 'production' || __DEV__ === false) {
  // Verify critical methods exist - auth is an object!
  const criticalMethods = ['from', 'rpc'];
  criticalMethods.forEach(method => {
    if (!supabase || typeof supabase[method] !== 'function') {
      const msg = `Critical method '${method}' is not a function in production build`;
      console.error(`[SupabaseClient] ${msg}`);
      captureException(new Error(msg));
    }
  });
  
  // Check auth separately as it's an object
  if (!supabase || !supabase.auth || typeof supabase.auth !== 'object') {
    const msg = 'Critical auth object is not properly initialized in production build';
    console.error(`[SupabaseClient] ${msg}`);
    captureException(new Error(msg));
  }
}

// Export a method to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return supabase && supabase.auth && typeof supabase.auth.getSession === 'function';
};

// Export a promise that resolves when the client is ready
export const supabaseReady = new Promise<void>((resolve) => {
  // Check if already initialized
  if (supabase && supabase.auth && typeof supabase.auth.getSession === 'function') {
    resolve();
  } else {
    // Wait a bit for initialization to complete
    const checkInterval = setInterval(() => {
      if (supabase && supabase.auth && typeof supabase.auth.getSession === 'function') {
        clearInterval(checkInterval);
        resolve();
      }
    }, 10);
    
    // Timeout after 5 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      console.error('[SupabaseClient] Timeout waiting for client initialization');
      resolve(); // Resolve anyway to prevent hanging
    }, 5000);
  }
}); 