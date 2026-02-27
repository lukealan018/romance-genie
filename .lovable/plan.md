

# Fix: Product Tour Step 2+ Not Highlighting

## Problem
When the user clicks "Full Night Out" (Step 1), the page swaps components:
- `ModeSelection` unmounts (contains the Step 1 target)
- `HeroSection` mounts with staggered framer-motion animations (voice button has a 400ms delay)

The tour's `measureTarget` runs after 350ms, but the `[data-tour="voice-input"]` element either hasn't mounted yet or hasn't animated into its final position. Result: `rect` stays `null` and no spotlight renders.

## Fix

### 1. Update `ProductTour.tsx` - Add polling for target element

Replace the single 350ms timeout with a polling mechanism that retries until the target element is found (up to ~2 seconds). This handles the page transition gracefully regardless of animation timing.

```text
Instead of:
  setTimeout(measureTarget, 350)

Use:
  Poll every 200ms for up to 2s until the element is found
  Once found, measure and stop polling
```

### 2. Update `ProductTour.tsx` - Re-measure when rect is null

Add a secondary effect that keeps trying to measure if `rect` is still null after the initial attempt. This acts as a safety net for slow renders.

## Technical Details

**File: `src/components/ProductTour.tsx`**

Replace the measurement effect with a polling approach:
- Use an interval (every 200ms) that calls `measureTarget`
- Clear the interval once a valid rect is obtained or after ~2s max
- Keep the existing resize/scroll listeners for repositioning after the element is found

This is a small, surgical fix -- only the timing logic in `ProductTour.tsx` changes. No other files need modification.

