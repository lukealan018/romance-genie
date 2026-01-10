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

    // Get response counts by type (privacy: no names/list for public)
    const { data: responseCounts } = await supabase
      .from('invite_responses')
      .select('response')
      .eq('invite_id', inviteId);

    const counts = (responseCounts || []).reduce((acc: Record<string, number>, r) => {
      acc[r.response] = (acc[r.response] || 0) + 1;
      return acc;
    }, {});

    console.log('Invite found:', invite.id, 'Response counts:', counts);

    return new Response(JSON.stringify({ 
      invite: {
        id: invite.id,
        hostName: invite.host_name,
        intent: invite.intent,
        message: invite.message,
        planJson: invite.plan_json,
        inviteeCount: invite.invitee_count,
        createdAt: invite.created_at,
        expiresAt: invite.expires_at,
      },
      responseCounts: counts,
      totalResponses: responseCounts?.length || 0,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
