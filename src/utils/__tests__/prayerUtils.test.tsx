import { extractPeopleFromSnapshot, type InputSnapshot } from '../prayerUtils';

describe('extractPeopleFromSnapshot', () => {
  it('returns empty array when snapshot is null', () => {
    expect(extractPeopleFromSnapshot(null)).toEqual([]);
  });

  it('handles prayer_focus_people only', () => {
    const snapshot: InputSnapshot = {
      activeIntentions: [
        {
          id: '1',
          person_id: 'p1',
          category: 'healing',
          details: 'details',
          is_active: true,
          prayer_focus_people: {
            id: 'p1',
            name: 'Sarah',
            image_uri: 'image://sarah',
            relationship: 'Friend',
            gender: 'female',
          },
        },
      ],
    };

    expect(extractPeopleFromSnapshot(snapshot)).toEqual([
      {
        id: 'p1',
        name: 'Sarah',
        image_uri: 'image://sarah',
        relationship: 'Friend',
        gender: 'female',
      },
    ]);
  });

  it('handles modern `person` field on intentions', () => {
    const snapshot: InputSnapshot = {
      activeIntentions: [
        {
          id: '2',
          person_id: 'p2',
          category: 'love',
          details: 'details',
          is_active: true,
          person: {
            id: 'p2',
            name: 'John',
            relationship: 'Brother',
          },
        },
      ],
    } as any;

    expect(extractPeopleFromSnapshot(snapshot)).toEqual([
      {
        id: 'p2',
        name: 'John',
        image_uri: null,
        relationship: 'Brother',
        gender: null,
      },
    ]);
  });

  it('dedupes people appearing in multiple buckets', () => {
    const snapshot: InputSnapshot = {
      activeIntentions: [
        {
          id: '3',
          person_id: 'p3',
          category: 'healing',
          details: 'details',
          is_active: true,
          person: {
            id: 'p3',
            name: 'Emily',
          },
        },
      ],
      fetchedIntentionsForPrompt: [
        {
          id: '4',
          person_id: 'p3',
          category: 'healing',
          details: 'details',
          is_active: true,
          prayer_focus_people: {
            id: 'p3',
            name: 'Emily',
            image_uri: 'image://emily',
          },
        },
      ],
      modelKnows: {
        activeIntentions: [
          {
            id: '5',
            person_id: 'p3',
            category: 'healing',
            details: 'details',
            is_active: true,
            person: {
              id: 'p3',
              name: 'Emily',
            },
          },
        ],
      },
    } as any;

    const people = extractPeopleFromSnapshot(snapshot);

    expect(people).toEqual([
      {
        id: 'p3',
        name: 'Emily',
        image_uri: 'image://emily',
        relationship: null,
        gender: null,
      },
    ]);
  });
});
