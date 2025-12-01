import { create } from 'zustand';

export type SearchMode = "both" | "restaurant_only" | "activity_only";

interface Place {
  id: string;
  name: string;
  rating: number;
  totalRatings: number;
  address: string;
  lat: number;
  lng: number;
  priceLevel?: string;
  cuisine?: string;
  category?: 'event' | 'activity';
  city?: string;
  source?: string;
  isHiddenGem?: boolean;
  isNewDiscovery?: boolean;
  isLocalFavorite?: boolean;
}

// Mode-specific result bucket structure
interface ModeResultsBoth {
  restaurants: Place[];
  activities: Place[];
  restaurantIdx: number;
  activityIdx: number;
  nextRestaurantsToken: string | null;
  nextActivitiesToken: string | null;
}

interface ModeResultsRestaurantOnly {
  restaurants: Place[];
  restaurantIdx: number;
  nextRestaurantsToken: string | null;
}

interface ModeResultsActivityOnly {
  activities: Place[];
  activityIdx: number;
  nextActivitiesToken: string | null;
}

interface PlanState {
  // Location and filters
  lat: number | null;
  lng: number | null;
  radius: number;
  cuisine: string;
  activityCategory: string;
  priceLevel: string;
  locationMode: "gps" | "zip";
  zipCode: string;
  
  // Date/time selection for future date searches
  searchDate: Date | null;
  searchTime: string | null;
  
  // Last search location fallback
  lastSearchLat: number | null;
  lastSearchLng: number | null;
  
  // Mode-specific result buckets
  resultsBoth: ModeResultsBoth;
  resultsRestaurantOnly: ModeResultsRestaurantOnly;
  resultsActivityOnly: ModeResultsActivityOnly;
  
  // Search signature for cache invalidation
  lastSearchSignature: string | null;
  
  // Track what was last searched
  lastSearchedCuisine: string | null;
  lastSearchedActivity: string | null;
  
  // User preferences
  userPreferences: {
    cuisines: string[];
    activities: string[];
  };
  
  // Search mode
  searchMode: SearchMode | null;
  
  // Track last search params for cache invalidation
  lastSearchMode: SearchMode | null;
  lastSearchDate: Date | null;
  
  // Actions
  setLocation: (lat: number | null, lng: number | null) => void;
  setFilters: (filters: { radius?: number; cuisine?: string; activityCategory?: string; priceLevel?: string; locationMode?: "gps" | "zip"; zipCode?: string }) => void;
  setSearchDate: (date: Date | null, time?: string | null) => void;
  clearSearchDateTime: () => void;
  setUserPreferences: (preferences: { cuisines: string[]; activities: string[] }) => void;
  setLastSearched: (cuisine: string, activity: string) => void;
  setLastSearchLocation: (lat: number | null, lng: number | null) => void;
  setSearchMode: (mode: SearchMode | null) => void;
  
  // Mode-aware getters
  getCurrentRestaurants: () => Place[];
  getCurrentActivities: () => Place[];
  getCurrentRestaurantIdx: () => number;
  getCurrentActivityIdx: () => number;
  getNextRestaurantsToken: () => string | null;
  getNextActivitiesToken: () => string | null;
  
  // Mode-aware setters
  setResultsForCurrentMode: (data: {
    restaurants?: Place[];
    activities?: Place[];
    restaurantIdx?: number;
    activityIdx?: number;
    nextRestaurantsToken?: string | null;
    nextActivitiesToken?: string | null;
  }) => void;
  setRestaurantIdxForCurrentMode: (idx: number) => void;
  setActivityIdxForCurrentMode: (idx: number) => void;
  
  // Signature management
  setSearchSignature: (signature: string) => void;
  clearAllResults: () => void;
  
  // Legacy compatibility - deprecated, use mode-aware versions
  restaurants: Place[];
  activities: Place[];
  restaurantIdx: number;
  activityIdx: number;
  nextRestaurantsToken: string | null;
  nextActivitiesToken: string | null;
  setRestaurants: (restaurants: Place[], token: string | null) => void;
  setActivities: (activities: Place[], token: string | null) => void;
  setRestaurantIdx: (idx: number) => void;
  setActivityIdx: (idx: number) => void;
  clearResults: () => void;
  resetPlan: () => void;
}

