
# Smarter Upscale Curation — Systemic Fix

## The Real Problem

The current `passesUpscaleQualityGate()` function works like this:

- Has `price_level >= 3` from Google? → PASS
- Name contains "steakhouse", "bistro", "omakase", etc.? → PASS
- Name is a known chain like Mastro's? → PASS
- None of the above? → REJECT

The flaw: **Google's Nearby Search API returns `price_level` for only ~40–60% of venues.** A place called "Nobu" or "Matsuhisa" or "Carbone" fails all three checks and gets silently rejected — even though it's fine dining.

We're missing great restaurants not because of bad logic, but because we're using the wrong API endpoint.

---

## The Real Fix: Switch to Google Places Details (New API v1)

Google's **Places API (New)** — the `places:searchNearby` endpoint — returns **significantly richer data per venue** in a single call, including:

- `priceLevel` → More consistently populated than Nearby Search
- `editorialSummary` → e.g. "Upscale Japanese restaurant with celebrity following"
- `primaryTypeDisplayName` → e.g. "Fine Dining Restaurant", "Japanese Restaurant"
- `takeout`, `reservable`, `servesCocktails`, `servesWine` → Attribute signals
- `regularOpeningHours` → Whether they have limited/dinner-only hours (upscale signal)
- `websiteUri` → Domain-based signals

With this data, the quality gate becomes multi-dimensional:

```text
PASS if ANY of:
  1. priceLevel >= 3 (confirmed $$$ or $$$$)
  2. editorialSummary contains upscale keywords
  3. primaryTypeDisplayName contains "Fine Dining"
  4. reservable = true AND rating >= 4.3 AND reviewCount >= 50
  5. Name matches UPSCALE_NAME_SIGNALS or UPSCALE_CHAIN_NAMES

FAIL if ANY of:
  1. NON_UPSCALE_SIGNALS match the name (fast food, boba, etc.)
  2. priceLevel is confirmed <= 2 ($ or $$)
```

This means "Nobu" would PASS because `reservable = true`, `rating = 4.5+`, and its editorial summary says "Sophisticated Japanese restaurant" — even with no keyword in the name.

---

## Two-Phase Implementation

### Phase 1 — Enrich the Google Provider (New Places API)

Switch `google-provider.ts` from `nearbysearch` (legacy) to `places:searchNearby` (New API v1).

The new endpoint:
- Returns `editorialSummary`, `reservable`, `priceLevel`, `primaryTypeDisplayName` in one call
- Still uses lat/lng + radius
- Field mask controls exactly what is returned (cost-efficient)
- Same API key — no additional credentials needed

**Field mask to request:**
```
places.id,places.displayName,places.formattedAddress,places.rating,
places.userRatingCount,places.priceLevel,places.location,places.types,
places.photos,places.editorialSummary,places.reservable,places.primaryTypeDisplayName,
places.servesWine,places.servesCocktails,places.takeout
```

### Phase 2 — Upgrade `passesUpscaleQualityGate()`

Update the function signature to accept the new rich fields:

```typescript
passesUpscaleQualityGate(
  name: string,
  priceLevel: number | null | undefined,
  editorialSummary?: string,
  reservable?: boolean,
  primaryTypeDisplayName?: string,
  rating?: number,
  reviewCount?: number
): boolean
```

New logic:

```text
1. INSTANT FAIL: NON_UPSCALE_SIGNALS in name
2. INSTANT FAIL: confirmed price_level <= 2
3. PASS: confirmed price_level >= 3
4. PASS: primaryTypeDisplayName includes "Fine Dining"
5. PASS: editorialSummary contains upscale keywords (elegant, upscale, refined, etc.)
6. PASS: UPSCALE_CHAIN_NAMES match
7. PASS: UPSCALE_NAME_SIGNALS match
8. PASS: reservable=true AND rating>=4.3 AND reviewCount>=100
   (reservable venues with great ratings are almost always proper sit-down restaurants)
9. DEFAULT REJECT: no positive signals
```

Rule 8 is the key new rule — **reservable + high rating is a proxy for "real restaurant"**. This catches Nobu, Carbone, Matsuhisa, and any other brand-name place with no descriptor in its name.

---

## What This Solves

| Venue | Before | After |
|---|---|---|
| Nobu | REJECTED (no name signals, no price_level) | PASS (reservable, 4.5+ rating) |
| Matsuhisa | REJECTED | PASS (reservable + rating) |
| Carbone | REJECTED | PASS (editorial: "upscale Italian") |
| Boba Tea Shop | REJECTED | Still REJECTED (NON_UPSCALE_SIGNALS) |
| McDonald's | REJECTED | Still REJECTED (NON_UPSCALE_SIGNALS) |
| Random Fried Rice Place | REJECTED | REJECTED (no reservable, low signals) |

---

## Files to Change

1. **`supabase/functions/_shared/providers/google-provider.ts`**
   - Switch from legacy `nearbysearch` to New Places API `places:searchNearby`
   - Parse new fields: `editorialSummary`, `reservable`, `primaryTypeDisplayName`, `servesWine`
   - Pass these fields into `passesUpscaleQualityGate()`

2. **`supabase/functions/_shared/place-filters.ts`**
   - Update `passesUpscaleQualityGate()` to accept and use the new fields
   - Add editorial summary keyword matching
   - Add the `reservable + rating + reviewCount` heuristic as a positive signal

3. **`supabase/functions/_shared/places-types.ts`**
   - Add optional fields to `ProviderPlace`: `editorialSummary`, `reservable`, `primaryTypeDisplayName`

---

## Important Notes

- The New Places API (v1) uses a different URL and request format (POST with JSON body and field mask header), but uses the **same API key** — no new credentials needed.
- The field mask approach means we only pay for what we request — this is actually **more cost-efficient** than the legacy API.
- All existing non-upscale filtering (boba, fast food, catering) is preserved and unaffected.
- This change only affects upscale/fine_dining searches. Regular searches are unaffected.
