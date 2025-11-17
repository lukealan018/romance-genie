import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, answer, field } = await req.json();
    
    if (!question || !answer || !field) {
      throw new Error('Missing required fields');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build context-specific prompts based on field type
    const prompts: Record<string, string> = {
      cuisinePreferences: `Parse the user's answer about their favorite cuisines and foods. Extract cuisine types from their natural language response.
Common cuisines: italian, mexican, chinese, japanese, thai, indian, american, mediterranean, french, korean, vietnamese, greek, spanish, brazilian, middle_eastern, fusion.
User answer: "${answer}"

Return a JSON array of cuisine strings. Examples:
- "I love pasta and sushi" -> ["italian", "japanese"]
- "spicy food, noodles, tacos" -> ["thai", "chinese", "mexican"]
- "anything mediterranean" -> ["mediterranean", "greek"]

Return only the JSON array, nothing else.`,

      priceRange: `Parse the user's answer about their typical spending on a night out.
User answer: "${answer}"

Categorize into ONE of these exact strings: "budget", "moderate", "upscale", "luxury"
- budget: $, cheap, under $30, affordable
- moderate: $$, $30-60, reasonable, mid-range
- upscale: $$$, $60-100, nice, fancy
- luxury: $$$$, over $100, expensive, high-end

Return only the category string, nothing else.`,

      activityPreferences: `Parse the user's answer about what kind of activities they enjoy on nights out.
Common activities: live_music, comedy_shows, bars, nightclubs, karaoke, wine_tasting, arcade, bowling, theater, dancing, rooftop_bars, speakeasy, trivia, sports_bar, lounge.
User answer: "${answer}"

Return a JSON array of activity strings. Handle natural language:
- "I love seeing bands play" -> ["live_music"]
- "comedy and drinks" -> ["comedy_shows", "bars"]
- "dancing all night" -> ["dancing", "nightclubs"]

Return only the JSON array, nothing else.`,

      foodRules: `Parse the user's dietary restrictions or preferences.
Common restrictions: vegan, vegetarian, gluten_free, dairy_free, nut_free, halal, kosher, pescatarian, keto, paleo, no_restrictions.
User answer: "${answer}"

Return a JSON array of dietary restriction strings:
- "I'm vegan" -> ["vegan"]
- "no dairy or gluten" -> ["dairy_free", "gluten_free"]
- "I eat everything" -> ["no_restrictions"]

Return only the JSON array, nothing else.`,

      dealbreakers: `Parse what the user wants to avoid.
User answer: "${answer}"

Extract specific things they dislike as a JSON array of strings:
- "hate seafood" -> ["seafood"]
- "no loud places or sushi" -> ["loud_venues", "sushi"]
- "nothing, I'm open" -> []

Return only the JSON array, nothing else.`,

      occasionType: `Parse who the user typically goes out with.
Options: date_night, solo, friends, family, coworkers, mixed_group.
User answer: "${answer}"

Return ONE of the exact option strings based on their answer:
- "date night" -> "date_night"
- "with my partner" -> "date_night"
- "friends" -> "friends"
- "by myself" -> "solo"

Return only the string, nothing else.`,

      timePreference: `Parse what time of day they prefer to go out.
Options: brunch, lunch, happy_hour, dinner, late_night.
User answer: "${answer}"

Return ONE of the exact option strings:
- "evening drinks" -> "happy_hour"
- "late nights" -> "late_night"
- "morning mimosas" -> "brunch"

Return only the string, nothing else.`,

      planningStyle: `Parse their planning style.
Options: spontaneous, flexible, planner.
User answer: "${answer}"

Return ONE of the exact option strings:
- "I like to plan ahead" -> "planner"
- "go with the flow" -> "spontaneous"
- "sometimes plan, sometimes wing it" -> "flexible"

Return only the string, nothing else.`
    };

    const systemPrompt = prompts[field] || `Parse the user's answer: "${answer}" and return relevant data.`;

    // Call Lovable AI
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that parses natural language into structured data. Always return ONLY the requested format, no extra text or explanations.' },
          { role: 'user', content: systemPrompt }
        ],
        temperature: 0.3
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ 
        error: 'rate_limit',
        message: 'Too many requests. Please try again in a moment.' 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (response.status === 402) {
      return new Response(JSON.stringify({ 
        error: 'payment_required',
        message: 'AI service requires payment. Please contact support.' 
      }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const parsedContent = data.choices[0].message.content.trim();

    console.log('AI parsed result:', parsedContent);

    // Try to parse as JSON
    let result;
    try {
      result = JSON.parse(parsedContent);
    } catch (e) {
      // If not JSON, return as string (for single values like priceRange)
      result = parsedContent.replace(/['"]/g, '');
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-onboarding-answer:', error);
    return new Response(
      JSON.stringify({ 
        error: 'internal_error',
        message: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
