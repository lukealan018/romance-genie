

# Fix: Vague Voice Prompts Should Always Return Results

## Problem

When a user says something vague like "find me something interesting to do" or "plan a fun night," the system returns nothing because:

1. The `interpret-voice` AI sets `needsClarification: true` with `mode: null` for vague prompts, which halts the search entirely and shows clarification chips
2. Even if clarification is bypassed, `searchActivity` ends up empty/undefined, causing `activities-search` to return a 400 error (keyword is required)
3. Similarly, `searchCuisine` being empty means restaurant search has no direction

A blank screen is never acceptable. Vague prompts should behave like an intelligent "Surprise Me" -- just find something good nearby.

## Solution

Two-part fix: update the edge function prompt to never clarify on genuinely vague prompts, and add frontend fallback defaults so searches always have keywords.

---

## Part 1: Update `interpret-voice` System Prompt

Add a new rule section to the system prompt:

**"VAGUE PROMPT HANDLING"** -- When the user's request is genuinely open-ended (e.g., "something fun," "plan a night," "find me something interesting," "what should we do"), do NOT set `needsClarification: true`. Instead:
- Set `mode: "both"`
- Set `intent: "surprise"`
- Set `noveltyLevel: "adventurous"`
- Set `restaurantQueryBundles` to a varied set like `["popular restaurant", "date night restaurant", "trendy restaurant"]`
- Set `activityQueryBundles` to a varied set like `["fun things to do", "nightlife", "entertainment"]`
- Set `mood` based on any contextual clues (default to `"fun"`)

Reserve `needsClarification` ONLY for genuinely ambiguous specific terms (e.g., "wings" where you truly cannot tell food vs. activity), not for open-ended requests.

## Part 2: Frontend Fallback Defaults in `useVoiceSearch.ts`

In the `executeSearch` function, add fallback keywords so searches never go out empty:

- **Restaurant search**: If `searchCuisine` is empty and mode includes restaurants, default the cuisine to an empty string (which places-search already handles as "general restaurant search") -- this already works, no change needed
- **Activity search**: If `searchActivity` is empty (line ~398) and mode includes activities, provide a sensible default keyword like `"fun things to do"` instead of `undefined`. This prevents the 400 error from activities-search.
- **Query bundles fallback**: If both `searchActivity` and `activityQueryBundles` are empty, inject default bundles like `["fun things to do", "nightlife", "entertainment"]`

## Part 3: Activities-Search Edge Function Tolerance

Update `activities-search/index.ts` to accept empty/missing keyword when `queryBundles` are provided. Currently line ~149 returns 400 if `!keyword`, but if bundles exist, the keyword isn't needed since each bundle is its own search.

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/interpret-voice/index.ts` | Add "VAGUE PROMPT HANDLING" section to system prompt |
| `src/hooks/useVoiceSearch.ts` | Add fallback keyword defaults when searchActivity is empty (~line 398) |
| `supabase/functions/activities-search/index.ts` | Allow empty keyword when queryBundles are provided |

## Technical Details

### interpret-voice prompt addition (abbreviated):
```
VAGUE PROMPT HANDLING:
When the user gives a broad, open-ended request with no specific venue type,
cuisine, or activity (e.g., "something fun", "plan a night out", "find me
something interesting", "what should we do tonight"), do NOT set
needsClarification to true. Instead treat it as a surprise/discovery request:
- mode: "both"
- intent: "surprise"  
- noveltyLevel: "adventurous"
- restaurantQueryBundles: ["popular restaurant", "date night restaurant", "trendy restaurant"]
- activityQueryBundles: ["fun things to do", "nightlife", "entertainment"]
Only use needsClarification for genuinely ambiguous SPECIFIC terms.
```

### useVoiceSearch.ts change (~line 393-408):
```typescript
// Fallback: ensure activity search always has a keyword
const activityKeyword = searchActivity || 'fun things to do';
const activityBundles = preferences.activityQueryBundles?.length > 0 
  ? preferences.activityQueryBundles 
  : (!searchActivity ? ['fun things to do', 'nightlife', 'entertainment'] : []);

// In the activities-search invoke:
keyword: activityKeyword,
queryBundles: activityBundles,
```

### activities-search/index.ts change (~line 149):
```typescript
// Allow empty keyword when queryBundles are provided
if (isNaN(lat) || isNaN(lng) || isNaN(radiusMiles) || (!keyword && queryBundles.length === 0)) {
  return new Response(
    JSON.stringify({ error: 'Missing required parameters: lat, lng, radiusMiles, and either keyword or queryBundles' }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

## Implementation Order

1. Update `interpret-voice` system prompt with vague prompt handling rules
2. Update `activities-search` to accept empty keyword when bundles exist
3. Add frontend fallback defaults in `useVoiceSearch.ts`
4. Deploy edge functions and test with vague prompts
