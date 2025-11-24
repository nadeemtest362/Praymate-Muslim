import { Asset } from 'expo-asset';
import { Image as ExpoImage } from 'expo-image';
import { registerPrefetchedImageUrl } from './imagePrefetchRegistry';

export const PLAN_MORNING_ICON = require('../../assets/images/morning1.png');
export const PLAN_EVENING_ICON = require('../../assets/images/evening1.png');
export const PRAYER_JOURNEY_JESUS = require('../../assets/images/jesus-2.png');
export const DAILY_BREAD_BG = require('../../assets/images/jesus-bg.png');

let warmIconsPromise: Promise<void> | null = null;
let warmPrayerJourneyPromise: Promise<void> | null = null;
let warmDailyBreadPromise: Promise<void> | null = null;

const iconModules = [PLAN_MORNING_ICON, PLAN_EVENING_ICON];

async function ensureIconPrefetched(moduleId: number) {
  try {
    const asset = Asset.fromModule(moduleId);
    if (!asset.localUri) {
      await asset.downloadAsync();
    }
    const uri = asset.localUri || asset.uri;
    if (uri) {
      await ExpoImage.prefetch(uri).catch(() => {});
      try {
        registerPrefetchedImageUrl(uri);
      } catch {}
    }
  } catch {
    // no-op; icon will fall back to initial render if warm fails
  }
}

export async function warmPlanIcons() {
  if (!warmIconsPromise) {
    warmIconsPromise = (async () => {
      for (let index = 0; index < iconModules.length; index += 1) {
        await ensureIconPrefetched(iconModules[index]);
      }
    })().catch(() => {
      warmIconsPromise = null;
    });
  }

  return warmIconsPromise;
}

export async function warmPrayerJourneyImage() {
  if (!warmPrayerJourneyPromise) {
    warmPrayerJourneyPromise = ensureIconPrefetched(PRAYER_JOURNEY_JESUS).catch(() => {
      warmPrayerJourneyPromise = null;
    });
  }

  return warmPrayerJourneyPromise;
}

export async function warmDailyBreadImage() {
  if (!warmDailyBreadPromise) {
    warmDailyBreadPromise = ensureIconPrefetched(DAILY_BREAD_BG).catch(() => {
      warmDailyBreadPromise = null;
    });
  }

  return warmDailyBreadPromise;
}
