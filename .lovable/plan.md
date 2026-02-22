

## Cleanup and Polish Pass -- Post Voice Sequencing

Five issues found across the recently changed files. All are small, targeted fixes.

---

### 1. Stale closure: `searchMode` missing from `executeSearch` deps

**File:** `src/hooks/useVoiceSearch.ts`

`executeSearch` reads `searchMode` (line 106) but does not include it in its `useCallback` dependency array (lines 704-711). This means if the user changes mode between triggering voice and the search executing, it could use the old mode value.

**Fix:** Add `searchMode` to the dependency array of `executeSearch`.

---

### 2. `scorePlaces` calls missing `planIntent` and `mood`

**File:** `src/hooks/useVoiceSearch.ts` (lines 581-604)

The two direct `scorePlaces` calls that sort restaurants and activities before storing them in the plan store do not pass `planIntent` or `mood`. This means the date-worthiness scoring from Phase 5 is not applied to the stored/sorted results -- only the later `buildPlan`/`buildSequencedPlan` call applies it. Since the store's sorted order determines what appears when swiping, this is a gap.

**Fix:** Pass `preferences.planIntent` and `preferences.mood` as the last two arguments to both `scorePlaces` calls (lines 581-592 and 593-604).

---

### 3. `planNarrative` not cleared in `resetPlan()`

**File:** `src/store/planStore.ts`

`resetPlan()` resets all result buckets and search state but does not clear `planNarrative`. A stale narrative (e.g., "Dinner at 5:30 PM, 15 min drive, show starts at 8:00 PM") will persist on PlanPage after a new non-sequenced search.

**Fix:** Add `planNarrative: null` to `resetPlan()`.

---

### 4. VoiceConfirmationBar progress animation not resetting on chip tap

**File:** `src/components/VoiceConfirmationBar.tsx`

When the user taps a chip (budget/vibe), `resetTimer` is called which resets the auto-proceed timeout and sets `progress` to 0. However, the `useEffect` that runs the progress interval (lines 76-81) has an empty dependency array, so it keeps running from its initial state and immediately starts re-incrementing. The progress bar jumps back to where it was.

**Fix:** Add a `resetKey` counter state. Increment it in `handleChipTap`. Use `resetKey` as a dependency in the progress interval `useEffect` so the interval restarts from 0.

---

### 5. Type mismatch: `priceLevel: null` in `setFilters`

**File:** `src/hooks/useVoiceSearch.ts` (line 726)

`setFilters({ ... priceLevel: null })` passes `null`, but the store's `priceLevel` field is typed as `string`. This won't cause a runtime crash but is a type inconsistency.

**Fix:** Change to `priceLevel: ''` (empty string, matching the store's initial value).

---

### Summary

| File | Change |
|------|--------|
| `src/hooks/useVoiceSearch.ts` | Add `searchMode` to `executeSearch` deps; pass `planIntent`/`mood` to `scorePlaces` calls; fix `priceLevel: null` to `''` |
| `src/store/planStore.ts` | Add `planNarrative: null` to `resetPlan()` |
| `src/components/VoiceConfirmationBar.tsx` | Fix progress bar reset on chip tap using a `resetKey` counter |

All five fixes are small and self-contained. No new dependencies, no database changes.

