
# Voice Search Intelligence Upgrade

## Overview
Enhance the `interpret-voice` edge function and supporting hooks to handle synonym collisions, compound phrases, slang/cultural terms, spoken negations, group/occasion context, and weather-aware outdoor fallbacks.

---

## 1. Synonym Collision Handling

Add disambiguation rules to the `interpret-voice` system prompt for words with multiple meanings:

| Word | Context A | Context B |
|------|-----------|-----------|
| "wings" | Food context (near "eat", "dinner", "hungry") -> restaurant: chicken wings | Activity context (near "try", "fun", "adventure") -> activity: skydiving/indoor skydiving |
| "club" | Nightlife context (default) -> nightclub/dance club | Sport context (near "golf") -> golf club (excluded or routed to TopGolf) |
| "pool" | Social context (near "bar", "play", "game") -> pool hall/billiards | Leisure context (near "swim", "water", "day") -> swimming pool |
| "bar" | Default -> cocktail bar/lounge | Near "monkey bars", "pull-up bar" -> gym (excluded) |
| "garden" | Social context -> beer garden / botanical garden | Near "home", "plant" -> exclude (home gardening) |
| "spot" | Generic filler word -> ignore, use surrounding context |
| "joint" | Food context -> restaurant (burger joint) | Otherwise -> ignore |

**Implementation:** Add a "SYNONYM COLLISION RULES" section to the system prompt with context-matching instructions and examples.

---

## 2. Compound Phrase Logic

Teach the AI to recognize idiomatic compound phrases and route them correctly:

| Phrase | Interpretation |
|--------|---------------|
| "dinner and a show" | mode: "both", restaurant (general), activity: live music/theater/comedy |
| "dinner and a movie" | mode: "both", restaurant (general), activity: movie theater |
| "surf and turf" | mode: "restaurant_only", restaurantQueryBundles: ["surf and turf", "seafood steakhouse", "steak and lobster"] |
| "wine and dine" | mode: "restaurant_only", priceLevel: "upscale", restaurantQueryBundles: ["wine bar restaurant", "fine dining", "wine pairing dinner"] |
| "Netflix and chill" | mode: "restaurant_only" (takeout-friendly), mood: "chill", restaurantQueryBundles: ["takeout", "delivery", "casual"] |
| "paint the town" | mode: "both", energyLevel: "high", intent: "surprise" |
| "pub crawl" | mode: "activity_only", activityQueryBundles: ["pub", "bar", "brewery", "tavern"] |

**Implementation:** Add a "COMPOUND PHRASE RECOGNITION" section to the system prompt with these mappings.

---

## 3. Slang and Cultural Phrase Recognition

Map subjective/slang terms to concrete search parameters:

| Slang | Maps To |
|-------|---------|
| "bougie" / "boujee" | priceLevel: "upscale", mood: "romantic" |
| "hole in the wall" | noveltyLevel: "adventurous", priceLevel: "budget", intent: "surprise" |
| "lowkey" / "low key" | energyLevel: "low", mood: "chill" |
| "turn up" / "go hard" / "lit" | energyLevel: "high", activityQueryBundles: ["nightclub", "dance club", "party"] |
| "vibes" / "good vibes" | mood: "chill", intent: "flexible" |
| "fire" / "slaps" | noveltyLevel: "safe" (popular/well-reviewed) |
| "extra" | priceLevel: "upscale", mood: "celebratory" |
| "chill spot" | energyLevel: "low", activityQueryBundles: ["lounge", "wine bar", "jazz bar"] |
| "pregame" | activityQueryBundles: ["happy hour", "bar", "cocktail bar"], early evening bias |
| "afterparty" | activityQueryBundles: ["late night bar", "nightclub", "after hours"], searchTime: "22:00"+ |
| "brunch vibes" | mode: "restaurant_only", restaurantQueryBundles: ["brunch", "brunch spot", "breakfast"], searchTime: "11:00" |

**Implementation:** Add a "SLANG & CULTURAL PHRASES" section to the system prompt.

---

## 4. Spoken Negation Parsing

Enhance the AI to detect and extract negations from natural speech:

