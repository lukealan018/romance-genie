

# Smarter Result Rotation -- Stop Seeing the Same Places

## The Problem

When you search multiple times with similar prompts, the same 2-3 venues keep appearing at the top. This happens because:

1. The backend always sorts results by rating first, so the highest-rated places always float to the top
2. The frontend scoring is completely deterministic -- same inputs always produce the same ranking
3. Only the single displayed venue gets excluded per search, so the runner-up just takes its place next time

## The Fix -- Three Targeted Changes

### 1. Add randomness to surprise/voice scoring (frontend)
**File: `src/lib/planner.ts`**

Inject a random jitter factor into the scoring formula for surprise and flexible (voice) intents. This means even with the same set of results, the ranking shuffles each time. The jitter is small enough that terrible venues won't suddenly rank first, but large enough that the top 5-8 quality venues rotate who appears at #1.

- Surprise mode: add a random factor worth up to 20% of the score
- Voice/flexible mode: add a random factor worth up to 10%
- Specific/manual mode: no change (users expect consistent results)

### 2. Exclude top 3 displayed results, not just 1 (frontend)
**File: `src/hooks/useVoiceSearch.ts`**

Currently only the single displayed restaurant and activity get added to the exclusion list. Change this to exclude the top 3 from each category. This way, the next search genuinely cannot return those same venues, forcing deeper rotation into the result pool.

### 3. Backend shuffle for surprise mode (edge function)
**File: `supabase/functions/places-search/index.ts`**

Currently, surprise mode skips the seed-based shuffle and keeps results in strict score order. Change this to apply a weighted shuffle for surprise mode -- top-rated venues still have a higher chance of appearing first, but it's not guaranteed. This prevents the same venue from always being the #1 result from the API itself.

---

## Technical Details

### Change 1 -- `src/lib/planner.ts` (scoring randomness)

In the `scorePlaces` function, add a random jitter to the score calculation:

```typescript
// After calculating all score components (~line 250)
const randomJitter = (Math.random() - 0.5); // range: -0.5 to 0.5

if (intent === 'surprise') {
  score = 
    0.30 * noveltyBoost +
    0.25 * ratingNorm +
    0.15 * learnedBoost +
    0.10 * contextualBoost +
    0.10 * personalFit +
    0.05 * proximityNorm +
    0.20 * randomJitter +  // NEW: rotation jitter
    qualityPenalty;
} else if (intent !== 'specific') {
  // flexible/voice mode gets smaller jitter
  score += 0.10 * randomJitter;
}
```

The novelty weight drops slightly (0.35 to 0.30) to make room for the jitter. Rating weight stays the same so quality is still prioritized.

### Change 2 -- `src/hooks/useVoiceSearch.ts` (exclude top 3)

Replace lines 536-539 to exclude the top 3 results instead of just the first:

```typescript
const displayedRestaurantIds = sortedRestaurants.slice(0, 3).map(r => r.id);
const displayedActivityIds = sortedActivities.slice(0, 3).map(a => a.id);
addToExcludePlaceIds(displayedRestaurantIds);
addToExcludeActivityIds(displayedActivityIds);
```

### Change 3 -- `supabase/functions/places-search/index.ts` (weighted shuffle for surprise)

Replace the current surprise mode logic (which just truncates to top 15) with a weighted shuffle that uses rating as probability weight:

```typescript
} else if (surpriseMe) {
  // Weighted shuffle: higher-rated venues are more likely to appear first,
  // but not guaranteed -- ensures rotation across searches
  const weighted = items.map(item => ({
    item,
    weight: Math.pow(item.rating, 2) * Math.random()
  }));
  weighted.sort((a, b) => b.weight - a.weight);
  items.length = 0;
  items.push(...weighted.slice(0, 15).map(w => w.item));
}
```

## Implementation Order

1. Frontend scoring jitter (planner.ts) -- immediate rotation improvement
2. Exclude top 3 (useVoiceSearch.ts) -- deeper pool rotation
3. Backend weighted shuffle (places-search) -- variety from the API layer

All three changes are small and surgical. No new files, no new dependencies.
