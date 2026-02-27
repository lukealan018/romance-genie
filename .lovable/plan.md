
# Fix: Product Tour Steps 2 and 3 Should Be "Look, Don't Click"

## Problem
The tour highlights the voice button (Step 2) and says "Tell us what you want," but clicking it instantly advances to Step 3 (Surprise Me). The user never actually gets to try voice input. It feels like the tour is rushing them through without letting them engage.

## Solution
Change the tour so only Step 1 requires clicking the target element (since it changes the page). Steps 2 and 3 become "observe and learn" steps with a **"Next" / "Got it" button** in the tooltip instead.

### Changes to `src/components/ProductTour.tsx`

1. **Add an `action` field to `TourStep`** (optional, defaults to `"observe"`):
   - `"click"` -- clicking the spotlight triggers the real element and advances (current Step 1 behavior)
   - `"observe"` -- spotlight is non-interactive; a "Next" button in the tooltip advances the tour

2. **Update the spotlight zone**: Only render the clickable zone when `step.action === "click"`. For `"observe"` steps, the spotlight is just visual (no pointer events).

3. **Add a "Next" / "Got it" button** to the tooltip for observe steps, styled as a theme-accent pill next to the "Skip tour" button.

### Changes to `src/hooks/useProductTour.ts`

4. **Add `action` to each step definition**:
   - Step 1 (mode-full-night): `action: "click"` -- user taps it, page transitions, tour advances
   - Step 2 (voice-input): `action: "observe"` -- highlights voice button, shows "Next" to continue
   - Step 3 (surprise-me): `action: "observe"` -- highlights Surprise Me, shows "Got it!" to finish

5. **Update step descriptions** to feel more natural:
   - Step 2: "Use this mic to describe your perfect night -- we'll find the best matches."
   - Step 3: "Or skip the details -- tap Surprise Me and we'll handle everything."

## Result
- Step 1: User clicks "Full Night Out" (page changes, tour advances)
- Step 2: Tour highlights voice button, explains it, user reads and clicks "Next"
- Step 3: Tour highlights Surprise Me, explains it, user clicks "Got it!" and tour ends
- After the tour, the user is on the main page and can choose either option on their own