**Patterns to recognize:**
- "Italian but not pizza" -> cuisine: italian, negativeKeywords: ["pizza", "pizzeria"]
- "bar but nothing too loud" -> type: bar, negativeKeywords: ["nightclub", "dance club"]
- "steak, no chains" -> type: steakhouse, negativeKeywords: all chain names from place-filters.ts
- "sushi, not all-you-can-eat" -> type: sushi, negativeKeywords: ["buffet", "all you can eat", "ayce"]
- "Mexican, not Taco Bell" -> type: mexican, negativeKeywords: ["taco bell"] + fast food chains
- "outdoors, just not hiking" -> outdoor_nightlife bundles, negativeKeywords: hiking terms
- "something fun, not too expensive" -> priceLevel excludes "upscale"

**Implementation:** Add a "SPOKEN NEGATION PARSING" section with pattern examples. The AI already returns `negativeKeywords` and `avoidances` -- this just teaches it to populate them from natural speech patterns like "but not", "no", "without", "except", "nothing like", "not into".

---

## 5. Group/Occasion Context Detection

Detect social context from voice input and adjust search parameters:

| Trigger Phrase | Effect |
|----------------|--------|
| "date night" / "romantic evening" / "anniversary" / "Valentine's" | mood: "romantic", priceLevel: "upscale", restaurantQueryBundles biased toward intimate venues |
| "with the boys" / "guys night" / "boys night" | mood: "fun", energyLevel: "high", activityQueryBundles: ["sports bar", "bowling", "arcade", "beer garden", "pool hall"] |
| "girls night" / "ladies night" | mood: "fun", activityQueryBundles: ["cocktail bar", "wine bar", "karaoke", "paint and sip", "rooftop bar"] |
| "family dinner" / "with the kids" / "family friendly" | mood: "chill", avoidances: ["bar", "nightclub", "hookah"], restaurantQueryBundles biased toward family restaurants |
| "birthday" / "celebration" / "special occasion" | mood: "celebratory", priceLevel: "upscale", intent: "specific" |
| "first date" | mood: "romantic", energyLevel: "medium", restaurantQueryBundles biased toward cozy/intimate but not overly formal |
| "double date" | mood: "fun", mode: "both" (dinner + activity) |
| "solo" / "just me" / "by myself" | mood: "chill", activityQueryBundles: ["bar", "movie theater", "museum", "cafe"] |

**Implementation:** Add a "GROUP & OCCASION CONTEXT" section to the system prompt. Also add an `occasion` field to the response schema (already partially supported via `mood`).

---

## 6. Weather-Aware Outdoor Fallbacks

When user requests outdoor activities, cross-reference with available weather data to provide smart suggestions:

**Frontend change (useVoiceSearch.ts):**
- Before calling `interpret-voice`, fetch current weather from the store/hook
- Pass `currentWeather: { temperature, description, isRaining }` in the request body

**Edge function change (interpret-voice):**
- If weather data is provided AND user requests outdoor activities:
  - If raining/storming: set `weatherWarning: "It's currently raining -- suggesting covered options"`, adjust bundles to include "covered patio", "indoor rooftop", "enclosed beer garden"
  - If very hot (>95F): bias toward indoor or evening options
  - If very cold (<40F): bias toward indoor options
- Add `weatherWarning` (string | null) to response schema

**Frontend display:**
- Show a small toast or inline note when `weatherWarning` is present

---

## 7. Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/interpret-voice/index.ts` | Add 6 new prompt sections (synonym collisions, compound phrases, slang, negations, group context, weather awareness). Add `occasion`, `groupContext`, `weatherWarning` to response schema. Accept `currentWeather` in request body. |
| `src/hooks/useVoiceSearch.ts` | Pass weather data to interpret-voice call. Handle `weatherWarning` in response (show toast). Handle new `occasion`/`groupContext` fields for downstream scoring. |
| `src/hooks/useVoiceInput.ts` | Pass weather data through to the edge function call. |
| `src/components/ClarificationChips.tsx` | No changes needed -- already handles dynamic options. |

---

## 8. Implementation Order

1. Update `interpret-voice` system prompt with all 6 new sections
2. Add `currentWeather` to the request body accepted by `interpret-voice`
3. Add new response fields (`occasion`, `groupContext`, `weatherWarning`) with defaults
4. Update `useVoiceInput.ts` to pass weather data to the edge function
5. Update `useVoiceSearch.ts` to read weather from store and pass it, plus handle `weatherWarning` toast
6. Deploy and test with various voice commands
