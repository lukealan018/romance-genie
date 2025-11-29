// OpenTable booking provider stub
// Status: DISABLED - Ready for future integration

import type { ProviderPlace } from '../places-types.ts';
import type { BookingProvider } from '../booking-types.ts';

/**
 * OpenTable booking provider for restaurant reservations.
 * 
 * Future integration steps:
 * 1. Apply for OpenTable API partnership
 * 2. Implement venue search/matching
 * 3. Generate deep links with pre-filled party size and datetime
 * 4. Add availability checking via OpenTable API
 */
export const openTableProvider: BookingProvider = {
  name: "opentable",
  isEnabled: false, // ⏸️ DISABLED - scaffolding only
  
  findBookingUrl(place: ProviderPlace): string | null {
    // TODO: Future implementation
    // 
    // OpenTable deep link format (search-based, no API needed):
    // https://www.opentable.com/s/?covers=2&datetime=YYYY-MM-DDTHH:mm&term=[name]&metroId=[metro]
    //
    // Example:
    // https://www.opentable.com/s/?covers=2&datetime=2024-01-15T19:00&term=Nobu&metroId=4
    //
    // Metro IDs (some examples):
    // - Los Angeles: 4
    // - New York: 8
    // - San Francisco: 6
    // - Chicago: 3
    //
    // For API integration:
    // 1. Use OpenTable Restaurant Search API to find restaurant_id
    // 2. Direct booking link: https://www.opentable.com/restref/client/?rid=[restaurant_id]
    //
    // For now, return null (provider exists but inactive)
    console.log(`[OpenTable] Provider disabled - skipping booking URL lookup for: ${place.name}`);
    return null;
  },
};
