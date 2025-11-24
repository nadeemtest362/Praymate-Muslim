import { BaseRepository } from './baseRepository';
import { supabase } from '../lib/supabaseClient';
import { emitDataChange } from '../lib/eventBus';
import { Prayer } from '../models/prayer';

// Re-export the consistent Prayer type
export type { Prayer } from '../models/prayer';

export interface PaginatedPrayers {
  prayers: Prayer[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
}

export class PrayersRepository extends BaseRepository {
  protected tableName = 'prayers';
  protected eventPrefix = 'prayers' as const;

  // Get paginated prayers
  async getPrayers(
    userId: string,
    options: {
      limit?: number;
      cursor?: string;
      filter?: 'all' | 'morning' | 'evening' | 'liked';
    } = {}
  ): Promise<PaginatedPrayers> {
    try {
      const { limit = 20, cursor, filter = 'all' } = options;
      
      let query = supabase
        .from('prayers')
        .select('id, user_id, content, generated_at, slot, verse_ref, liked, completed_at, input_snapshot', { count: 'exact' })
        .eq('user_id', userId)
        .order('generated_at', { ascending: false })
        .limit(limit);

      // Apply cursor pagination
      if (cursor) {
        query = query.lt('generated_at', cursor);
      }

      // Apply filters
      if (filter === 'morning') {
        query = query.or('slot.ilike.*am*,slot.eq.morning');
      } else if (filter === 'evening') {
        query = query.or('slot.ilike.*pm*,slot.eq.evening');
      } else if (filter === 'liked') {
        query = query.eq('liked', true);
      }

      const { data, error, count } = await query;
      
      if (error) throw this.handleError(error, 'Get prayers');

      const prayers = data || [];
      const hasMore = prayers.length === limit;
      const nextCursor = hasMore && prayers.length > 0 
        ? prayers[prayers.length - 1].generated_at 
        : undefined;

      return {
        prayers,
        totalCount: count || 0,
        hasMore,
        nextCursor,
      };
    } catch (error) {
      throw this.handleError(error, 'Get prayers');
    }
  }

  // Get today's prayers
  async getTodaysPrayers(userId: string): Promise<{ morning: Prayer | null; evening: Prayer | null }> {
    try {
      // Use database RPC to get today's prayers with proper timezone handling
      const { data: prayerState, error: rpcError } = await supabase
        .rpc('get_current_prayer_state', { user_id_param: userId });
      
      if (rpcError) throw this.handleError(rpcError, 'Get current prayer state');
      
      // Extract prayers from RPC response
      const morning = prayerState?.prayers?.morning || null;
      const evening = prayerState?.prayers?.evening || null;
      
      return { morning, evening };
    } catch (error) {
      throw this.handleError(error, 'Get today\'s prayers');
    }
  }

  // Get prayer by ID
  async getPrayerById(prayerId: string, userId: string): Promise<Prayer | null> {
    try {
      const { data, error } = await supabase
        .from('prayers')
        .select('*')
        .eq('id', prayerId)
        .eq('user_id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw this.handleError(error, 'Get prayer by ID');
      }

      return data as Prayer;
    } catch (error) {
      throw this.handleError(error, 'Get prayer by ID');
    }
  }

  // Toggle like status
  async toggleLike(prayerId: string, userId: string, liked: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('prayers')
        .update({ liked })
        .eq('id', prayerId)
        .eq('user_id', userId);
      
      if (error) throw this.handleError(error, 'Toggle like');
      
      this.emitDataEvent('updated', userId, prayerId);
    } catch (error) {
      throw this.handleError(error, 'Toggle like');
    }
  }

  // Complete prayer
  async completePrayer(prayerId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('prayers')
        .update({ 
          completed_at: new Date().toISOString()
        })
        .eq('id', prayerId)
        .eq('user_id', userId);
      
      if (error) throw this.handleError(error, 'Complete prayer');
      
      // Emit specific completion event
      emitDataChange('prayers', 'completed', { userId, id: prayerId });
    } catch (error) {
      throw this.handleError(error, 'Complete prayer');
    }
  }
}

export const prayersRepository = new PrayersRepository();
