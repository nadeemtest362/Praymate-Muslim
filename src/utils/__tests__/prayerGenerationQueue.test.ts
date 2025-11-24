import { prayerGenerationQueue } from '../prayerGenerationQueue';
import { secureQueueStorage } from '../secureQueueStorage';

jest.mock('../generatePrayerRetry', () => ({
  invokeGeneratePrayerWithRetry: jest.fn().mockResolvedValue({ data: { prayer: 'queued', prayerId: 'queued-id' }, error: null, attempts: 1 }),
}));

jest.mock('../secureQueueStorage', () => ({
  secureQueueStorage: {
    getJson: jest.fn().mockResolvedValue([]),
    setJson: jest.fn().mockResolvedValue(true),
    remove: jest.fn().mockResolvedValue(true),
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

jest.mock('../../lib/eventBus', () => ({
  emitDataChange: jest.fn(),
}));

describe('PrayerGenerationQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('enqueues generation payloads', async () => {
    await prayerGenerationQueue.enqueueGeneration({
      userId: 'user-1',
      payload: { slot: 'morning' },
      slot: 'morning',
      source: 'test',
    });

    expect(secureQueueStorage.getJson).toHaveBeenCalled();
    expect(secureQueueStorage.setJson).toHaveBeenCalled();
  });

  it('processes queue and clears processed entries', async () => {
    (secureQueueStorage.getJson as jest.Mock).mockResolvedValueOnce([
      {
        id: 'entry-1',
        userId: 'user-1',
        payload: { slot: 'morning' },
        slot: 'morning',
        source: 'test',
        createdAt: new Date().toISOString(),
        retryCount: 0,
        lastAttempt: new Date().toISOString(),
      },
    ]);

    await prayerGenerationQueue.processPendingGenerations();

    expect(secureQueueStorage.setJson).toHaveBeenCalledWith(expect.any(String), []);
  });
});
