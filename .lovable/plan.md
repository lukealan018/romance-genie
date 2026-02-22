

## Fix Availability Check Timing Logic

### Problem Summary
The current `check-availability` edge function has four timing bugs:

1. **Multiple periods per day** -- `.find()` grabs the first matching period (e.g. lunch) when the user may be scheduling during a second period (e.g. dinner)
2. **Next-day closing** -- A venue closing at "0100" produces 60 minutes, which looks earlier than a 7 PM start, causing false warnings
3. **No opening-time check** -- Only closing time is validated; scheduling before a venue opens produces no warning
4. **No activity closing-time check** -- Activity opening is checked but closing is ignored, so a 90-min activity at a venue closing in 30 min passes silently

### Solution

Replace the restaurant and activity period-matching logic with a shared helper that handles all four cases. All changes are in one file: `supabase/functions/check-availability/index.ts`.

---

### Detailed Changes

#### 1. Add helper: `findMatchingPeriod(periods, dayOfWeek, scheduledMinutes)`

Instead of `.find(p => p.open.day === dayOfWeek)` (grabs only the first period), this helper:
- Filters ALL periods for the given day
- For each period, parses open/close times to minutes
- Handles next-day closing: if `closeMinutes < openMinutes`, treat close as `closeMinutes + 1440` (next day)
- Returns the period whose open-close range contains `scheduledMinutes`, or `null` if none match

#### 2. Add helper: `formatTime(minutesSinceMidnight)`

Returns a human-readable string like `"7:00 PM"` for conflict messages.

#### 3. Restaurant validation (replaces lines 64-100)

Using the matched period (or lack thereof):

- **No periods for this day at all** -- severity `error`, status `closed`, message "Restaurant is closed on this day."
- **No period contains the scheduled time** -- severity `error`, status `closed`, message "Restaurant isn't open at [time]. Opens at [nearest open] and [next period if any]." Suggest the nearest valid opening time.
- **Period found but dinner (90 min) extends past closing** -- severity `warning`, status `limited`, suggest an earlier start time so dinner fits. Handle next-day close correctly (e.g. close at 1 AM = 1500 minutes, so 11 PM dinner is fine).

#### 4. Activity validation (replaces lines 102-125)

Estimated activity start = `scheduledMinutes + 105` (90 min dinner + 15 min travel). Using the matched period for that start time:

- **No periods for this day** -- severity `warning`, "Activity appears closed on this day."
- **Activity start is before opening** -- severity `info`, suggest starting dinner earlier or choosing later time (existing behavior, kept).
- **New: Activity (90 min default) extends past closing** -- severity `warning`, status `limited`, message "Activity closes at [time]. Your 90-min activity may be cut short." Suggest an earlier dinner time.
- Handle next-day closing the same way as restaurant.

#### 5. Date proximity check -- no changes (already correct)

### Constants

```text
DINNER_DURATION = 90      (minutes)
TRAVEL_TIME = 15          (minutes)
ACTIVITY_DURATION = 90    (minutes)
MINUTES_IN_DAY = 1440
```

### Edge Cases Handled

- Venue open 11:00-14:00 and 17:00-23:00: scheduling at 18:00 correctly matches the dinner period, not lunch
- Venue closing at 01:00 (next day): "0100" becomes 1500 minutes when open time is e.g. 1080 (18:00), so 19:00 dinner ending at 20:30 passes correctly
- Scheduling at 15:00 when venue opens at 17:00: returns `closed` with suggestion "Opens at 5:00 PM"
- Activity closing at 22:00 with estimated start at 21:15: warns that 90-min activity won't fit

### Files Modified

| File | Change |
|------|--------|
| `supabase/functions/check-availability/index.ts` | Rewrite period matching + add opening/closing validation for both restaurant and activity |

No database changes, no new edge functions, no client-side changes needed -- the response shape (`status`, `conflicts[]`, `restaurantHours`, `activityHours`) stays identical.
