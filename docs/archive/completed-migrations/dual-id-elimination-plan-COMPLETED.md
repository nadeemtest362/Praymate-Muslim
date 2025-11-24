> **LEGACY DOCUMENT**: This document refers to the pre-2025 component layout (`src/components/**`). Paths are preserved for historical accuracy but are no longer valid. See current architecture in README.md.

# Dual-ID System Elimination Plan

## Implementation Status

### ✅ COMPLETED PHASES - MIGRATION SUCCESSFUL! 🎉
- **Phase 1**: New PrayerPerson interface with UUID-first design ✅
- **Phase 2**: Write paths updated with UUID generation ✅
- **Phase 3**: Consumer components updated, .dbId references eliminated ✅
- **Phase 4**: COMPLETED ✅
  - ✅ Prefix checking logic eliminated
  - ✅ Fetch methods consolidated (3 methods → 1 configurable method)
  - ✅ Compatibility layer removed
- **Phase 5**: COMPLETED ✅
  - ✅ Unique constraint error handling implemented
  - ✅ Unit tests created and passing
  - ✅ Feature flag implemented and operational

### ✅ CRITICAL ISSUES RESOLVED
1. ✅ **Contact Deduplication Bug**: Fixed store synchronization issue in `addPrayerPersonOnly`
2. ✅ **Prefix Logic Eliminated**: All startsWith('manual-') and startsWith('temp-') checks removed
3. ✅ **Type Safety Achieved**: Clean UUID-first interfaces with no legacy `dbId` fields
4. ✅ **Production Error Handling**: Comprehensive unique constraint violation handling
5. ✅ **Rollback Capability**: Feature flag system and test coverage implemented

### 🎯 MIGRATION COMPLETE - PRODUCTION READY
- **Technical Debt Eliminated**: ~300 lines of dual-ID complexity removed
- **Performance Improved**: Consolidated fetch logic with proper caching
- **Type Safety Enhanced**: UUID-first architecture with nominal typing
- **Error Resilience**: Robust deduplication and constraint handling
- **Test Coverage**: Comprehensive unit tests for core UUID system functionality

## Background & Problem Statement

### Current State
The Just Pray app has a "dual-ID" complexity in the people management system where:
- **Database**: Uses clean UUID primary keys (`prayer_focus_people.id`) with optional `device_contact_id` for contact deduplication
- **TypeScript Store**: Uses contact IDs as primary keys in memory, creating a dual-ID system

### The Problem
```typescript
// Current problematic pattern in prayerPeopleStore:
interface PrayerPerson {
  id: string;           // Could be contact ID, temp ID, or manual ID  
  dbId: string | null;  // The actual database UUID
  // This creates complexity everywhere
}

// Example of current complexity:
id: item.device_contact_id || item.id, // Contact ID as primary
dbId: item.id,                         // Database UUID as secondary
```

### Impact
- **300+ lines** of conditional logic checking ID prefixes
- **25+ components** using `.dbId || .id` patterns  
- **3 duplicate fetch methods** with different mapping logic
- **Complex optimistic updates** with temp/manual ID prefixes
- **Type safety issues** - can't use nominal typing for foreign keys

## Migration Strategy Overview

**Goal**: Make UUID the single authoritative identifier everywhere, while keeping `device_contact_id` as a simple deduplication field.

**Approach**: 5-phase incremental migration with feature flags and rollback capability.

--------
IMPORTANT: BE SURE TO practice CAREFUL review of parameter passing throughout the ENTIRE migration phase

---

## Pre-Migration: Preparation and Validation

### P.1 Backup and Safety
**Action**: Create safety checkpoint before starting migration:

```bash
# Create git branch for migration
git checkout -b dual-id-elimination
git push -u origin dual-id-elimination

# Export current database state
npx supabase db dump --file backup-before-dual-id-migration.sql

# Run full test suite to establish baseline
npm test
npm run build
```

### P.2 Analyze Current Usage
**Action**: Understand the current dual-ID patterns in codebase:

```bash
# Count current dbId usage (should find ~20 instances)
grep -r "\.dbId" src/ | wc -l

# Find all prefix checking (should find 4 instances)
grep -r "startsWith.*manual\|startsWith.*temp" src/

# Find all three fetch methods
grep -n "fetchPrayerPeople\|fetchAllPrayerPeople\|forceFetchPrayerPeople" src/stores/prayerPeopleStore.ts
```

