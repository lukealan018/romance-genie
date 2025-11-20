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
- restaurantRequest: { type: string, location: string | null, priceLevel: string | null }
- activityRequest: { type: string, location: string | null, priceLevel: string | null }
- generalLocation: string | null
- energyLevel: "low" | "medium" | "high"
- mood: string
- constraints: array of dietary/preference constraints
- transcript: the original transcript
- intent: "surprise" | "specific" | "flexible" - Detect user's planning intent
- noveltyLevel: "safe" | "adventurous" | "wild" - How far outside comfort zone
- mustHaves: array of non-negotiable requirements
- avoidances: array of things to avoid

CRITICAL Rules:
1. **PRESERVE EXACT SPECIFICITY** - If user says "whiskey bar", return "whiskey bar" NOT "bar"
2. **Restaurants/Dining:** steakhouse, Italian restaurant, sushi, taco place, bistro, cafe, pizza, seafood, etc.
3. **Activities/Entertainment:** whiskey bar, cocktail lounge, wine bar, speakeasy, comedy club, bowling, movie theater, live music, karaoke, etc.
4. **Price Extraction:** Detect budget indicators:
   - "cheap", "affordable", "budget", "inexpensive" → "budget"
   - "upscale", "fancy", "fine dining", "luxury", "high-end" → "upscale"
   - "mid-range", "moderate" → "moderate"
   - If not mentioned → null
5. **Intent Detection:**
   - "surprise" → User wants novel/unexpected suggestions ("surprise me", "something different", "never been", "hidden gem")
   - "specific" → User has clear requirements ("I want", specific cuisine/place type, exact location)
   - "flexible" → User is open but has some preferences ("maybe", "something like", "open to")
6. **Novelty Level:**
   - "safe" → User wants quality but familiar (no explicit adventure keywords)
   - "adventurous" → User wants something different ("new", "different", "explore", "try something")
   - "wild" → User wants completely unexpected ("blow my mind", "crazy", "wildest", "never heard of")
7. **Must-Haves & Avoidances:** Extract explicit requirements and dislikes

Examples:

"steakhouse in Santa Monica and whiskey bar in Hollywood"
→ restaurantRequest: {type: "steakhouse", location: "Santa Monica", priceLevel: null}
→ activityRequest: {type: "whiskey bar", location: "Hollywood", priceLevel: null}
→ generalLocation: null

"cheap Mexican and bowling in Pasadena"
→ restaurantRequest: {type: "mexican", location: null, priceLevel: "budget"}
→ activityRequest: {type: "bowling", location: null, priceLevel: null}
→ generalLocation: "Pasadena"

"find me an upscale Italian spot and a speakeasy in downtown"
→ restaurantRequest: {type: "italian", location: null, priceLevel: "upscale"}
→ activityRequest: {type: "speakeasy", location: "downtown", priceLevel: null}
→ generalLocation: null

"fancy steakhouse Beverly Hills"
→ restaurantRequest: {type: "steakhouse", location: "Beverly Hills", priceLevel: "upscale"}
→ activityRequest: {type: "", location: null, priceLevel: null}
→ generalLocation: null
→ intent: "specific", noveltyLevel: "safe", mustHaves: ["upscale", "steakhouse"], avoidances: []

"surprise me with something wild"
→ restaurantRequest: {type: "", location: null, priceLevel: null}
→ activityRequest: {type: "", location: null, priceLevel: null}
→ generalLocation: null
→ intent: "surprise", noveltyLevel: "wild", mustHaves: [], avoidances: []

"something different but not too crazy, maybe Italian"
→ restaurantRequest: {type: "italian", location: null, priceLevel: null}
→ activityRequest: {type: "", location: null, priceLevel: null}
→ generalLocation: null
→ intent: "flexible", noveltyLevel: "adventurous", mustHaves: [], avoidances: ["too crazy"]

Be flexible: "pasta" = Italian, "tacos" = Mexican, "drinks" = bar, BUT preserve specific bar types like "whiskey bar", "wine bar", "cocktail lounge", "speakeasy"`;

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
    
    console.log('=== VOICE INTERPRETATION ===');
    console.log('Original transcript:', transcript);
    console.log('Extracted restaurant:', result.restaurantRequest);
    console.log('Extracted activity:', result.activityRequest);
    console.log('General location:', result.generalLocation);
    console.log('Intent:', result.intent);
    console.log('Novelty level:', result.noveltyLevel);
    console.log('Must-haves:', result.mustHaves);
    console.log('Avoidances:', result.avoidances);
    console.log('Price levels:', {
      restaurant: result.restaurantRequest?.priceLevel,
      activity: result.activityRequest?.priceLevel
    });
    console.log('===========================');

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
