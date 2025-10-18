import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      const url = new URL(req.url);
      const userId = url.searchParams.get('userId');

      if (!userId) {
        console.error('Missing userId parameter');
        return new Response(
          JSON.stringify({ error: 'userId is required' }),
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
      const body = await req.json();
      const { userId, nickname, home_zip, default_radius_mi, cuisines, activities, dietary } = body;

      // Validate required fields
      if (!userId) {
        console.error('Missing userId in request body');
        return new Response(
          JSON.stringify({ error: 'userId is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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

      console.log(`Upserting profile for userId: ${userId}`);

      const profileData = {
        user_id: userId,
        nickname,
        home_zip,
        default_radius_mi,
        cuisines,
        activities,
        dietary: dietary || null,
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