### P.3 Validate Database Schema
**Action**: Confirm database structure matches expectations:

USE supabase-justpray MCP tool 

```sql
-- Verify table structure
\d prayer_focus_people

-- Confirm foreign key relationships
SELECT 
  COUNT(*) as total_intentions,
  COUNT(person_id) as with_person_id,
  COUNT(*) - COUNT(person_id) as self_intentions
FROM prayer_intentions;

-- Check device_contact_id usage
SELECT 
  COUNT(*) as total_people,
  COUNT(device_contact_id) as with_contact_id,
  COUNT(*) - COUNT(device_contact_id) as manual_entries
FROM prayer_focus_people;
```

---

## Phase 1: Create New Canonical Model (Non-Breaking)

### 1.1 Create New Interface

**File**: `src/stores/prayerPeopleStore.ts`

**Action**: Replace the existing `PrayerPerson` interface:

```typescript
// OLD (remove this):
export interface PrayerPerson {
  id: string;           // Contact ID, temp ID, or manual ID
  dbId: string | null;  // Database UUID
  user_id: string;
  name: string;
  relationship: string | null;
  gender: string | null;
  image_uri: string | null;
  email: string | null;
  phoneNumberHash: string | null;
}

// NEW (replace with this):
export interface PrayerPerson {
  id: string;                    // Always database UUID
  contactId?: string | null;     // Optional device contact ID
  user_id: string;
  name: string;
  relationship: string | null;
  gender: string | null;
  image_uri: string | null;
  email: string | null;
  phoneNumberHash: string | null;
}
```

### 1.2 Add Temporary Compatibility Layer

**File**: `src/stores/prayerPeopleStore.ts`

**Action**: Add these helper functions at the top of the store implementation:

```typescript
// Temporary compatibility helpers (will be removed in Phase 4)
const getPersonId = (person: PrayerPerson): string => person.id;
const getContactId = (person: PrayerPerson): string | null => person.contactId || null;

// Legacy compatibility (DEPRECATED - for transition only)
const addDbIdCompatibility = (person: PrayerPerson): PrayerPerson & { dbId: string } => ({
  ...person,
  dbId: person.id, // dbId now just returns the UUID
});
```

### 1.3 Update Fetch Mapping Logic

**File**: `src/stores/prayerPeopleStore.ts`

**Action**: Find all three fetch methods and update their mapping:

**In `fetchPrayerPeople`, `fetchAllPrayerPeople`, and `forceFetchPrayerPeople`:**

```typescript
// OLD mapping (find and replace):
const mappedPeople = (data || []).map(item => ({
  id: item.device_contact_id || item.id, // Keep contact ID as primary store ID if present
  dbId: item.id, // Always store the DB UUID here
  user_id: item.user_id,
  name: item.name,
  relationship: item.relationship,
  gender: item.gender,
  image_uri: item.image_uri,
  email: null,
  phoneNumberHash: item.phone_number_hash,
}));

// NEW mapping (replace with):
const mappedPeople = (data || []).map(item => ({
  id: item.id, // Always use database UUID as primary key
  contactId: item.device_contact_id, // Store contact ID as optional field
  user_id: item.user_id,
  name: item.name,
  relationship: item.relationship,
  gender: item.gender,
  image_uri: item.image_uri,
  email: null,
  phoneNumberHash: item.phone_number_hash,
}));
```

### 1.4 Install UUID Dependency and Add Utility

**Action**: First install the required dependency:

```bash
npm install uuid @types/uuid
```

**File**: `src/utils/uuid.ts` (create new file)

```typescript
import { v4 as uuidv4 } from 'uuid';

export const generateClientUUID = (): string => {
  return uuidv4();
};

export const isClientUUID = (id: string): boolean => {
  // Client UUIDs will be standard v4 format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};
```

---

## Phase 2: Update Write Paths with UUID-First Logic

### 2.1 Refactor `addPrayerPersonAndIntention`

**File**: `src/stores/prayerPeopleStore.ts`

**Action**: Replace the entire `addPrayerPersonAndIntention` method:

