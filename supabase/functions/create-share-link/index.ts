import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateShareRequest {
  scheduledPlanId: string;
  shareContext?: string;
  inviteeCount?: number;
  message?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: CreateShareRequest = await req.json();
    const { scheduledPlanId, shareContext = "default", inviteeCount, message } = body;

    if (!scheduledPlanId) {
      return new Response(
        JSON.stringify({ error: "scheduledPlanId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Creating share link for plan:", scheduledPlanId, "by user:", user.id);

    // Verify user owns the scheduled plan
    const { data: plan, error: planError } = await supabase
      .from("scheduled_plans")
      .select("id, user_id")
      .eq("id", scheduledPlanId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (planError || !plan) {
      console.error("Plan not found or not owned by user:", planError);
      return new Response(
        JSON.stringify({ error: "Plan not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's nickname from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("nickname")
      .eq("user_id", user.id)
      .maybeSingle();

    const senderName = profile?.nickname || "Someone special";

    // Create the share record
    const { data: share, error: shareError } = await supabase
      .from("shared_plans")
      .insert({
        scheduled_plan_id: scheduledPlanId,
        created_by: user.id,
        share_context: shareContext,
        sender_name: senderName,
        invitee_count: inviteeCount,
        message: message,
      })
      .select("id")
      .single();

    if (shareError) {
      console.error("Error creating share:", shareError);
      return new Response(
        JSON.stringify({ error: "Failed to create share link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Share created successfully:", share.id);

    // Generate the share URL (using origin from request or fallback)
    const origin = req.headers.get("origin") || "https://romance-genie.lovable.app";
    const shareUrl = `${origin}/share/${share.id}`;

    return new Response(
      JSON.stringify({
        shareId: share.id,
        shareUrl: shareUrl,
      }),
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
