// Yelp Reservations booking provider stub
// Status: DISABLED - Ready for future integration

import type { ProviderPlace } from '../places-types.ts';
import type { BookingProvider } from '../booking-types.ts';

/**
 * Yelp Reservations booking provider.
 * 
 * Future integration steps:
 * 1. Obtain Yelp Fusion API key with reservations scope
 * 2. Use Business Match API to find Yelp business_id for venues
 * 3. Check reservation availability via Yelp Reservations API
 * 4. Generate booking URLs
 */
export const yelpReservationsProvider: BookingProvider = {
  name: "yelp-reservations",
  isEnabled: false, // ⏸️ DISABLED - scaffolding only
  
  findBookingUrl(place: ProviderPlace): string | null {
    // TODO: Future implementation
    // 
    // Yelp Fusion API endpoints needed:
    // 1. Business Match: https://api.yelp.com/v3/businesses/matches
    //    - Match by name, address, city, state, country
    //    - Returns business_id
    //
    // 2. Business Details: https://api.yelp.com/v3/businesses/{id}
    //    - Check if business has reservations enabled
    //    - Get reservation URL from response
    //
    // Yelp reservation deep link format:
    // https://www.yelp.com/reservations/[business-alias]
    //
    // Example:
    // https://www.yelp.com/reservations/bestia-los-angeles
    //
    // For now, return null (provider exists but inactive)
    console.log(`[Yelp Reservations] Provider disabled - skipping booking URL lookup for: ${place.name}`);
    return null;
  },
};
