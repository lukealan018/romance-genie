import type { PlacesProvider, ProviderPlace, SearchOptions } from '../places-types.ts';

export const mockPlacesProvider: PlacesProvider = {
  providerName: "mock",
  isEnabled: false, // Disabled by default - enable for testing only
  
  async searchRestaurants(options: SearchOptions): Promise<ProviderPlace[]> {
    console.log('🎭 Mock provider: Generating test data');
    
    // Return 5 mock places near the search center for testing
    const mockPlaces: ProviderPlace[] = [
      {
        id: "mock-italian-bistro",
        name: "Mock Italian Bistro",
        address: "123 Test Street",
        rating: 4.7,
        priceLevel: 2,
        lat: options.lat + 0.002,
        lng: options.lng + 0.002,
        source: "mock",
        reviewCount: 185,
        photos: [],
        categories: ["italian", "restaurant"],
        distance: 0.15
      },
      {
        id: "mock-sushi-palace",
        name: "Mock Sushi Palace",
        address: "456 Demo Avenue",
        rating: 4.5,
        priceLevel: 3,
        lat: options.lat - 0.001,
        lng: options.lng + 0.003,
        source: "mock",
        reviewCount: 142,
        photos: [],
        categories: ["japanese", "sushi", "restaurant"],
        distance: 0.22
      },
      {
        id: "mock-taco-truck",
        name: "Mock Taco Truck",
        address: "789 Sample Road",
        rating: 4.8,
        priceLevel: 1,
        lat: options.lat + 0.003,
        lng: options.lng - 0.001,
        source: "mock",
        reviewCount: 98,
        photos: [],
        categories: ["mexican", "food_truck"],
        distance: 0.18
      },
      {
        id: "mock-steakhouse",
        name: "Mock Prime Steakhouse",
        address: "321 Placeholder Blvd",
        rating: 4.6,
        priceLevel: 4,
        lat: options.lat - 0.002,
        lng: options.lng - 0.002,
        source: "mock",
        reviewCount: 267,
        photos: [],
        categories: ["steakhouse", "upscale", "restaurant"],
        distance: 0.28
      },
      {
        id: "mock-cafe",
        name: "Mock Coffee & Brunch",
        address: "555 Testing Lane",
        rating: 4.4,
        priceLevel: 2,
        lat: options.lat + 0.001,
        lng: options.lng - 0.003,
        source: "mock",
        reviewCount: 156,
        photos: [],
        categories: ["cafe", "breakfast", "brunch"],
        distance: 0.21
      }
    ];
    
    // Filter by cuisine if specified
    if (options.cuisine && options.cuisine !== 'restaurant') {
      const filtered = mockPlaces.filter(place => 
        place.categories.some(cat => 
          cat.toLowerCase().includes(options.cuisine!.toLowerCase())
        )
      );
      console.log(`🎭 Mock provider: Filtered to ${filtered.length} results matching "${options.cuisine}"`);
      return filtered;
    }
    
    console.log(`🎭 Mock provider: Returning ${mockPlaces.length} mock results`);
    return mockPlaces;
  }
};
