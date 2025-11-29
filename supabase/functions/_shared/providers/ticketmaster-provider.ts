// Ticketmaster activity provider stub
// Status: DISABLED - Ready for future integration

import type { ProviderActivity, ActivitySearchOptions, ActivityProvider } from '../activities-types.ts';

/**
 * Ticketmaster Discovery API provider for events/activities.
 * 
 * Future integration steps:
 * 1. Obtain Ticketmaster API key from developer portal
 * 2. Add TICKETMASTER_API_KEY to Supabase secrets
 * 3. Implement Discovery API search
 * 4. Map Ticketmaster events to ProviderActivity format
 */
export const ticketmasterProvider: ActivityProvider = {
  providerName: "ticketmaster",
  isEnabled: false, // ⏸️ DISABLED - scaffolding only
  
  async searchActivities(options: ActivitySearchOptions): Promise<ProviderActivity[]> {
    // TODO: Future implementation
    //
    // Ticketmaster Discovery API:
    // Endpoint: https://app.ticketmaster.com/discovery/v2/events.json
    //
    // Key parameters:
    // - apikey: TICKETMASTER_API_KEY
    // - latlong: `${lat},${lng}`
    // - radius: in miles
    // - unit: 'miles'
    // - classificationName: 'Music', 'Sports', 'Arts & Theatre', 'Comedy'
    // - startDateTime: ISO 8601 format
    // - sort: 'date,asc' or 'relevance,desc'
    //
    // Example request:
    // https://app.ticketmaster.com/discovery/v2/events.json?
    //   apikey=YOUR_KEY&
    //   latlong=34.0522,-118.2437&
    //   radius=25&
    //   unit=miles&
    //   classificationName=Comedy
    //
    // Response mapping to ProviderActivity:
    // - id: event.id
    // - name: event.name
    // - address: event._embedded.venues[0].address.line1
    // - rating: N/A (Ticketmaster doesn't have ratings)
    // - lat/lng: event._embedded.venues[0].location
    // - category: 'event'
    // - source: 'ticketmaster' (would need to extend source type)
    //
    // For now, return empty array (provider exists but inactive)
    console.log(`[Ticketmaster] Provider disabled - returning empty results`);
    return [];
  },
};
