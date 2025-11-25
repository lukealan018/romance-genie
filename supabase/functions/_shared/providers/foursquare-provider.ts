import type { PlacesProvider, ProviderPlace, SearchOptions } from '../places-types.ts';

// TODO: Add FOURSQUARE_API_KEY to Supabase secrets when ready
// Steps to enable:
// 1. Get API key from https://foursquare.com/developers/apps
// 2. Add secret: FOURSQUARE_API_KEY via Lovable Cloud settings
// 3. Set isEnabled: true below
// 4. Implement the searchRestaurants logic using Foursquare Places API

const FOURSQUARE_API_KEY = Deno.env.get('FOURSQUARE_API_KEY');

export const foursquarePlacesProvider: PlacesProvider = {
  providerName: "foursquare",
  isEnabled: false, // Set to true when API key is configured
  
  async searchRestaurants(options: SearchOptions): Promise<ProviderPlace[]> {
    if (!FOURSQUARE_API_KEY) {
      console.log('⏸️ Foursquare provider: API key not configured (disabled)');
      return [];
    }
    
    // TODO: Implement Foursquare Places API integration
    // API Documentation: https://developer.foursquare.com/docs/places-api-overview
    // 
    // Example implementation:
    // 
    // const fsUrl = new URL('https://api.foursquare.com/v3/places/search');
    // fsUrl.searchParams.set('ll', `${options.lat},${options.lng}`);
    // fsUrl.searchParams.set('radius', options.radiusMeters.toString());
    // fsUrl.searchParams.set('categories', '13065'); // Food & Dining category
    // fsUrl.searchParams.set('limit', '50');
    // 
    // if (options.cuisine && options.cuisine !== 'restaurant') {
    //   fsUrl.searchParams.set('query', options.cuisine);
    // }
    // 
    // if (options.priceLevel) {
    //   const priceMap: Record<string, string> = {
    //     'budget': '1',
    //     'moderate': '2',
    //     'upscale': '3,4'
    //   };
    //   fsUrl.searchParams.set('price', priceMap[options.priceLevel]);
    // }
    // 
    // const response = await fetch(fsUrl.toString(), {
    //   headers: {
    //     'Authorization': FOURSQUARE_API_KEY,
    //     'Accept': 'application/json'
    //   }
    // });
    // 
    // const data = await response.json();
    // 
    // return (data.results || []).map((place: any): ProviderPlace => ({
    //   id: place.fsq_id,
    //   name: place.name,
    //   address: place.location.address || '',
    //   rating: place.rating ? place.rating / 2 : 0, // Foursquare uses 10-point scale
    //   priceLevel: place.price || null,
    //   lat: place.geocodes.main.latitude,
    //   lng: place.geocodes.main.longitude,
    //   source: "foursquare",
    //   reviewCount: place.stats?.total_ratings || 0,
    //   photos: place.photos?.map((p: any) => `${p.prefix}original${p.suffix}`) || [],
    //   categories: place.categories?.map((c: any) => c.name.toLowerCase()) || []
    // }));
    
    console.log('⏸️ Foursquare provider: Not yet implemented');
    return [];
  }
};
