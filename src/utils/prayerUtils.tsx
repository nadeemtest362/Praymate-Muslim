import { Text } from 'react-native';
import React from 'react';

export interface PrayerPerson {
  id: string;
  name: string;
  image_uri?: string | null; // Database path or resolved URL
  relationship?: string | null;
  gender?: string | null;
}

export interface PrayerIntention {
  id: string;
  person_id: string | null;
  category: string;
  details: string;
  is_active: boolean;
  prayer_focus_people?: PrayerPerson;
  // Recent snapshots (especially onboarding) sometimes use `person`
  person?: PrayerPerson;
}

export interface InputSnapshot {
  source?: string;
  clientSnapshot?: any;
  fetchedIntentionsForPrompt?: PrayerIntention[];
  activeIntentions?: PrayerIntention[];
  dbProfileMoodAtGeneration?: string;
  slot?: string;
  // Legacy fields from older prayers
  inputSnapshotForDB?: any;
  modelKnowledge?: any;
  // Some edge responses stuff nests in modelKnowledge.modelKnows.activeIntentions
  modelKnows?: {
    activeIntentions?: PrayerIntention[];
  };
}

/**
 * Extract prayer people from the input_snapshot
 */
export function extractPeopleFromSnapshot(inputSnapshot: InputSnapshot | null): PrayerPerson[] {
  if (!inputSnapshot) return [];
  
  const people: PrayerPerson[] = [];
  const seenIds = new Set<string>();
  const seenNames = new Set<string>(); // Track by name too for better deduplication

  // Helper function to add a person if not already seen
  const addPerson = (rawPerson: any) => {
    if (!rawPerson || !rawPerson.name) {
      return;
    }

    const normalized: PrayerPerson = {
      id: rawPerson.id || `temp_${rawPerson.name}`,
      name: rawPerson.name,
      image_uri: rawPerson.image_uri ?? rawPerson.imageUri ?? null,
      relationship: rawPerson.relationship ?? null,
      gender: rawPerson.gender ?? null,
    };

    const uniqueKey = normalized.id || normalized.name.toLowerCase().trim();
    const nameKey = normalized.name.toLowerCase().trim();

    if (seenIds.has(uniqueKey) || seenNames.has(nameKey)) {
      return;
    }

    seenIds.add(uniqueKey);
    seenNames.add(nameKey);
    people.push(normalized);
  };

  // Only extract from ACTIVE intentions - these are the people actually prayed for
  const activeBuckets: (PrayerIntention[] | undefined)[] = [
    inputSnapshot.activeIntentions,
    inputSnapshot.fetchedIntentionsForPrompt,
    inputSnapshot.inputSnapshotForDB?.fetchedIntentionsForPrompt,
    inputSnapshot.modelKnows?.activeIntentions,
  ];

  activeBuckets.forEach(bucket => {
    if (!bucket?.length) return;
    bucket.forEach((intention) => {
      addPerson(intention?.prayer_focus_people);
      addPerson((intention as any)?.person);
    });
  });

  // NOTE: We intentionally DO NOT extract from detailedChangesContext
  // as those contain intentions that were toggled off and not included in the prayer

  return people;
}

/**
 * Extract first name from full name, handling emojis and suffixes
 */
function getFirstName(fullName: string): string {
  if (!fullName) return '';
  
  // If it starts with an emoji, return as is
  if (/\p{Emoji}/u.test(Array.from(fullName.trim())[0] || '')) {
    return fullName;
  }
  
  // Split by spaces and get the first part
  const parts = fullName.trim().split(' ');
  return parts[0] || fullName;
}

/**
 * Determine if we should use full name or first name for matching
 * Returns the name to use for regex matching
 */
const FULL_NAME_PREFIXES = new Set([
  'my',
  'mine',
  'your',
  'yours',
  'our',
  'ours',
  'his',
  'her',
  'hers',
  'their',
  'theirs',
  'them',
  'they',
  'you',
  'yall',
  'ya',
  'pastor',
  'reverend',
  'rev',
  'bishop',
  'elder',
  'minister',
  'father',
  'mother',
  'mom',
  'mum',
  'mama',
  'momma',
  'dad',
  'daddy',
  'papa',
  'grandma',
  'grandpa',
  'grandmother',
  'grandfather',
  'grandmom',
  'granddad',
  'grandad',
  'uncle',
  'aunt',
  'brother',
  'sister',
  'coach',
  'teacher',
  'professor',
  'doctor',
  'dr',
  'mr',
  'mrs',
  'ms',
]);

function getNameForMatching(fullName: string): string {
  if (!fullName) return '';
  
  const trimmedName = fullName.trim();
  
  // If it starts with an emoji, return as is
  if (/\p{Emoji}/u.test(Array.from(trimmedName)[0] || '')) {
    return trimmedName;
  }
  
  // Common articles that shouldn't be used alone for matching
  const commonArticles = ['the', 'a', 'an'];
  
  // Get first word
  const parts = trimmedName.split(/\s+/);
  const firstWordOriginal = parts[0] || '';
  const firstWord = firstWordOriginal.toLowerCase();
  const normalizedFirstWord = firstWord.replace(/[^a-z]/g, '');
  
  // If name starts with a common article, use the full name to avoid false matches
  // e.g., "the Chapel" should match "the Chapel" not every "the"
  if (commonArticles.includes(firstWord) && parts.length > 1) {
    return trimmedName;
  }

  if (parts.length > 1) {
    if (!normalizedFirstWord || FULL_NAME_PREFIXES.has(normalizedFirstWord)) {
      return trimmedName;
    }
  } else if (!normalizedFirstWord || FULL_NAME_PREFIXES.has(normalizedFirstWord)) {
    // For single-word names that are pronouns/titles, skip highlighting entirely
    return '';
  }
  
  // Otherwise use first name for individuals (e.g., "John Smith" -> "John")
  return parts[0] || trimmedName;
}

