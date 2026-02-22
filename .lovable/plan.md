## Cleanup and Polish Pass

After all the calendar/availability changes, there are a few small gaps to tidy up.

### 1. ConflictWarningCard -- missing labels for new conflict types

The updated `check-availability` function now emits `activity_closed` and `activity_closing` conflict types, but `ConflictWarningCard` only maps four types in its `conflictTypeLabels`. The new types fall through to the generic "Note" label.

**Fix:** Add the two missing labels to `conflictTypeLabels` in `src/components/ConflictWarningCard.tsx`:

- `activity_closed` -> "Activity Closed"
- `activity_closing` -> "Activity Hours"

### 2. EditScheduledPlanSheet -- `notes` field exists in state but is never rendered

The sheet tracks a `notes` state variable and computes dirty state from it, but there is no `<Textarea>` in the JSX for the user to actually edit notes. The original plan called for optional notes.

**Fix:** Add a Notes textarea between the confirmation numbers section and the Save button in `src/components/EditScheduledPlanSheet.tsx`.

### 3. EditScheduledPlanSheet -- `excludePlanId` not used by edge function

The sheet sends `excludePlanId` in the request body, but `check-availability` never reads it -- the date-proximity query doesn't filter it out, so editing a plan always flags itself as a nearby conflict.

**Fix:** In `supabase/functions/check-availability/index.ts`, read `excludePlanId` from the request body and add `.neq('id', excludePlanId)` to the nearby-plans query (when present).

### 4. Remove stale `console.log` statements

`Calendar.tsx` has debug `console.log` calls on lines 137, 140, 147, 156, 159, 166 for restaurant/activity click handlers. These should be removed for cleanliness.

---

### Summary of files


| File                                             | Change                                                           |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| `src/components/ConflictWarningCard.tsx`         | Add `activity_closed` and `activity_closing` to label map        |
| `src/components/EditScheduledPlanSheet.tsx`      | Add Notes textarea to the form                                   |
| `supabase/functions/check-availability/index.ts` | Read `excludePlanId` and filter it from the date-proximity query |
| `src/pages/Calendar.tsx`                         | Remove debug `console.log` lines                                 |


All four are small, self-contained tweaks -- no new dependencies, no DB changes, no breaking changes.