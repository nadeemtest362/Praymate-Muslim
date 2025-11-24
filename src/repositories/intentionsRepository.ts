import { BaseRepository } from './baseRepository';
import { supabase } from '../lib/supabaseClient';
import { emitDataChange } from '../lib/eventBus';

// Interface matches the database schema exactly
export interface PrayerIntention {
  id: string;
  user_id: string;
  person_id: string | null;
  category: string;
  details: string | null;
  is_active: boolean;
  created_at: string;
  prayer_focus_people?: {
    name: string;
    relationship?: string;
    gender?: string;
    image_uri?: string;
  } | null;
}

export interface CreateIntentionParams {
  person_id: string | null;
  category: string;
  details: string | null;
  is_active: boolean;
}

export interface UpdateIntentionParams {
  category?: string;
  details?: string | null;
  is_active?: boolean;
}

export class IntentionsRepository extends BaseRepository {
  protected tableName = 'prayer_intentions';
  protected eventPrefix = 'intentions' as const;

  // Get all intentions for a user with person data
  async getAllIntentions(userId: string): Promise<PrayerIntention[]> {
    try {
      const { data, error } = await supabase
        .from('prayer_intentions')
        .select(`
          *,
          prayer_focus_people (
            name,
            relationship, 
            gender,
            image_uri
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) throw this.handleError(error, 'Get intentions');
      
      return data || [];
    } catch (error) {
      throw this.handleError(error, 'Get intentions');
    }
  }

  // Get intentions by person ID
  async getIntentionsByPersonId(userId: string, personId: string | null): Promise<PrayerIntention[]> {
    try {
      let query = supabase
        .from('prayer_intentions')
        .select(`
          *,
          prayer_focus_people (
            name,
            relationship, 
            gender,
            image_uri
          )
        `)
        .eq('user_id', userId);

      if (personId === null) {
        query = query.is('person_id', null);
      } else {
        query = query.eq('person_id', personId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
        
      if (error) throw this.handleError(error, 'Get intentions by person');
      
      return data || [];
    } catch (error) {
      throw this.handleError(error, 'Get intentions by person');
    }
  }

  // Get active intentions only
  async getActiveIntentions(userId: string): Promise<PrayerIntention[]> {
    try {
      const { data, error } = await supabase
        .from('prayer_intentions')
        .select(`
          *,
          prayer_focus_people (
            name,
            relationship, 
            gender,
            image_uri
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
        
      if (error) throw this.handleError(error, 'Get active intentions');
      
      return data || [];
    } catch (error) {
      throw this.handleError(error, 'Get active intentions');
    }
  }

  // Get single intention by ID
  async getIntentionById(intentionId: string): Promise<PrayerIntention | null> {
    try {
      const { data, error } = await supabase
        .from('prayer_intentions')
        .select(`
          *,
          prayer_focus_people (
            name,
            relationship, 
            gender,
            image_uri
          )
        `)
        .eq('id', intentionId)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw this.handleError(error, 'Get intention');
      }
      
      return data as PrayerIntention;
    } catch (error) {
      throw this.handleError(error, 'Get intention');
    }
  }

  // Create new intention
  async createIntention(userId: string, params: CreateIntentionParams): Promise<PrayerIntention> {
    try {
      const { data, error } = await supabase
        .from('prayer_intentions')
        .insert({
          user_id: userId,
          person_id: params.person_id,
          category: params.category,
          details: params.details,
          is_active: params.is_active,
        })
        .select(`
          *,
          prayer_focus_people (
            name,
            relationship, 
            gender,
            image_uri
          )
        `)
        .single();
        
      if (error) throw this.handleError(error, 'Create intention');
      
      const intention = data as PrayerIntention;
      
      // Emit creation event
      this.emitDataEvent('created', userId, intention.id);
      
      return intention;
    } catch (error) {
      throw this.handleError(error, 'Create intention');
    }
  }

  // Update intention
  async updateIntention(intentionId: string, updates: UpdateIntentionParams): Promise<PrayerIntention> {
    try {
      const { data, error } = await supabase
        .from('prayer_intentions')
        .update({
          ...updates,
          ...this.getAuditFields()
        })
        .eq('id', intentionId)
        .select(`
          *,
          prayer_focus_people (
            name,
            relationship, 
            gender,
            image_uri
          )
        `)
        .single();
        
      if (error) throw this.handleError(error, 'Update intention');
      
      const intention = data as PrayerIntention;
      
      // Emit update event
      this.emitDataEvent('updated', intention.user_id, intention.id);
      
      return intention;
    } catch (error) {
      throw this.handleError(error, 'Update intention');
    }
  }

  // Toggle intention active status
  async toggleIntentionActive(intentionId: string): Promise<PrayerIntention> {
    try {
      // First get current status
      const { data: current, error: fetchError } = await supabase
        .from('prayer_intentions')
        .select('is_active, user_id')
        .eq('id', intentionId)
        .single();
        
      if (fetchError) throw this.handleError(fetchError, 'Get intention for toggle');
      
      const newStatus = !current.is_active;
      
      const { data, error } = await supabase
        .from('prayer_intentions')
        .update({
          is_active: newStatus
        })
        .eq('id', intentionId)
        .select(`
          *,
          prayer_focus_people (
            name,
            relationship, 
            gender,
            image_uri
          )
        `)
        .single();
        
      if (error) throw this.handleError(error, 'Toggle intention active');
      
      const intention = data as PrayerIntention;
      
      // Emit toggle event
      emitDataChange('intentions', 'toggled', { userId: intention.user_id, id: intention.id });
      
      return intention;
    } catch (error) {
      throw this.handleError(error, 'Toggle intention active');
    }
  }

  // Delete intention
  async deleteIntention(intentionId: string): Promise<void> {
    try {
      // Get user_id before deletion for event emission
      const { data: intention, error: fetchError } = await supabase
        .from('prayer_intentions')
        .select('user_id')
        .eq('id', intentionId)
        .single();
        
      // If intention doesn't exist, consider deletion successful (idempotent)
      if (fetchError?.code === 'PGRST116') {
        console.warn(`[IntentionsRepository] Intention ${intentionId} already deleted`);
        return;
      }
      
      if (fetchError) throw this.handleError(fetchError, 'Get intention for deletion');
      
      const { error } = await supabase
        .from('prayer_intentions')
        .delete()
        .eq('id', intentionId);
        
      if (error) throw this.handleError(error, 'Delete intention');
      
      // Emit deletion event
      this.emitDataEvent('deleted', intention.user_id, intentionId);
    } catch (error) {
      throw this.handleError(error, 'Delete intention');
    }
  }

  // Bulk operations for performance
  async createMultipleIntentions(userId: string, intentions: CreateIntentionParams[]): Promise<PrayerIntention[]> {
    try {
      const insertData = intentions.map(intention => ({
        user_id: userId,
        person_id: intention.person_id,
        category: intention.category,
        details: intention.details,
        is_active: intention.is_active,
      }));

      const { data, error } = await supabase
        .from('prayer_intentions')
        .insert(insertData)
        .select(`
          *,
          prayer_focus_people (
            name,
            relationship, 
            gender,
            image_uri
          )
        `);
        
      if (error) throw this.handleError(error, 'Create multiple intentions');
      
      const createdIntentions = data as PrayerIntention[];
      
      // Emit creation events for each intention
      createdIntentions.forEach(intention => {
        this.emitDataEvent('created', userId, intention.id);
      });
      
      return createdIntentions;
    } catch (error) {
      throw this.handleError(error, 'Create multiple intentions');
    }
  }

  // Delete multiple intentions by person ID (useful when deleting a person)
  async deleteIntentionsByPersonId(userId: string, personId: string): Promise<void> {
    try {
      // Get intention IDs before deletion for event emission
      const { data: intentions, error: fetchError } = await supabase
        .from('prayer_intentions')
        .select('id')
        .eq('user_id', userId)
        .eq('person_id', personId);
        
      if (fetchError) throw this.handleError(fetchError, 'Get intentions for bulk deletion');
      
      const { error } = await supabase
        .from('prayer_intentions')
        .delete()
        .eq('user_id', userId)
        .eq('person_id', personId);
        
      if (error) throw this.handleError(error, 'Delete intentions by person');
      
      // Emit deletion events for each intention
      (intentions || []).forEach((intention: { id: string }) => {
        this.emitDataEvent('deleted', userId, intention.id);
      });
    } catch (error) {
      throw this.handleError(error, 'Delete intentions by person');
    }
  }
}

// Singleton instance
export const intentionsRepository = new IntentionsRepository();
