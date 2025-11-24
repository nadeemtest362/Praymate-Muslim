import { supabase } from '../lib/supabaseClient';

export interface DeleteAccountResponse {
  success: boolean;
  message?: string;
  error?: string;
  deleted_data?: unknown;
}

export class AccountDeletionService {
  /**
   * Delete user account and all associated data
   * This is a permanent action that cannot be undone
   */
  static async deleteAccount(userId: string): Promise<DeleteAccountResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('delete-user-account', {
        body: { userId }
      });

      console.log('Edge Function response:', { data, error });

      if (error) {
        console.error('Account deletion error:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          statusText: error.statusText,
          name: error.name
        });
        
        return {
          success: false,
          error: `Edge Function error: ${error.message} (Status: ${error.status})`
        };
      }

      return {
        success: true,
        message: data?.message || 'Account deleted successfully',
        deleted_data: data?.deleted_data
      };

    } catch (error) {
      console.error('Account deletion service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
