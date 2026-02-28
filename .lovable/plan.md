

# Wrap-Around Venue Cycling

## Problem
When you tap the swap button and reach the end of cached results, the app tries to fetch fresh ones. If none are found (common for niche searches like "live jazz"), you get an "End of list" toast and are stuck on the last item with no way to revisit earlier options.

## Solution
Make the swap buttons **cycle through results in a loop**. When you reach the last cached venue and tap swap again, it wraps back to the first option instead of trying to fetch fresh results that may not exist. This means:

- You can never get "stuck" -- tapping swap always shows a different venue
- If there are only 2 results, swap toggles between them
- If there's only 1 result, swap shows a toast saying "This is the only option in this area" instead of silently doing nothing

The fresh-fetch behavior (calling the API for more results) will be removed from the swap button since the "Start Fresh" / reroll button already handles that use case.

## Technical Changes

**File: `src/hooks/useSwapVenue.ts`**

- `handleSwapRestaurant`: Instead of fetching fresh results when `restaurantIndex + 1 >= length`, wrap the index back to `0` using modulo arithmetic (`(index + 1) % length`). If only 1 result exists, show a "only option" toast.
- `handleSwapActivity`: Same wrap-around logic for activities.
- Remove the `supabase.functions.invoke` fresh-fetch calls from both handlers (the "Start Fresh" button already covers this).

This is a focused change to one file with no other dependencies.

