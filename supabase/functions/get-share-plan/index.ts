import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get shareId from URL or body
    const url = new URL(req.url);
    let shareId = url.searchParams.get("shareId");
    
    if (!shareId && req.method === "POST") {
      const body = await req.json();
      shareId = body.shareId;
    }

    if (!shareId) {
      return new Response(
        JSON.stringify({ error: "shareId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Fetching share plan:", shareId);

    // Initialize Supabase client with service role for public access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the shared plan with scheduled plan details
    const { data: share, error: shareError } = await supabase
      .from("shared_plans")
      .select(`
        id,
        share_context,
        sender_name,
        message,
        expires_at,
        created_at,
        scheduled_plan_id
      `)
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
    const isExpired = share.expires_at && new Date(share.expires_at) < new Date();

    // Fetch the scheduled plan details
    const { data: plan, error: planError } = await supabase
      .from("scheduled_plans")
      .select(`
        scheduled_date,
        scheduled_time,
        restaurant_name,
        restaurant_address,
        restaurant_website,
        activity_name,
        activity_address,
        activity_website,
        weather_forecast
      `)
      .eq("id", share.scheduled_plan_id)
      .maybeSingle();

    if (planError || !plan) {
      console.error("Scheduled plan not found:", planError);
      return new Response(
        JSON.stringify({ error: "Plan details not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch response counts
    const { data: responses, error: responsesError } = await supabase
      .from("share_responses")
      .select("response")
      .eq("share_id", shareId);

    const responseCounts = {
      in: 0,
      maybe: 0,
      tweak: 0,
    };

    if (responses && !responsesError) {
      responses.forEach((r) => {
        if (r.response === "in") responseCounts.in++;
        else if (r.response === "maybe") responseCounts.maybe++;
        else if (r.response === "tweak") responseCounts.tweak++;
      });
    }

    // Format the response (sanitized - no internal IDs or user info)
    const response = {
      shareId: share.id,
      shareContext: share.share_context,
      senderName: share.sender_name,
      message: share.message,
      scheduledDate: plan.scheduled_date,
      scheduledTime: plan.scheduled_time,
      restaurant: {
        name: plan.restaurant_name,
        address: plan.restaurant_address,
        website: plan.restaurant_website,
      },
      activity: {
        name: plan.activity_name,
        address: plan.activity_address,
        website: plan.activity_website,
      },
      weather: plan.weather_forecast,
      responses: responseCounts,
      isExpired: isExpired,
    };

    console.log("Returning share plan data for:", shareId);

    return new Response(
      JSON.stringify(response),
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
