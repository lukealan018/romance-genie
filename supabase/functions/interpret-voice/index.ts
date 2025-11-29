import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const transcript = body?.transcript;
    const userProfile = body?.userProfile;

    if (!transcript) {
      throw new Error('No transcript provided');
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log('Interpreting voice input:', transcript);

    const systemPrompt = `You are a date night planning assistant. Parse natural language and extract structured information.

CRITICAL INSTRUCTION: Extract location PER venue type, not a general location.
- restaurantRequest.location should ONLY contain the restaurant's city/neighborhood
- activityRequest.location should ONLY contain the activity's city/neighborhood  
- Only use generalLocation if BOTH venues are explicitly in the same place
- When user mentions multiple locations, separate them by venue type

VOICE RECOGNITION ERROR HANDLING:
Common voice-to-text errors to ignore or correct:
- Filler words: "nice", "good", "great", "app", "scan", "something", "somewhere"
- Navigation words: "then", "after", "before", "driving to", "going to", "and also"
- Phonetic errors: "Beverley" → "Beverly", "whisky" → "whiskey", "delicate test" → "delicatessen"
- Focus ONLY on: [venue type] [price level] [location] patterns

When parsing:
1. Ignore all filler/navigation words
2. Extract venue types from the lists below
3. Extract locations that follow "in [location]" patterns
4. Match each location to its closest venue mention

VENUE TYPES TO RECOGNIZE:

RESTAURANTS (maintain exact type, don't simplify):
American: steakhouse, burger joint, burger, bbq, barbecue, diner, southern, soul food, cajun, tex-mex
Japanese: sushi, omakase, ramen, izakaya, japanese, teppanyaki, udon
Chinese: dim sum, hot pot, chinese, szechuan, cantonese
Korean: korean bbq, korean
Thai/Vietnamese: thai, vietnamese, pho
Other Asian: indian, filipino, indonesian
Italian: italian, pizza, trattoria
French: french, bistro, brasserie
European: spanish, tapas, greek, mediterranean, german, turkish
Latin: mexican, tacos, taqueria, burrito, brazilian, peruvian, cuban
Middle Eastern: middle eastern, lebanese, shawarma, falafel, ethiopian, moroccan
Seafood: seafood, oyster bar, raw bar, lobster, crab, poke
Dietary: vegan, vegetarian, healthy, salad
Styles: fine dining, tasting menu, gastropub, food hall, buffet, brunch, breakfast
Casual: cafe, coffee shop, bakery, sandwich, sandwich shop, sandwich joint, deli, delicatessen, pastrami, food truck, bagel shop

BARS/LOUNGES (maintain exact type):
Specialty: whiskey bar, cocktail bar, wine bar, speakeasy, tiki bar, gin bar, rum bar, sake bar, champagne bar
Style: sports bar, dive bar, rooftop bar, beach bar, hotel bar, piano bar, cigar bar
Beer: beer garden, brewery, brewpub, taproom, beer bar
Pubs: pub, irish pub, english pub, gastropub
Lounges: lounge, lounge bar, jazz lounge, hookah lounge, cocktail lounge
Nightlife: nightclub, dance club, live music venue, karaoke bar, comedy club

ACTIVITIES (maintain exact type):
Entertainment: comedy club, comedy show, karaoke, movie theater, theater, comedy theater, live music, concert
Gaming: arcade, escape room, virtual reality, laser tag
Sports: bowling, pool hall, billiards, golf, mini golf, driving range, axe throwing, go karts, trampoline park, rock climbing, ice skating, roller skating, rage room
Arts: art gallery, museum, aquarium, zoo, botanical garden, observatory, planetarium
Classes: painting class, art class, cooking class, wine tasting, pottery class, dance class, paint and sip
Outdoor: park, beach, hiking, picnic
Venues: casino, spa, sports game, stadium

PRICE DESCRIPTORS:
budget: cheap, affordable, inexpensive, budget-friendly, value, economical, hole in the wall
moderate: mid-range, moderate, decent, reasonable, fair price
upscale: fancy, fine dining, high-end, luxury, upscale, expensive, premium, michelin, tasting menu, elevated, sophisticated

IMMEDIACY DETECTION (determines if user wants current GPS location):
Set "useCurrentLocation": true when user says:
- "right now", "right here", "nearby", "around here", "close to me"
- "near me", "where I am", "around me", "in my area"

Set "useCurrentLocation": false (default) when:
- User specifies a location (city, ZIP, neighborhood)
- No immediacy indicator present (will use home location)

INTENT DETECTION:
"surprise" → surprise me, something different, hidden gem, never been, blow my mind, wildest, crazy, random, adventurous, new experience
"specific" → I want, find me, looking for, need, [specific place type], exact location mentioned, must have
"flexible" → maybe, something like, open to, whatever, doesn't matter, any, either way, suggest

MODE DETECTION (CRITICAL - determines what searches run):
"both" → mentions BOTH restaurant/dining AND activity (e.g., "sushi and karaoke", "dinner and movie", "tacos then bar")
"restaurant_only" → ONLY mentions restaurant/dining, no activity (e.g., "just find me tacos", "looking for pizza", "casual place to eat", "sandwich shop")
"activity_only" → ONLY mentions activity, no restaurant (e.g., "whiskey bar", "comedy club tonight", "find a lounge", "just looking for a bar")

NOVELTY LEVEL:
"safe" → favorite, usual, reliable, tried and true, classic, popular, well known
"adventurous" → something different, new, try something, explore, discover
"wild" → surprise me, blow my mind, craziest, wildest, most unique, never been

Examples - MULTI-LOCATION PARSING (CRITICAL):

DIFFERENT LOCATIONS PER VENUE:
1. "Fancy steakhouse in Beverly Hills whiskey bar in West Hollywood" 
   → { restaurantRequest: { type: "steakhouse", location: "Beverly Hills", priceLevel: "upscale" }, activityRequest: { type: "whiskey bar", location: "West Hollywood" } }

2. "Sushi in Santa Monica then cocktails in Venice"
   → { restaurantRequest: { type: "sushi", location: "Santa Monica" }, activityRequest: { type: "cocktail bar", location: "Venice" } }

3. "Italian restaurant in Hollywood then bowling in Pasadena"
   → { restaurantRequest: { type: "italian", location: "Hollywood" }, activityRequest: { type: "bowling", location: "Pasadena" } }

4. "Dinner in downtown LA bar in West Hollywood"
   → { restaurantRequest: { location: "downtown LA" }, activityRequest: { type: "bar", location: "West Hollywood" } }

5. "Steakhouse in Beverly Hills comedy club in Hollywood"
   → { restaurantRequest: { type: "steakhouse", location: "Beverly Hills" }, activityRequest: { type: "comedy club", location: "Hollywood" } }

6. "Ramen in Little Tokyo karaoke in Koreatown"
   → { restaurantRequest: { type: "ramen", location: "Little Tokyo" }, activityRequest: { type: "karaoke bar", location: "Koreatown" } }

7. "Pizza in Venice Beach arcade in Santa Monica"
   → { restaurantRequest: { type: "pizza", location: "Venice Beach" }, activityRequest: { type: "arcade", location: "Santa Monica" } }

8. "Tacos in downtown then rooftop bar in Hollywood"
   → { restaurantRequest: { type: "tacos", location: "downtown" }, activityRequest: { type: "rooftop bar", location: "Hollywood" } }

SAME LOCATION FOR BOTH:
9. "Italian and bowling in Hollywood"
   → { restaurantRequest: { type: "italian" }, activityRequest: { type: "bowling" }, generalLocation: "Hollywood" }

10. "Sushi and karaoke in Little Tokyo"
    → { restaurantRequest: { type: "sushi" }, activityRequest: { type: "karaoke bar" }, generalLocation: "Little Tokyo" }

ONLY RESTAURANT WITH LOCATION:
11. "Italian in Hollywood" → { restaurantRequest: { type: "italian", location: "Hollywood" } }
12. "Steakhouse in Beverly Hills" → { restaurantRequest: { type: "steakhouse", location: "Beverly Hills" } }

ONLY ACTIVITY WITH LOCATION:
13. "Bar in West Hollywood" → { activityRequest: { type: "bar", location: "West Hollywood" } }
14. "Comedy club downtown" → { activityRequest: { type: "comedy club", location: "downtown" } }

VOICE ERROR EXAMPLES (test filler word removal):
15. "nice app scan fancy steakhouse in Beverly Hills"
   → { restaurantRequest: { type: "steakhouse", location: "Beverly Hills", priceLevel: "upscale" } }

16. "good Italian somewhere in Santa Monica"
   → { restaurantRequest: { type: "italian", location: "Santa Monica" } }

17. "something great whiskey bar and also nice in West Hollywood"
   → { activityRequest: { type: "whiskey bar", location: "West Hollywood" } }

MORE STANDARD EXAMPLES:
18. "Upscale lounge bar" → { activityRequest: { type: "lounge bar", priceLevel: "upscale" }, intent: "specific" }
19. "Cheap tacos" → { restaurantRequest: { type: "tacos", priceLevel: "budget" }, intent: "specific" }
20. "Hidden gem sushi omakase" → { restaurantRequest: { type: "omakase" }, intent: "surprise", noveltyLevel: "adventurous" }

1. "Upscale lounge bar" → { activityRequest: { type: "lounge bar", priceLevel: "upscale" }, intent: "specific" }
2. "High-end restaurant in Brentwood" → { location: "Brentwood", restaurantRequest: { type: "restaurant", priceLevel: "upscale" }, intent: "specific" }
3. "Fancy steakhouse" → { restaurantRequest: { type: "steakhouse", priceLevel: "upscale" }, intent: "specific" }
4. "Cheap tacos" → { restaurantRequest: { type: "tacos", priceLevel: "budget" }, intent: "specific" }
5. "Hidden gem sushi omakase" → { restaurantRequest: { type: "omakase" }, intent: "surprise", noveltyLevel: "adventurous" }
6. "Dive bar with pool tables" → { activityRequest: { type: "pool hall", priceLevel: "budget" }, intent: "specific" }
7. "Rooftop bar downtown" → { activityRequest: { type: "rooftop bar" }, location: "downtown", intent: "specific" }
8. "Speakeasy with craft cocktails" → { activityRequest: { type: "speakeasy" }, intent: "specific" }
9. "Whiskey bar" → { activityRequest: { type: "whiskey bar" }, intent: "specific" }
10. "Jazz lounge" → { activityRequest: { type: "jazz lounge" }, intent: "specific" }
11. "Korean BBQ" → { restaurantRequest: { type: "korean bbq" }, intent: "specific" }
12. "Ramen house" → { restaurantRequest: { type: "ramen" }, intent: "specific" }
13. "Wine tasting" → { activityRequest: { type: "wine tasting" }, intent: "specific" }
14. "Comedy club" → { activityRequest: { type: "comedy club" }, intent: "specific" }
15. "Escape room" → { activityRequest: { type: "escape room" }, intent: "specific" }
16. "Italian bistro" → { restaurantRequest: { type: "trattoria" }, intent: "specific" }
17. "Sushi and cocktails" → { restaurantRequest: { type: "sushi" }, activityRequest: { type: "cocktail bar" }, intent: "specific" }
18. "Surprise me with something wild" → { intent: "surprise", noveltyLevel: "wild" }
19. "Best BBQ in town" → { restaurantRequest: { type: "bbq" }, intent: "specific", noveltyLevel: "safe" }
20. "Something different, never been" → { intent: "surprise", noveltyLevel: "adventurous" }
21. "Tiki bar with tropical drinks" → { activityRequest: { type: "tiki bar" }, intent: "specific" }
22. "Brewery with food" → { activityRequest: { type: "brewery" }, intent: "specific" }
23. "Paint and sip" → { activityRequest: { type: "paint and sip" }, intent: "specific" }
24. "Dim sum brunch" → { restaurantRequest: { type: "dim sum" }, intent: "specific" }
25. "Mexican cantina" → { restaurantRequest: { type: "mexican" }, intent: "specific" }
26. "Steakhouse and live music" → { restaurantRequest: { type: "steakhouse" }, activityRequest: { type: "live music" }, intent: "specific" }
27. "Casual burger joint" → { restaurantRequest: { type: "burger joint", priceLevel: "budget" }, intent: "specific" }
28. "Fine dining Italian" → { restaurantRequest: { type: "italian", priceLevel: "upscale" }, intent: "specific" }
29. "Thai food, spicy" → { restaurantRequest: { type: "thai" }, mustHaves: ["spicy"], intent: "specific" }
30. "Pho and bowling" → { restaurantRequest: { type: "pho" }, activityRequest: { type: "bowling" }, intent: "specific" }
31. "Gastropub" → { restaurantRequest: { type: "gastropub" }, intent: "specific" }
32. "Wine bar" → { activityRequest: { type: "wine bar" }, intent: "specific" }
33. "Sports bar for the game" → { activityRequest: { type: "sports bar" }, intent: "specific" }
34. "Axe throwing and beer" → { activityRequest: { type: "axe throwing" }, intent: "specific" }
35. "Mini golf" → { activityRequest: { type: "mini golf" }, intent: "specific" }
36. "Something romantic and upscale" → { restaurantRequest: { priceLevel: "upscale" }, intent: "flexible", mood: "romantic" }
37. "Brazilian steakhouse" → { restaurantRequest: { type: "brazilian" }, intent: "specific" }
38. "Hot pot" → { restaurantRequest: { type: "hot pot" }, intent: "specific" }
39. "Tapas and wine" → { restaurantRequest: { type: "tapas" }, activityRequest: { type: "wine bar" }, intent: "specific" }
40. "Karaoke bar" → { activityRequest: { type: "karaoke bar" }, intent: "specific" }
41. "Arcade bar" → { activityRequest: { type: "arcade" }, intent: "specific" }
42. "Vegan restaurant" → { restaurantRequest: { type: "vegan" }, intent: "specific" }
43. "Lebanese food" → { restaurantRequest: { type: "lebanese" }, intent: "specific" }
44. "Indian curry" → { restaurantRequest: { type: "indian" }, intent: "specific" }
45. "Oyster bar" → { restaurantRequest: { type: "oyster bar" }, intent: "specific" }
46. "Pizza and beer" → { restaurantRequest: { type: "pizza" }, intent: "specific" }
47. "French bistro" → { restaurantRequest: { type: "bistro" }, intent: "specific" }
48. "Hookah lounge" → { activityRequest: { type: "hookah lounge" }, intent: "specific" }
49. "Cocktail lounge" → { activityRequest: { type: "cocktail lounge" }, intent: "specific" }
50. "Movie theater" → { activityRequest: { type: "movie theater" }, intent: "specific" }

Return JSON with this structure:
{
  "restaurantRequest": { "type": "exact venue type from lists", "location": "city or null", "priceLevel": "budget|moderate|upscale|null" },
  "activityRequest": { "type": "exact venue type from lists", "location": "city or null", "priceLevel": "budget|moderate|upscale|null" },
  "generalLocation": "city or area name or null",
  "mode": "both|restaurant_only|activity_only",
  "useCurrentLocation": false,
  "energyLevel": "low|medium|high",
  "mood": "string",
  "constraints": ["dietary or preference constraints"],
  "transcript": "original transcript",
  "intent": "surprise|specific|flexible",
  "noveltyLevel": "safe|adventurous|wild",
  "mustHaves": ["required features"],
  "avoidances": ["things to avoid"]
}

CRITICAL EXAMPLES for MODE DETECTION:
- "sushi and karaoke" → mode: "both"
- "dinner and bowling" → mode: "both"
- "just find me tacos" → mode: "restaurant_only"
- "looking for pizza" → mode: "restaurant_only"
- "casual place to eat" → mode: "restaurant_only"
- "I'm looking for something casual to eat" → mode: "restaurant_only"
- "whiskey bar" → mode: "activity_only"
- "comedy club tonight" → mode: "activity_only"
- "find a lounge" → mode: "activity_only"`;

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
    const content = data?.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('AI response missing content:', JSON.stringify(data));
      throw new Error('Invalid AI response: missing content');
    }
    
    const result = JSON.parse(content);
    
    console.log('=== VOICE INTERPRETATION ===');
    console.log('Original transcript:', transcript);
    console.log('Mode:', result.mode);
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
