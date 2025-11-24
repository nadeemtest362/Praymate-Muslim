import { AppState, AppStateStatus } from 'react-native';

type Period = 'morning' | 'evening';

interface ClockAnchor {
  serverNowEpochMs: number;
  timezone?: string | null;
}

const DEFAULT_TIMEZONE = 'UTC';
const MORNING_START_HOUR = 4;
const EVENING_START_HOUR = 16;

let serverNowEpochMs = Date.now();
let perfAtSync = typeof performance !== 'undefined' ? performance.now() : 0;
let canonicalTimezone: string | null = null;
let lastSyncAt = Date.now();

let minuteTimer: ReturnType<typeof setInterval> | null = null;
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
const minuteListeners = new Set<() => void>();
const appStateListeners = new Set<(state: AppStateStatus) => void>();

export function initClock(anchor: ClockAnchor) {
  resyncClock(anchor);
  ensureMinuteTicker();
  ensureAppStateListener();
}

export function resyncClock(anchor: ClockAnchor) {
  if (typeof anchor.serverNowEpochMs === 'number' && !Number.isNaN(anchor.serverNowEpochMs)) {
    serverNowEpochMs = anchor.serverNowEpochMs;
    perfAtSync = typeof performance !== 'undefined' ? performance.now() : 0;
    lastSyncAt = Date.now();
  }

  if (typeof anchor.timezone === 'string' && anchor.timezone.length > 0) {
    canonicalTimezone = anchor.timezone;
  }
}

export function setCanonicalTimezone(timezone: string | null | undefined) {
  if (timezone && timezone.length > 0) {
    canonicalTimezone = timezone;
  }
}

export function getCanonicalTimezone(): string {
  if (canonicalTimezone && canonicalTimezone.length > 0) {
    return canonicalTimezone;
  }

  try {
    const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (deviceTimezone) {
      return deviceTimezone;
    }
  } catch (error) {
    console.warn('[Clock] Failed to resolve device timezone:', error);
  }

  return DEFAULT_TIMEZONE;
}

export function now(): number {
  const perfNow = typeof performance !== 'undefined' ? performance.now() : 0;
  return serverNowEpochMs + (perfNow - perfAtSync);
}

export function getLastSyncAt(): number {
  return lastSyncAt;
}

export function nowInTimezone(timezone?: string): Date {
  const tz = timezone || getCanonicalTimezone();
  const date = new Date(now());

  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);

    const parsePart = (type: Intl.DateTimeFormatPartTypes) =>
      parseInt(parts.find((p) => p.type === type)?.value || '0', 10);

    const localized = new Date(0);
    localized.setFullYear(parsePart('year'), parsePart('month') - 1, parsePart('day'));
    localized.setHours(parsePart('hour'), parsePart('minute'), parsePart('second'), 0);
    return localized;
  } catch (error) {
    console.error('[Clock] Failed to convert to timezone, falling back to Date', error);
    return new Date(date.getTime());
  }
}

export function getCurrentPeriod(timezone?: string): Period {
  const date = nowInTimezone(timezone);
  const hour = date.getHours();
  return hour >= MORNING_START_HOUR && hour < EVENING_START_HOUR ? 'morning' : 'evening';
}

export function isInPrayerWindow(timezone?: string): boolean {
  const date = nowInTimezone(timezone);
  const hour = date.getHours();
  if (hour >= MORNING_START_HOUR && hour < EVENING_START_HOUR) {
    return true;
  }

  if (hour >= EVENING_START_HOUR || hour < MORNING_START_HOUR) {
    return true;
  }

  return false;
}

export function getPrayerDayStart(timezone?: string): Date {
  const nowTz = nowInTimezone(timezone);
  const start = new Date(nowTz);
  start.setHours(MORNING_START_HOUR, 0, 0, 0);

  if (nowTz.getHours() < MORNING_START_HOUR) {
    start.setDate(start.getDate() - 1);
  }

  return start;
}

export function getPrayerDayStartMs(timezone?: string): number {
  return getPrayerDayStart(timezone).getTime();
}

export function getNextBoundary(timezone?: string): { type: Period; at: Date } {
  const nowTz = nowInTimezone(timezone);
  const hour = nowTz.getHours();
  const next = new Date(nowTz);

  if (hour < MORNING_START_HOUR) {
    next.setHours(MORNING_START_HOUR, 0, 0, 0);
    return { type: 'morning', at: next };
  }

  if (hour >= MORNING_START_HOUR && hour < EVENING_START_HOUR) {
    next.setHours(EVENING_START_HOUR, 0, 0, 0);
    return { type: 'evening', at: next };
  }

  next.setDate(next.getDate() + 1);
  next.setHours(MORNING_START_HOUR, 0, 0, 0);
  return { type: 'morning', at: next };
}

export function onMinuteTick(listener: () => void): () => void {
  minuteListeners.add(listener);
  ensureMinuteTicker();
  return () => {
    minuteListeners.delete(listener);
    if (minuteListeners.size === 0) {
      clearMinuteTicker();
    }
  };
}

export function onAppStateChange(listener: (state: AppStateStatus) => void): () => void {
  appStateListeners.add(listener);
  ensureAppStateListener();
  return () => {
    appStateListeners.delete(listener);
    if (appStateListeners.size === 0 && minuteListeners.size === 0) {
      removeAppStateListener();
    }
  };
}

function ensureMinuteTicker() {
  if (minuteTimer) return;

  minuteTimer = setInterval(() => {
    minuteListeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.error('[Clock] Minute listener error:', error);
      }
    });
  }, 60_000);
}

function clearMinuteTicker() {
  if (minuteTimer) {
    clearInterval(minuteTimer);
    minuteTimer = null;
  }
}

function ensureAppStateListener() {
  if (appStateListeners.size === 0 || appStateSubscription) {
    return;
  }

  appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
}

function removeAppStateListener() {
  if (!appStateSubscription) {
    return;
  }

  appStateSubscription.remove();
  appStateSubscription = null;
}

function handleAppStateChange(state: AppStateStatus) {
  appStateListeners.forEach((listener) => {
    try {
      listener(state);
    } catch (error) {
      console.error('[Clock] App state listener error:', error);
    }
  });
}

export function detectSignificantDeviceClockDrift(thresholdMs = 120_000): boolean {
  const simulatedNow = now();
  const deviceNow = Date.now();
  return Math.abs(simulatedNow - deviceNow) > thresholdMs;
}

export function getClockSnapshot(timezone?: string) {
  const tz = timezone || getCanonicalTimezone();
  const date = nowInTimezone(tz);

  return {
    timezone: tz,
    iso: date.toISOString(),
    period: getCurrentPeriod(tz),
    inPrayerWindow: isInPrayerWindow(tz),
    serverNowEpochMs,
    lastSyncAt,
  };
}

