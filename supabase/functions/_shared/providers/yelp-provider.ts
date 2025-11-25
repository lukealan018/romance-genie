import type { PlacesProvider, ProviderPlace, SearchOptions } from '../places-types.ts';

// TODO: Add YELP_API_KEY to Supabase secrets when ready
// Steps to enable:
// 1. Get API key from https://www.yelp.com/developers
// 2. Add secret: YELP_API_KEY via Lovable Cloud settings
// 3. Set isEnabled: true below
// 4. Implement the searchRestaurants logic using Yelp Fusion API

const YELP_API_KEY = Deno.env.get('YELP_API_KEY');

export const yelpPlacesProvider: PlacesProvider = {
  providerName: "yelp",
  isEnabled: false, // Set to true when API key is configured
  
  async searchRestaurants(options: SearchOptions): Promise<ProviderPlace[]> {
    if (!YELP_API_KEY) {
      console.log('⏸️ Yelp provider: API key not configured (disabled)');
      return [];
    }
    
    // TODO: Implement Yelp Fusion API integration
    // API Documentation: https://www.yelp.com/developers/documentation/v3/business_search
    // 
    // Example implementation:
    // 
    // const yelpUrl = new URL('https://api.yelp.com/v3/businesses/search');
    // yelpUrl.searchParams.set('latitude', options.lat.toString());
    // yelpUrl.searchParams.set('longitude', options.lng.toString());
    // yelpUrl.searchParams.set('radius', Math.min(options.radiusMeters, 40000).toString()); // Max 40km
    // yelpUrl.searchParams.set('categories', 'restaurants');
    // yelpUrl.searchParams.set('limit', '50');
    // 
    // if (options.cuisine && options.cuisine !== 'restaurant') {
    //   yelpUrl.searchParams.set('term', options.cuisine);
    // }
    // 
    // if (options.priceLevel) {
    //   const priceMap: Record<string, string> = {
    //     'budget': '1,2',
    //     'moderate': '2,3',
    //     'upscale': '3,4'
    //   };
    //   yelpUrl.searchParams.set('price', priceMap[options.priceLevel]);
    // }
    // 
    // const response = await fetch(yelpUrl.toString(), {
    //   headers: {
    //     'Authorization': `Bearer ${YELP_API_KEY}`,
    //     'Accept': 'application/json'
    //   }
    // });
    // 
    // const data = await response.json();
    // 
    // return (data.businesses || []).map((business: any): ProviderPlace => ({
    //   id: business.id,
    //   name: business.name,
    //   address: business.location.address1 || '',
    //   rating: business.rating || 0,
    //   priceLevel: business.price ? business.price.length : null,
    //   lat: business.coordinates.latitude,
    //   lng: business.coordinates.longitude,
    //   source: "yelp",
    //   reviewCount: business.review_count || 0,
    //   photos: business.image_url ? [business.image_url] : [],
    //   categories: business.categories?.map((c: any) => c.alias) || []
    // }));
    
    console.log('⏸️ Yelp provider: Not yet implemented');
    return [];
  }
};