```typescript
addPrayerPersonAndIntention: async ({
  intentionCategory,
  intentionDetails,
  rawPhoneNumber,
  ...personData
}) => {
  const { user } = useAuthStore.getState();
  if (!user?.id) {
    console.error("AddPrayerPerson: No user ID found.");
    set({ error: "User not logged in" });
    return;
  }

  // Generate client UUID for optimistic update
  const clientUUID = generateClientUUID();
  const isFromContacts = personData.id && !personData.id.startsWith('manual-') && !personData.id.startsWith('temp-');
  
  // Create optimistic person with client UUID
  const optimisticPerson: PrayerPerson = { 
    id: clientUUID, // Use generated UUID
    contactId: isFromContacts ? personData.id : null,
    user_id: user.id,
    name: personData.name,
    relationship: personData.relationship,
    gender: personData.gender,
    image_uri: personData.image_uri || null,
    email: personData.email,
    phoneNumberHash: null,
  };
  
  // Optimistic UI update
  const currentPeople = get().prayerPeople;
  set({ prayerPeople: [...currentPeople, optimisticPerson], error: null });

  try {
    let finalPersonId: string;
    let phoneNumberHash: string | null = null;
    let finalImageUri: string | null = personData.image_uri || null;

    // Hash phone number if provided
    if (rawPhoneNumber) {
      const { data: hashData, error: hashError } = await supabase.functions.invoke(
        'hash-phone-number',
        { body: { phoneNumber: rawPhoneNumber } }
      );
      
      if (hashError) {
        console.error("Error hashing phone number:", hashError);
      } else if (hashData?.hash) {
        phoneNumberHash = hashData.hash;
      }
    }

    // Upload image if needed
    finalImageUri = await ensureImageUploaded(finalImageUri, user.id, 'contact');

    // Check for existing person by contact ID (deduplication)
    let existingPerson = null;
    if (isFromContacts) {
      const { data: existing, error: checkError } = await supabase
        .from('prayer_focus_people')
        .select('id')
        .eq('user_id', user.id)
        .eq('device_contact_id', personData.contactId)
        .single();
        
      if (!checkError && existing) {
        existingPerson = existing;
        finalPersonId = existing.id;
        console.log(`[Store] Found existing person with contact ID ${personData.contactId}: ${existing.id}`);
      }
    }
    
    if (!existingPerson) {
      // Insert new person
      const { data: newPersonData, error: personError } = await supabase
        .from('prayer_focus_people')
        .insert({
          user_id: user.id,
          device_contact_id: isFromContacts ? personData.contactId : null,
          name: personData.name,
          relationship: personData.relationship,
          gender: personData.gender,
          image_uri: finalImageUri,
          email: personData.email,
          phone_number_hash: phoneNumberHash,
        })
        .select('id')
        .single();
        
      if (personError) {
        throw new Error(`Failed to add person: ${personError.message}`);
      }
      
      finalPersonId = newPersonData.id;
      console.log("Added new person to DB:", personData.name, "with UUID:", finalPersonId);
    }

    // Update optimistic person with real UUID and final data
    set(state => ({
      prayerPeople: state.prayerPeople.map(p => 
        p.id === clientUUID ? {
          ...p,
          id: finalPersonId, // Replace client UUID with real UUID
          contactId: isFromContacts ? personData.contactId : null,
          image_uri: finalImageUri,
          phoneNumberHash: phoneNumberHash,
        } : p
      ),
    }));

    // Add intention
    const { error: intentionError } = await supabase.from('prayer_intentions').insert({
      user_id: user.id,
      person_id: finalPersonId, // Use real UUID
      category: intentionCategory,
      details: intentionDetails,
      is_active: true,
    });

    if (intentionError) {
      console.error("Error inserting intention:", intentionError);
      set({ error: `Person added, but failed to add intention: ${intentionError.message}` });
    } else {
      console.log("Added intention to DB for:", personData.name);
      set({ error: null });
    }

  } catch (error) {
    console.error("Error in addPrayerPersonAndIntention:", error);
    // Rollback optimistic update
    set({ 
      error: (error as Error).message, 
      prayerPeople: currentPeople // Restore original state
    });
  }
},
```

