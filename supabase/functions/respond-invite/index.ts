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
    
    // Use service role for public response submission
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { inviteId, responderName, response, suggestionJson, fingerprint } = await req.json();

    if (!inviteId || !response) {
      return new Response(JSON.stringify({ error: 'Invite ID and response are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!fingerprint) {
      return new Response(JSON.stringify({ error: 'Fingerprint is required to prevent duplicate responses' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate response type
    const validResponses = ['in', 'maybe', 'out', 'suggest_change'];
    if (!validResponses.includes(response)) {
      return new Response(JSON.stringify({ error: 'Invalid response type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Recording response for invite:', inviteId);
    console.log('Response:', response, 'From:', responderName, 'Fingerprint:', fingerprint?.substring(0, 8));

    // Verify invite exists and hasn't expired
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select('id, expires_at')
      .eq('id', inviteId)
      .single();

    if (inviteError || !invite) {
      return new Response(JSON.stringify({ error: 'Invite not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'This invite has expired' }), {
        status: 410,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check for existing response with same fingerprint (spam prevention)
    const { data: existingResponse } = await supabase
      .from('invite_responses')
      .select('id')
      .eq('invite_id', inviteId)
      .eq('responder_fingerprint', fingerprint)
      .single();

    if (existingResponse) {
      return new Response(JSON.stringify({ 
        error: 'You have already responded to this invite',
        alreadyResponded: true 
      }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert the response
    const { data: responseData, error: insertError } = await supabase
      .from('invite_responses')
      .insert({
        invite_id: inviteId,
        responder_name: responderName || 'Guest',
        response,
        suggestion_json: suggestionJson || null,
        responder_fingerprint: fingerprint,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      // Handle unique constraint violation gracefully
      if (insertError.code === '23505') {
        return new Response(JSON.stringify({ 
          error: 'You have already responded to this invite',
          alreadyResponded: true 
        }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Response recorded:', responseData.id);

    return new Response(JSON.stringify({ 
      success: true,
      responseId: responseData.id,
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
