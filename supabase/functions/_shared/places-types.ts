// Common types for multi-provider places system

export interface ProviderPlace {
  id: string;
  name: string;
  address: string;
  rating: number;
  priceLevel: number | null;
  lat: number;
  lng: number;
  source: "mock" | "google" | "yelp" | "foursquare";
  reviewCount: number;
  photos: string[];
  categories: string[];
  distance?: number; // miles from search center
  types?: string[]; // For compatibility with scoring functions
  addressComponents?: any[]; // For city filtering
  geometry?: any; // For compatibility with scoring functions
  // Foursquare-specific fields for scoring (FREE tier)
  chains?: { id: string; name: string }[]; // Chain detection array
  hasPremiumData?: boolean; // Flag indicating if rating/reviews are available
}

export interface SearchOptions {
  lat: number;
  lng: number;
  radiusMeters: number;
  cuisine?: string;
  priceLevel?: string;
  limit?: number;
  targetCity?: string;
  noveltyMode?: 'popular' | 'balanced' | 'hidden_gems';
}

export interface PlacesProvider {
  readonly providerName: string;
  readonly isEnabled: boolean;
  searchRestaurants(options: SearchOptions): Promise<ProviderPlace[]>;
}