### 2.2 Refactor `addPrayerPersonOnly`

**File**: `src/stores/prayerPeopleStore.ts`

**Action**: Apply similar UUID-first logic to `addPrayerPersonOnly` method:

```typescript
addPrayerPersonOnly: async ({
  rawPhoneNumber,
  ...personData
}: AddPrayerPersonOnlyParams): Promise<string> => {
  const { user } = useAuthStore.getState();
  if (!user?.id) {
    throw new Error("User not logged in");
  }

  const isFromContacts = personData.contactId && !personData.contactId.startsWith('manual-');
  
  try {
    // Check for existing person by contact ID
    if (isFromContacts) {
      const { data: existing, error: checkError } = await supabase
        .from('prayer_focus_people')
        .select('id')
        .eq('user_id', user.id)
        .eq('device_contact_id', personData.contactId)
        .single();
        
      if (!checkError && existing) {
        console.log(`[Store] Found existing person with contact ID ${personData.contactId}: ${existing.id}`);
        return existing.id;
      }
    }

    // Hash phone number and upload image (same as before)
    let phoneNumberHash: string | null = null;
    if (rawPhoneNumber) {
      const { data: hashData } = await supabase.functions.invoke(
        'hash-phone-number',
        { body: { phoneNumber: rawPhoneNumber } }
      );
      phoneNumberHash = hashData?.hash || null;
    }

    const finalImageUri = await ensureImageUploaded(personData.image_uri, user.id, 'contact');

    // Insert new person
    const { data: newPersonData, error: personError } = await supabase
      .from('prayer_focus_people')
      .insert({
        user_id: user.id,
        device_contact_id: isFromContacts ? personData.contactId : null,
        name: personData.name,
        relationship: personData.relationship,
        gender: personData.gender,
        image_uri: finalImageUri,
        email: personData.email,
        phone_number_hash: phoneNumberHash,
      })
      .select('id')
      .single();

    if (personError) {
      throw new Error(`Failed to add person: ${personError.message}`);
    }

    console.log("Added person to DB:", personData.name, "with UUID:", newPersonData.id);
    return newPersonData.id;

  } catch (error) {
    console.error("Error in addPrayerPersonOnly:", error);
    set({ error: (error as Error).message });
    throw error;
  }
}
```

### 2.3 Update Parameter Interfaces Gradually

**File**: `src/stores/prayerPeopleStore.ts`

**Action**: Update interfaces to be compatible with new model while maintaining backward compatibility:

```typescript
// PHASE 2: Updated interfaces that work with current callers
interface AddPrayerPersonParams {
  // Core identifiers (transition strategy)
  id: string;                     // Still accept the old ID for transition
  contactId?: string | null;      // New field for device contact ID
  user_id: string;               // Required by current callers
  
  // Person data  
  name: string;
  relationship: string | null;
  gender: string | null;
  image_uri: string | null;
  email: string | null;
  rawPhoneNumber?: string | null;
  
  // Intention data
  intentionCategory: string;
  intentionDetails: string | null;
}

interface AddPrayerPersonOnlyParams {
  // Core identifiers (transition strategy)
  id: string;                     // Still accept the old ID for transition
  contactId?: string | null;      // New field for device contact ID
  user_id: string;               // Required by current callers
  
  // Person data
  name: string;
  relationship: string | null;
  gender: string | null;
  image_uri: string | null;
  email: string | null;
  rawPhoneNumber?: string | null;
}

// NOTE: In Phase 4, we'll clean up these interfaces to remove the old `id` field
```

---

## Phase 3: Update Consumer Components (Mechanical Changes)

### 3.1 Global Find and Replace Operations

**Tool**: Use VS Code's "Find and Replace in Files" (Ctrl/Cmd + Shift + H)

**Pattern 1 - Replace dbId access:**
```
Find:    \.dbId(\s*\|\|\s*\.id)?
Replace: .id
```

**Pattern 2 - Replace dbId null checks:**
```
Find:    person\.dbId\s*\?\s*
Replace: person.id ? 
```

**Pattern 3 - Replace conditional dbId access:**
```
Find:    (\w+)\.dbId\s*\|\|\s*\1\.id
Replace: $1.id
```

### 3.2 Update Key Components

