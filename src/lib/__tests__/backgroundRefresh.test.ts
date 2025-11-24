import { AppState } from 'react-native';
import { backgroundRefreshManager } from '../backgroundRefresh';
import { queryClient } from '../queryClient';

// Mock dependencies
jest.mock('../queryClient', () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
  },
}));

jest.mock('../../config/featureFlags', () => ({
  isFeatureEnabled: jest.fn(() => true),
}));

jest.mock('../eventBus', () => ({
  eventBus: {
    emit: jest.fn(),
  },
}));

// Mock AppState
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(),
    currentState: 'active',
  },
}));

describe('BackgroundRefreshManager', () => {
  let mockListener: (state: string) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock AppState.addEventListener to capture the listener
    (AppState.addEventListener as jest.Mock).mockImplementation((event, listener) => {
      mockListener = listener;
      return { remove: jest.fn() };
    });
  });

  afterEach(() => {
    backgroundRefreshManager.cleanup();
  });

  it('should initialize and set up app state listener', () => {
    backgroundRefreshManager.init();
    
    expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('should refresh queries when app becomes active after being stale', () => {
    backgroundRefreshManager.init();
    
    // Simulate app going to background
    mockListener('background');
    
    // Mock time passage to make data stale
    const originalNow = Date.now;
    Date.now = jest.fn(() => originalNow() + 6 * 60 * 1000); // 6 minutes later
    
    // Simulate app becoming active
    mockListener('active');
    
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      predicate: expect.any(Function),
      type: 'inactive',
    });
    
    // Restore Date.now
    Date.now = originalNow;
  });

  it('should not refresh queries when app becomes active quickly', () => {
    backgroundRefreshManager.init();
    
    // Simulate app going to background and quickly back to active
    mockListener('background');
    mockListener('active');
    
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });

  it('should provide manual refresh capability', () => {
    backgroundRefreshManager.refreshCriticalData();
    
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      predicate: expect.any(Function),
      type: 'inactive',
    });
  });

  it('should check if data is stale correctly', () => {
    const originalNow = Date.now;
    Date.now = jest.fn(() => originalNow() + 6 * 60 * 1000); // 6 minutes
    
    expect(backgroundRefreshManager.isDataStale()).toBe(true);
    
    Date.now = jest.fn(() => originalNow() + 2 * 60 * 1000); // 2 minutes
    expect(backgroundRefreshManager.isDataStale()).toBe(false);
    
    Date.now = originalNow;
  });

  it('should cleanup app state listener', () => {
    const mockRemove = jest.fn();
    (AppState.addEventListener as jest.Mock).mockReturnValue({ remove: mockRemove });
    
    backgroundRefreshManager.init();
    backgroundRefreshManager.cleanup();
    
    expect(mockRemove).toHaveBeenCalled();
  });
});
