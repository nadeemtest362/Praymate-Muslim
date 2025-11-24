import { supabase } from '../lib/supabaseClient';

export async function logClientError(error: Error, context: any) {
  try {
    const errorData = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      platform: 'ios',
    };

    const { error: invokeError } = await supabase.functions.invoke('log-client-error', {
      body: errorData,
    });

    if (invokeError) {
      console.error('Failed to log client error:', invokeError.message);
    }
  } catch (e) {
    // Silently fail - don't want logging errors to break the app
    console.error('Error logging client error:', e);
  }
} 