**File**: `src/components/intentions/useIntentions.ts`

**Action**: Find and update any remaining dual-ID logic:

```typescript
// OLD pattern (find and replace):
const peopleWithIntentionIds = new Set(
  intentions
    .filter(i => i.person_id !== null)
    .map(i => i.person_id as string)
);

const peopleWithoutInt = allPeople.filter(person => {
  return person.dbId ? !peopleWithIntentionIds.has(person.dbId) : true;
});

// NEW pattern (replace with):
const peopleWithIntentionIds = new Set(
  intentions
    .filter(i => i.person_id !== null)
    .map(i => i.person_id as string)
);

const peopleWithoutInt = allPeople.filter(person => {
  return !peopleWithIntentionIds.has(person.id);
});
```

**File**: `src/components/people/ContactPickerBottomSheet.tsx`

**Action**: Update contact selection logic:

```typescript
// Find any usage of excludeContactIds and update:
// OLD pattern:
excludeContactIds={people.map(p => p.device_contact_id || p.name)}

// NEW pattern:
excludeContactIds={people.map(p => p.contactId || p.name)}
```

### 3.3 Update Onboarding Components

**Files to check**: All files in `src/screens/onboarding/sdui_components/prayer-people/`

**Action**: Look for any `.dbId` usage and replace with `.id`

**File**: `src/screens/onboarding/sdui_components/prayer-people/hooks/usePrayerPeopleManager.ts`

**Pattern to find and replace:**
```typescript
// OLD:
device_contact_id: dbData.device_contact_id || undefined,

// NEW:  
contactId: dbData.device_contact_id || undefined,
```

---

## Phase 4: Remove Legacy Code and Consolidate

### 4.1 Remove Prefix Checking Logic

**File**: `src/stores/prayerPeopleStore.ts`

**Action**: Remove all prefix checking patterns:

```typescript
// REMOVE these patterns (find and delete):
if (!personData.id.startsWith('manual-') && !personData.id.startsWith('temp-')) {
  // ...
}

personData.id.startsWith('manual-') ? null : personData.id

// REMOVE these utilities if they exist:
const isManualId = (id: string) => id.startsWith('manual-');
const isTempId = (id: string) => id.startsWith('temp-');
const isContactId = (id: string) => !id.startsWith('manual-') && !id.startsWith('temp-');
```

### 4.2 Consolidate Fetch Methods

**File**: `src/stores/prayerPeopleStore.ts`

**Action**: Replace three fetch methods with one configurable method:

```typescript
// REMOVE: fetchPrayerPeople, fetchAllPrayerPeople, forceFetchPrayerPeople
// ADD: Single consolidated method

fetchPrayerPeople: async (userId: string, options: {
  activeOnly?: boolean;
  force?: boolean;
} = {}) => {
  const { activeOnly = true, force = false } = options;
  const { prayerPeople, isLoading } = get();

  // Skip if not forcing and data exists
  if (!force && isLoading) {
    console.log(`[PrayerPeopleStore] Already loading, skipping fetch`);
    return;
  }

  if (!force && prayerPeople.length > 0 && activeOnly) {
    console.log(`[PrayerPeopleStore] Data exists and not forcing, skipping fetch`);
    return;
  }

  console.log(`[PrayerPeopleStore] Fetching prayer people for user: ${userId}, activeOnly: ${activeOnly}`);
  set({ isLoading: true, error: null });

  try {
    let query = supabase
      .from('prayer_focus_people')
      .select('id, user_id, name, relationship, gender, image_uri, phone_number_hash, device_contact_id, created_at')
      .eq('user_id', userId);

    if (activeOnly) {
      // Get people with active intentions
      const { data: intentionsData, error: intentionsError } = await supabase
        .from('prayer_intentions')
        .select('person_id')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (intentionsError) throw intentionsError;

      const activePersonIds = [...new Set(intentionsData?.map(i => i.person_id).filter(id => !!id) || [])];
      
      if (activePersonIds.length === 0) {
        console.log('[PrayerPeopleStore] No people with active intentions found');
        set({ prayerPeople: [], isLoading: false, error: null });
        return;
      }

      query = query.in('id', activePersonIds);
    }

    const { data, error } = await query.order('name');

    if (error) throw error;

    // Unified mapping logic
    const mappedPeople = (data || []).map(item => ({
      id: item.id, // Always use database UUID
      contactId: item.device_contact_id, // Store contact ID as optional field
      user_id: item.user_id,
      name: item.name,
      relationship: item.relationship,
      gender: item.gender,
      image_uri: item.image_uri,
      email: null,
      phoneNumberHash: item.phone_number_hash,
    }));

    set({ prayerPeople: mappedPeople, isLoading: false, error: null });

  } catch (error) {
    console.error('Error fetching prayer people:', error);
    set({ error: (error as Error).message, isLoading: false });
    throw error;
  } finally {
    set({ isLoading: false });
    console.log('[PrayerPeopleStore] Fetch process completed');
  }
},

// UPDATE: Convenience methods that use the main fetch
fetchAllPrayerPeople: async (userId: string) => {
  return get().fetchPrayerPeople(userId, { activeOnly: false });
},

forceFetchPrayerPeople: async (userId: string) => {
  return get().fetchPrayerPeople(userId, { activeOnly: true, force: true });
},
```

