import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id',
};

// UUID v4 validation regex
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateUserId(userId: string | null): { valid: boolean; error?: string } {
  if (!userId) {
    return { valid: false, error: 'X-User-Id header is required' };
  }
  
  if (!UUID_V4_REGEX.test(userId)) {
    return { valid: false, error: 'Invalid userId format. Must be a valid UUID v4' };
  }
  
  return { valid: true };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // GET: Fetch a profile
    if (req.method === 'GET') {
      // Read userId from X-User-Id header (trusted source)
      const userId = req.headers.get('x-user-id');
      
      // Validate userId
      const validation = validateUserId(userId);
      if (!validation.valid) {
        console.error('Invalid userId:', validation.error);
        return new Response(
          JSON.stringify({ error: validation.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Fetching profile for userId: ${userId}`);

      const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!data) {
        console.log(`Profile not found for userId: ${userId}`);
        return new Response(
          JSON.stringify({ error: 'not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Profile fetched successfully');
      return new Response(
        JSON.stringify(data),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST: Upsert a profile
    if (req.method === 'POST') {
      // Read userId from X-User-Id header (trusted source), ignore body
      const userId = req.headers.get('x-user-id');
      
      // Validate userId
      const validation = validateUserId(userId);
      if (!validation.valid) {
        console.error('Invalid userId:', validation.error);
        return new Response(
          JSON.stringify({ error: validation.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const { nickname, home_zip, default_radius_mi, cuisines, activities, dietary, price_range, dislikes, party_size, vibe, planning_style } = body;

      if (!nickname || !home_zip || !default_radius_mi) {
        console.error('Missing required fields:', { nickname, home_zip, default_radius_mi });
        return new Response(
          JSON.stringify({ error: 'nickname, home_zip, and default_radius_mi are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate types
      if (typeof nickname !== 'string' || typeof home_zip !== 'string') {
        console.error('Invalid field types');
        return new Response(
          JSON.stringify({ error: 'nickname and home_zip must be strings' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (typeof default_radius_mi !== 'number' || default_radius_mi <= 0) {
        console.error('Invalid default_radius_mi:', default_radius_mi);
        return new Response(
          JSON.stringify({ error: 'default_radius_mi must be a positive number' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!Array.isArray(cuisines) || !Array.isArray(activities)) {
        console.error('Invalid array fields');
        return new Response(
          JSON.stringify({ error: 'cuisines and activities must be arrays' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (dietary !== null && dietary !== undefined && !Array.isArray(dietary)) {
        console.error('Invalid dietary field');
        return new Response(
          JSON.stringify({ error: 'dietary must be an array or null' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (price_range !== null && price_range !== undefined && typeof price_range !== 'string') {
        console.error('Invalid price_range field');
        return new Response(
          JSON.stringify({ error: 'price_range must be a string or null' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (dislikes !== null && dislikes !== undefined && !Array.isArray(dislikes)) {
        console.error('Invalid dislikes field');
        return new Response(
          JSON.stringify({ error: 'dislikes must be an array or null' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (party_size !== null && party_size !== undefined && typeof party_size !== 'number') {
        console.error('Invalid party_size field');
        return new Response(
          JSON.stringify({ error: 'party_size must be a number or null' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (vibe !== null && vibe !== undefined && typeof vibe !== 'string') {
        console.error('Invalid vibe field');
        return new Response(
          JSON.stringify({ error: 'vibe must be a string or null' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (planning_style !== null && planning_style !== undefined && typeof planning_style !== 'string') {
        console.error('Invalid planning_style field');
        return new Response(
          JSON.stringify({ error: 'planning_style must be a string or null' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Upserting profile for userId: ${userId}`);

      const profileData = {
        user_id: userId,
        nickname,
        home_zip,
        default_radius_mi,
        cuisines,
        activities,
        dietary: dietary || null,
        price_range: price_range || null,
        dislikes: dislikes || null,
        party_size: party_size || null,
        vibe: vibe || null,
        planning_style: planning_style || null,
      };

      const { data, error } = await supabaseClient
        .from('profiles')
        .upsert(profileData, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) {
        console.error('Error upserting profile:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Profile upserted successfully');
      return new Response(
        JSON.stringify(data),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Method not allowed
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in profile function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
