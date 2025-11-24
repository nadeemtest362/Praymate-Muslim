import ExpoFamilyControlsModule from './ExpoFamilyControlsModule';
import { 
  AuthorizationStatus, 
  BlockingSchedule, 
  BlockedApp,
  ShieldEvent 
} from './ExpoFamilyControls.types';

// Platform availability
export function isSupported(): boolean {
  return ExpoFamilyControlsModule.isSupported();
}

// Authorization
export async function requestAuthorization(): Promise<boolean> {
  return ExpoFamilyControlsModule.requestAuthorization();
}

export async function checkAuthorizationStatus(): Promise<AuthorizationStatus> {
  return ExpoFamilyControlsModule.checkAuthorizationStatus();
}

// App Selection
export async function selectAppsToBlock(): Promise<void> {
  return ExpoFamilyControlsModule.selectAppsToBlock();
}

export async function getBlockedApps(): Promise<BlockedApp[]> {
  return ExpoFamilyControlsModule.getBlockedApps();
}

export async function clearBlockedApps(): Promise<void> {
  return ExpoFamilyControlsModule.clearBlockedApps();
}

// Blocking Control
export async function enablePraylock(schedule: BlockingSchedule): Promise<void> {
  return ExpoFamilyControlsModule.enablePraylock(schedule);
}

export async function disablePraylock(): Promise<void> {
  return ExpoFamilyControlsModule.disablePraylock();
}

export async function isPraylockEnabled(): Promise<boolean> {
  return ExpoFamilyControlsModule.isPraylockEnabled();
}

// Prayer Completion
export async function markPrayerCompleted(period: 'morning' | 'evening'): Promise<void> {
  return ExpoFamilyControlsModule.markPrayerCompleted(period);
}

// Emergency Unlock
export async function performEmergencyUnlock(appBundleId: string): Promise<void> {
  return ExpoFamilyControlsModule.performEmergencyUnlock(appBundleId);
} 