import PostHog, { PostHogOptions } from 'posthog-react-native';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { captureException } from './sentry';

type ExtraConfig = {
  posthogApiKey?: string;
  posthogHost?: string;
};

let posthogClient: PostHog | null = null;

const getExtraConfig = (): ExtraConfig => {
  const extras = (Constants?.expoConfig?.extra as ExtraConfig | undefined) || {};
  return extras;
};

const buildOptions = (host: string): PostHogOptions => ({
  host,
  flushAt: 1,
  flushInterval: 10000,
  captureAppLifecycleEvents: true,
  enableSessionReplay: false,
  sessionReplayConfig: {
    maskAllTextInputs: true,
    maskAllImages: true,
    maskAllSandboxedViews: true,
    captureLog: true,
    captureNetworkTelemetry: false,
  },
  errorTracking: {
    autocapture: {
      uncaughtExceptions: true,
      unhandledRejections: true,
      console: ['error'],
    },
  },
});

export const getPostHogClient = (): PostHog | null => {
  if (posthogClient) {
    return posthogClient;
  }

  const extras = getExtraConfig();
  const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY || extras.posthogApiKey;
  const host = process.env.EXPO_PUBLIC_POSTHOG_HOST || extras.posthogHost || 'https://us.i.posthog.com';

  if (!apiKey) {
    if (__DEV__) {
      console.warn('[PostHog] Missing API key; analytics disabled.');
    }
    return null;
  }

  if (__DEV__) {
    console.log('[PostHog] Initializing client');
  }
  posthogClient = new PostHog(apiKey, buildOptions(host));
  
  try {
    posthogClient.debug(__DEV__);
  } catch (error) {
    console.error('[PostHog] debug() failed:', error);
  }

  // Add event listener for flushes
  if (__DEV__) {
    console.log('[PostHog] Client initialized (dev debug enabled)');
  }

  return posthogClient;
};

export const identifyPostHogUser = (userId: string, traits?: Record<string, any>) => {
  const client = getPostHogClient();
  if (!client) {
    if (__DEV__) {
      console.warn('[PostHog] identify skipped - client unavailable');
    }
    return;
  }

  if (__DEV__) {
    console.log('[PostHog] identify', { traitsKeyCount: traits ? Object.keys(traits).length : 0 });
  }
  client.identify(userId, traits);
};

export const aliasPostHogUser = (newUserId: string) => {
  const client = getPostHogClient();
  if (!client) {
    if (__DEV__) {
      console.warn('[PostHog] alias skipped - client unavailable');
    }
    return;
  }

  if (__DEV__) {
    console.log('[PostHog] alias', { newUserId });
  }
  
  try {
    client.alias(newUserId);
    if (__DEV__) {
      console.log('[PostHog] alias succeeded');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[PostHog] alias failed:', message);
    try {
      captureException(error instanceof Error ? error : new Error(message), {
        module: 'posthog',
        op: 'aliasPostHogUser',
      });
    } catch (_) {
      // Sentry unavailable
    }
  }
};

export const registerPostHogProperties = async (properties: Record<string, any>) => {
  const client = getPostHogClient();
  if (!client) {
    if (__DEV__) {
      console.warn('[PostHog] register skipped - client unavailable');
    }
    return;
  }

  if (__DEV__) {
    console.log('[PostHog] register', { propertiesKeyCount: Object.keys(properties).length });
  }
  
  try {
    await client.register(properties);
    if (__DEV__) {
      console.log('[PostHog] register succeeded');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[PostHog] register failed:', message);
    try {
      captureException(error instanceof Error ? error : new Error(message), {
        module: 'posthog',
        op: 'registerPostHogProperties',
      });
    } catch (_) {
      // Sentry unavailable
    }
  }
};

export const resetPostHog = () => {
  if (!posthogClient) {
    if (__DEV__) {
      console.log('[PostHog] reset skipped - client not initialized');
    }
    return;
  }

  if (__DEV__) {
    console.log('[PostHog] reset');
  }
  posthogClient.reset();
};

export const capturePostHogEvent = (event: string, properties?: Record<string, any>) => {
  const client = getPostHogClient();
  if (!client) {
    if (__DEV__) {
      console.warn('[PostHog] capture skipped - client unavailable');
    }
    return;
  }

  if (__DEV__) {
    console.log('[PostHog] capture', { propertiesKeyCount: properties ? Object.keys(properties).length : 0 });
  }
  client.capture(event, properties);
};

/**
 * Diagnostic function to verify PostHog is working end-to-end
 * Run this from console during development to debug issues
 */
export const diagnosPostHog = async () => {
  if (!__DEV__) {
    return;
  }

  console.log('\n========== PostHog Diagnostics ==========\n');

  // Check 1: API Key
  const extras = getExtraConfig();
  const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY || extras.posthogApiKey;
  console.log('[Diagnostic] API Key present:', !!apiKey);

  // Check 2: Client Initialization
  const client = getPostHogClient();
  console.log('[Diagnostic] Client initialized:', !!client);

  if (!client) {
    console.log('[Diagnostic] ✗ FAILED: PostHog client not initialized\n');
    return;
  }

  // Check 3: Send test event
  console.log('[Diagnostic] Sending test event...');
  const testEventId = `test-${Date.now()}`;
  client.capture('PostHog_Diagnostic_Test', {
    testId: testEventId,
    timestamp: new Date().toISOString(),
    platform: Platform.OS,
  });
  console.log('[Diagnostic] Test event queued:', testEventId);

  // Check 4: Force flush
  console.log('[Diagnostic] Flushing events...');
  try {
    await client.flush();
    console.log('[Diagnostic] ✓ Flush completed');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Diagnostic] ✗ Flush error:', message);
    try {
      captureException(error instanceof Error ? error : new Error(message), {
        module: 'posthog',
        op: 'diagnosPostHog.flush',
      });
    } catch (_) {
      // no-op if Sentry unavailable
    }
  }

  console.log('\n[Diagnostic] Check PostHog dashboard for event:', testEventId);
  console.log('[Diagnostic] https://us.posthog.com/');
  console.log('\n========== End Diagnostics ==========\n');
};

/**
 * Check network connectivity to PostHog endpoint
 */
export const checkPostHogNetwork = async () => {
  if (!__DEV__) {
    return false;
  }

  const host = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
  console.log('\n[Network] Testing connectivity...');

  try {
    const response = await fetch(`${host}/engage/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    console.log('[Network] Response status:', response.status);
    console.log('[Network] ✓ Connectivity OK');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('[Network] ✗ Network error:', message);
    return false;
  }
};
