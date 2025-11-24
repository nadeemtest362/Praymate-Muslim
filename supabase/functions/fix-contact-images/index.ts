import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get all people with local file paths
    const { data: people, error: fetchError } = await supabaseClient
      .from('prayer_focus_people')
      .select('id, image_uri')
      .or('image_uri.like.file:///%,image_uri.like./var/mobile/%')
      .not('image_uri', 'is', null);

    if (fetchError) throw fetchError;

    console.log(`Found ${people?.length || 0} people with local image paths`);

    const results = {
      total: people?.length || 0,
      fixed: 0,
      failed: 0,
      errors: [] as string[]
    };

    // For each person, we'll set their image_uri to null since we can't access the local files
    // The Avatar component will fall back to showing initials
    for (const person of people || []) {
      try {
        const { error: updateError } = await supabaseClient
          .from('prayer_focus_people')
          .update({ image_uri: null })
          .eq('id', person.id);

        if (updateError) throw updateError;
        
        results.fixed++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to fix ${person.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return new Response(
      JSON.stringify(results),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
}); 