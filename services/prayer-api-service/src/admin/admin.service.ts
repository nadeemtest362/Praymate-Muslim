import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class AdminService {
    private supabaseAdmin: SupabaseClient;

    constructor(private configService: ConfigService) {
        const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
        const supabaseServiceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseServiceRoleKey) {
            // This should ideally not happen if AppService already checked, 
            // but good for robustness if AdminModule is used independently.
            throw new Error('Supabase URL or Service Role Key is missing in environment configuration for AdminService.');
        }

        this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
            auth: { persistSession: false }
        });
        console.log('Supabase Admin client initialized in AdminService.');
    }

    async getPrayerLogs(options?: { page?: number; limit?: number; userId?: string; dateFrom?: string; dateTo?: string; successful?: boolean }) {
        const page = options?.page || 1;
        const limit = options?.limit || 20;
        const offset = (page - 1) * limit;

        let query = this.supabaseAdmin
            .from('openai_prayer_logs')
            .select('*_count', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (options?.userId) {
            query = query.eq('user_id', options.userId);
        }
        if (options?.dateFrom) {
            query = query.gte('created_at', options.dateFrom);
        }
        if (options?.dateTo) {
            // To include the whole end day, typically add 1 day and use 'lt' or adjust to end of day timestamp
            query = query.lte('created_at', options.dateTo);
        }
        if (options?.successful !== undefined) {
            query = query.eq('was_successful', options.successful);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error('Error fetching prayer logs:', error);
            throw new Error(`Failed to fetch prayer logs: ${error.message}`);
        }

        return { 
            logs: data,
            totalCount: count,
            currentPage: page,
            pageSize: limit,
            totalPages: Math.ceil((count || 0) / limit)
        };
    }
}
