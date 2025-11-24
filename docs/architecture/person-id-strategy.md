# Person ID Strategy

## Problem
The current codebase mixes contact IDs and database IDs in the `PrayerPerson` type, leading to:
- Confusion about which ID to use (`id` vs `dbId`)
- Fallback logic scattered throughout the codebase (`dbId || id`)
- Type unsafety and potential bugs

## Solution: Discriminated Union Types

### 1. Clear Type Separation
```typescript
// Contact from device (not yet saved)
interface ContactPerson {
  type: 'contact';
  tempId: string;
  contactId: string;
  // ... other fields
}

// Person saved in database
interface SavedPerson {
  type: 'saved';
  id: string; // Database UUID only
  contactId?: string; // Optional reference
  // ... other fields
}

type Person = ContactPerson | SavedPerson;
```

### 2. Type-Safe Operations
```typescript
// No more dbId || id fallbacks!
const getPersonId = (person: Person): string => {
  if (person.type === 'saved') {
    return person.id; // Always the database ID
  }
  return person.tempId; // Temporary ID for UI
};
```

### 3. Usage in Components
```typescript
// In IntentionsScreen
const handleAddIntention = (person: Person) => {
  if (isSavedPerson(person)) {
    router.push({
      pathname: '/add-intention',
      params: { personId: person.id }
    });
  } else {
    // Handle unsaved contact flow
    router.push({
      pathname: '/add-intention',
      params: { 
        contactId: person.contactId,
        contactName: person.name,
        // ... other contact data
      }
    });
  }
};
```

### 4. Store Architecture
```typescript
// Better store design
interface PrayerPeopleStore {
  savedPeople: SavedPerson[];
  pendingContacts: ContactPerson[];
  
  // Clear methods
  addContactPerson(contact: ContactData): void;
  saveContactAsPerson(tempId: string): Promise<SavedPerson>;
  updateSavedPerson(id: string, updates: Partial<SavedPerson>): Promise<void>;
}
```

## Benefits
1. **Type Safety**: TypeScript catches ID mismatches at compile time
2. **Clarity**: No confusion about which ID to use
3. **Single Source of Truth**: Database ID is always `id` for saved persons
4. **No Fallback Logic**: Each type has its own clear ID field
5. **Better Developer Experience**: Autocomplete shows correct fields

## Migration Strategy
1. Create new types alongside existing ones
2. Add utility functions for conversion
3. Gradually migrate components to use new types
4. Remove old `PrayerPerson` type once migration complete 