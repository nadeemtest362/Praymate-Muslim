export type AuthorizationStatus = 'notDetermined' | 'denied' | 'approved';

export interface BlockingSchedule {
  type: 'morning' | 'evening' | 'both';
  morningStart?: number; // Hour (0-23)
  eveningStart?: number; // Hour (0-23)
}

export interface BlockedApp {
  bundleId: string;
  displayName: string;
  icon?: string;
}

export interface ShieldEvent {
  type: 'primaryButtonPressed' | 'closeButtonPressed' | 'emergencyUnlock';
  appBundleId?: string;
  timestamp: number;
}

export interface FamilyActivitySelection {
  // Opaque token from iOS FamilyControls
  token: string;
} 