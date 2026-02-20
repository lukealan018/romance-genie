

# Elevate Result Quality: Kill Cafes, Prioritize Date-Worthy Venues

## The Core Problem

Romance Genie is a **curated experience concierge**, not a search engine. Right now, cafes and low-effort venues leak into results because the system treats them as valid restaurants. A cafe is only appropriate when someone explicitly asks for coffee (which we already handle with the Coffee Shops toggle). In every other context, suggesting a cafe for an outing is like a concierge recommending a gas station.

## What Changes

### 1. Block cafes from general restaurant results (backend)
**File: `supabase/functions/_shared/providers/google-provider.ts`**

- Remove `'cafe'` from the restaurant name allowlist (line 57) so cafe-named venues no longer bypass filtering
- Add cafe/coffee-related names to the **exclusion** list when `venueType !== 'coffee'`
- This means "Blue Bottle Coffee", "The Daily Cafe", "Sunrise Cafe" will be filtered out of dinner/outing searches but still appear when someone uses the Coffee Shops toggle

### 2. Remove `'cafe'` from RESTAURANT_TYPES (backend)
**File: `supabase/functions/_shared/place-filters.ts`**

- Remove `'cafe'` from the `RESTAURANT_TYPES` array (line 86) so venues typed as `cafe` by Google don't get classified as "primarily a restaurant" and slip through activity filters either
- Add a new `CAFE_EXCLUSION_KEYWORDS` list for name-based filtering: `cafe, café, coffee, espresso, roasters, coffeehouse`

### 3. Add a "date-night quality floor" to restaurant scoring (backend)
**File: `supabase/functions/places-search/index.ts`**

- In the final sort, add a penalty for venues with very low review counts (under 30) unless they're in hidden_gems mode
- This prevents obscure, untested venues from ranking alongside proven options
- Keeps the hidden gems path open for adventurous users while filtering noise for everyone else

### 4. Exclude low-effort venue types from activity results (backend)  
**File: `supabase/functions/_shared/place-filters.ts`**

- Add to `EXCLUDED_ACTIVITY_TYPES`: `'cafe'`, `'bakery'`
- These should never appear as "activities" — they're not outings

### 5. Foursquare cafe filtering (backend)
**File: `supabase/functions/_shared/providers/foursquare-provider.ts`**

- When `venueType !== 'coffee'`, exclude Foursquare category IDs `13034` (Coffee Shop) and `13035` (Cafe) from restaurant results
- This mirrors the Google-side fix for the other provider

---

## Technical Details

### Change 1 -- `google-provider.ts` (lines 56-66)
Remove `'cafe'` from the allowlist and add cafe exclusion for non-coffee searches:

```typescript
const restaurantKeywords = [
  'restaurant', 'bistro', 'steakhouse', 'trattoria', 
  'brasserie', 'eatery', 'dining', 'grill', 'kitchen', 
  'tavern', 'pub', 'diner', 'bar & grill', 'ristorante', 'osteria'
  // 'cafe' REMOVED -- only valid when venueType === 'coffee'
];

// NEW: Exclude cafe/coffee venues from non-coffee searches
if (!isCoffeeSearch) {
  const cafePatterns = /\bcafe\b|\bcafé\b|\bcoffee\b|\bespresso\b|\broasters?\b|\bcoffeehouse\b/i;
  if (cafePatterns.test(name) && !name.includes('bistro') && !name.includes('kitchen') && !name.includes('grill')) {
    console.log(`☕🚫 Google: Filtering out "${placeName}" - cafe/coffee venue in non-coffee search`);
    return true;
  }
}
```

### Change 2 -- `place-filters.ts` (line 86)
```typescript
export const RESTAURANT_TYPES: string[] = [
  'restaurant', 'food', 'meal_takeaway', 'meal_delivery', 'bakery',
  // 'cafe' REMOVED - cafes are only valid for coffee-specific searches
];
```

### Change 3 -- `place-filters.ts` (EXCLUDED_ACTIVITY_TYPES, line 57-67)
Add `'cafe'` and `'bakery'` to the excluded activity types list.

### Change 4 -- `foursquare-provider.ts`
When `venueType !== 'coffee'`, filter results whose primary category is Coffee Shop (13034) or Cafe (13035):

```typescript
// After building results, exclude cafe/coffee venues for non-coffee searches
if (venueType !== 'coffee') {
  results = results.filter(r => {
    const isCafeCategory = r.categories.some(c => 
      ['13034', '13035'].includes(c) || 
      c.toLowerCase().includes('coffee') || c.toLowerCase().includes('café')
    );
    if (isCafeCategory) {
      console.log(`☕🚫 Foursquare: Filtering "${r.name}" - cafe in non-coffee search`);
      return false;
    }
    return true;
  });
}
```

### Change 5 -- `places-search/index.ts` (quality floor in sort)
Add review count awareness to the sort to prevent untested venues from surfacing:

```typescript
.sort((a, b) => {
  // Quality floor: penalize venues with very few reviews (except hidden_gems mode)
  const aHasEnoughReviews = a.totalRatings >= 30 || noveltyMode === 'hidden_gems';
  const bHasEnoughReviews = b.totalRatings >= 30 || noveltyMode === 'hidden_gems';
  if (aHasEnoughReviews !== bHasEnoughReviews) {
    return aHasEnoughReviews ? -1 : 1; // Prefer venues with enough reviews
  }
  
  // ... existing rating/price/uniqueness sort
})
```

## Deployment

All changes are in edge functions, so `places-search` needs redeployment. No frontend changes needed -- the filtering happens entirely server-side.

## What This Does NOT Change

- Coffee Shops toggle still works exactly as before (venueType='coffee' bypasses all cafe filters)
- Brunch search still works (cafes that serve brunch have separate handling)
- Hidden gems mode still surfaces unique low-review spots
- Fine dining chains (Mastro's, Ruth's Chris, etc.) remain allowed

