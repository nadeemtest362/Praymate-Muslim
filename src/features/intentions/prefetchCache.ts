import type { PrayerIntention } from '../../repositories/intentionsRepository';
import type { PrayerPerson } from '../../repositories/peopleRepository';

type PrefetchCache<T> = {
  userId: string;
  data: T;
} | null;

let intentionsCache: PrefetchCache<PrayerIntention[]> = null;
let peopleCache: PrefetchCache<PrayerPerson[]> = null;

export const setPrefetchedIntentions = (userId: string, intentions: PrayerIntention[]) => {
  intentionsCache = {
    userId,
    data: intentions,
  };
};

export const getPrefetchedIntentions = (userId: string | null | undefined): PrayerIntention[] | undefined => {
  if (!userId) return undefined;
  return intentionsCache?.userId === userId ? intentionsCache.data : undefined;
};

export const setPrefetchedPeople = (userId: string, people: PrayerPerson[]) => {
  peopleCache = {
    userId,
    data: people,
  };
};

export const getPrefetchedPeople = (userId: string | null | undefined): PrayerPerson[] | undefined => {
  if (!userId) return undefined;
  return peopleCache?.userId === userId ? peopleCache.data : undefined;
};

export const resetIntentionsPrefetchCache = () => {
  intentionsCache = null;
  peopleCache = null;
};
