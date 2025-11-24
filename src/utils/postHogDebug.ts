/**
 * PostHog Debug Utilities
 * Expose diagnostic functions globally in dev mode
 * Access via: (global as any).PostHogDebug.diagnos() from console
 */

import { diagnosPostHog, checkPostHogNetwork } from '../lib/posthog';

export const setupPostHogDebugTools = () => {
  if (!__DEV__) return;

  const PostHogDebug = {
    async diagnos() {
      console.log('🔍 Running PostHog diagnostics...');
      await diagnosPostHog();
    },
    async checkNetwork() {
      console.log('🌐 Checking PostHog network...');
      await checkPostHogNetwork();
    },
    async runAll() {
      console.log('🚀 Running all PostHog checks...');
      await checkPostHogNetwork();
      await new Promise(resolve => setTimeout(resolve, 500));
      await diagnosPostHog();
    },
  };

  // Expose globally for console access
  (global as any).PostHogDebug = PostHogDebug;

  console.log('[PostHog Debug] Tools available globally');
  console.log('  - PostHogDebug.diagnos()');
  console.log('  - PostHogDebug.checkNetwork()');
  console.log('  - PostHogDebug.runAll()');
};
