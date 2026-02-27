

# Interactive Product Tour (Coach Marks)

A lightweight 3-step guided tour that fires once after a new user completes onboarding and lands on the main page. It spotlights key UI elements with a dimmed backdrop and tooltip bubbles, getting the user to their first curated plan in under 30 seconds.

## Tour Flow

```text
Step 1: Mode Selection
  "Pick a vibe to get started"
  --> Spotlight the "Full Night Out" card
  --> User taps it (tour advances automatically)

Step 2: Voice Input
  "Try saying something like: 'Find me an upscale steakhouse with a speakeasy after'"
  --> Spotlight the voice button
  --> User taps it (tour advances)

Step 3: Surprise Me (fallback)
  "Or just tap Surprise Me and we'll handle everything"
  --> Spotlight the Surprise Me button
  --> User taps it OR taps "Skip" --> tour ends
```

A persistent "Skip tour" link is visible on every step. The tour triggers the actual UI actions -- when they tap the spotlighted element, it really works, and the tour just advances to the next step.

## What Gets Built

### 1. Database: Add `has_seen_tour` to profiles
- Add a `boolean` column `has_seen_tour` defaulting to `false`
- No RLS changes needed (existing profile policies cover it)

### 2. New component: `src/components/ProductTour.tsx`
- Renders a full-screen overlay with a semi-transparent dark backdrop
- Uses a "spotlight cutout" effect (CSS `mix-blend-mode` or a large box-shadow on a positioned element) to highlight a target element by its `data-tour` attribute
- Shows a tooltip bubble next to the spotlight with copy + step indicator (1/3, 2/3, 3/3)
- Listens for clicks on the spotlighted element to advance steps
- "Skip tour" button on every step
- On completion or skip: PATCH `has_seen_tour = true` on the profile and remove overlay
- Fully theme-aware: uses Romance Genie CSS variables for glow, text tint, panel styling
- Uses framer-motion for fade/scale transitions between steps

### 3. New hook: `src/hooks/useProductTour.ts`
- Reads `has_seen_tour` from the profile (already fetched in `useAuthAndProfile`)
- Exposes `{ showTour, currentStep, advanceStep, skipTour }`
- Manages step state and the DB update on completion

### 4. Update `src/hooks/useAuthAndProfile.ts`
- Include `has_seen_tour` in the profile SELECT query
- Expose it in the return value so the tour hook can consume it

### 5. Add `data-tour` attributes to target elements
- `src/components/ModeSelection.tsx`: Add `data-tour="mode-full-night"` to the "Full Night Out" card
- `src/components/hero-section.tsx`: Add `data-tour="voice-input"` to the voice button, `data-tour="surprise-me"` to the Surprise Me button

### 6. Mount tour in `src/pages/Index.tsx`
- Import `ProductTour` and `useProductTour`
- Render `<ProductTour />` when `showTour` is true
- Pass step config (target selectors, copy, positioning)

### 7. Profile page: "Replay Tour" option
- Add a small link/button in the profile page that resets `has_seen_tour` to `false` and navigates home, retriggering the tour for users who want to revisit it

## Technical Details

**Spotlight approach**: The overlay is a fixed full-screen div with `pointer-events: none` on the cutout area. The spotlighted element gets `pointer-events: auto` and a higher z-index so it remains clickable. The tooltip is positioned relative to the target using `getBoundingClientRect()`.

**Step advancement**: Each step registers a one-time click listener on the `[data-tour="..."]` element. When clicked, the real action fires (mode select, voice start, etc.) AND the tour advances.

**Theme integration**: Tooltip bubble uses `var(--card-surface-gradient)` background, `var(--theme-accent)` for the step indicator dot, and `var(--glow-primary)` for the spotlight ring glow.

| File | Action |
|------|--------|
| `profiles` table | Add `has_seen_tour` boolean column |
| `src/components/ProductTour.tsx` | Create (overlay + tooltips) |
| `src/hooks/useProductTour.ts` | Create (tour state management) |
| `src/hooks/useAuthAndProfile.ts` | Read `has_seen_tour` from profile |
| `src/components/ModeSelection.tsx` | Add `data-tour` attribute |
| `src/components/hero-section.tsx` | Add `data-tour` attributes |
| `src/pages/Index.tsx` | Mount tour component |
| `src/pages/Profile.tsx` | Add "Replay Tour" option |
