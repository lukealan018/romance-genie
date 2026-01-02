import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RespondRequest {
  shareId: string;
  response: "in" | "maybe" | "tweak";
  tweakType?: "time" | "vibe" | "day";
  tweakNote?: string;
  responderName?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RespondRequest = await req.json();
    const { shareId, response, tweakType, tweakNote, responderName } = body;

    if (!shareId || !response) {
      return new Response(
        JSON.stringify({ error: "shareId and response are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["in", "maybe", "tweak"].includes(response)) {
      return new Response(
        JSON.stringify({ error: "Invalid response type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing response for share:", shareId, "response:", response);

    // Initialize Supabase client with service role for public access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the share exists and is not expired
    const { data: share, error: shareError } = await supabase
      .from("shared_plans")
      .select("id, created_by, expires_at, scheduled_plan_id")
      .eq("id", shareId)
      .maybeSingle();

    if (shareError || !share) {
      console.error("Share not found:", shareError);
      return new Response(
        JSON.stringify({ error: "Share not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if expired
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "This share link has expired" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert the response
    const { error: insertError } = await supabase
      .from("share_responses")
      .insert({
        share_id: shareId,
        response: response,
        tweak_type: tweakType,
        tweak_note: tweakNote,
        responder_name: responderName,
      });

    if (insertError) {
      console.error("Error inserting response:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create notification for the share creator
    let notificationMessage = "";
    const displayName = responderName || "Someone";
    
    switch (response) {
      case "in":
        notificationMessage = `${displayName} is in! 🎉`;
        break;
      case "maybe":
        notificationMessage = `${displayName} responded: Maybe 🤔`;
        break;
      case "tweak":
        const tweakInfo = tweakType ? ` (${tweakType})` : "";
        notificationMessage = `${displayName} wants to tweak${tweakInfo}: ${tweakNote || "No details"}`;
        break;
    }

    // Insert notification for the creator
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: share.created_by,
        scheduled_plan_id: share.scheduled_plan_id,
        notification_type: "share_response",
        title: "New Response to Your Shared Plan",
        message: notificationMessage,
        scheduled_for: new Date().toISOString(),
        delivery_method: "in_app",
      });

    if (notificationError) {
      console.error("Error creating notification:", notificationError);
      // Don't fail the request if notification fails
    }

    console.log("Response saved successfully for share:", shareId);

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
