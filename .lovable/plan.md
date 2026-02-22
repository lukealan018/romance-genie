

## Voice-Powered Intelligent Plan Sequencing

This is a significant feature set that adds smart timing logic, event-first routing, and a confirmation UX to the voice search flow. Breaking it into 6 workstreams.

---

### Phase 1: Structured PlanRequest from interpret-voice (Part A)

**File: `supabase/functions/interpret-voice/index.ts`**

Extend the JSON schema the AI returns to include:
- `confidence` object with per-field confidence scores (0-1): `{ mode, location, datetime, activity, budget, overall }`
- `budgetSignal`: `"cheap"` | `"moderate"` | `"upscale"` | `null` -- extracted from phrases like "under $50", "nice place", "cheap eats"
- `constraints` object: `{ excludeFastFood: boolean, chainHandling: "soft" | "hard" | "none", maxBudgetDollars: number | null }`
- `planIntent`: `"dinner_and_show"` | `"dinner_and_activity"` | `"restaurant_only"` | `"activity_only"` | `"quick_bite"` | `null`

Add prompt examples:
- "Dinner and a concert Friday at 7" -> `planIntent: "dinner_and_show"`, `searchDate`, `searchTime: "19:00"`, `activityQueryBundles: ["concert","live music"]`
- "Cheap tacos, no chains" -> `constraints: { excludeFastFood: true, chainHandling: "hard" }`, `budgetSignal: "cheap"`
- "Nice place under 50 bucks" -> `budgetSignal: "moderate"`, `constraints: { maxBudgetDollars: 50 }`

The existing fields (`restaurantRequest`, `activityRequest`, `queryBundles`, etc.) stay unchanged -- this is purely additive.

**File: `src/hooks/useVoiceInput.ts`**

Map the new fields (`confidence`, `budgetSignal`, `constraints`, `planIntent`) into `VoicePreferences`.

---

### Phase 2: Ticketed Events First Routing (Part B)

**File: `src/hooks/useVoiceSearch.ts`**

In `executeSearch`, after checking `planIntent` or detecting show/concert/comedy/theater keywords in `activityQueryBundles`:

1. If show-intent detected, set `liveEventsOnly: true` on the first activity search call
2. If that returns 0 results, fall back to a second search with `liveEventsOnly: false` (current behavior)
3. Pass `searchDate` and `searchTime` to `activities-search` so events can be time-filtered

This is a ~15-line change in the activities search invocation block (around line 445).

---

### Phase 3: Time-Window Filter for Events (Part C)

**File: `supabase/functions/activities-search/index.ts`**

Add two new optional parameters:
- `scheduledTime`: `"HH:mm"` format
- `timeWindowMinutes`: number (default 180 = 3 hours)

After fetching results, filter Ticketmaster/Eventbrite events:
- Parse `eventDate` + `eventTime` into minutes
- Parse `scheduledTime` into minutes
- Keep events where `eventStartMinutes` is within `[scheduledMinutes, scheduledMinutes + timeWindowMinutes]`
- Non-event results (Google/Foursquare venues) pass through unfiltered

Add `eventStartMinutes` to each event result for downstream scoring.

---

### Phase 4: Plan Sequencing in buildPlan (Part D)

**File: `src/lib/planner.ts`**

Add a new export: `buildSequencedPlan()` that wraps `buildPlan()` with timing logic.

```text
buildSequencedPlan(params + scheduledTime + planIntent):
  IF planIntent === "dinner_and_show":
    1. Pick activity FIRST (show with earliest compatible start time)
    2. Compute latest dinner start = activityStartTime - DINNER_DURATION - TRAVEL_TIME
    3. Filter restaurants to those:
       - Open at computed dinner time
       - Within X miles of activity venue
    4. Score and pick best restaurant from filtered set
    5. If no restaurant fits timing:
       - Try "show first, dessert/cocktails after" ordering
       - Return planNarrative explaining the swap
  ELSE:
    - Use existing buildPlan() logic (restaurant first, then activity)
  
  RETURN:
    { restaurant, activity, distances, sequence, planNarrative, timing }
    sequence: "dinner_first" | "show_first"
    timing: { dinnerStart, dinnerEnd, travelTime, activityStart, activityEnd }
    planNarrative: "Dinner at 6:00 PM, 15 min drive, show starts at 8:00 PM"
```