/**
 * Find all occurrences of a name in the prayer text
 * Returns array of [startIndex, endIndex] pairs
 * Uses first name only for matching (e.g., "Annmarie" matches "Annmarie Legge")
 * For names starting with articles like "the Chapel", matches the full name
 */
function findNameOccurrences(text: string, name: string): [number, number][] {
  const occurrences: [number, number][] = [];
  
  // Get the appropriate name to match (first name or full name)
  const nameToMatch = getNameForMatching(name);
  if (!nameToMatch || nameToMatch.length < 2) return occurrences;
  
  // Escape special regex characters in the name
  const escapedName = nameToMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Search for the name as a whole word
  const regex = new RegExp(`\\b${escapedName}\\b`, 'gi');
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    occurrences.push([match.index, match.index + match[0].length]);
  }
  
  return occurrences;
}

/**
 * Create highlighted text components for prayer display
 * This creates an array of Text components with highlighted names
 */
export function createHighlightedPrayerText(
  prayerText: string, 
  people: PrayerPerson[],
  highlightStyle: any = { color: '#FFD700', fontWeight: '600' }
): React.ReactElement[] {
  if (!prayerText || people.length === 0) {
    return [<Text key="0">{prayerText}</Text>];
  }

  // Find all name occurrences
  const allOccurrences: { start: number; end: number; person: PrayerPerson }[] = [];
  
  people.forEach(person => {
    const occurrences = findNameOccurrences(prayerText, person.name);
    occurrences.forEach(([start, end]) => {
      allOccurrences.push({ start, end, person });
    });
  });

  // Sort by start position
  allOccurrences.sort((a, b) => a.start - b.start);

  // Remove overlapping occurrences (keep the first one)
  const filteredOccurrences = allOccurrences.filter((curr, index) => {
    if (index === 0) return true;
    const prev = allOccurrences[index - 1];
    return curr.start >= prev.end;
  });

  // Build the highlighted text components
  const components: React.ReactElement[] = [];
  let lastEnd = 0;

  filteredOccurrences.forEach((occurrence, index) => {
    // Add text before the highlight
    if (occurrence.start > lastEnd) {
      components.push(
        <Text key={`text-${index}`}>
          {prayerText.substring(lastEnd, occurrence.start)}
        </Text>
      );
    }

    // Add highlighted name
    components.push(
      <Text key={`highlight-${index}`} style={highlightStyle}>
        {prayerText.substring(occurrence.start, occurrence.end)}
      </Text>
    );

    lastEnd = occurrence.end;
  });

  // Add remaining text
  if (lastEnd < prayerText.length) {
    components.push(
      <Text key={`text-final`}>
        {prayerText.substring(lastEnd)}
      </Text>
    );
  }

  return components;
}

/**
 * Extract people mentioned in a specific prayer text
 */
export function extractPeopleMentionedInText(
  prayerText: string,
  people: PrayerPerson[]
): PrayerPerson[] {
  if (!prayerText || people.length === 0) {
    return [];
  }

  const mentionedPeople: PrayerPerson[] = [];
  const seenIds = new Set<string>();

  people.forEach(person => {
    const occurrences = findNameOccurrences(prayerText, person.name);
    if (occurrences.length > 0 && !seenIds.has(person.id)) {
      seenIds.add(person.id);
      mentionedPeople.push(person);
    }
  });

  return mentionedPeople;
}

/**
 * Extract verse reference from prayer content
 * Looks for common Bible verse patterns at the end of prayers
 */
export function extractVerseReference(prayerText: string): string | null {
  // Common patterns for Bible verses
  const versePatterns = [
    /\(([1-3]?\s*[A-Za-z]+\s+\d+:\d+(?:-\d+)?)\)\s*$/,  // (John 3:16) or (1 John 3:16-17)
    /\n([1-3]?\s*[A-Za-z]+\s+\d+:\d+(?:-\d+)?)\s*$/,     // John 3:16 at end of line
    /\[([1-3]?\s*[A-Za-z]+\s+\d+:\d+(?:-\d+)?)\]\s*$/,   // [John 3:16]
  ];

  for (const pattern of versePatterns) {
    const match = prayerText.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Clean prayer text by removing verse reference if it's embedded
 */
export function cleanPrayerText(prayerText: string): string {
  // Remove verse references that might be embedded in the prayer
  const versePatterns = [
    /\([1-3]?\s*[A-Za-z]+\s+\d+:\d+(?:-\d+)?\)\s*$/,
    /\n[1-3]?\s*[A-Za-z]+\s+\d+:\d+(?:-\d+)?\s*$/,
    /\[[1-3]?\s*[A-Za-z]+\s+\d+:\d+(?:-\d+)?\]\s*$/,
  ];

  let cleanedText = prayerText;
  for (const pattern of versePatterns) {
    cleanedText = cleanedText.replace(pattern, '');
  }

  return cleanedText.trim();
}

/**
 * Get a default avatar color based on the person's name
 */
export function getAvatarColor(name: string): string {
  const colors = [
    '#FF6B8B', '#4D6AE3', '#00C896', '#FFB347', 
    '#B19CD9', '#77DD77', '#FFD700', '#FF69B4',
    '#40E0D0', '#DDA0DD', '#F0E68C', '#87CEEB'
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
} 