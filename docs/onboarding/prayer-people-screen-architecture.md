# Prayer People Onboarding Screen Architecture & Flow

Complete documentation for the refactored prayer-people onboarding screen, covering component architecture, database operations, and data flow patterns.

## Component Architecture (Post-Refactoring)

### Main Orchestrator
- **`PrayerPeopleScreen.tsx`** - Main component that orchestrates the entire flow
  - Manages flow states: `'idle' | 'choice' | 'contacts' | 'manual' | 'miniProfile'`
  - Handles SDUI configuration parsing
  - Coordinates between UI components and business logic

### Extracted UI Components (`/components/`)
- **`FloatingParticles.tsx`** - Background particle animations
- **`EmptyStateGiant.tsx`** - Large tap-to-add state when no people added
- **`LoadingOverlay.tsx`** - Loading blur overlay with BlurView
- **`PeopleAvatarList.tsx`** - Horizontal scrollable list with remove buttons
- **`ManualAddFlow.tsx`** - Bottom sheet for manual relationship/name entry
- **`ContactMiniProfile.tsx`** - Contact relationship and pronoun selection
- **`ConfettiCelebration.tsx`** - Animation for reaching max people
- **`AddPersonChoiceModal.tsx`** - Choice between contacts vs manual add

### Business Logic Hook
- **`usePrayerPeopleManager.ts`** - All database operations and duplicate checking

### Data Structures
- **`relationshipData.ts`** - Relationship options and chip data

## Database Operations Flow

### 1. Adding a Person (`addPerson` in usePrayerPeopleManager)

```typescript
// Flow: UI Input → Duplicate Check → DB Insert → Store Update → Atomic Save

1. Validation & Limits
   - Check if at maxPeople limit
   - Check for duplicates (device_contact_id + name fallback)

2. Database Insert to `prayer_focus_people`
   - Fields: user_id, name, relationship, gender, image_uri, device_contact_id
   - Returns real database ID
   - Handles existing person detection

3. Background Image Upload (if provided)
   - Uses ArrayBuffer method (see supabase-storage-uploads rule)
   - Updates database with uploaded URI
   - Non-blocking operation

4. Store Updates
   - Add to prayerFocusPeople array with real DB ID
   - Call saveStateAtomically() for crash recovery
```

### 2. Removing a Person (`removePerson`)

```typescript
// Flow: User Action → DB Delete → Store Update → Atomic Save

1. Database Delete from `prayer_focus_people`
   - WHERE id = idToRemove AND user_id = current_user_id
   
2. Store Updates  
   - Filter person from prayerFocusPeople array
   - Call saveStateAtomically()
```

### 3. Duplicate Detection Logic

```typescript
// Priority: device_contact_id > case-insensitive name matching

function isPersonAlreadyAdded(identifier, currentPeople) {
  // 1. Check device_contact_id (if available and non-empty)
  if (identifier.device_contact_id?.trim()) {
    const existingByDeviceId = currentPeople.find(p => 
      p.device_contact_id === identifier.device_contact_id
    );
    if (existingByDeviceId) return existingByDeviceId;
  }
  
  // 2. Fallback to case-insensitive name check  
  const lname = identifier.name.trim().toLowerCase();
  return currentPeople.find(p => 
    p.name.trim().toLowerCase() === lname
  ) || null;
}
```

## Store Management (Zustand + Atomic Store)

### Onboarding Store Integration

```typescript
// Store Structure in onboardingStore.ts
interface OnboardingState {
  prayerFocusPeople: PrayerFocusPerson[];
  setPrayerFocusPeople: (people: PrayerFocusPerson[]) => void;
  // ... other fields
}

// Actions with Atomic Persistence
setPrayerFocusPeople: (people) => {
  set({ prayerFocusPeople: people });
  // Automatic atomic save for crash recovery
  get().saveStateAtomically().catch(error => {
    console.error('[OnboardingStore] Failed to save atomically:', error);
  });
}
```

### Atomic Store Mapping

```typescript
// Data transformation for atomic persistence
saveStateAtomically: async () => {
  const state = get();
  await AtomicDataStore.updateData((data) => ({
    ...data,
    prayerPeople: state.prayerFocusPeople.map(p => ({
      id: p.id,
      name: p.name,
      imageUri: p.imageUri || undefined,
      relationship: p.relationship || undefined, 
      gender: p.gender || undefined,
      device_contact_id: p.device_contact_id || undefined,
      phone_number_hash: p.phone_number_hash || undefined,
    })),
    // ... other mappings
  }));
}
```

## Flow States & Navigation

### State Machine
```typescript
type FlowState = 'idle' | 'choice' | 'contacts' | 'manual' | 'miniProfile';

// State Transitions:
'idle' → 'choice'        // User taps add button (no contacts permission)
'idle' → 'contacts'      // User taps add button (has contacts permission)  
'choice' → 'contacts'    // User chooses "From Contacts"
'choice' → 'manual'      // User chooses "Add Manually"
'contacts' → 'miniProfile' // User selects a contact
'contacts' → 'manual'    // User taps "Add Manually" in contacts picker
'*' → 'idle'            // After successful add or cancel
```