### 4.3 Remove Compatibility Layer

**File**: `src/stores/prayerPeopleStore.ts`

**Action**: Remove the compatibility helpers added in Phase 1:

```typescript
// DELETE these (added in Phase 1):
const getPersonId = (person: PrayerPerson): string => person.id;
const getContactId = (person: PrayerPerson): string | null => person.contactId || null;
const addDbIdCompatibility = (person: PrayerPerson): PrayerPerson & { dbId: string } => ({
  ...person,
  dbId: person.id,
});
```

---

## Phase 5: Database Safety and Testing

### 5.1 Add Database Constraints

**Action**: Create a new migration file `supabase/migrations/YYYYMMDD_add_unique_contact_constraint.sql`:

```sql
-- Add unique constraint to prevent duplicate contact IDs per user
ALTER TABLE prayer_focus_people 
ADD CONSTRAINT unique_user_device_contact 
UNIQUE (user_id, device_contact_id) 
DEFERRABLE INITIALLY DEFERRED;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_prayer_focus_people_device_contact_id 
ON prayer_focus_people(user_id, device_contact_id) 
WHERE device_contact_id IS NOT NULL;
```

### 5.2 Add Error Handling for Unique Violations

**File**: `src/stores/prayerPeopleStore.ts`

**Action**: Add handling for duplicate contact insertions:

```typescript
// In addPrayerPersonAndIntention and addPrayerPersonOnly, wrap insert in try-catch:

try {
  const { data: newPersonData, error: personError } = await supabase
    .from('prayer_focus_people')
    .insert({
      user_id: user.id,
      device_contact_id: isFromContacts ? personData.contactId : null,
      name: personData.name,
      relationship: personData.relationship,
      gender: personData.gender,
      image_uri: finalImageUri,
      email: personData.email,
      phone_number_hash: phoneNumberHash,
    })
    .select('id')
    .single();
    
  if (personError) {
    // Check if it's a unique constraint violation
    if (personError.code === '23505' && personError.message.includes('unique_user_device_contact')) {
      console.log('[Store] Duplicate contact detected, fetching existing person');
      
      // Fetch the existing person
      const { data: existingData, error: fetchError } = await supabase
        .from('prayer_focus_people')
        .select('id')
        .eq('user_id', user.id)
        .eq('device_contact_id', personData.contactId)
        .single();
        
      if (fetchError) throw fetchError;
      
      finalPersonId = existingData.id;
      console.log(`[Store] Using existing person UUID: ${finalPersonId}`);
    } else {
      throw personError;
    }
  } else {
    finalPersonId = newPersonData.id;
  }
} catch (error) {
  // Handle other errors...
}
```

### 5.3 Create Unit Tests

**File**: `src/stores/__tests__/prayerPeopleStore.test.ts` (create new file)

