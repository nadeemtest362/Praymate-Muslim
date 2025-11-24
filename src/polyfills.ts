/**
 * Global polyfills for React Native
 * 
 * CRITICAL: Import this file BEFORE any other imports in app entry point
 * to ensure polyfills are available when modules are loaded.
 */

import { Buffer } from 'buffer/';

// Add global Buffer polyfill for react-native-svg and other libraries
if (!(globalThis as any).Buffer) {
  (globalThis as any).Buffer = Buffer;
}

// Log polyfill status for debugging
if (__DEV__) {
  console.log('[Polyfills] Buffer global:', typeof (globalThis as any).Buffer);
}
