
# Fix: Voice Search Intent Dialect Fields Not Passed Through

## Root Cause
The `interpret-voice` edge function correctly returns all the new fields (needsClarification, clarificationOptions, queryBundles, negativeKeywords, occasion, groupContext, weatherWarning), but `useVoiceInput.ts` never maps them into the preferences object passed to the frontend. This causes:
- Clarification chips never appearing (needsClarification is always undefined)
- Query bundles never reaching search functions
- Negative keywords never applied
- Searches with no keyword hitting 400 errors

## Fix

### File: `src/hooks/useVoiceInput.ts`

**1. Update the VoicePreferences interface** to include all new fields:
- `restaurantSubtype?: string`
- `activitySubtype?: string`
- `restaurantQueryBundles?: string[]`
- `activityQueryBundles?: string[]`
- `negativeKeywords?: string[]`
- `needsClarification?: boolean`
- `clarificationOptions?: string[]`
- `occasion?: string`
- `groupContext?: string`
- `weatherWarning?: string`
- `searchDate?: string`
- `searchTime?: string`
- `searchDateAmbiguous?: boolean`
- `searchDateOptions?: any[]`
- `venueType?: string`

**2. Update the preferences object construction** (lines 225-241) to pass through all new fields from the edge function response:
```typescript
const preferences: VoicePreferences = {
  // ...existing fields...
  restaurantSubtype: data.restaurantSubtype,
  activitySubtype: data.activitySubtype,
  restaurantQueryBundles: data.restaurantQueryBundles || [],
  activityQueryBundles: data.activityQueryBundles || [],
  negativeKeywords: data.negativeKeywords || [],
  needsClarification: data.needsClarification || false,
  clarificationOptions: data.clarificationOptions || [],
  occasion: data.occasion,
  groupContext: data.groupContext,
  weatherWarning: data.weatherWarning,
  searchDate: data.searchDate,
  searchTime: data.searchTime,
  searchDateAmbiguous: data.searchDateAmbiguous,
  searchDateOptions: data.searchDateOptions || [],
  venueType: data.venueType,
};
```

**3. Move the success toast** so it doesn't fire when clarification is needed. Currently on line 244-248 it always shows "Looking for great food and fun activities!" even when the system wants to show clarification chips instead. Wrap it in a condition: only show if `!data.needsClarification`.

This single file fix will:
- Make clarification chips appear when the AI flags ambiguity
- Pass query bundles through to restaurant and activity searches
- Pass negative keywords for filtering
- Pass occasion/group context for better scoring
- Show weather warnings via toast
- Pass date fields through properly
