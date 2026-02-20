import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Get today's date for date extraction context
const today = new Date();
const todayStr = today.toISOString().split('T')[0];
const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });

// Helper to get next occurrence of a day
function getNextDayOfWeek(dayName: string): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const targetDay = days.indexOf(dayName.toLowerCase());
  if (targetDay === -1) return todayStr;
  
  const todayDay = today.getDay();
  let daysUntil = targetDay - todayDay;
  if (daysUntil <= 0) daysUntil += 7; // Next week if today or past
  
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + daysUntil);
  return targetDate.toISOString().split('T')[0];
}

// Helper to get tomorrow's date
function getTomorrow(): string {
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

// Get this weekend dates (Friday and Saturday)
function getWeekendDates(): { friday: string; saturday: string } {
  const friday = new Date(today);
  const saturday = new Date(today);
  
  const todayDay = today.getDay();
  const daysUntilFriday = (5 - todayDay + 7) % 7 || 7;
  const daysUntilSaturday = (6 - todayDay + 7) % 7 || 7;
  
  // If today is Friday, use today
  if (todayDay === 5) {
    friday.setDate(today.getDate());
  } else {
    friday.setDate(today.getDate() + daysUntilFriday);
  }
  
  // If today is Saturday, use today
  if (todayDay === 6) {
    saturday.setDate(today.getDate());
  } else {
    saturday.setDate(today.getDate() + daysUntilSaturday);
  }
  
  return {
    friday: friday.toISOString().split('T')[0],
    saturday: saturday.toISOString().split('T')[0]
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const transcript = body?.transcript;
    const userProfile = body?.userProfile;
    const currentWeather = body?.currentWeather; // { temperature, description, isRaining }

    if (!transcript) {
      throw new Error('No transcript provided');
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log('Interpreting voice input:', transcript);

    const systemPrompt = `You are a date night planning assistant. Parse natural language and extract structured information.

TODAY'S DATE CONTEXT:
- Today is ${dayOfWeek}, ${todayStr}
- Use this to calculate relative dates like "tomorrow", "Saturday", "this weekend"

DATE/TIME EXTRACTION:
Extract dates and times from the user's request. Return in the following format:
- searchDate: "YYYY-MM-DD" format or null if no date mentioned
- searchTime: "HH:mm" 24-hour format or null (default to "19:00" if date mentioned but no time)
- searchDateAmbiguous: true if date is ambiguous (e.g., "this weekend" could be Friday or Saturday)
- searchDateOptions: array of options if ambiguous, each with { date: "YYYY-MM-DD", time: "HH:mm", label: "friendly label" }

DATE KEYWORDS TO RECOGNIZE:
- "today", "tonight" → ${todayStr}
- "tomorrow" → calculate next day
- Day names: "Saturday", "Friday", "Sunday" → calculate next occurrence
- "this weekend" → AMBIGUOUS - return both Friday and Saturday options
- "next [day]" → calculate next week's occurrence

TIME KEYWORDS TO RECOGNIZE:
- "at 7pm", "7pm", "7:00", "seven" → "19:00"
- "at noon", "noon", "12pm" → "12:00"
- "lunch", "lunchtime" → "12:00"
- "dinner", "dinnertime", "evening" → "19:00"
- "late night" → "21:00"
- "tonight" → "20:00"

DATE EXTRACTION EXAMPLES:
1. "Find me sushi for Saturday at 7pm" → searchDate: next Saturday's date, searchTime: "19:00", searchDateAmbiguous: false
2. "Dinner tomorrow" → searchDate: tomorrow's date, searchTime: "19:00", searchDateAmbiguous: false
3. "Tacos this weekend" → searchDateAmbiguous: true, searchDateOptions: [{ date: Friday, time: "19:00", label: "Friday, December X at 7:00 PM" }, { date: Saturday, time: "19:00", label: "Saturday, December X at 7:00 PM" }]
4. "Tonight at 8" → searchDate: ${todayStr}, searchTime: "20:00", searchDateAmbiguous: false
5. "Italian restaurant" → searchDate: null (no date mentioned)
6. "Lunch on Friday" → searchDate: next Friday, searchTime: "12:00", searchDateAmbiguous: false

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
Entertainment: comedy club, comedy show, karaoke, movie theater, theater, comedy theater, live music, concert, improv show, magic show
Gaming: arcade, escape room, virtual reality, laser tag, barcade, board game cafe
Sports: bowling, pool hall, billiards, golf, mini golf, driving range, axe throwing, go karts, trampoline park, rock climbing, ice skating, roller skating, rage room
Arts: art gallery, museum, aquarium, zoo, botanical garden, observatory, planetarium, sculpture garden
Classes: painting class, art class, cooking class, wine tasting, pottery class, dance class, paint and sip, mixology class, candle making
Outdoor (Date-Worthy): rooftop bar, rooftop lounge, outdoor cinema, drive-in movie, sunset spot, scenic overlook, botanical garden, beach bonfire, outdoor concert, food truck park, farmers market, night market, pier, waterfront, wine tasting outdoors
Outdoor (Generic - use as last resort): park, beach, hiking, picnic
Unique Experiences: couples spa, escape room, speakeasy, secret bar, tasting menu, chef's table, immersive experience
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

COFFEE SHOP DETECTION (CRITICAL):
If transcript contains: "coffee", "café", "cafe", "espresso", "roasters", "roastery", "coffee shop", "latte", "cappuccino"
Set: venueType: "coffee", mode: "restaurant_only"
Coffee examples:
- "Find me a coffee shop" → { venueType: "coffee", mode: "restaurant_only" }
- "Good espresso nearby" → { venueType: "coffee", mode: "restaurant_only" }  
- "Cute café in Venice" → { venueType: "coffee", mode: "restaurant_only", restaurantRequest: { location: "Venice" } }
- "Coffee roasters" → { venueType: "coffee", mode: "restaurant_only" }

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

DATE EXTRACTION EXAMPLES:
18. "Sushi for Saturday at 7pm" → { restaurantRequest: { type: "sushi" }, searchDate: "next Saturday YYYY-MM-DD", searchTime: "19:00", searchDateAmbiguous: false }
19. "Dinner tomorrow evening" → { searchDate: "tomorrow YYYY-MM-DD", searchTime: "19:00", searchDateAmbiguous: false }
20. "Tacos this weekend" → { restaurantRequest: { type: "tacos" }, searchDateAmbiguous: true, searchDateOptions: [...] }
21. "Comedy club tonight" → { activityRequest: { type: "comedy club" }, searchDate: "${todayStr}", searchTime: "20:00", searchDateAmbiguous: false }

MORE STANDARD EXAMPLES:
22. "Upscale lounge bar" → { activityRequest: { type: "lounge bar", priceLevel: "upscale" }, intent: "specific" }
23. "Cheap tacos" → { restaurantRequest: { type: "tacos", priceLevel: "budget" }, intent: "specific" }
24. "Hidden gem sushi omakase" → { restaurantRequest: { type: "omakase" }, intent: "surprise", noveltyLevel: "adventurous" }

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

INTENT ROUTING & QUERY BUNDLES (CRITICAL NEW FEATURE):
Instead of just returning a venue "type", also return query bundles that control what searches run.
This prevents "steak dinner" from returning churrascarias, and "something outside" from returning hiking trails.

RULES:
1. If user says "steak" but does NOT say "Brazilian/churrascaria/rodizio":
   - restaurantSubtype: "classic_steakhouse"
   - restaurantQueryBundles: ["steakhouse","prime steakhouse","chophouse","dry aged steak","grill"]
   - negativeKeywords: ["churrascaria","rodizio","brazilian steakhouse"]

2. If user says "Brazilian steakhouse" / "churrascaria" / "rodizio":
   - restaurantSubtype: "brazilian_churrascaria"
   - restaurantQueryBundles: ["churrascaria","rodizio","brazilian steakhouse"]

3. If user says "outside" / "outdoors" / "open air" / "patio" and does NOT say "hike" / "trail" / "nature walk":
   - activitySubtype: "outdoor_nightlife"
   - activityQueryBundles: ["rooftop bar","patio cocktails","beer garden","outdoor live music","outdoor lounge","outdoor dining"]
   - negativeKeywords: ["hiking trail","campground","trailhead","nature center"]

4. If user says "hike" / "trail" / "nature walk" / "workout" / "adventure outdoors":
   - activitySubtype: "hiking"
   - activityQueryBundles: ["hiking trail","nature walk","scenic hike"]

5. For "sushi" → restaurantQueryBundles: ["sushi restaurant","sushi bar","omakase"]
6. For "Italian" → restaurantQueryBundles: ["italian restaurant","trattoria","italian bistro"]
7. For "Mexican" → restaurantQueryBundles: ["mexican restaurant","taqueria","cantina"]
8. For "bar" (generic) → activityQueryBundles: ["cocktail bar","lounge","bar","speakeasy"]
9. For "comedy" → activityQueryBundles: ["comedy club","comedy show","improv","stand up comedy"]
10. For "live music" → activityQueryBundles: ["live music venue","concert venue","jazz club","music bar"]

---

SYNONYM COLLISION RULES:
Some words have multiple meanings. Use surrounding context to disambiguate:

| Word | Context A (Food/Dining cues: "eat", "dinner", "hungry", "food") | Context B (Activity/Fun cues: "try", "fun", "adventure", "do") |
|------|------|------|
| "wings" | Restaurant: chicken wings → restaurantQueryBundles: ["chicken wings","wing bar","wings restaurant"] | Activity: indoor skydiving → activityQueryBundles: ["indoor skydiving","skydiving experience"] |
| "club" | Default (nightlife) → nightclub/dance club | Near "golf" → route to TopGolf/driving range, NOT golf course |
| "pool" | Near "bar","play","game" → pool hall/billiards → activityQueryBundles: ["pool hall","billiards","bar with pool tables"] | Near "swim","water","day" → swimming pool (exclude from date-night results) |
| "bar" | Default → cocktail bar/lounge | Near "monkey bars","pull-up bar","workout" → EXCLUDE (gym context, not a venue) |
| "garden" | Social context → beer garden or botanical garden | Near "home","plant","grow" → EXCLUDE (home gardening, not a venue) |
| "spot" | Generic filler word → IGNORE, use surrounding context for venue type |
| "joint" | Food context (near "burger","pizza","taco") → restaurant (burger joint) | Otherwise → IGNORE as slang filler |

Examples:
- "Let's get wings" → restaurant, chicken wings
- "I want to try wings" (no food context) → activity, indoor skydiving experience
- "Pool and drinks" → pool hall/billiards bar
- "Pool day" → swimming pool (likely exclude or suggest pool party venue)
- "Hit the club" → nightclub
- "Golf club" → TopGolf/driving range

---

COMPOUND PHRASE RECOGNITION:
Recognize these idiomatic compound phrases and route them as complete units — do NOT split them into individual words:

| Phrase | Interpretation |
|--------|---------------|
| "dinner and a show" | mode: "both", restaurant (general), activityQueryBundles: ["live music venue","theater","comedy club","dinner theater"] |
| "dinner and a movie" | mode: "both", restaurant (general), activityQueryBundles: ["movie theater","cinema","dine-in theater"] |
| "surf and turf" | mode: "restaurant_only", restaurantQueryBundles: ["surf and turf","seafood steakhouse","steak and lobster","steak and seafood"] |
| "wine and dine" | mode: "restaurant_only", priceLevel: "upscale", restaurantQueryBundles: ["wine bar restaurant","fine dining","wine pairing dinner"] |
| "Netflix and chill" | mode: "restaurant_only", mood: "chill", restaurantQueryBundles: ["takeout","delivery","casual restaurant","comfort food"] |
| "paint the town" / "paint the town red" | mode: "both", energyLevel: "high", intent: "surprise" |
| "pub crawl" | mode: "activity_only", activityQueryBundles: ["pub","bar","brewery","tavern","beer garden"] |
| "brunch and mimosas" | mode: "restaurant_only", restaurantQueryBundles: ["brunch","brunch spot","bottomless mimosas","breakfast restaurant"] |

---

SLANG & CULTURAL PHRASES:
Map subjective/slang terms to concrete search parameters:

| Slang | Maps To |
|-------|---------|
| "bougie" / "boujee" | priceLevel: "upscale", mood: "romantic" |
| "hole in the wall" | noveltyLevel: "adventurous", priceLevel: "budget", intent: "surprise" |
| "lowkey" / "low key" | energyLevel: "low", mood: "chill" |
| "turn up" / "go hard" / "lit" | energyLevel: "high", activityQueryBundles: ["nightclub","dance club","party venue","late night bar"] |
| "vibes" / "good vibes" | mood: "chill", intent: "flexible" |
| "fire" / "slaps" (as in "this place slaps") | noveltyLevel: "safe" (popular/well-reviewed places) |
| "extra" | priceLevel: "upscale", mood: "celebratory" |
| "chill spot" | energyLevel: "low", activityQueryBundles: ["lounge","wine bar","jazz bar","cafe"] |
| "pregame" / "pre-game" | activityQueryBundles: ["happy hour","bar","cocktail bar"], searchTime bias toward "17:00"-"19:00" |
| "afterparty" / "after party" | activityQueryBundles: ["late night bar","nightclub","after hours","late night lounge"], searchTime: "22:00"+ |
| "brunch vibes" | mode: "restaurant_only", restaurantQueryBundles: ["brunch","brunch spot","breakfast cafe"], searchTime: "11:00" |
| "sleeper" / "underrated" | noveltyLevel: "adventurous", intent: "surprise" |
| "no cap" (emphasis) | Treat as emphasis on the request, increase confidence in detected intent |

Examples:
- "bougie Italian place" → italian, priceLevel: "upscale", mood: "romantic"
- "lowkey spot for drinks" → energyLevel: "low", activityQueryBundles: ["lounge","wine bar","jazz bar"]
- "let's turn up tonight" → energyLevel: "high", activityQueryBundles: ["nightclub","dance club","party venue"]
- "find me a hole in the wall taco joint" → priceLevel: "budget", noveltyLevel: "adventurous", restaurantQueryBundles: ["taqueria","taco stand","street tacos"]

---

SPOKEN NEGATION PARSING:
Detect negation patterns in natural speech and extract them into negativeKeywords and avoidances.

Negation trigger phrases: "but not", "no", "without", "except", "nothing like", "not into", "just not", "anything but", "skip the", "hold the", "none of that"

Patterns:
- "[cuisine] but not [thing]" → negativeKeywords: [thing]
  Example: "Italian but not pizza" → cuisine: italian, negativeKeywords: ["pizza","pizzeria"]
- "[venue] but nothing too [adjective]" → interpret adjective as exclusion
  Example: "bar but nothing too loud" → type: bar, negativeKeywords: ["nightclub","dance club","rave"]
- "[type], no chains" → negativeKeywords: common chain names for that type
  Example: "steak, no chains" → negativeKeywords: ["outback","ruth's chris","longhorn","texas roadhouse","applebee's","chili's"]
- "[type], not all-you-can-eat" → negativeKeywords: ["buffet","all you can eat","ayce","unlimited"]
- "[cuisine], not [specific chain]" → negativeKeywords: [chain name] + similar chains
  Example: "Mexican, not Taco Bell" → negativeKeywords: ["taco bell","del taco","chipotle"] (fast food mexican)
- "outdoors, just not hiking" → outdoor bundles, negativeKeywords: ["hiking trail","trailhead","nature hike"]
- "something fun, not too expensive" → exclude priceLevel "upscale", set priceLevel: "moderate"
- "no [dietary item]" in food context → add to avoidances, NOT negativeKeywords
  Example: "Italian, no gluten" → avoidances: ["gluten"]

---

GROUP & OCCASION CONTEXT:
Detect social context and adjust search parameters accordingly. Also set the "occasion" and "groupContext" fields.

| Trigger Phrase | occasion | groupContext | Effect |
|----------------|----------|-------------|--------|
| "date night" / "romantic evening" / "anniversary" / "Valentine's" | "date_night" | "couple" | mood: "romantic", priceLevel: "upscale", restaurantQueryBundles biased toward: ["intimate restaurant","candlelit dining","romantic restaurant"] |
| "with the boys" / "guys night" / "boys night" | "guys_night" | "group" | mood: "fun", energyLevel: "high", activityQueryBundles: ["sports bar","bowling","arcade","beer garden","pool hall","barcade"] |
| "girls night" / "ladies night" / "with my girls" | "girls_night" | "group" | mood: "fun", activityQueryBundles: ["cocktail bar","wine bar","karaoke","paint and sip","rooftop bar"] |
| "family dinner" / "with the kids" / "family friendly" | "family" | "family" | mood: "chill", avoidances: ["bar","nightclub","hookah","21+"], restaurantQueryBundles biased toward: ["family restaurant","kid-friendly restaurant"] |
| "birthday" / "celebration" / "special occasion" | "celebration" | "group" | mood: "celebratory", priceLevel: "upscale", intent: "specific" |
| "first date" | "first_date" | "couple" | mood: "romantic", energyLevel: "medium", restaurantQueryBundles biased toward cozy/intimate but NOT overly formal |
| "double date" | "double_date" | "group" | mood: "fun", mode: "both" (dinner + activity) |
| "solo" / "just me" / "by myself" / "alone" | "solo" | "solo" | mood: "chill", activityQueryBundles: ["bar","movie theater","museum","cafe","bookstore cafe"] |
| "work event" / "corporate" / "team dinner" | "corporate" | "group" | mood: "chill", priceLevel: "moderate" to "upscale", avoidances: ["dive bar","nightclub"] |

---

WEATHER-AWARE OUTDOOR FALLBACKS:
${currentWeather ? `
CURRENT WEATHER DATA PROVIDED:
- Temperature: ${currentWeather.temperature}°F
- Conditions: ${currentWeather.description}
- Raining: ${currentWeather.isRaining ? 'YES' : 'NO'}

If the user requests outdoor activities or venues:
- If raining/storming (isRaining=true): Set weatherWarning: "It's currently raining — suggesting covered options", adjust activityQueryBundles to include "covered patio","indoor rooftop","enclosed beer garden","indoor entertainment" and add negativeKeywords: ["outdoor patio","open air","uncovered"]
- If very hot (temperature > 95°F): Set weatherWarning: "It's very hot outside — suggesting indoor or evening options", bias toward indoor venues or add searchTime bias toward evening (after 19:00)
- If very cold (temperature < 40°F): Set weatherWarning: "It's cold outside — suggesting cozy indoor options", bias toward indoor venues, add restaurantQueryBundles: ["cozy restaurant","fireside dining"] if applicable
- If weather is fine: Set weatherWarning: null, proceed normally
` : 'No weather data provided. Set weatherWarning: null.'}

AMBIGUITY / CLARIFICATION:
If the request is truly vague with no clear venue type (e.g., "something fun", "let's go out", "nice evening", "chill night"):
- Set needsClarification: true
- Provide 3-5 clarificationOptions as short chip labels
- Example: "something fun outside" → needsClarification: true, clarificationOptions: ["Rooftop bar","Patio dining","Outdoor concert","Scenic walk","Surprise me"]
- Example: "nice evening" → needsClarification: true, clarificationOptions: ["Fine dining","Cocktail lounge","Live music","Surprise me"]

Do NOT set needsClarification for specific requests like "steak dinner", "sushi", "comedy club" etc.

Return JSON with this structure:
{
  "restaurantRequest": { "type": "exact venue type from lists", "location": "city or null", "priceLevel": "budget|moderate|upscale|null" },
  "activityRequest": { "type": "exact venue type from lists", "location": "city or null", "priceLevel": "budget|moderate|upscale|null" },
  "restaurantSubtype": "classic_steakhouse|brazilian_churrascaria|null",
  "activitySubtype": "outdoor_nightlife|hiking|null",
  "restaurantQueryBundles": ["array of specific search terms for restaurant"],
  "activityQueryBundles": ["array of specific search terms for activity"],
  "negativeKeywords": ["terms to exclude from results"],
  "needsClarification": false,
  "clarificationOptions": [],
  "generalLocation": "city or area name or null",
  "mode": "both|restaurant_only|activity_only",
  "venueType": "any|coffee",
  "useCurrentLocation": false,
  "energyLevel": "low|medium|high",
  "mood": "string",
  "occasion": "date_night|guys_night|girls_night|family|celebration|first_date|double_date|solo|corporate|null",
  "groupContext": "couple|group|family|solo|null",
  "weatherWarning": "string or null",
  "constraints": ["dietary or preference constraints"],
  "transcript": "original transcript",
  "intent": "surprise|specific|flexible",
  "noveltyLevel": "safe|adventurous|wild",
  "mustHaves": ["required features"],
  "avoidances": ["things to avoid"],
  "searchDate": "YYYY-MM-DD or null",
  "searchTime": "HH:mm or null",
  "searchDateAmbiguous": false,
  "searchDateOptions": []
}

QUERY BUNDLE EXAMPLES:
- "steak dinner" → restaurantQueryBundles: ["steakhouse","prime steakhouse","chophouse","dry aged steak","grill"], negativeKeywords: ["churrascaria","rodizio"]
- "sushi date" → restaurantQueryBundles: ["sushi restaurant","sushi bar","omakase"], occasion: "date_night", mood: "romantic"
- "something outside tonight" → activityQueryBundles: ["rooftop bar","patio cocktails","beer garden","outdoor live music"], negativeKeywords: ["hiking trail","campground"]
- "comedy club" → activityQueryBundles: ["comedy club","comedy show","improv","stand up comedy"]
- "something fun" → needsClarification: true, clarificationOptions: ["Cocktail bar","Comedy club","Arcade","Live music","Surprise me"]
- "nice dinner" → needsClarification: true, clarificationOptions: ["Italian","Steakhouse","Sushi","Seafood","Surprise me"]
- "whiskey bar" → activityQueryBundles: ["whiskey bar","bourbon bar","scotch bar","craft cocktail bar"]
- "bougie sushi date night" → restaurantQueryBundles: ["sushi restaurant","omakase","high-end sushi"], priceLevel: "upscale", mood: "romantic", occasion: "date_night"
- "lowkey bar with the boys" → activityQueryBundles: ["sports bar","dive bar","pub","beer garden"], energyLevel: "low", occasion: "guys_night", groupContext: "group"
- "Italian but not pizza, no chains" → restaurantQueryBundles: ["italian restaurant","trattoria"], negativeKeywords: ["pizza","pizzeria","olive garden","carrabba's","maggiano's"]
- "dinner and a show for our anniversary" → mode: "both", occasion: "date_night", mood: "romantic", priceLevel: "upscale", activityQueryBundles: ["live music venue","theater","comedy club"]
- "hole in the wall tacos" → restaurantQueryBundles: ["taqueria","taco stand","street tacos"], priceLevel: "budget", noveltyLevel: "adventurous"
- "pregame drinks before the concert" → activityQueryBundles: ["happy hour","cocktail bar","bar"], searchTime: "17:00"

CRITICAL EXAMPLES for MODE DETECTION:
- "sushi and karaoke" → mode: "both"
- "dinner and bowling" → mode: "both"
- "just find me tacos" → mode: "restaurant_only"
- "looking for pizza" → mode: "restaurant_only"
- "casual place to eat" → mode: "restaurant_only"
- "I'm looking for something casual to eat" → mode: "restaurant_only"
- "whiskey bar" → mode: "activity_only"
- "comedy club tonight" → mode: "activity_only"
- "find a lounge" → mode: "activity_only"
- "coffee shop near me" → mode: "restaurant_only", venueType: "coffee"
- "good espresso in downtown" → mode: "restaurant_only", venueType: "coffee"
- "dinner and a movie" → mode: "both" (compound phrase)
- "pub crawl" → mode: "activity_only" (compound phrase)`;

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
    
    // Ensure new fields have defaults for backward compatibility
    if (!result.restaurantQueryBundles) result.restaurantQueryBundles = [];
    if (!result.activityQueryBundles) result.activityQueryBundles = [];
    if (!result.negativeKeywords) result.negativeKeywords = [];
    if (result.needsClarification === undefined) result.needsClarification = false;
    if (!result.clarificationOptions) result.clarificationOptions = [];
    if (!result.restaurantSubtype) result.restaurantSubtype = null;
    if (!result.activitySubtype) result.activitySubtype = null;
    if (!result.occasion) result.occasion = null;
    if (!result.groupContext) result.groupContext = null;
    if (result.weatherWarning === undefined) result.weatherWarning = null;
    
    console.log('=== VOICE INTERPRETATION ===');
    console.log('Original transcript:', transcript);
    console.log('Mode:', result.mode);
    console.log('Extracted restaurant:', result.restaurantRequest);
    console.log('Extracted activity:', result.activityRequest);
    console.log('Restaurant subtype:', result.restaurantSubtype);
    console.log('Activity subtype:', result.activitySubtype);
    console.log('Restaurant bundles:', result.restaurantQueryBundles);
    console.log('Activity bundles:', result.activityQueryBundles);
    console.log('Negative keywords:', result.negativeKeywords);
    console.log('Needs clarification:', result.needsClarification);
    console.log('Clarification options:', result.clarificationOptions);
    console.log('General location:', result.generalLocation);
    console.log('Intent:', result.intent);
    console.log('Novelty level:', result.noveltyLevel);
    console.log('Search date:', result.searchDate);
    console.log('Search time:', result.searchTime);
    console.log('Date ambiguous:', result.searchDateAmbiguous);
    console.log('Date options:', result.searchDateOptions);
    console.log('Must-haves:', result.mustHaves);
    console.log('Avoidances:', result.avoidances);
    console.log('Price levels:', {
      restaurant: result.restaurantRequest?.priceLevel,
      activity: result.activityRequest?.priceLevel
    });
    console.log('Occasion:', result.occasion);
    console.log('Group context:', result.groupContext);
    console.log('Weather warning:', result.weatherWarning);
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
