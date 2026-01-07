import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Use service role to read invites (public access for invitees)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const inviteId = url.searchParams.get('inviteId');

    if (!inviteId) {
      return new Response(JSON.stringify({ error: 'Invite ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Fetching invite:', inviteId);

    const { data: invite, error: fetchError } = await supabase
      .from('invites')
      .select('*')
      .eq('id', inviteId)
      .single();

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return new Response(JSON.stringify({ error: 'Invite not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if invite has expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'This invite has expired' }), {
        status: 410,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get response count
    const { count: responseCount } = await supabase
      .from('invite_responses')
      .select('*', { count: 'exact', head: true })
      .eq('invite_id', inviteId);

    // Get responses (for status display)
    const { data: responses } = await supabase
      .from('invite_responses')
      .select('responder_name, response, created_at')
      .eq('invite_id', inviteId)
      .order('created_at', { ascending: false });

    console.log('Invite found:', invite.id, 'Responses:', responseCount);

    return new Response(JSON.stringify({ 
      invite: {
        id: invite.id,
        hostName: invite.host_name,
        intent: invite.intent,
        planJson: invite.plan_json,
        inviteeCount: invite.invitee_count,
        createdAt: invite.created_at,
        expiresAt: invite.expires_at,
      },
      responseCount: responseCount || 0,
      responses: responses || [],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
