import type * as SentryModule from '@sentry/react-native';

type SentryNamespace = typeof SentryModule;

let Sentry: SentryNamespace | null = null;
let navigationIntegration: ReturnType<SentryNamespace['reactNavigationIntegration']> | undefined;
let tracingIntegration: ReturnType<SentryNamespace['reactNativeTracingIntegration']> | undefined;

try {
  const requiredModule = require('@sentry/react-native') as SentryNamespace;
  const { NativeModules } = require('react-native');
  if (!(NativeModules as Record<string, unknown>)?.RNSentry) {
    throw new Error('Sentry native module is not installed in this build.');
  }
  Sentry = requiredModule;
  navigationIntegration = Sentry.reactNavigationIntegration();
  tracingIntegration = Sentry.reactNativeTracingIntegration();
} catch (error) {
  Sentry = null;
  navigationIntegration = undefined;
  tracingIntegration = undefined;
  if (__DEV__) {
    const message = error instanceof Error ? error.message : 'Unknown error while loading Sentry.';
    console.warn(`[Sentry] Disabled - ${message}`);
  }
}

// Initialize Sentry for crash reporting
export const initSentry = () => {
  if (!Sentry) {
    if (__DEV__) {
      console.warn('[Sentry] init skipped - native module unavailable in this build.');
    }
    return;
  }

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    console.warn('[Sentry] Missing EXPO_PUBLIC_SENTRY_DSN; Sentry will not capture events.');
    return;
  }

  const isDev = __DEV__;

  Sentry.init({
    dsn,
    debug: false,
    enableNative: !isDev,
    tracesSampleRate: isDev ? 0 : 1.0,
    environment: process.env.EXPO_PUBLIC_APP_VARIANT || 'development',
    beforeSend: (event) => {
      // Add extra context for debugging production crashes
      if (event.exception && !isDev) {
        console.log('[Sentry] Capturing exception:', event.exception);
      }
      return event;
    },
    integrations: (defaultIntegrations) => {
      if (isDev || !navigationIntegration || !tracingIntegration) {
        return defaultIntegrations;
      }

      return [...defaultIntegrations, navigationIntegration, tracingIntegration];
    },
  });

  if (Sentry.addBreadcrumb) {
    Sentry.addBreadcrumb({
      message: 'App initialized',
      level: 'info',
      data: {
        timestamp: new Date().toISOString(),
      },
    });
  }
};

// Capture user context when they log in
export const setSentryUser = (userId: string, email?: string) => {
  if (!Sentry) {
    return;
  }

  Sentry.setUser({
    id: userId,
    email: email,
  });
};

// Clear user on logout
export const clearSentryUser = () => {
  if (!Sentry) {
    return;
  }

  Sentry.setUser(null);
};

// Capture custom events
export const captureException = (error: Error, context?: Record<string, any>) => {
  if (!Sentry) {
    if (__DEV__) {
      console.warn('[Sentry] captureException skipped - native module unavailable.');
    }
    console.error(error);
    return;
  }

  if (context) {
    Sentry.captureException(error, {
      contexts: {
        custom: context,
      },
    });
  } else {
    Sentry.captureException(error);
  }
}; 

export const routingInstrumentation = navigationIntegration;

export const wrapWithSentry = <T extends (...args: any[]) => any>(component: T): T => {
  if (Sentry?.wrap) {
    return Sentry.wrap(component) as T;
  }

  if (__DEV__) {
    console.warn('[Sentry] wrap skipped - returning original component.');
  }

  return component;
};
