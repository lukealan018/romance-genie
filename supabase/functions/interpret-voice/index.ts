import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, userProfile } = await req.json();

    if (!transcript) {
      throw new Error('No transcript provided');
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log('Interpreting voice input:', transcript);

    const systemPrompt = `You are a helpful date night planning assistant. Analyze the user's spoken input and extract their preferences for restaurants and activities.

${userProfile ? `User's saved preferences: ${JSON.stringify(userProfile)}` : ''}

Return a JSON object with these fields:
- cuisinePreferences: array of cuisine types mentioned (e.g., ["italian", "mexican"])
- activityPreferences: array of activity types (e.g., ["movie", "bowling", "museum"])
- energyLevel: "low" | "medium" | "high" (based on vibe)
- mood: string describing the mood
- constraints: array of any dietary restrictions or constraints mentioned
- locationMention: string with specific location if mentioned (e.g., "Beverly Hills", "downtown Los Angeles", "90210"), or null if no location mentioned
- transcript: the original transcript

Be flexible with language - "pasta" means Italian, "tacos" means Mexican, etc.
For locations, extract city names, neighborhood names, or ZIP codes mentioned.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcript }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI interpretation failed: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    
    console.log('Interpretation result:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('Error in interpret-voice function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
