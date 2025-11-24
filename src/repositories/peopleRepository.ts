import { BaseRepository } from './baseRepository';
import { supabase } from '../lib/supabaseClient';
import { ensureImageUploaded } from '../utils/imageUploadUtils';


// Type definitions (matches existing store interfaces)
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

export interface AddPrayerPersonParams {
  // Contact deduplication
  contactId?: string | null;      // Device contact ID for deduplication
  
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

export interface AddPrayerPersonOnlyParams {
  // Contact deduplication
  contactId?: string | null;      // Device contact ID for deduplication
  
  // Person data
  name: string;
  relationship: string | null;
  gender: string | null;
  image_uri: string | null;
  email: string | null;
  rawPhoneNumber?: string | null;
}

export interface UpdatePrayerPersonParams {
  name?: string;
  relationship?: string | null;
  gender?: string | null;
  image_uri?: string | null;
  email?: string | null;
  phoneNumberHash?: string | null;
}

// Pagination cursor type for people queries
export interface PeopleCursor {
  id: string;
  created_at: string;
}

export class PeopleRepository extends BaseRepository {
  protected tableName = 'prayer_focus_people';
  protected eventPrefix = 'people' as const;

  // Get all people for a user with optional filtering
  async getPeople(
    userId: string, 
    options: {
      activeOnly?: boolean;
      limit?: number;
      cursor?: PeopleCursor;
    } = {}
  ): Promise<{ data: PrayerPerson[]; nextCursor?: PeopleCursor }> {
    try {
      const { activeOnly = true, limit = 50, cursor } = options;
      
      console.log(`[PeopleRepository] Fetching people for user: ${userId}, activeOnly: ${activeOnly}`);

      const baseSelect = 'id, user_id, name, relationship, gender, image_uri, phone_number_hash, device_contact_id, created_at';
      let selectColumns = baseSelect;

      if (activeOnly) {
        selectColumns = `${baseSelect}, prayer_intentions!inner(id, is_active)`;
      }

      let query = supabase
        .from('prayer_focus_people')
        .select(selectColumns)
        .eq('user_id', userId);

      if (activeOnly) {
        query = query.eq('prayer_intentions.is_active', true);
      }

      // Add cursor-based pagination
      if (cursor) {
        query = query
          .or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.gt.${cursor.id})`);
      }

      // Apply limit and ordering
      query = query
        .order('name')
        .order('created_at', { ascending: false })
        .order('id', { ascending: true })
        .limit(limit + 1); // Fetch one extra to check for next page

      const { data, error } = await query;

      if (error) throw this.handleError(error, 'Get people');

      // Process results
      const rawData = data || [];
      const hasNextPage = rawData.length > limit;
      const processedData = hasNextPage ? rawData.slice(0, limit) : rawData;

      // Map to our interface
      const mappedPeople: PrayerPerson[] = processedData.map((item: any) => ({
        id: item.id,
        contactId: item.device_contact_id,
        user_id: item.user_id,
        name: item.name,
        relationship: item.relationship,
        gender: item.gender,
        image_uri: item.image_uri,
        email: null, // Not stored in DB for privacy
        phoneNumberHash: item.phone_number_hash,
      }));

      // Generate next cursor if there are more results
      let nextCursor: PeopleCursor | undefined;
      if (hasNextPage && processedData.length > 0) {
        const lastItem = processedData[processedData.length - 1];
        nextCursor = {
          id: lastItem.id,
          created_at: lastItem.created_at,
        };
      }

      return { data: mappedPeople, nextCursor };
    } catch (error) {
      throw this.handleError(error, 'Get people');
    }
  }

  // Get a single person by ID
  async getPersonById(personId: string): Promise<PrayerPerson | null> {
    try {
      const { data, error } = await supabase
        .from('prayer_focus_people')
        .select('id, user_id, name, relationship, gender, image_uri, phone_number_hash, device_contact_id')
        .eq('id', personId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw this.handleError(error, 'Get person by ID');
      }

      return {
        id: data.id,
        contactId: data.device_contact_id,
        user_id: data.user_id,
        name: data.name,
        relationship: data.relationship,
        gender: data.gender,
        image_uri: data.image_uri,
        email: null,
        phoneNumberHash: data.phone_number_hash,
      };
    } catch (error) {
      throw this.handleError(error, 'Get person by ID');
    }
  }

  // Add a person with an intention (existing behavior)
  async addPersonWithIntention(userId: string, params: AddPrayerPersonParams): Promise<PrayerPerson> {
    try {
      console.log(`[PeopleRepository] Adding person with intention for user: ${userId}`);

      // Handle image upload if provided
      let finalImageUri = params.image_uri;
      if (params.image_uri && !params.image_uri.startsWith('http')) {
        try {
          finalImageUri = await ensureImageUploaded(params.image_uri, userId, 'contact');
        } catch (error) {
          console.warn('[PeopleRepository] Image upload failed, continuing without image:', error);
          finalImageUri = null; // Continue without image on upload failure
        }
      }

      // Hash phone number if provided
      let phoneHash = null;
      if (params.rawPhoneNumber) {
        try {
          const { data: hashData, error: hashError } = await supabase.functions.invoke('hash-phone-number', {
            body: { phoneNumber: params.rawPhoneNumber }
          });
          
          if (!hashError && hashData?.hashedPhoneNumber) {
            phoneHash = hashData.hashedPhoneNumber;
          }
        } catch (error) {
          console.warn('[PeopleRepository] Phone number hashing failed:', error);
        }
      }

      // Start transaction by creating person first
      const { data: personData, error: personError } = await supabase
        .from('prayer_focus_people')
        .insert({
          user_id: userId,
          name: params.name,
          relationship: params.relationship,
          gender: params.gender,
          image_uri: finalImageUri,
          phone_number_hash: phoneHash,
          device_contact_id: params.contactId,
        })
        .select()
        .single();

      if (personError) throw this.handleError(personError, 'Add person');

      // Create the intention
      const { error: intentionError } = await supabase
        .from('prayer_intentions')
        .insert({
          user_id: userId,
          person_id: personData.id,
          category: params.intentionCategory,
          details: params.intentionDetails,
          is_active: true,
        });

      if (intentionError) {
        // Rollback: delete the person if intention creation fails
        await supabase
          .from('prayer_focus_people')
          .delete()
          .eq('id', personData.id);
        
        throw this.handleError(intentionError, 'Add intention');
      }

      const newPerson: PrayerPerson = {
        id: personData.id,
        contactId: personData.device_contact_id,
        user_id: personData.user_id,
        name: personData.name,
        relationship: personData.relationship,
        gender: personData.gender,
        image_uri: personData.image_uri,
        email: null,
        phoneNumberHash: personData.phone_number_hash,
      };

      // Emit events for both person and intention creation  
      this.emitDataEvent('created', userId, personData.id);

      return newPerson;
    } catch (error) {
      throw this.handleError(error, 'Add person with intention');
    }
  }

  // Add a person only (no intention)
  async addPersonOnly(userId: string, params: AddPrayerPersonOnlyParams): Promise<PrayerPerson> {
    try {
      console.log(`[PeopleRepository] Adding person only for user: ${userId}`);

      // Handle image upload if provided
      let finalImageUri = params.image_uri; // Default to provided URI
      if (params.image_uri && !params.image_uri.startsWith('http')) {
        try {
          finalImageUri = await ensureImageUploaded(params.image_uri, userId, 'contact');
        } catch (error) {
          console.warn('[PeopleRepository] Image upload failed, continuing without image:', error);
          finalImageUri = null; // Continue without image on upload failure
        }
      }

      // Hash phone number if provided
      let phoneHash = null;
      if (params.rawPhoneNumber) {
        try {
          const { data: hashData, error: hashError } = await supabase.functions.invoke('hash-phone-number', {
            body: { phoneNumber: params.rawPhoneNumber }
          });
          
          if (!hashError && hashData?.hashedPhoneNumber) {
            phoneHash = hashData.hashedPhoneNumber;
          }
        } catch (error) {
          console.warn('[PeopleRepository] Phone number hashing failed:', error);
        }
      }

      const { data, error } = await supabase
        .from('prayer_focus_people')
        .insert({
          user_id: userId,
          name: params.name,
          relationship: params.relationship,
          gender: params.gender,
          image_uri: finalImageUri,
          phone_number_hash: phoneHash,
          device_contact_id: params.contactId,
        })
        .select()
        .single();

      if (error) throw this.handleError(error, 'Add person only');

      const newPerson: PrayerPerson = {
        id: data.id,
        contactId: data.device_contact_id,
        user_id: data.user_id,
        name: data.name,
        relationship: data.relationship,
        gender: data.gender,
        image_uri: data.image_uri,
        email: null,
        phoneNumberHash: data.phone_number_hash,
      };

      // Emit event
      this.emitDataEvent('created', userId, data.id);

      return newPerson;
    } catch (error) {
      throw this.handleError(error, 'Add person only');
    }
  }

  // Update person details
  async updatePerson(
    personId: string, 
    userId: string, 
    updates: UpdatePrayerPersonParams
  ): Promise<PrayerPerson> {
    try {
      // Handle image upload if provided
      let finalUpdates = { ...updates };
      if (updates.image_uri && !updates.image_uri.startsWith('http')) {
        finalUpdates.image_uri = await ensureImageUploaded(updates.image_uri, userId, 'contact');
      }

      const { data, error } = await supabase
        .from('prayer_focus_people')
        .update({
          ...finalUpdates,
          ...this.getAuditFields(),
        })
        .eq('id', personId)
        .eq('user_id', userId) // Ensure user owns this person
        .select()
        .single();

      if (error) throw this.handleError(error, 'Update person');

      const updatedPerson: PrayerPerson = {
        id: data.id,
        contactId: data.device_contact_id,
        user_id: data.user_id,
        name: data.name,
        relationship: data.relationship,
        gender: data.gender,
        image_uri: data.image_uri,
        email: null,
        phoneNumberHash: data.phone_number_hash,
      };

      // Emit event
      this.emitDataEvent('updated', userId, personId);

      return updatedPerson;
    } catch (error) {
      throw this.handleError(error, 'Update person');
    }
  }

  // Delete person (cascade deletes intentions)
  async deletePerson(personId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('prayer_focus_people')
        .delete()
        .eq('id', personId)
        .eq('user_id', userId); // Ensure user owns this person

      if (error) throw this.handleError(error, 'Delete person');

      // Emit event
      this.emitDataEvent('deleted', userId, personId);
    } catch (error) {
      throw this.handleError(error, 'Delete person');
    }
  }

  // Get all people (not just those with active intentions)
  async getAllPeople(
    userId: string,
    options: {
      limit?: number;
      cursor?: PeopleCursor;
    } = {}
  ): Promise<{ data: PrayerPerson[]; nextCursor?: PeopleCursor }> {
    return this.getPeople(userId, { ...options, activeOnly: false });
  }
}

// Singleton instance
export const peopleRepository = new PeopleRepository();
