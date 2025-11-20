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

    const systemPrompt = `You are a helpful date night planning assistant. Parse the user's request and extract structured venue requests with their specific locations.

${userProfile ? `User's saved preferences: ${JSON.stringify(userProfile)}` : ''}

Return a JSON object with these fields:
- restaurantRequest: { type: string, location: string | null } - restaurant/dining venue type and its specific location if mentioned
- activityRequest: { type: string, location: string | null } - activity/entertainment venue type and its specific location if mentioned
- generalLocation: string | null - fallback location if no specific venue locations mentioned
- energyLevel: "low" | "medium" | "high" (based on vibe)
- mood: string describing the mood
- constraints: array of any dietary restrictions or constraints mentioned
- transcript: the original transcript

CRITICAL Classification Rules:
- Restaurants/Dining: steakhouse, Italian restaurant, sushi, taco place, bistro, cafe, pizza, burger joint, seafood, etc.
- Activities/Entertainment: bar, whiskey bar, cocktail lounge, wine bar, comedy club, bowling, movie theater, arcade, karaoke, etc.

Examples:
"steakhouse in Santa Monica and whiskey bar in Hollywood"
→ restaurantRequest: {type: "steakhouse", location: "Santa Monica"}
→ activityRequest: {type: "bar", location: "Hollywood"}
→ generalLocation: null

"Italian food in Beverly Hills"
→ restaurantRequest: {type: "italian", location: "Beverly Hills"}
→ activityRequest: {type: "", location: null}
→ generalLocation: null

"whiskey bar in downtown LA"
→ restaurantRequest: {type: "", location: null}
→ activityRequest: {type: "bar", location: "downtown LA"}
→ generalLocation: null

"Mexican and bowling in Pasadena"
→ restaurantRequest: {type: "mexican", location: null}
→ activityRequest: {type: "bowling", location: null}
→ generalLocation: "Pasadena"

Be flexible with language - "pasta" means Italian, "tacos" means Mexican, "drinks" means bar, etc.`;

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
