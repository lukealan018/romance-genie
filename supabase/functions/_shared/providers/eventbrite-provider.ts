// Eventbrite activity provider stub
// Status: DISABLED - Ready for future integration

import type { ProviderActivity, ActivitySearchOptions, ActivityProvider } from '../activities-types.ts';

/**
 * Eventbrite API provider for local events/activities.
 * 
 * Future integration steps:
 * 1. Create Eventbrite developer account
 * 2. Obtain API key (OAuth token)
 * 3. Add EVENTBRITE_API_KEY to Supabase secrets
 * 4. Implement event search
 * 5. Map Eventbrite events to ProviderActivity format
 */
export const eventbriteProvider: ActivityProvider = {
  providerName: "eventbrite",
  isEnabled: false, // ⏸️ DISABLED - scaffolding only
  
  async searchActivities(options: ActivitySearchOptions): Promise<ProviderActivity[]> {
    // TODO: Future implementation
    //
    // Eventbrite API:
    // Endpoint: https://www.eventbriteapi.com/v3/events/search/
    //
    // Key parameters:
    // - Authorization: Bearer EVENTBRITE_API_KEY
    // - location.latitude: lat
    // - location.longitude: lng
    // - location.within: radius in format "25mi" or "40km"
    // - q: search keyword
    // - categories: category IDs (103=Music, 105=Food & Drink, etc.)
    // - start_date.range_start: ISO 8601 format
    //
    // Example request:
    // GET https://www.eventbriteapi.com/v3/events/search/?
    //   location.latitude=34.0522&
    //   location.longitude=-118.2437&
    //   location.within=25mi&
    //   categories=103,105
    //
    // Category IDs:
    // - 103: Music
    // - 105: Performing & Visual Arts
    // - 110: Food & Drink
    // - 113: Community & Culture
    // - 115: Charity & Causes
    // - 199: Other
    //
    // Response mapping to ProviderActivity:
    // - id: event.id
    // - name: event.name.text
    // - address: event.venue.address.localized_address_display
    // - rating: N/A (Eventbrite doesn't have ratings)
    // - lat/lng: event.venue.latitude/longitude
    // - category: 'event'
    // - source: 'eventbrite' (would need to extend source type)
    //
    // For now, return empty array (provider exists but inactive)
    console.log(`[Eventbrite] Provider disabled - returning empty results`);
    return [];
  },
};
