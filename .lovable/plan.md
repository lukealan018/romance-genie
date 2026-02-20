

# Fix: Lock Voice Search to the UI-Selected Mode

## The Problem

When you select "Full Night Out" (dinner + activity), "Just Dinner", or "Just Activity" in the mode picker, voice search ignores that choice. The AI interprets your words and picks its own mode -- so saying "find me something fun" in Full Night Out mode might only return a restaurant, and saying "fun place" in Just Dinner mode might return an activity too.

The mode you pick on the home screen should be the law. Voice, Surprise Me, and manual search should all respect it.

## Root Cause

In `useVoiceSearch.ts` line 352, the mode that controls which API calls fire is:
```
let voiceMode = preferences.mode || 'both';
```

This uses the AI's detected mode from the transcript and only falls back to `'both'` -- it **never** checks the UI-selected `searchMode`. So the mode picker is cosmetic during voice search.

There was a partial fix (Fix 4) at lines 104-109 that sets a variable called `currentMode`, but that variable is only used for coordinate fallback logic and logging -- it doesn't control the actual API gating.

## The Fix

### Change 1: UI mode always wins (useVoiceSearch.ts)

Replace the mode resolution at line 352 from:
```
let voiceMode = preferences.mode || 'both';
```

To a simple rule: **the UI-selected mode is authoritative**. The AI mode is only used when no UI mode was selected (shouldn't happen in normal flow):

```typescript
// UI-selected mode is the authority. The user picked their mode on the home screen.
// Voice/AI can detect specific vs vague intent, price, cuisine, etc. -- but NOT override the mode.
let voiceMode = searchMode || preferences.mode || 'both';
```

This one line change means:
- Pick "Full Night Out" and say "something fun" --> searches for BOTH dinner + activity (always)
- Pick "Just Dinner" and say "something fun" --> searches for ONLY a dinner (always)  
- Pick "Just Activity" and say "something fun" --> searches for ONLY an activity (always)
- Pick "Full Night Out" and say "upscale steakhouse" --> searches for a steakhouse dinner + an activity
- Pick "Just Dinner" and say "upscale steakhouse" --> searches for ONLY a steakhouse dinner

### Change 2: Remove the now-redundant Fix 4 guard (useVoiceSearch.ts)

Lines 104-109 had a partial guard that tried to protect "both" mode from being downgraded. Since the UI mode now always wins, this guard is unnecessary. Simplify `currentMode` to just use the resolved `voiceMode` for coordinate fallback logic.

### Change 3: Update the AI system prompt to stop setting mode for vague prompts (interpret-voice/index.ts)

The AI prompt currently has extensive rules telling it when to set `mode: "both"` vs `mode: "restaurant_only"`. Since the UI mode is now authoritative, simplify the AI's job:

- Keep mode detection for **informational purposes** (logging, analytics) but add a note that it won't override the UI selection
- For vague prompts, the AI should focus on returning good query bundles and intent detection -- not mode gating
- The AI should still detect intent ("surprise" vs "specific"), price level, cuisine, activity type, etc. -- all of that stays the same

### Change 4: Ensure Surprise Me button also respects the UI mode

Verify that the `handleSurpriseMe` function in the Index page passes `searchMode` the same way. (Based on the architecture memories, this should already work since mode-aware search gating is in place for Surprise Me, but worth confirming.)

## What Stays the Same

- All the good work on concrete activity bundles (comedy club, escape room, bowling, etc.) stays
- The vague bundle guard (`areVagueActivityBundles`) stays
- Price level detection from voice stays (say "upscale" and you get upscale)
- Cuisine/activity type detection stays (say "steakhouse" and you get a steakhouse)
- Location detection stays
- Negative keywords and chain filtering stays

## Expected Behavior After Fix

| UI Mode | Voice Prompt | Result |
|---------|-------------|--------|
| Full Night Out | "something fun" | Cool restaurant + real activity |
| Full Night Out | "upscale steakhouse" | Upscale steakhouse + activity |
| Full Night Out | "find me something under $100" | Budget-friendly dinner + activity |
| Just Dinner | "something fun" | Fun/trendy restaurant only |
| Just Dinner | "upscale place" | Upscale restaurant only |
| Just Activity | "something fun" | Real activity only (no restaurant) |
| Just Activity | "comedy club" | Comedy club only |

## Technical Summary

| File | Change |
|------|--------|
| `src/hooks/useVoiceSearch.ts` | Line 352: `searchMode \|\| preferences.mode \|\| 'both'` -- UI mode wins |
| `src/hooks/useVoiceSearch.ts` | Lines 104-109: Remove redundant Fix 4 guard, simplify to use resolved mode |
| `supabase/functions/interpret-voice/index.ts` | Simplify MODE instructions -- AI provides mode as suggestion, not authority |