Constants: `DINNER_DURATION = 90`, `TRAVEL_TIME = 15`, `DESSERT_DURATION = 45` (all in minutes).

**File: `src/hooks/useVoiceSearch.ts`**

When `planIntent === "dinner_and_show"`, call `buildSequencedPlan` instead of `buildPlan`.

**File: `src/pages/PlanPage.tsx`**

Display `planNarrative` as a subtle info banner above the plan cards when present.

---

### Phase 5: Date-Worthiness Restaurant Scoring (The "Nice Place" Problem)

**File: `src/lib/planner.ts` -- `scorePlaces` function**

Add a new scoring factor: `dateWorthinessBoost` (applied only when `planIntent === "dinner_and_show"` or mood is `"romantic"`):

Boost (+0.15 to +0.25):
- `priceLevel` >= moderate
- Name contains ambiance keywords: steakhouse, bistro, tapas, rooftop, lounge, wine bar, trattoria, brasserie, omakase

Penalize (-0.2 to -0.3):
- Name contains: deli, market, express, drive-thru, counter, grill (standalone)
- `priceLevel` === budget (when show-night context)
- Casual chain detection (already exists via `isChainRestaurant`)

This uses the existing `scorePlaces` weighting system -- just a new additive/subtractive factor alongside `learnedBoost`, `noveltyBoost`, etc.

---

### Phase 6: Voice Confirmation Chip Row (The "Magic" UX)

**File: `src/components/VoiceConfirmationBar.tsx`** (new)

A compact, single-line confirmation bar that appears after voice parsing but before search execution:

```text
"Friday 7:00 PM · LA · Dinner + Show · Budget: Usual · Vibe: Nice"
```

Each segment is a tappable chip. Tapping opens a quick-toggle:
- **Date**: mini calendar or quick options (Today/Tomorrow/This Weekend)
- **Location**: text input
- **Mode**: Dinner Only / Activity Only / Both
- **Budget**: Cheap / Usual / Upscale (single-tap toggle)
- **Vibe**: Chill / Fun / Romantic / Celebratory

Design: follows Romance Genie pill/chip system -- rounded, glow on theme accent, semi-transparent dark background, single horizontal scroll row.

**File: `src/hooks/useVoiceSearch.ts`**

Instead of immediately calling `executeSearch` after voice parsing:
1. Build the confirmation bar data from parsed preferences
2. Set `showConfirmationBar: true` + `pendingPreferences`
3. When user taps "Go" (or after 4-second auto-proceed timer), call `executeSearch`
4. If user taps a chip to change a value, update `pendingPreferences` and reset the timer

**File: `src/pages/Index.tsx`**

Render `<VoiceConfirmationBar>` between the hero section and results area when active.

---

### Summary of Files

| File | Change |
|------|--------|
| `supabase/functions/interpret-voice/index.ts` | Add confidence, budgetSignal, constraints, planIntent to schema |
| `src/hooks/useVoiceInput.ts` | Map new fields into VoicePreferences |
| `src/hooks/useVoiceSearch.ts` | Show-first routing, sequenced plan call, confirmation bar state |
| `supabase/functions/activities-search/index.ts` | Time-window filtering for events |
| `src/lib/planner.ts` | buildSequencedPlan + dateWorthinessBoost scoring |
| `src/pages/PlanPage.tsx` | Display planNarrative banner |
| `src/components/VoiceConfirmationBar.tsx` | New confirmation chip row component |
| `src/pages/Index.tsx` | Render VoiceConfirmationBar |

### No database changes required

All new data flows through existing voice -> search -> plan pipeline. The `scheduled_plans` table already stores everything needed.

### Suggested Implementation Order

1. Phase 1 (PlanRequest schema) -- foundation for everything else
2. Phase 3 (time-window filter) -- needed by Phase 4
3. Phase 2 (ticketed events routing) -- uses Phase 3
4. Phase 5 (date-worthiness scoring) -- independent, can parallel
5. Phase 4 (plan sequencing) -- depends on 1+3
6. Phase 6 (confirmation bar UX) -- depends on 1, can be done last

