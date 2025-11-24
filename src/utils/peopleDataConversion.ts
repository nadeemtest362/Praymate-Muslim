import type { PrayerPerson } from '../models/prayerPerson';

// Onboarding interface (from onboardingStore.ts)
export interface PrayerFocusPerson {
  id: string;
  name: string;
  image_uri?: string;
  relationship?: string;
  gender?: string;
  device_contact_id?: string | null;
  phone_number_hash?: string;
}

/**
 * Convert onboarding person format to main PrayerPerson format
 * Handles field name mapping and required field population
 */
export function onboardingToMainPerson(
  onboardingPerson: PrayerFocusPerson, 
  userId: string
): PrayerPerson {
  return {
    id: onboardingPerson.id,
    dbId: null, // Will be set after DB save
    user_id: userId,
    name: onboardingPerson.name,
    relationship: onboardingPerson.relationship || null,
    gender: onboardingPerson.gender || null,
    image_uri: onboardingPerson.image_uri || null,
    email: null, // Not captured during onboarding
    phoneNumberHash: onboardingPerson.phone_number_hash || null, // Field name mapping
  };
}

/**
 * Convert multiple onboarding people to main store format
 */
export function convertOnboardingPeopleList(
  onboardingPeople: PrayerFocusPerson[], 
  userId: string
): PrayerPerson[] {
  return onboardingPeople
    .filter(person => person && person.id && person.name) // Ensure valid data
    .map(person => onboardingToMainPerson(person, userId));
}

/**
 * Validate onboarding person data before conversion
 */
export function validateOnboardingPerson(person: any): person is PrayerFocusPerson {
  return (
    person &&
    typeof person.id === 'string' &&
    person.id.length > 0 &&
    typeof person.name === 'string' &&
    person.name.trim().length > 0
  );
}
