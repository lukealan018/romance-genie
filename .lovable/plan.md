
# Slim Down and Restyle the Onboarding Flow

## The Idea
You nailed it -- most users just want to try the product. Collect only what's essential (name + ZIP), then get them in. The existing `ProfileCompletionPrompt` component already handles nudging users to complete their profile (photo, voice preferences) after they've seen their first recommendation. That progressive profiling system stays in place.

## New Flow: 2 Steps (down from 4)

**Step 1 -- Welcome + Name**
- Romantic branded header ("Your night, figured out")
- Single name input
- Theme-aware styling (sapphire glow, pink glow, or matte depending on active theme)

**Step 2 -- ZIP Code**
- Location input with friendly copy
- Validates 5-digit ZIP
- "Let's Go" button that saves and drops them straight into the app

**Removed from onboarding:**
- Profile picture step (moved to post-first-search via ProfileCompletionPrompt)
- Voice preferences step (moved to post-first-search via ProfileCompletionPrompt)

## Visual Overhaul

The entire onboarding currently uses hardcoded `purple-500`, `slate-800`, etc. that don't respond to the theme system. Every element will be restyled to use the Romance Genie design system:

- Panel backgrounds use theme CSS variables (`hsl(var(--card))`) with backdrop blur and glowing borders (`border-[hsl(var(--accent))]`)
- Buttons use the `btn-theme-secondary` class or theme-aware gradients instead of hardcoded purple-to-pink
- Progress bar accent uses `hsl(var(--primary))` gradient
- Text uses theme-tinted colors (`text-foreground`, `text-muted-foreground`) instead of `text-white` / `text-slate-300`
- Icon circles use `hsl(var(--accent))` glow
- All corners use `var(--radius-lg)` for consistency

## Files Changed

**`src/components/OnboardingFlow.tsx`** -- Major rewrite
- Remove steps 3 (photo) and 4 (voice preferences)
- Remove `useVoiceInput` import and all voice-related state
- Update `totalSteps` from 4 to 2
- Restyle both remaining steps to use theme-aware CSS variables
- Update progress bar to use theme accent colors
- Simplify `OnboardingData` interface (remove `profilePicture` and `voicePreferences` fields)
- Copy becomes more romantic/premium ("Your night, figured out" instead of generic "Welcome")

**`src/pages/OnboardingWrapper.tsx`** -- Simplify data mapping
- Remove references to `profilePicture` and `voicePreferences` from the `handleComplete` callback
- Only send `nickname` and `home_zip` to the profile edge function

## Files NOT Changed
- `ProfileCompletionPrompt.tsx` -- already handles photo + voice nudging post-first-search
- Theme system, edge functions, database -- no changes needed

## What Users Experience
1. Sign up / log in
2. See a sleek, glowing 2-step onboarding (name, then ZIP) -- takes about 15 seconds
3. Land on the home screen immediately
4. After their first "Surprise Me" or manual search, the ProfileCompletionPrompt appears asking if they want to add photo + voice prefs for better recommendations

## Technical Details
- `OnboardingData` interface simplified to `{ name: string; zipCode: string }`
- `OnboardingWrapper` sends only `{ nickname, home_zip, default_radius_mi: 5 }` to the profile function
- All `bg-slate-*`, `text-purple-*`, `border-purple-*` classes replaced with theme-responsive equivalents
- Framer Motion slide transitions kept for polish
