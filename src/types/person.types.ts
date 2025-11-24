// Discriminated union types for better type safety
export interface ContactPerson {
  type: 'contact';
  tempId: string; // Temporary ID for UI tracking
  contactId: string; // Original contact ID
  name: string;
  relationship: string | null;
  gender: string | null;
  image_uri: string | null;
  email: string | null;
  phoneNumber: string | null;
}

export interface SavedPerson {
  type: 'saved';
  id: string; // Database UUID - single source of truth
  contactId?: string; // Original contact ID if from contacts
  userId: string;
  name: string;
  relationship: string | null;
  gender: string | null;
  image_uri: string | null;
  email: string | null;
  phoneNumberHash: string | null;
}

// Union type
export type Person = ContactPerson | SavedPerson;

// Type guards
export const isSavedPerson = (person: Person): person is SavedPerson => {
  return person.type === 'saved';
};

export const isContactPerson = (person: Person): person is ContactPerson => {
  return person.type === 'contact';
};

// Safe ID getter - no fallback logic needed
export const getPersonId = (person: Person): string => {
  if (isSavedPerson(person)) {
    return person.id; // Always use database ID for saved persons
  }
  return person.tempId; // Use temp ID for unsaved contacts
};

// Get ID for database operations
export const getDatabaseId = (person: Person): string | null => {
  return isSavedPerson(person) ? person.id : null;
};

// Get display info
export const getPersonDisplayInfo = (person: Person) => {
  return {
    name: person.name,
    image_uri: person.image_uri,
    relationship: person.relationship,
  };
}; 