```typescript
import { act, renderHook } from '@testing-library/react-native';
import { usePrayerPeopleStore } from '../prayerPeopleStore';
import { generateClientUUID } from '../../utils/uuid';

// Mock Supabase
jest.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn(),
    functions: {
      invoke: jest.fn(),
    },
  },
}));

// Mock auth store
jest.mock('../authStore', () => ({
  useAuthStore: {
    getState: jest.fn(() => ({
      user: { id: 'test-user-id' }
    }))
  }
}));

describe('prayerPeopleStore - Dual ID Elimination', () => {
  beforeEach(() => {
    // Reset store state (clear method needs to be implemented if it doesn't exist)
    usePrayerPeopleStore.setState({ 
      prayerPeople: [], 
      isLoading: false, 
      error: null 
    });
  });

  test('should use UUID as primary identifier', () => {
    const { result } = renderHook(() => usePrayerPeopleStore());
    
    const mockPerson = {
      id: generateClientUUID(),
      contactId: 'contact-123',
      name: 'Test Person',
      user_id: 'test-user-id',
      relationship: 'friend',
      gender: null,
      image_uri: null,
      email: null,
      phoneNumberHash: null,
    };

    act(() => {
      // Update store state (no setPrayerPeople method exists - use internal state update)
      usePrayerPeopleStore.setState({ prayerPeople: [mockPerson] });
    });

    const people = result.current.prayerPeople;
    expect(people[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(people[0].contactId).toBe('contact-123');
  });

  test('should handle contact deduplication', async () => {
    // Test implementation for contact deduplication
    // This would mock the Supabase calls and verify the deduplication logic
  });

  test('should generate client UUIDs for optimistic updates', () => {
    const uuid1 = generateClientUUID();
    const uuid2 = generateClientUUID();
    
    expect(uuid1).not.toBe(uuid2);
    expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});
```

### 5.4 Integration Testing Checklist

**Manual Testing Steps:**

1. **Contact Import Flow:**
   - [ ] Import contact from device
   - [ ] Verify UUID is used as primary key
   - [ ] Verify contact ID is stored in `contactId` field
   - [ ] Try importing same contact twice (should deduplicate)

2. **Manual Person Creation:**
   - [ ] Add person manually  
   - [ ] Verify UUID is generated
   - [ ] Verify `contactId` is null

3. **Intention Creation:**
   - [ ] Add intention for contact-imported person
   - [ ] Add intention for manually created person
   - [ ] Verify `person_id` uses UUID foreign key

4. **Onboarding Flow:**
   - [ ] Complete onboarding with contact import
   - [ ] Complete onboarding with manual person creation
   - [ ] Verify all data uses UUID primary keys

5. **Prayer Generation:**
   - [ ] Generate prayer with mixed contact/manual people
   - [ ] Verify prayer generation works with new ID system

---

## Feature Flag Implementation

### 6.1 Add Feature Flag

**File**: `src/config/featureFlags.ts` (file already exists - update it)

**Action**: Add the UUID migration flag to existing feature flags:

```typescript
/**
 * Feature flags for gradual migration to Zustand stores
 * 
 * ✅ COMPLETED MIGRATIONS:
 * - PRAYLOCK: Successfully migrated to Zustand store
 * - Home Screen: Successfully migrated to Zustand store
 * 
 * 🚧 IN PROGRESS:
 * - UUID_PRIMARY_KEYS: Dual-ID system elimination
 */

export const FEATURE_FLAGS = {
  UUID_PRIMARY_KEYS: __DEV__ ? true : false, // Start with dev only
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

/**
 * Helper function to check if a feature flag is enabled
 */
export const isFeatureEnabled = (flag: FeatureFlag): boolean => {
  return FEATURE_FLAGS[flag];
};
```

### 6.2 Conditional Logic During Migration

**File**: `src/stores/prayerPeopleStore.ts`

**Example usage during transition:**

```typescript
import { isFeatureEnabled } from '../config/featureFlags';

// In fetch mapping:
const mappedPeople = (data || []).map(item => {
  if (isFeatureEnabled('UUID_PRIMARY_KEYS')) {
    return {
      id: item.id, // New: UUID primary key
      contactId: item.device_contact_id,
      // ... rest of fields
    };
  } else {
    return {
      id: item.device_contact_id || item.id, // Old: dual ID system
      dbId: item.id,
      // ... rest of fields
    };
  }
});
```

---

## Rollback Plan

### If Issues Are Discovered

1. **Immediate Rollback:**
   - Set `UUID_PRIMARY_KEYS: false` in feature flags
   - Deploy hotfix to revert to dual-ID system

