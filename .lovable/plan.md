
# Root Cause Analysis & Fix Plan: Vague Voice Prompts Not Returning Full Night Out

## What I Found — The 4 Actual Bugs

### Bug #1: The AI's Vague Prompt Mode Detection Is Wrong (CRITICAL)
**File:** `supabase/functions/interpret-voice/index.ts`

The AI system prompt has an instruction that directly causes the failure. Under `VAGUE PROMPT HANDLING`, for "something fun", "find me something interesting to do", "plan a night out" — the AI is told to set:
```
mode: infer from context ("nice dinner" → "restaurant_only", "something fun" → "both")
```
But look at `CRITICAL EXAMPLES for MODE DETECTION` further down the same prompt:
```
"casual place to eat" → mode: "restaurant_only"
"I'm looking for something casual to eat" → mode: "restaurant_only"
```
The AI is confusing "something fun" with "looking for something" — which it maps to `restaurant_only`. The word "something" or "looking for" in the transcript causes the AI to strip the mode to restaurant-only, even when "fun" and "interesting" clearly signal a full night out.

Additionally, the vague prompt section tells the AI to use:
```
activityQueryBundles: ["fun things to do", "nightlife", "entertainment", "popular attractions"]
```
These are **terrible** generic keywords — "entertainment" maps to businesses in the Google activity provider (no recognized mapping), and "nightlife" is so broad it returns restaurant-bars.

### Bug #2: The `activityBundles` Logic Has a Bypass Hole (CRITICAL)
**File:** `src/hooks/useVoiceSearch.ts` lines 414–418

```typescript
const activityBundles = (preferences.activityQueryBundles?.length > 0)
  ? preferences.activityQueryBundles      // ← Uses AI-returned bundles
  : (!searchActivity 
      ? DEFAULT_ACTIVITY_BUNDLES_BOTH_MODE  // ← Good fallback
      : []);
```

When the AI returns `activityQueryBundles: ["fun things to do", "nightlife", "entertainment", "popular attractions"]` (which it does for vague prompts per the system prompt), the first condition is true — the AI bundles ARE populated (length > 0) — so the code skips the good `DEFAULT_ACTIVITY_BUNDLES_BOTH_MODE` fallback and sends bad generic keywords to the backend instead. The good fallback bundles are **never used** when the AI sends any bundles at all.

### Bug #3: "entertainment" Keyword Has No Mapping in the Activity Provider
**File:** `supabase/functions/_shared/providers/google-activity-provider.ts`

The `activityMappings` dictionary has no entry for `"entertainment"`, `"fun things to do"`, `"nightlife"`, or `"popular attractions"`. When these keywords arrive via `queryBundles`, the `getActivityMapping()` function returns `null`, so the text query becomes the raw keyword string with no type filtering. Google then returns a mix of generic businesses, entertainment companies (non-venues), and restaurant chains.

### Bug #4: Mode Not Being Forced to `"both"` For the Full Night Out UI Context
**File:** `src/hooks/useVoiceSearch.ts` line 102

```typescript
const aiMode = preferences.mode;
const currentMode = aiMode || searchMode || 'both';
```

When the AI incorrectly returns `mode: "restaurant_only"` for a vague prompt said while the UI is in "Full Night Out" mode, the AI mode wins over the UI selection. There is no guard that says: "if the UI is in 'both' mode and the user gave a vague/surprise prompt, respect the UI mode."

---

## The Fix — 4 Targeted Changes

### Fix 1: Update the Voice AI System Prompt (Vague Prompt Section)
**File:** `supabase/functions/interpret-voice/index.ts`

Replace the vague activityQueryBundles with concrete, date-night-worthy bundles. Also add explicit mode logic for vague prompts to respect "both":

**Current (broken):**
```
activityQueryBundles: ["fun things to do", "nightlife", "entertainment", "popular attractions"]
```

**Fixed:**
```
activityQueryBundles: ["comedy club", "cocktail bar", "escape room", "bowling", "speakeasy", "rooftop bar", "arcade", "karaoke", "jazz lounge", "axe throwing"]
restaurantQueryBundles: ["trendy restaurant", "popular restaurant", "highly rated restaurant", "lively restaurant"]
mode: "both" (NEVER "restaurant_only" for vague/fun/interesting/exciting prompts — these always imply a full night out)
```

Also add concrete MODE DETECTION rules:
```
"something fun" → mode: "both" (not restaurant_only — fun implies an activity)
"something interesting" → mode: "both"
"find me something to do" → mode: "both"
"plan a night out" → mode: "both"
"what should we do tonight" → mode: "both"
"entertain me" → mode: "both"
```

