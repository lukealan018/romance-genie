import type { PlacesProvider, ProviderPlace, SearchOptions } from '../places-types.ts';

const FOURSQUARE_API_KEY = Deno.env.get('FOURSQUARE_API_KEY')?.trim();
console.log(`🟦 Foursquare provider init: API key ${FOURSQUARE_API_KEY ? `present (${FOURSQUARE_API_KEY.length} chars, starts with: ${FOURSQUARE_API_KEY.substring(0, 4)}, ends with: ${FOURSQUARE_API_KEY.substring(FOURSQUARE_API_KEY.length - 4)})` : 'MISSING'}`);

// Cuisine to Foursquare Category ID mapping
const cuisineToCategoryId: Record<string, string> = {
  'italian': '13236',
  'mexican': '13303',
  'japanese': '13263',
  'chinese': '13099',
  'thai': '13352',
  'french': '13148',
  'american': '13064',
  'steakhouse': '13334',
  'seafood': '13338',
  'mediterranean': '13304',
  'indian': '13199',
  'fine dining': '13145',
  'restaurant': '13065', // Generic fallback
};

// Helper: Get Foursquare category ID for cuisine
function getCuisineCategory(cuisine?: string): string {
  if (!cuisine) return '13065'; // Default to generic restaurant
  const normalized = cuisine.toLowerCase().trim();
  return cuisineToCategoryId[normalized] || '13065';
}

// Helper: Calculate distance using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const foursquarePlacesProvider: PlacesProvider = {
  providerName: "foursquare",
  isEnabled: !!FOURSQUARE_API_KEY,
  
  async searchRestaurants(options: SearchOptions): Promise<ProviderPlace[]> {
    if (!FOURSQUARE_API_KEY) {
      console.log('⏸️ Foursquare provider: API key not configured (disabled)');
      return [];
    }
    
    try {
      console.log(`🟦 Foursquare provider: Searching near ${options.lat},${options.lng} radius ${options.radiusMeters}m`);
      
      // Build Foursquare Places API search URL (new endpoint)
      const fsUrl = new URL('https://places-api.foursquare.com/places/search');
      fsUrl.searchParams.set('ll', `${options.lat},${options.lng}`);
      fsUrl.searchParams.set('radius', options.radiusMeters.toString());
      
      // Add category ID for cuisine type
      const categoryId = getCuisineCategory(options.cuisine);
      fsUrl.searchParams.set('categories', categoryId);
      fsUrl.searchParams.set('limit', '50');
      
      // Add cuisine-specific query if provided for additional precision
      if (options.cuisine && options.cuisine !== 'restaurant') {
        fsUrl.searchParams.set('query', options.cuisine);
      }
      
      console.log(`🟦 Foursquare: Searching "${options.cuisine || 'restaurant'}" with category ${categoryId}`);
      
      // Map price level to Foursquare's 1-4 scale
      if (options.priceLevel) {
        const priceMap: Record<string, string> = {
          'budget': '1',
          'moderate': '2',
          'upscale': '3,4'
        };
        const foursquarePrice = priceMap[options.priceLevel];
        if (foursquarePrice) {
          fsUrl.searchParams.set('price', foursquarePrice);
        }
      }
      
      // Make API request with Bearer token format for Service API Key
      const authHeader = `Bearer ${FOURSQUARE_API_KEY}`;
      console.log(`🟦 Foursquare: Making request to ${fsUrl.toString()}`);
      console.log(`🟦 Foursquare: Auth header format: Bearer ${FOURSQUARE_API_KEY.substring(0, 4)}...${FOURSQUARE_API_KEY.substring(FOURSQUARE_API_KEY.length - 4)}`);
      
      const response = await fetch(fsUrl.toString(), {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json',
          'X-Places-Api-Version': '2025-06-17'
        }
      });
      
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`❌ Foursquare API error: ${response.status} ${response.statusText}`);
        console.error(`❌ Foursquare error body: ${errorBody}`);
        console.error(`❌ Request URL was: ${fsUrl.toString()}`);
        console.error(`❌ Headers sent: Authorization: Bearer ${FOURSQUARE_API_KEY.substring(0,4)}...${FOURSQUARE_API_KEY.substring(FOURSQUARE_API_KEY.length - 4)}`);
        return [];
      }
      
      const data = await response.json();
      const results = data.results || [];
      
      console.log(`🟦 Foursquare provider: Received ${results.length} raw results`);
      
      // Transform to ProviderPlace format
      const places: ProviderPlace[] = results.map((place: any): ProviderPlace => {
        // Support both new and old field names for coordinates
        const lat = place.latitude || place.geocodes?.main?.latitude || 0;
        const lng = place.longitude || place.geocodes?.main?.longitude || 0;
        const distance = calculateDistance(options.lat, options.lng, lat, lng);
        
        // Normalize rating from Foursquare's 10-point scale to 5-point
        const rating = place.rating ? place.rating / 2 : 0;
        
        // Extract photo URLs
        const photos: string[] = [];
        if (place.photos && Array.isArray(place.photos)) {
          photos.push(...place.photos.map((p: any) => `${p.prefix}original${p.suffix}`));
        }
        
        // Extract categories
        const categories: string[] = [];
        if (place.categories && Array.isArray(place.categories)) {
          categories.push(...place.categories.map((c: any) => c.name?.toLowerCase() || ''));
        }
        
        return {
          id: place.fsq_place_id || place.fsq_id, // New field with fallback to old
          name: place.name,
          address: place.location?.address || place.location?.formatted_address || '',
          rating,
          priceLevel: place.price || null,
          lat,
          lng,
          source: "foursquare",
          reviewCount: place.stats?.total_ratings || 0,
          photos,
          categories,
          distance,
          types: categories, // For compatibility with scoring
          addressComponents: [], // Foursquare doesn't provide this
          geometry: { location: { lat, lng } } // For compatibility
        };
      });
      
      // Filter by target city if specified
      let filtered = places;
      if (options.targetCity) {
        filtered = places.filter(place => {
          const addressLower = place.address.toLowerCase();
          const cityLower = options.targetCity!.toLowerCase();
          return addressLower.includes(cityLower);
        });
        console.log(`🟦 Foursquare provider: Filtered to ${filtered.length} results in ${options.targetCity}`);
      }
      
      // Sort by distance
      filtered.sort((a, b) => (a.distance || 999) - (b.distance || 999));
      
      console.log(`✅ Foursquare provider: Returning ${filtered.length} places`);
      return filtered;
      
    } catch (error) {
      console.error('❌ Foursquare provider error:', error);
      return [];
    }
  }
};
