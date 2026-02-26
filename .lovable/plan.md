

# Fix: Plan Scheduling Fails Silently

## Problem
When you try to schedule a plan, the save silently fails with no feedback. Two issues:

1. **No auth check before attempting to save** -- The `handleSchedule` function doesn't verify you're logged in before doing all the work (fetching weather, place details, etc.), then the store's `addScheduledPlan` fails silently at the auth check and returns `null`.

2. **No error feedback when save returns null** -- After `addScheduledPlan` returns `null`, the code just skips the success toast but never shows an error, so you see nothing happen.

## Changes

### 1. Add early auth gate in `handleSchedule` (`src/components/ScheduleVoiceDialog.tsx`)
- At the top of `handleSchedule`, check `supabase.auth.getSession()`.
- If no session, show a toast: "Please log in to schedule plans" and return early before doing any API calls.

### 2. Add error feedback when `addScheduledPlan` returns null (`src/components/ScheduleVoiceDialog.tsx`)
- After `const scheduledPlan = await addScheduledPlan(...)`, add an `else` block:
  ```
  if (scheduledPlan) {
    // existing success toast...
  } else {
    toast.error("Failed to save your plan. Please make sure you're logged in.");
  }
  ```

### 3. Add error logging in `addScheduledPlan` (`src/store/scheduledPlansStore.ts`)
- In the catch block, surface the actual error message so it's diagnosable:
  ```
  toast.error("Could not save plan: " + (error?.message || "Unknown error"));
  ```
  (Import toast from sonner in the store file.)

## Technical Details
- **Files modified:** `src/components/ScheduleVoiceDialog.tsx`, `src/store/scheduledPlansStore.ts`
- The root cause is likely that you're not logged in (console shows guest mode). The fix ensures you get clear feedback either way and prevents wasted API calls when unauthenticated.
