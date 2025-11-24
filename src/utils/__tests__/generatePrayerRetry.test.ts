import { invokeGeneratePrayerWithRetry, getGeneratePrayerRetryConfig } from '../generatePrayerRetry';

jest.mock('../../lib/supabaseClient', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
  },
}));

jest.mock('../secureLogger', () => ({
  secureLog: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../lib/posthog', () => ({
  capturePostHogEvent: jest.fn(),
}));

const supabaseMock: any = require('../../lib/supabaseClient').supabase;

describe('invokeGeneratePrayerWithRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns data on first successful attempt', async () => {
    const response = { prayer: 'Test', prayerId: '123' };
    supabaseMock.functions.invoke.mockResolvedValue({ data: response, error: null });

    const result = await invokeGeneratePrayerWithRetry({ slot: 'morning' });

    expect(result.error).toBeNull();
    expect(result.data).toEqual(response);
    expect(result.attempts).toBe(1);
  });

  it('retries on retryable error and eventually returns success', async () => {
    const retryableError = { message: 'network request failed' };
    const successResponse = { prayer: 'Test', prayerId: '123' };
    supabaseMock.functions.invoke
      .mockResolvedValueOnce({ data: null, error: retryableError })
      .mockResolvedValueOnce({ data: successResponse, error: null });

    const result = await invokeGeneratePrayerWithRetry({ slot: 'morning' });

    expect(result.error).toBeNull();
    expect(result.data).toEqual(successResponse);
    expect(result.attempts).toBe(2);
    expect(supabaseMock.functions.invoke).toHaveBeenCalledTimes(2);
  });

  it('stops retrying on non-retryable error', async () => {
    const validationError = { message: 'Bad Request', status: 400 };
    supabaseMock.functions.invoke.mockResolvedValue({ data: null, error: validationError });

    const result = await invokeGeneratePrayerWithRetry({ slot: 'morning' });

    expect(result.error).toBeInstanceOf(Error);
    expect(result.attempts).toBe(1);
  });

  it('caps attempts based on configuration', async () => {
    const retryableError = { message: 'network request failed' };
    supabaseMock.functions.invoke.mockResolvedValue({ data: null, error: retryableError });

    const config = getGeneratePrayerRetryConfig();
    const result = await invokeGeneratePrayerWithRetry({ slot: 'morning' });

    expect(result.error).toBeInstanceOf(Error);
    expect(result.attempts).toBe(config.maxAttempts);
    expect(supabaseMock.functions.invoke).toHaveBeenCalledTimes(config.maxAttempts);
  });
});
