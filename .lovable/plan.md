

## Fix Calendar Export Timezone Handling

### Problem
Currently, `generateICSFile` outputs DTSTART/DTEND in **floating local time** (no suffix), e.g. `20250315T190000`. This means calendar apps interpret it in whatever timezone the importing device is set to — if the user schedules at 7 PM Eastern but opens the .ics on a Pacific device, it shows 7 PM Pacific instead of 4 PM Pacific.

### Solution
Convert the local date+time to a proper JS Date, then format DTSTART/DTEND as **UTC with Z suffix**. This anchors the event to an absolute moment in time, so Google Calendar, Apple Calendar, and Outlook all display it correctly regardless of the viewer's timezone.

### Before/After ICS Sample

**Before (floating local time — ambiguous):**
```text
DTSTART:20250315T190000
DTEND:20250315T230000
```

**After (UTC — unambiguous):**
```text
DTSTART:20250316T000000Z
DTEND:20250316T040000Z
```
(Assuming user is in UTC-5 / Eastern: 7 PM ET = midnight UTC)

### Changes

**File: `src/lib/calendar-export.ts`**

1. Remove the `formatICSDateLocal` helper function
2. Use the existing `formatICSDateUTC` helper for DTSTART and DTEND as well (it already converts to UTC via `toISOString()`)
3. Update the DTSTART and DTEND lines to call `formatICSDateUTC` instead of `formatICSDateLocal`

The `new Date(year, month - 1, day, hours, minutes)` constructor already creates the Date in the user's local timezone, so calling `.toISOString()` on it naturally converts to UTC — no additional logic needed.

### Technical Detail
- `formatICSDateUTC` already does: `date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'`
- This produces `YYYYMMDDTHHMMSSZ` — the standard UTC format
- DTSTAMP, DTSTART, DTEND will all use this same formatter
- Alarms (VALARM with TRIGGER) are relative durations (`-P1D`, `-PT2H`) and are unaffected

### What stays the same
- ScheduledPlan interface (no changes)
- downloadICS function (no changes)
- VALARM triggers (relative, timezone-agnostic)
- Description and location formatting