### Fix 2: Upgrade the Activity Bundle Logic — Bad AI Bundles Get Replaced
**File:** `src/hooks/useVoiceSearch.ts`

Add a detection function `areVagueActivityBundles()` that identifies when the AI returned worthless generic keywords, and replaces them with the concrete date-night bundle list:

```typescript
const VAGUE_ACTIVITY_KEYWORDS = new Set([
  'fun things to do', 'nightlife', 'entertainment', 'popular attractions',
  'things to do', 'activities', 'fun', 'something fun', 'entertainment venues'
]);

function areVagueActivityBundles(bundles: string[]): boolean {
  if (!bundles || bundles.length === 0) return true;
  // If every bundle in the AI-returned list is a vague term, treat as if empty
  return bundles.every(b => VAGUE_ACTIVITY_KEYWORDS.has(b.toLowerCase().trim()));
}
```

Then update the bundle selection logic:
```typescript
const activityBundles = 
  (preferences.activityQueryBundles?.length > 0 && !areVagueActivityBundles(preferences.activityQueryBundles))
    ? preferences.activityQueryBundles           // Specific AI bundles → use them
    : (!searchActivity 
        ? DEFAULT_ACTIVITY_BUNDLES_BOTH_MODE     // Vague/no activity → use good defaults
        : []);
```

### Fix 3: Add Missing Activity Keyword Mappings to the Provider
**File:** `supabase/functions/_shared/providers/google-activity-provider.ts`

Add entries to `activityMappings` for the keywords that currently produce zero/bad results:
```typescript
'entertainment': { googleType: 'amusement_center', keywords: ['entertainment venue', 'comedy club', 'escape room', 'bowling', 'arcade', 'game venue'] },
'nightlife': { googleType: 'night_club', keywords: ['cocktail bar', 'lounge', 'speakeasy', 'jazz bar', 'rooftop bar', 'cocktail lounge'] },
'fun things to do': { googleType: 'amusement_center', keywords: ['escape room', 'bowling', 'arcade', 'axe throwing', 'comedy club'] },
'popular attractions': { googleType: 'tourist_attraction', keywords: ['cocktail bar', 'rooftop bar', 'comedy club', 'escape room', 'bowling'] },
```

### Fix 4: Protect Mode — UI "Both" Mode Wins Over Vague AI Detection
**File:** `src/hooks/useVoiceSearch.ts`

Add a guard that prevents the AI from silently downgrading a "full night out" session to `restaurant_only`:
```typescript
const aiMode = preferences.mode;
const isVagueIntent = preferences.intent === 'surprise' || preferences.intent === 'flexible';
const uiModeIsBoth = searchMode === 'both' || !searchMode;

// If UI is in Full Night Out (both) mode AND the prompt is vague/flexible,
// NEVER downgrade to restaurant_only — keep 'both' to deliver the full experience.
const currentMode = (isVagueIntent && uiModeIsBoth && aiMode === 'restaurant_only')
  ? 'both'
  : (aiMode || searchMode || 'both');
```

---

## Summary of What Changes

| Fix | File | What Changes |
|-----|------|-------------|
| 1 | `interpret-voice/index.ts` | Vague prompt section: replace generic bundles with concrete date-night ones; add MODE rules for "something fun/interesting" → "both" |
| 2 | `src/hooks/useVoiceSearch.ts` | Add `areVagueActivityBundles()` guard — bad AI bundles get swapped for the good default list |
| 3 | `google-activity-provider.ts` | Add mappings for `entertainment`, `nightlife`, `fun things to do`, `popular attractions` |
| 4 | `src/hooks/useVoiceSearch.ts` | Protect UI "both" mode from being silently downgraded by vague AI intent |

---

## Expected Outcome

When you say **"find me something fun to do this evening"** or **"plan a night out"** with Full Night Out selected:
1. AI sets `mode: "both"`, `intent: "surprise"`, and returns concrete activity bundles like `["comedy club", "cocktail bar", "escape room", "bowling"]`
2. Fix 4 ensures mode stays `"both"` even if AI guesses wrong
3. Fix 2 ensures even if AI returns vague bundles, the real bundles are used
4. Fix 3 ensures every bundle keyword maps to a real Google Places search
5. Result: a restaurant card + a genuine activity card (bowling, comedy club, speakeasy, etc.) every time