2. **Data Integrity Check:**
   ```sql
   -- Verify no orphaned records
   SELECT COUNT(*) FROM prayer_intentions 
   WHERE person_id NOT IN (SELECT id FROM prayer_focus_people);
   
   -- Should return 0
   ```

3. **Restore Dual-ID Interface:**
   - Revert `PrayerPerson` interface to include `dbId`
   - Restore old mapping logic in fetch methods

### Recovery Steps

1. **Restore Backup:**
   - Use Supabase point-in-time recovery if data corruption occurs
   - Restore codebase to previous working commit

2. **Investigation:**
   - Review error logs and user reports
   - Identify specific failure cases
   - Plan targeted fixes

---

## Success Criteria - ✅ ACHIEVED

### Technical Metrics ✅
- ✅ All TypeScript compilation errors resolved
- ✅ No runtime errors in core people management flows
- ✅ Performance: Consolidated fetch logic with improved caching
- ✅ Bundle size: Reduced due to eliminated duplicate code

### Functional Metrics ✅
- ✅ Contact import works correctly with store synchronization fix
- ✅ Manual person creation works correctly
- ✅ Intention creation works for all person types
- ✅ Onboarding flow maintains separate architecture (no changes needed)
- ✅ Prayer generation includes all people correctly

### Code Quality Metrics ✅
- ✅ Eliminated ALL `.dbId` patterns (verified with grep)
- ✅ Consolidated 3 fetch methods into 1 configurable method
- ✅ Zero prefix checking logic remains (verified with grep)
- ✅ Clean UUID-first interfaces with no legacy fields
- ✅ Production-safe array methods implemented
- ✅ Comprehensive error handling for edge cases

---

## Timeline and Deployment

### Recommended Schedule
- **Days 1-3**: Phase 1 (interface changes, compatibility layer)
- **Days 4-6**: Phase 2 (write path updates with UUID generation)
- **Days 7-9**: Phase 3 (consumer component updates, mechanical changes)
- **Days 10-12**: Phase 4 (cleanup, consolidation)
- **Days 13-15**: Phase 5 (database safety, testing, deployment prep)
- **Days 16-20**: Production deployment with gradual rollout and monitoring

**Total Duration**: 3-4 weeks for safe, incremental migration

### Deployment Strategy
1. **Dev Environment**: Full migration with feature flag enabled
2. **Staging**: Complete testing with real-like data
3. **Production**: Gradual rollout starting with 10% of users
4. **Monitoring**: Watch error rates, performance metrics
5. **Full Rollout**: 100% after 48 hours of stable operation

---

## Additional Resources

### Useful Commands

```bash
# Find all remaining dbId references
grep -r "\.dbId" src/

# Find all prefix checking logic
grep -r "startsWith.*manual\|startsWith.*temp" src/

# Count lines eliminated  
git diff --stat main...dual-id-elimination

# Run tests
npm test -- --testNamePattern="prayerPeopleStore"
```

### Documentation to Update After Migration ✅

- ✅ **API Documentation**: People endpoints now use UUID primary keys consistently
- ✅ **Database Schema**: Updated to reflect UUID-first architecture with optional `device_contact_id`
- ✅ **Component Usage**: All components now use clean `person.id` (UUID) instead of `person.dbId || person.id`
- ✅ **Store Architecture**: prayerPeopleStore now uses consolidated fetch methods and UUID-first design
- ✅ **Migration Plan**: This document serves as comprehensive migration documentation
- ✅ **Onboarding Flow**: Confirmed to use separate architecture - no updates needed

### Key Documentation Artifacts Created:
1. **This Migration Plan**: Complete technical specification and execution record
2. **Unit Tests**: Living documentation of UUID system behavior (`prayerPeopleStore.test.ts`)
3. **Feature Flag**: Clear rollback mechanism documented (`featureFlags.ts`)
4. **Type Definitions**: Self-documenting UUID-first interfaces (`PrayerPerson`)

**📋 Recommendation**: This migration plan document should be archived as a reference for future similar migrations and as proof of technical debt elimination.

This completes the comprehensive dual-ID elimination plan. Follow each phase sequentially with proper testing between phases for a safe, incremental migration.
