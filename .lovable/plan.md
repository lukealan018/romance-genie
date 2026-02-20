

# Concierge Polish -- 6 UI Refinements

Transform the app from "search engine showing results" to "personal concierge presenting curated picks."

---

## 1. Remove Source Badges (Google/Foursquare)

Nobody cares which API found the venue. These technical badges break the premium illusion.

**Files:**
- `src/components/PlanCard.tsx` -- Remove the `restaurant.source` and `activity.source` badge blocks (lines 375-379 and 608-611) that show "Foursquare" / "Google"
- `src/components/RestaurantCard.tsx` -- Remove source badge block (lines 112-116)
- `src/components/ActivityCard.tsx` -- Remove source badge block that shows "Foursquare" / "Google" (keep the Ticketmaster "Live Event" badge since that's useful context, not a technical detail)

The Hidden Gem, New Discovery, Local Favorite, and Personal Match badges all stay -- those are concierge-style curation signals.

---

## 2. Replace Raw Ratings with Concierge Language

Instead of "4.7 (342)" which feels like a search engine, show warm descriptors.

**File: `src/components/PlanCard.tsx`**

Create a helper function `getConciergeRatingLabel`:
```typescript
const getConciergeRatingLabel = (rating: number, totalRatings: number): string => {
  if (rating >= 4.7 && totalRatings >= 500) return "Exceptional";
  if (rating >= 4.7) return "Highly Rated";
  if (rating >= 4.3 && totalRatings >= 200) return "Local Favorite";
  if (rating >= 4.3) return "Well Loved";
  if (rating >= 4.0) return "Great Pick";
  if (rating >= 3.5) return "Solid Choice";
  return "Worth a Try";
};
```

Replace the Star + number display (lines 366-369 for restaurant, 597-601 for activity) with:
```
<Star icon filled /> "Highly Rated"
```

No raw numbers. The concierge doesn't say "4.7 out of 5 based on 342 reviews" -- they say "this place is exceptional."

Apply the same treatment to `RestaurantCard.tsx` and `ActivityCard.tsx` (the list view cards).

---

## 3. Rename "Swap" to "Show Me Something Else"

The word "Swap" is transactional. A concierge says "let me show you another option."

**Files:**
- `src/components/PlanCard.tsx` -- Change both Swap buttons (lines 416 and 648) from "Swap" to "Something Else"
- `src/pages/PlanPage.tsx` -- Change "Swap Food" (lines 469, 493) to "Different Dinner" and "Swap Activity" (lines 478, 493) to "Different Activity"
- Also change "Reroll" button text (line 336) to "Start Fresh"

---

## 4. Add Venue Taglines

Generate a one-line "why this place" descriptor using existing data (category, price level, rating). No AI call needed -- pure pattern matching.

**File: `src/components/PlanCard.tsx`**

Add a helper function:
```typescript
const getVenueTagline = (place: Place, type: 'restaurant' | 'activity'): string => {
  const { rating, totalRatings, priceLevel, city, category } = place;
  
  if (place.isHiddenGem) return "A rare find most people don't know about";
  if (place.isLocalFavorite) return "A neighborhood staple locals swear by";
  
  if (type === 'restaurant') {
    if (priceLevel === '$$$$') return "Upscale dining for a special evening";
    if (priceLevel === '$$$' && rating >= 4.5) return "Refined dining with outstanding reviews";
    if (rating >= 4.7 && totalRatings >= 300) return "One of the highest-rated spots nearby";
    if (rating >= 4.5) return "Consistently impressive dining experience";
    return "A solid pick for tonight";
  }
  
  // Activity
  if (category === 'event') return "A live experience happening near you";
  if (rating >= 4.7 && totalRatings >= 200) return "A top-rated experience in the area";
  if (rating >= 4.5) return "Highly recommended by visitors";
  return "Something fun to round out your evening";
};
```

Display it as a subtle italic line below the venue name in the PlanCard, styled with `text-sm italic text-muted-foreground/80`.

---

## 5. Time-Aware Greetings

The hero section should feel contextual, not static.

**File: `src/components/hero-section.tsx`**

Add a time-aware greeting helper:
```typescript
const getTimeGreeting = (): { greeting: string; subtitle: string } => {
  const hour = new Date().getHours();
  if (hour < 12) return { greeting: "Good morning", subtitle: "Planning a brunch or daytime date?" };
  if (hour < 17) return { greeting: "Good afternoon", subtitle: "Getting ahead on tonight's plans?" };
  if (hour < 21) return { greeting: "Good evening", subtitle: "Let's find something perfect for tonight" };
  return { greeting: "Night owl?", subtitle: "Let's find a late-night spot" };
};
```

Replace the static "Welcome back," (line 203) and "Ready for tonight's adventure?" (line 209) with the dynamic greeting. The non-logged-in state stays as-is since it's already good.

---

## 6. Clean Up Plan Page Header

The Plan page header currently has a "Profile" button that doesn't belong on a results page -- it breaks the concierge flow.

**File: `src/pages/PlanPage.tsx`**

- Remove the Profile button (line 406) -- users access Profile from the home screen
- Keep the Share button and Back arrow
- The "Curated for You" center text stays -- it reinforces the concierge positioning

---

## Summary of Files Changed

| File | Changes |
|------|---------|
| `src/components/PlanCard.tsx` | Remove source badges, replace raw ratings, rename Swap, add taglines |
| `src/components/RestaurantCard.tsx` | Remove source badge, replace raw rating |
| `src/components/ActivityCard.tsx` | Remove source badge (keep Live Event), replace raw rating |
| `src/components/hero-section.tsx` | Time-aware greetings |
| `src/pages/PlanPage.tsx` | Remove Profile button, rename swap buttons |

No new files. No new dependencies. All changes are frontend-only.

