import { OnboardingCrashRecovery } from '../crash-recovery';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock the store
jest.mock('../../../../stores/onboardingStore', () => ({
  useOnboardingStore: {
    getState: () => ({
      firstName: 'John',
      faithTradition: 'Christian',
      currentStep: 3,
      setFirstName: jest.fn(),
      setFaithTradition: jest.fn(),
    }),
  },
}));

describe('OnboardingCrashRecovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('crash detection', () => {
    it('should detect crash when session was active', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('active');
      
      const hasCrashed = await OnboardingCrashRecovery.detectCrash();
      
      expect(hasCrashed).toBe(true);
    });

    it('should not detect crash when session was clean', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('clean');
      
      const hasCrashed = await OnboardingCrashRecovery.detectCrash();
      
      expect(hasCrashed).toBe(false);
    });
  });

  describe('session marking', () => {
    it('should mark session as active', async () => {
      await OnboardingCrashRecovery.markSessionActive();
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@onboarding_crash_detection',
        'active'
      );
    });

    it('should mark session as clean', async () => {
      await OnboardingCrashRecovery.markSessionClean();
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@onboarding_crash_detection',
        'clean'
      );
    });
  });

  describe('progress saving', () => {
    it('should save current screen and progress snapshot', async () => {
      await OnboardingCrashRecovery.saveProgress('mood-screen');
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@onboarding_last_screen',
        'mood-screen'
      );
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@onboarding_progress',
        expect.stringContaining('"firstName":"John"')
      );
    });
  });

  describe('recovery info', () => {
    it('should allow recovery for recent crashes', async () => {
      const recentTimestamp = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
      
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce('active') // crash detected
        .mockResolvedValueOnce('mood-screen') // last screen
        .mockResolvedValueOnce(JSON.stringify({
          firstName: 'John',
          timestamp: recentTimestamp,
        }));
      
      const info = await OnboardingCrashRecovery.getRecoveryInfo();
      
      expect(info).toEqual({
        hasCrashed: true,
        lastScreen: 'mood-screen',
        canRecover: true,
      });
    });

    it('should not allow recovery for old crashes', async () => {
      const oldTimestamp = Date.now() - (48 * 60 * 60 * 1000); // 48 hours ago
      
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce('active')
        .mockResolvedValueOnce('mood-screen')
        .mockResolvedValueOnce(JSON.stringify({
          firstName: 'John',
          timestamp: oldTimestamp,
        }));
      
      const info = await OnboardingCrashRecovery.getRecoveryInfo();
      
      expect(info.canRecover).toBe(false);
    });
  });

  describe('progress restoration', () => {
    it('should restore saved progress', async () => {
      const mockProgress = {
        firstName: 'Jane',
        faithTradition: 'Catholic',
        timestamp: Date.now(),
      };
      
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(mockProgress)
      );
      
      const { useOnboardingStore } = jest.requireActual('../../../../stores/onboardingStore');
      const store = useOnboardingStore.getState();
      const restored = await OnboardingCrashRecovery.restoreProgress();
      
      expect(restored).toBe(true);
      expect(store.setFirstName).toHaveBeenCalledWith('Jane');
      expect(store.setFaithTradition).toHaveBeenCalledWith('Catholic');
    });

    it('should handle missing progress data', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      
      const restored = await OnboardingCrashRecovery.restoreProgress();
      
      expect(restored).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should clear all recovery data', async () => {
      await OnboardingCrashRecovery.clearRecoveryData();
      
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        '@onboarding_crash_detection',
        '@onboarding_last_screen',
        '@onboarding_progress',
      ]);
    });
  });
});

/**
 * Manual testing checklist:
 * 
 * ✅ Force quit app during onboarding
 * ✅ Reopen and see recovery dialog
 * ✅ Choose "Continue" - verify it resumes correctly
 * ✅ Choose "Start Fresh" - verify it clears data
 * ✅ Background app normally - verify no false positives
 * ✅ Test on both iOS and Android
 * ✅ Test with poor network conditions
 */ 