### Permission Handling
```typescript
// Smart permission flow in handleAddPerson()
const { status } = await Contacts.getPermissionsAsync();
if (status === 'granted') {
  setFlowState('contacts'); // Direct to contacts
} else {
  setFlowState('choice');   // Show choice modal first
}
```

## SDUI Configuration Structure

### Required Config Fields
```typescript
interface PrayerPeopleScreenConfig {
  maxPeople: number;
  title: string;
  subtitleTemplate: string; // Uses {maxPeople} placeholder
  
  alerts: {
    limitReachedTitle: string;
    limitReachedMessageTemplate: string; // Uses {maxPeople}
    addSomeoneFirstTitle: string;
    addSomeoneFirstMessage: string;
  };
  
  finalContinueButton: {
    text: string;
  };
  
  emptyState: {
    text: string;
  };
  
  peopleCollectionPhase: {
    encouragementMessageWhenMaxReached: {
      textTemplate: string; // Uses {count} placeholder
    };
  };
}
```

### Dynamic Text Generation
```typescript
// Template replacements happen in component
const subtitle = subtitleTemplate.replace('{maxPeople}', maxPeople.toString());
const encouragementText = encouragementMessage.textTemplate
  .replace('{count}', count.toString());
```

## UI Patterns & Responsive Design

### Universal Button Usage
```typescript
// Uses universal ContinueButton component with solid variant
<ContinueButton
  title={continueButtonText}
  onPress={handleContinue}
  disabled={isEmpty}
  variant="solid"      // Onboarding style (not gradient)
  showArrow={false}    // Clean look
/>
```

### Encouragement Messages
```typescript
// Dynamic messages based on count
const messages = {
  1: "add more people for an even more meaningful prayer experience",
  2: "building a beautiful prayer circle... maybe add one more?", 
  3+: "each person adds depth to your prayer time",
  max: encouragementText // From config
};
```

### Layout Structure
```typescript
// Main layout pattern for proper encouragement message display
<View style={styles.peopleWithEncouragement}>
  <View style={styles.avatarSection}>
    <PeopleAvatarList {...props} />
  </View>
  <View style={styles.encouragementContainer}>
    <Text style={styles.encouragementText}>
      {dynamicEncouragementMessage}
    </Text>
  </View>
</View>
```

## Error Handling & Debugging

### Debug Logging Pattern
```typescript
// Added comprehensive logging for debugging
console.log('[PrayerPeopleManager] Successfully added person:', {
  name: newPerson.name,
  dbId: newPerson.id,
  relationship: newPerson.relationship,
  gender: newPerson.gender,
  totalPeople: updatedList.length
});

console.log('[OnboardingStore] Updated prayer people count:', 
  people.length, people.map(p => ({ name: p.name, id: p.id }))
);
```

### Error Recovery Patterns
```typescript
// Proper error handling with user feedback
try {
  await addPerson(personData);
} catch (error) {
  // Error already handled in hook with Alert.alert()
  setFlowState('idle');
  setSelectedContact(null);
}
```

## Integration Points

### Contact System Integration
- Uses `expo-contacts` for device contact access
- Handles permission requests gracefully
- Maps contact data to person structure with proper field mapping

### Image Upload Integration  
- References supabase-storage-uploads patterns
- Background upload with database update
- Fallback handling for upload failures

### Onboarding Flow Integration
- Integrates with SDUI configuration system
- Follows universal onboarding navigation patterns
- Maintains state for crash recovery

## Key Learnings & Patterns

1. **Component Modularity**: Refactored from 2,697-line monolith to focused, single-responsibility components
2. **Universal UI Components**: Use `ContinueButton` with `variant="solid"` for consistent onboarding styling  
3. **Database-First IDs**: Always use real database IDs, not temporary client-side IDs
4. **Dual Persistence**: Both Zustand store (for UI) and Atomic store (for crash recovery)
5. **Responsive Border Radius**: Use `R.h(4)` for pill-shaped buttons that scale properly across devices
6. **Background Operations**: Image uploads happen asynchronously to avoid blocking user flow

## Files Changed During Refactoring

### Created Files
- `src/screens/onboarding/sdui_components/prayer-people/PrayerPeopleScreen.tsx`
- `src/screens/onboarding/sdui_components/prayer-people/hooks/usePrayerPeopleManager.ts`
- `src/screens/onboarding/sdui_components/prayer-people/components/` (8 component files)

### Modified Files
- `src/shared/ui/ContinueButton.tsx` - Added responsive design and solid variant
- `src/stores/onboardingStore.ts` - Enhanced logging and error handling
- `src/screens/onboarding/sdui_components/prayer-people.tsx` - Replaced with re-export

### Deleted Files
- Original 2,697-line `prayer-people.tsx` implementation
- 3 extracted utility files that were duplicated

## Performance Improvements

1. **Reduced Bundle Size**: Component splitting reduces initial load
2. **Better Memory Usage**: Smaller components with focused responsibilities
3. **Improved Debugging**: Clearer component hierarchy and logging
4. **Enhanced Maintainability**: Single-responsibility principle throughout 