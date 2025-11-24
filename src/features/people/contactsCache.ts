import * as Contacts from 'expo-contacts';

export interface CachedContact {
  id: string;
  name: string;
  phoneNumbers?: Contacts.PhoneNumber[];
  emails?: Contacts.Email[];
  image?: { uri: string };
}

let cachedContacts: CachedContact[] = [];
let lastLoadedAt = 0;

const STALE_MS = 60 * 1000; // 1 minute freshness window

export function getCachedContacts(): CachedContact[] {
  return cachedContacts;
}

export function hasFreshCache(): boolean {
  const now = Date.now();
  return cachedContacts.length > 0 && now - lastLoadedAt < STALE_MS;
}

export async function loadContactsFresh(): Promise<CachedContact[]> {
  try {
    const { status } = await Contacts.getPermissionsAsync();
    if (status !== 'granted') {
      // Return existing cache if any, otherwise empty
      return cachedContacts;
    }

    const { data } = await Contacts.getContactsAsync({
      fields: [
        Contacts.Fields.ID,
        Contacts.Fields.Name,
        Contacts.Fields.PhoneNumbers,
        Contacts.Fields.Emails,
        Contacts.Fields.Image,
        Contacts.Fields.ImageAvailable,
      ],
      sort: Contacts.SortTypes.FirstName,
      pageSize: 100,
      pageOffset: 0,
    });

    const list: CachedContact[] = [];
    for (let i = 0; i < data.length; i++) {
      const c = data[i] as Contacts.Contact & { id?: string };
      if (c && c.id && c.name) {
        const uri = c.image?.uri ? { uri: c.image.uri } : undefined;
        list[list.length] = {
          id: c.id,
          name: c.name || '',
          phoneNumbers: c.phoneNumbers,
          emails: c.emails,
          image: uri,
        };
      }
    }

    cachedContacts = list;
    lastLoadedAt = Date.now();
    return cachedContacts;
  } catch {
    return cachedContacts;
  }
}

export async function ensureContactsLoaded(): Promise<CachedContact[]> {
  if (hasFreshCache()) {
    return cachedContacts;
  }
  return loadContactsFresh();
}
