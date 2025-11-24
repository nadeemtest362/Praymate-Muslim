export interface PrayerIntention {
  id: string;
  user_id: string;
  person_id: string | null;
  category: string;
  details: string | null;
  is_active: boolean;
  created_at: string;
  person?: {
    id: string;
    name: string;
    image_uri: string | null;
    relationship: string | null;
  };
}

export interface PersonGroupType {
  id: string;
  name: string;
  avatar: string | null;
  intentions: PrayerIntention[];
}

export interface PersonWithoutIntention {
  id: string;
  name: string;
  image_uri: string | null;
}

// Utility function to get the proper ID for navigation
// With UUID-first migration, always use the id field
export const getPersonNavigationId = (person: { id: string }): string => {
  return person.id;
}; 