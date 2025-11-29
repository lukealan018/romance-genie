// Common types for multi-provider activities system

export interface ProviderActivity {
  id: string;
  name: string;
  address: string;
  rating: number;
  lat: number;
  lng: number;
  source: "mock" | "google" | "yelp" | "foursquare";
  totalRatings: number;
  city?: string;
  category: 'event' | 'activity';
  distance?: number; // miles from search center
  types?: string[]; // For compatibility with scoring functions
  addressComponents?: any[]; // For city filtering
  geometry?: any; // For compatibility with scoring functions
  // Foursquare-specific fields for scoring (FREE tier)
  chains?: { id: string; name: string }[]; // Chain detection array
  hasPremiumData?: boolean; // Flag indicating if rating/reviews are available
}

export interface ActivitySearchOptions {
  lat: number;
  lng: number;
  radiusMeters: number;
  keyword: string;
  limit?: number;
  targetCity?: string;
  noveltyMode?: 'popular' | 'balanced' | 'hidden_gems';
}

export interface ActivityProvider {
  readonly providerName: string;
  readonly isEnabled: boolean;
  searchActivities(options: ActivitySearchOptions): Promise<ProviderActivity[]>;
}
