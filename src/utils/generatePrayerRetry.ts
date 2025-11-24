import { supabase } from '../lib/supabaseClient';
import { secureLog } from './secureLogger';
import { capturePostHogEvent } from '../lib/posthog';

type GeneratePrayerBody = Record<string, unknown>;

interface GeneratePrayerSuccess {
  data: any;
  error: null;
  attempts: number;
}

interface GeneratePrayerFailure {
  data: null;
  error: Error;
  attempts: number;
}

type GeneratePrayerResult = GeneratePrayerSuccess | GeneratePrayerFailure;

const RETRYABLE_STATUS_CODES = [408, 425, 429, 500, 502, 503, 504];

const MAX_ATTEMPTS = 4;
const INITIAL_DELAY_MS = 1000;

function isRetryableStatus(status?: number | null): boolean {
  if (!status && status !== 0) {
    return false;
  }
  for (let i = 0; i < RETRYABLE_STATUS_CODES.length; i++) {
    if (RETRYABLE_STATUS_CODES[i] === status) {
      return true;
    }
  }
  return status >= 500;
}

function classifyError(error: unknown): { retryable: boolean; status?: number | null; details?: string } {
  if (!error) {
    return { retryable: true };
  }

  // Supabase function errors expose status code
  if (typeof error === 'object' && error !== null) {
    const anyErr = error as any;
    const status = typeof anyErr.status === 'number' ? anyErr.status : undefined;
    const message = typeof anyErr.message === 'string' ? anyErr.message : undefined;

    if (status) {
      return {
        retryable: isRetryableStatus(status),
        status,
        details: message,
      };
    }

    // Network failures often expose retryable flag
    if (typeof anyErr.retryable === 'boolean') {
      return {
        retryable: anyErr.retryable,
        status,
        details: message,
      };
    }

    // fetch/eval errors propagate through message strings
    if (message) {
      const normalized = message.toLowerCase();
      if (
        normalized.includes('network request failed') ||
        normalized.includes('networkerror') ||
        normalized.includes('fetch failed') ||
        normalized.includes('timed out') ||
        normalized.includes('timeout')
      ) {
        return {
          retryable: true,
          status,
          details: message,
        };
      }

      if (normalized.includes('429')) {
        return {
          retryable: true,
          status: 429,
          details: message,
        };
      }

      if (normalized.includes('500')) {
        return {
          retryable: true,
          status: 500,
          details: message,
        };
      }
    }
  }

  return { retryable: false };
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function computeDelay(attempt: number): number {
  const base = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
  const maxJitter = base * 0.25;
  const jitter = Math.floor(Math.random() * maxJitter);
  return base + jitter;
}

export async function invokeGeneratePrayerWithRetry(body: GeneratePrayerBody, context?: { source?: string; userId?: string }): Promise<GeneratePrayerResult> {
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < MAX_ATTEMPTS) {
    attempt += 1;
    try {
      secureLog.info('[GeneratePrayerRetry] Attempting prayer generation', {
        attempt,
        bodyKeys: Object.keys(body || {}),
        source: context?.source,
      });

      const { data, error } = await supabase.functions.invoke('generate-prayer', {
        body,
      });

      if (error) {
        const classification = classifyError(error);
        secureLog.warn('[GeneratePrayerRetry] Supabase function error', {
          attempt,
          classification,
        });

        if (!classification.retryable || attempt >= MAX_ATTEMPTS) {
          secureLog.error('[GeneratePrayerRetry] Give up due to non-retryable error or max attempts', error, {
            attempt,
            classification,
          });
          capturePostHogEvent('prayer_generation_failed', {
            attempts: attempt,
            source: context?.source || 'unknown',
            status: classification.status,
            retryable: classification.retryable,
          });
          return { data: null, error: error instanceof Error ? error : new Error(String(error)), attempts: attempt };
        }

        if (attempt < MAX_ATTEMPTS) {
          const delay = computeDelay(attempt);
          capturePostHogEvent('prayer_generation_retry', {
            attempt,
            delay,
            source: context?.source || 'unknown',
            status: classification.status,
          });
          await wait(delay);
          continue;
        }
      }

      // Success path
      capturePostHogEvent('prayer_generation_succeeded', {
        attempts: attempt,
        source: context?.source || 'unknown',
      });

      return { data, error: null, attempts: attempt };
    } catch (err) {
      const classification = classifyError(err);
      const normalizedError = err instanceof Error ? err : new Error(String(err));
      secureLog.error('[GeneratePrayerRetry] Unexpected error invoking generate-prayer', normalizedError, {
        attempt,
        classification,
      });

      lastError = normalizedError;

      if (!classification.retryable || attempt >= MAX_ATTEMPTS) {
        capturePostHogEvent('prayer_generation_failed', {
          attempts: attempt,
          source: context?.source || 'unknown',
          status: classification.status,
          retryable: classification.retryable,
        });
        return { data: null, error: normalizedError, attempts: attempt };
      }

      const delay = computeDelay(attempt);
      capturePostHogEvent('prayer_generation_retry', {
        attempt,
        delay,
        source: context?.source || 'unknown',
        status: classification.status,
      });
      await wait(delay);
    }
  }

  const fallbackError = lastError || new Error('Prayer generation failed without specific error');
  capturePostHogEvent('prayer_generation_failed', {
    attempts: MAX_ATTEMPTS,
    source: context?.source || 'unknown',
  });
  return { data: null, error: fallbackError, attempts: MAX_ATTEMPTS };
}

export function getGeneratePrayerRetryConfig() {
  return {
    maxAttempts: MAX_ATTEMPTS,
    initialDelayMs: INITIAL_DELAY_MS,
  };
}
