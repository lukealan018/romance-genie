// Ticketmaster Discovery API provider for events/activities
// Status: ACTIVE - Integrated with Discovery API

import type { ProviderActivity, ActivitySearchOptions, ActivityProvider } from '../activities-types.ts';
import { isFeatureEnabled } from '../feature-flags.ts';

// Ticketmaster classification mappings for Romance Genie activity keywords
const KEYWORD_TO_CLASSIFICATION: Record<string, string> = {
  'comedy': 'Comedy',
  'comedy show': 'Comedy',
  'standup': 'Comedy',
  'stand-up': 'Comedy',
  'concert': 'Music',
  'live music': 'Music',
  'music': 'Music',
  'band': 'Music',
  'dj': 'Music',
  'sports': 'Sports',
  'game': 'Sports',
  'basketball': 'Sports',
  'football': 'Sports',
  'baseball': 'Sports',
  'hockey': 'Sports',
  'soccer': 'Sports',
  'theater': 'Arts & Theatre',
  'theatre': 'Arts & Theatre',
  'show': 'Arts & Theatre',
  'musical': 'Arts & Theatre',
  'broadway': 'Arts & Theatre',
  'play': 'Arts & Theatre',
  'opera': 'Arts & Theatre',
  'ballet': 'Arts & Theatre',
  'dance': 'Arts & Theatre',
};

interface TicketmasterEvent {
  id: string;
  name: string;
  url?: string;
  images?: { url: string; width: number; height: number }[];
  dates?: {
    start?: {
      localDate?: string;
      localTime?: string;
    };
  };
  classifications?: {
    segment?: { name: string };
    genre?: { name: string };
    subGenre?: { name: string };
  }[];
  priceRanges?: {
    type: string;
    currency: string;
    min: number;
    max: number;
  }[];
  _embedded?: {
    venues?: {
      id: string;
      name: string;
      address?: { line1?: string };
      city?: { name: string };
      state?: { stateCode: string };
      postalCode?: string;
      location?: {
        latitude: string;
        longitude: string;
      };
    }[];
  };
}

interface TicketmasterResponse {
  _embedded?: {
    events?: TicketmasterEvent[];
  };
  page?: {
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
  };
}

/**
 * Maps a Ticketmaster event to our ProviderActivity format
 */
function mapEventToActivity(event: TicketmasterEvent): ProviderActivity | null {
  const venue = event._embedded?.venues?.[0];
  
  if (!venue?.location?.latitude || !venue?.location?.longitude) {
    console.log(`[Ticketmaster] Skipping event "${event.name}" - no location data`);
    return null;
  }
  
  const lat = parseFloat(venue.location.latitude);
  const lng = parseFloat(venue.location.longitude);
  
  if (isNaN(lat) || isNaN(lng)) {
    return null;
  }
  
  // Build address from venue data
  const addressParts: string[] = [];
  if (venue.address?.line1) addressParts.push(venue.address.line1);
  if (venue.city?.name) addressParts.push(venue.city.name);
  if (venue.state?.stateCode) addressParts.push(venue.state.stateCode);
  if (venue.postalCode) addressParts.push(venue.postalCode);
  
  const address = addressParts.join(', ') || venue.name || 'Address unavailable';
  
  // Get category from classification
  const segment = event.classifications?.[0]?.segment?.name?.toLowerCase() || '';
  const category: 'event' | 'activity' = 'event'; // All Ticketmaster results are events
  
  return {
    id: `tm_${event.id}`,
    name: event.name,
    address,
    rating: 0, // Ticketmaster doesn't have ratings
    totalRatings: 0,
    lat,
    lng,
    source: 'ticketmaster',
    category,
    city: venue.city?.name,
    types: [segment, event.classifications?.[0]?.genre?.name?.toLowerCase()].filter(Boolean) as string[],
  };
}

/**
 * Get the best classification for a search keyword
 */
function getClassificationForKeyword(keyword: string): string | null {
  const lowerKeyword = keyword.toLowerCase();
  
  // Direct match
  if (KEYWORD_TO_CLASSIFICATION[lowerKeyword]) {
    return KEYWORD_TO_CLASSIFICATION[lowerKeyword];
  }
  
  // Partial match
  for (const [key, value] of Object.entries(KEYWORD_TO_CLASSIFICATION)) {
    if (lowerKeyword.includes(key) || key.includes(lowerKeyword)) {
      return value;
    }
  }
  
  return null;
}

export const ticketmasterProvider: ActivityProvider = {
  providerName: "ticketmaster",
  
  get isEnabled(): boolean {
    const apiKey = Deno.env.get('TICKETMASTER_API_KEY');
    const flagEnabled = isFeatureEnabled('ENABLE_TICKETMASTER');
    return flagEnabled && !!apiKey;
  },
  
  async searchActivities(options: ActivitySearchOptions): Promise<ProviderActivity[]> {
    const apiKey = Deno.env.get('TICKETMASTER_API_KEY');
    
    if (!apiKey) {
      console.warn('[Ticketmaster] API key not configured');
      return [];
    }
    
    const { lat, lng, radiusMeters, keyword, limit = 20 } = options;
    
    // Convert meters to miles (Ticketmaster uses miles)
    const radiusMiles = Math.min(Math.ceil(radiusMeters / 1609.34), 100); // Max 100 miles
    
    // Build query parameters
    const params = new URLSearchParams({
      apikey: apiKey,
      latlong: `${lat},${lng}`,
      radius: radiusMiles.toString(),
      unit: 'miles',
      size: Math.min(limit, 50).toString(), // Max 50 per request
      sort: 'relevance,desc',
    });
    
    // Add classification if we can map the keyword
    const classification = getClassificationForKeyword(keyword);
    if (classification) {
      params.set('classificationName', classification);
      console.log(`[Ticketmaster] Mapped keyword "${keyword}" to classification "${classification}"`);
    } else {
      // Use keyword as general search term
      params.set('keyword', keyword);
      console.log(`[Ticketmaster] Using keyword search for "${keyword}"`);
    }
    
    // Only get events from today onwards
    const startDateTime = new Date().toISOString().split('.')[0] + 'Z';
    params.set('startDateTime', startDateTime);
    
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`;
    
    console.log(`[Ticketmaster] Searching: ${radiusMiles} miles around (${lat}, ${lng}) for "${keyword}"`);
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Ticketmaster] API error ${response.status}: ${errorText}`);
        return [];
      }
      
      const data: TicketmasterResponse = await response.json();
      
      const events = data._embedded?.events || [];
      console.log(`[Ticketmaster] Found ${events.length} events`);
      
      // Map and filter valid events
      const activities: ProviderActivity[] = [];
      
      for (const event of events) {
        const activity = mapEventToActivity(event);
        if (activity) {
          activities.push(activity);
        }
      }
      
      console.log(`[Ticketmaster] Mapped ${activities.length} valid activities`);
      return activities;
      
    } catch (error) {
      console.error('[Ticketmaster] Fetch error:', error);
      return [];
    }
  },
};
