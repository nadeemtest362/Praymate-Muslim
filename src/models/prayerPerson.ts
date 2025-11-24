export interface PrayerPerson {
  id: string;
  dbId: string | null;
  user_id: string;
  name: string;
  relationship: string | null;
  gender: string | null;
  image_uri: string | null;
  email: string | null;
  phoneNumberHash: string | null;
}

export interface PrayerIntention {
  id: string;
  user_id: string;
  person_id: string | null;
  category: string;
  details: string | null;
  is_active: boolean;
  person?: PrayerPerson | null;
}