// Helper to get empty bucket for mode
const getEmptyBothBucket = (): ModeResultsBoth => ({
  restaurants: [],
  activities: [],
  restaurantIdx: 0,
  activityIdx: 0,
  nextRestaurantsToken: null,
  nextActivitiesToken: null,
});

const getEmptyRestaurantOnlyBucket = (): ModeResultsRestaurantOnly => ({
  restaurants: [],
  restaurantIdx: 0,
  nextRestaurantsToken: null,
});

const getEmptyActivityOnlyBucket = (): ModeResultsActivityOnly => ({
  activities: [],
  activityIdx: 0,
  nextActivitiesToken: null,
});

export const usePlanStore = create<PlanState>((set, get) => ({
  // Initial state
  lat: null,
  lng: null,
  radius: 5,
  cuisine: "",
  activityCategory: "",
  priceLevel: "",
  locationMode: "gps",
  zipCode: "",
  
  searchDate: null,
  searchTime: null,
  
  lastSearchLat: null,
  lastSearchLng: null,
  
  // Mode-specific buckets
  resultsBoth: getEmptyBothBucket(),
  resultsRestaurantOnly: getEmptyRestaurantOnlyBucket(),
  resultsActivityOnly: getEmptyActivityOnlyBucket(),
  
  // Search signature
  lastSearchSignature: null,
  
  lastSearchedCuisine: null,
  lastSearchedActivity: null,
  
  userPreferences: {
    cuisines: [],
    activities: [],
  },
  
  searchMode: null,
  
  lastSearchMode: null,
  lastSearchDate: null,
  
  // Legacy compatibility getters (computed from mode-specific buckets)
  get restaurants() {
    const state = get();
    const mode = state.searchMode || 'both';
    if (mode === 'both') return state.resultsBoth.restaurants;
    if (mode === 'restaurant_only') return state.resultsRestaurantOnly.restaurants;
    return [];
  },
  get activities() {
    const state = get();
    const mode = state.searchMode || 'both';
    if (mode === 'both') return state.resultsBoth.activities;
    if (mode === 'activity_only') return state.resultsActivityOnly.activities;
    return [];
  },
  get restaurantIdx() {
    const state = get();
    const mode = state.searchMode || 'both';
    if (mode === 'both') return state.resultsBoth.restaurantIdx;
    if (mode === 'restaurant_only') return state.resultsRestaurantOnly.restaurantIdx;
    return 0;
  },
  get activityIdx() {
    const state = get();
    const mode = state.searchMode || 'both';
    if (mode === 'both') return state.resultsBoth.activityIdx;
    if (mode === 'activity_only') return state.resultsActivityOnly.activityIdx;
    return 0;
  },
  get nextRestaurantsToken() {
    const state = get();
    const mode = state.searchMode || 'both';
    if (mode === 'both') return state.resultsBoth.nextRestaurantsToken;
    if (mode === 'restaurant_only') return state.resultsRestaurantOnly.nextRestaurantsToken;
    return null;
  },
  get nextActivitiesToken() {
    const state = get();
    const mode = state.searchMode || 'both';
    if (mode === 'both') return state.resultsBoth.nextActivitiesToken;
    if (mode === 'activity_only') return state.resultsActivityOnly.nextActivitiesToken;
    return null;
  },
  
  // Actions
  setLocation: (lat, lng) => set({ lat, lng }),
  
  setFilters: (filters) => set((state) => ({
    ...state,
    ...filters,
  })),
  
  setSearchDate: (date, time = null) => set({ 
    searchDate: date, 
    searchTime: time 
  }),
  
  clearSearchDateTime: () => set({
    searchDate: null,
    searchTime: null,
  }),
  
  setUserPreferences: (preferences) => set({ userPreferences: preferences }),
  
  setLastSearched: (cuisine, activity) => set({
    lastSearchedCuisine: cuisine, 
    lastSearchedActivity: activity 
  }),
  
  setLastSearchLocation: (lat, lng) => set({
    lastSearchLat: lat,
    lastSearchLng: lng
  }),
  
  // Mode switching clears ALL buckets and resets signature
  setSearchMode: (mode) => set((state) => {
    if (state.searchMode !== mode) {
      console.log('🔄 [planStore] Mode changed, clearing ALL result buckets');
      return {
        searchMode: mode,
        resultsBoth: getEmptyBothBucket(),
        resultsRestaurantOnly: getEmptyRestaurantOnlyBucket(),
        resultsActivityOnly: getEmptyActivityOnlyBucket(),
        lastSearchSignature: null, // Force fresh search
      };
    }
    return { searchMode: mode };
  }),
  
  // Mode-aware getters
  getCurrentRestaurants: () => {
    const state = get();
    const mode = state.searchMode || 'both';
    if (mode === 'both') return state.resultsBoth.restaurants;
    if (mode === 'restaurant_only') return state.resultsRestaurantOnly.restaurants;
    return [];
  },
  
  getCurrentActivities: () => {
    const state = get();
    const mode = state.searchMode || 'both';
    if (mode === 'both') return state.resultsBoth.activities;
    if (mode === 'activity_only') return state.resultsActivityOnly.activities;
    return [];
  },
  
  getCurrentRestaurantIdx: () => {
    const state = get();
    const mode = state.searchMode || 'both';
    if (mode === 'both') return state.resultsBoth.restaurantIdx;
    if (mode === 'restaurant_only') return state.resultsRestaurantOnly.restaurantIdx;
    return 0;
  },
  
  getCurrentActivityIdx: () => {
    const state = get();
    const mode = state.searchMode || 'both';
    if (mode === 'both') return state.resultsBoth.activityIdx;
    if (mode === 'activity_only') return state.resultsActivityOnly.activityIdx;
    return 0;
  },
  
  getNextRestaurantsToken: () => {
    const state = get();
    const mode = state.searchMode || 'both';
    if (mode === 'both') return state.resultsBoth.nextRestaurantsToken;
    if (mode === 'restaurant_only') return state.resultsRestaurantOnly.nextRestaurantsToken;
    return null;
  },
  
  getNextActivitiesToken: () => {
    const state = get();
    const mode = state.searchMode || 'both';
    if (mode === 'both') return state.resultsBoth.nextActivitiesToken;
    if (mode === 'activity_only') return state.resultsActivityOnly.nextActivitiesToken;
    return null;
  },
  
  // Mode-aware setters
  setResultsForCurrentMode: (data) => set((state) => {
    const mode = state.searchMode || 'both';
    console.log('📦 [planStore] Setting results for mode:', mode, data);
    
    if (mode === 'both') {
      return {
        resultsBoth: {
          restaurants: data.restaurants ?? state.resultsBoth.restaurants,
          activities: data.activities ?? state.resultsBoth.activities,
          restaurantIdx: data.restaurantIdx ?? state.resultsBoth.restaurantIdx,
          activityIdx: data.activityIdx ?? state.resultsBoth.activityIdx,
          nextRestaurantsToken: data.nextRestaurantsToken !== undefined 
            ? data.nextRestaurantsToken 
            : state.resultsBoth.nextRestaurantsToken,
          nextActivitiesToken: data.nextActivitiesToken !== undefined 
            ? data.nextActivitiesToken 
            : state.resultsBoth.nextActivitiesToken,
        }
      };
    }
    
    if (mode === 'restaurant_only') {
      return {
        resultsRestaurantOnly: {
          restaurants: data.restaurants ?? state.resultsRestaurantOnly.restaurants,
          restaurantIdx: data.restaurantIdx ?? state.resultsRestaurantOnly.restaurantIdx,
          nextRestaurantsToken: data.nextRestaurantsToken !== undefined 
            ? data.nextRestaurantsToken 
            : state.resultsRestaurantOnly.nextRestaurantsToken,
        }
      };
    }
    
    if (mode === 'activity_only') {
      return {
        resultsActivityOnly: {
          activities: data.activities ?? state.resultsActivityOnly.activities,
          activityIdx: data.activityIdx ?? state.resultsActivityOnly.activityIdx,
          nextActivitiesToken: data.nextActivitiesToken !== undefined 
            ? data.nextActivitiesToken 
            : state.resultsActivityOnly.nextActivitiesToken,
        }
      };
    }
    
    return {};
  }),
  
  setRestaurantIdxForCurrentMode: (idx) => set((state) => {
    const mode = state.searchMode || 'both';
    if (mode === 'both') {
      return { resultsBoth: { ...state.resultsBoth, restaurantIdx: idx } };
    }
    if (mode === 'restaurant_only') {
      return { resultsRestaurantOnly: { ...state.resultsRestaurantOnly, restaurantIdx: idx } };
    }
    return {};
  }),
  
  setActivityIdxForCurrentMode: (idx) => set((state) => {
    const mode = state.searchMode || 'both';
    if (mode === 'both') {
      return { resultsBoth: { ...state.resultsBoth, activityIdx: idx } };
    }
    if (mode === 'activity_only') {
      return { resultsActivityOnly: { ...state.resultsActivityOnly, activityIdx: idx } };
    }
    return {};
  }),
  
  // Signature management
  setSearchSignature: (signature) => set({ lastSearchSignature: signature }),
  
  clearAllResults: () => set({
    resultsBoth: getEmptyBothBucket(),
    resultsRestaurantOnly: getEmptyRestaurantOnlyBucket(),
    resultsActivityOnly: getEmptyActivityOnlyBucket(),
    lastSearchSignature: null,
  }),
  
  // Legacy setters (write to current mode bucket)
  setRestaurants: (restaurants, token) => set((state) => {
    const mode = state.searchMode || 'both';
    if (mode === 'both') {
      return {
        resultsBoth: {
          ...state.resultsBoth,
          restaurants,
          nextRestaurantsToken: token,
        }
      };
    }
    if (mode === 'restaurant_only') {
      return {
        resultsRestaurantOnly: {
          ...state.resultsRestaurantOnly,
          restaurants,
          nextRestaurantsToken: token,
        }
      };
    }
    return {};
  }),
  
  setActivities: (activities, token) => set((state) => {
    const mode = state.searchMode || 'both';
    if (mode === 'both') {
      return {
        resultsBoth: {
          ...state.resultsBoth,
          activities,
          nextActivitiesToken: token,
        }
      };
    }
    if (mode === 'activity_only') {
      return {
        resultsActivityOnly: {
          ...state.resultsActivityOnly,
          activities,
          nextActivitiesToken: token,
        }
      };
    }
    return {};
  }),
  
  setRestaurantIdx: (idx) => set((state) => {
    const mode = state.searchMode || 'both';
    if (mode === 'both') {
      return { resultsBoth: { ...state.resultsBoth, restaurantIdx: idx } };
    }
    if (mode === 'restaurant_only') {
      return { resultsRestaurantOnly: { ...state.resultsRestaurantOnly, restaurantIdx: idx } };
    }
    return {};
  }),
  
  setActivityIdx: (idx) => set((state) => {
    const mode = state.searchMode || 'both';
    if (mode === 'both') {
      return { resultsBoth: { ...state.resultsBoth, activityIdx: idx } };
    }
    if (mode === 'activity_only') {
      return { resultsActivityOnly: { ...state.resultsActivityOnly, activityIdx: idx } };
    }
    return {};
  }),
  
  clearResults: () => set((state) => {
    const mode = state.searchMode || 'both';
    console.log('🧹 [planStore] Clearing results for current mode:', mode);
    
    if (mode === 'both') {
      return { resultsBoth: getEmptyBothBucket() };
    }
    if (mode === 'restaurant_only') {
      return { resultsRestaurantOnly: getEmptyRestaurantOnlyBucket() };
    }
    if (mode === 'activity_only') {
      return { resultsActivityOnly: getEmptyActivityOnlyBucket() };
    }
    return {};
  }),
  
  resetPlan: () => set({
    resultsBoth: getEmptyBothBucket(),
    resultsRestaurantOnly: getEmptyRestaurantOnlyBucket(),
    resultsActivityOnly: getEmptyActivityOnlyBucket(),
    lastSearchSignature: null,
    lastSearchedCuisine: null,
    lastSearchedActivity: null,
    lastSearchMode: null,
    lastSearchDate: null,
    searchDate: null,
    searchTime: null,
  }),
}));

// Helper to build search signature
export const buildSearchSignature = (params: {
  mode: SearchMode | null;
  cuisine: string;
  activityCategory: string;
  radius: number;
  priceLevel: string;
  searchDate: Date | null;
  lat: number | null;
  lng: number | null;
  seed?: number;
}): string => {
  return JSON.stringify({
    mode: params.mode || 'both',
    cuisine: params.cuisine,
    activityCategory: params.activityCategory,
    radius: params.radius,
    priceLevel: params.priceLevel,
    searchDate: params.searchDate?.toISOString() || null,
    // Round lat/lng to prevent tiny GPS drift from invalidating cache
    lat: params.lat ? Math.round(params.lat * 1000) / 1000 : null,
    lng: params.lng ? Math.round(params.lng * 1000) / 1000 : null,
    seed: params.seed,
  });
};
