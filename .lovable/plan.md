

# Add Step 4: Highlight "Something Else" on PlanCard

## Problem
After the tour ends (Step 3), the user taps Surprise Me or uses the mic, gets results on `/plan`, and has no idea they can swap venues. The "Something Else" button is easy to miss.

## Solution
Add a 4th tour step that appears on the PlanCard page, targeting the first "Something Else" button. This step uses `action: "observe"` with a "Got it!" button.

### Challenge: Cross-Page Tour
The tour currently lives in `Index.tsx` and completes before navigating to `/plan`. Step 4 needs to appear *after* results load on a different page.

**Approach**: Instead of extending the existing 3-step tour (which marks complete and disappears), we add a **one-time "plan page tip"** that shows the first time a user lands on `/plan`. This is cleaner than trying to keep the tour alive across navigation.

### Changes

**1. `src/components/plan/VenueCard.tsx`**
- Add `data-tour="swap-venue"` to the first "Something Else" button so the spotlight can find it.

**2. `src/hooks/useProductTour.ts`**
- Export a new hook: `usePlanPageTip()` -- a lightweight single-step tour for the plan page.
- It checks a `has_seen_plan_tip` flag (stored in localStorage for simplicity, works for guests too).
- Shows after a short delay (800ms) once PlanCard renders.
- Returns `{ showTip, dismissTip, tipStep }`.

**3. `src/components/ProductTour.tsx`**
- No structural changes needed -- it already supports any number of steps with observe mode. We reuse the same `ProductTour` component with a single-step array.

**4. `src/pages/PlanPage.tsx`**
- Import and use `usePlanPageTip()`.
- Render `<ProductTour>` with the single tip step when `showTip` is true.

### Tip Content
- **Target**: `swap-venue` (the "Something Else" button)
- **Title**: "Not feeling it?"
- **Description**: "Tap 'Something Else' to swap any venue -- we'll find another option nearby."
- **Action**: `observe` with "Got it!" button

### Flow
1. User completes 3-step tour on Index page
2. Taps Surprise Me or uses voice -- navigates to `/plan`
3. After results load, a spotlight appears on the "Something Else" button
4. User reads the tip, taps "Got it!", tip never shows again
