import { secureQueueStorage } from '../secureQueueStorage';

jest.mock('expo-secure-store', () => ({
  isAvailableAsync: jest.fn(),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('../../lib/sentry', () => ({
  captureException: jest.fn(),
}));

const SecureStore: any = require('expo-secure-store');
const AsyncStorage: any = require('@react-native-async-storage/async-storage');
const { captureException }: { captureException: jest.Mock } = require('../../lib/sentry');

describe('secureQueueStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    SecureStore.isAvailableAsync.mockResolvedValue(true);
    const storage: any = secureQueueStorage;
    storage.secureAvailable = null;
    storage.availabilityCheck = null;
    storage.reportedWriteFailures?.clear?.();
  });

  it('writes JSON payloads to SecureStore when available', async () => {
    const result = await secureQueueStorage.setJson('test-key', { foo: 'bar' });

    expect(result).toBe(true);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'test-key',
      JSON.stringify({ foo: 'bar' }),
      { requireAuthentication: false }
    );
    expect(captureException).not.toHaveBeenCalled();
  });

  it('falls back to read-only mode when SecureStore is unavailable', async () => {
    SecureStore.isAvailableAsync.mockResolvedValue(false);

    const writeResult = await secureQueueStorage.setJson('test-key', { foo: 'bar' });
    const readResult = await secureQueueStorage.getJson('test-key');

    expect(writeResult).toBe(false);
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('test-key');
    expect(readResult).toBeNull();
    expect(captureException).toHaveBeenCalledWith(expect.any(Error), {
      storage_key: 'test-key',
      operation: 'setJson',
      source: 'secureQueueStorage',
    });
  });

  it('migrates legacy AsyncStorage entries into SecureStore once', async () => {
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify([{ id: '123' }]));
    SecureStore.getItemAsync.mockResolvedValue(null);
    SecureStore.setItemAsync.mockResolvedValue(undefined);

    await secureQueueStorage.migrateFromAsyncStorage(['legacy-key']);

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'legacy-key',
      JSON.stringify([{ id: '123' }]),
      { requireAuthentication: false }
    );
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('legacy-key');
    expect(captureException).not.toHaveBeenCalled();
  });

  it('reports write failures only once per key and keeps legacy value', async () => {
    const error = new Error('secure write failed');
    SecureStore.setItemAsync.mockRejectedValue(error);

    const storage: any = secureQueueStorage;
    storage.reportedWriteFailures.clear();

    await secureQueueStorage.setJson('flaky-key', { foo: 'bar' });
    await secureQueueStorage.setJson('flaky-key', { foo: 'bar' });

    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(2);
    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledWith(error, {
      storage_key: 'flaky-key',
      operation: 'setJson',
      source: 'secureQueueStorage',
    });
  });
});
