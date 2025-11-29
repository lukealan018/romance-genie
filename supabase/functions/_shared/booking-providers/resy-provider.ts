// Resy booking provider stub
// Status: DISABLED - Ready for future integration

import type { ProviderPlace } from '../places-types.ts';
import type { BookingProvider } from '../booking-types.ts';

/**
 * Resy booking provider for restaurant reservations.
 * 
 * Future integration steps:
 * 1. Partner with Resy for API access
 * 2. Map venue IDs to Resy venue database
 * 3. Implement deep linking: https://resy.com/cities/[city]/[venue-slug]
 * 4. Add availability checking via Resy API
 */
export const resyProvider: BookingProvider = {
  name: "resy",
  isEnabled: false, // ⏸️ DISABLED - scaffolding only
  
  findBookingUrl(place: ProviderPlace): string | null {
    // TODO: Future implementation
    // 1. Check if venue exists in Resy database by name/location matching
    // 2. Return deep link URL if found
    // 
    // Example deep link format:
    // https://resy.com/cities/los-angeles/bestia
    // https://resy.com/cities/new-york/carbone
    //
    // For now, return null (provider exists but inactive)
    console.log(`[Resy] Provider disabled - skipping booking URL lookup for: ${place.name}`);
    return null;
  },
};
