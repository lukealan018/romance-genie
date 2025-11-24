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
}

interface PlanState {
  // Location and filters
  lat: number | null;
  lng: number | null;
  radius: number;
  cuisine: string;
  activityCategory: string;
  locationMode: "gps" | "zip";
  zipCode: string;
  
  // Last search location fallback
  lastSearchLat: number | null;
  lastSearchLng: number | null;
  
  // Results
  restaurants: Place[];
  activities: Place[];
  restaurantIdx: number;
  activityIdx: number;
  
  // Pagination tokens
  nextRestaurantsToken: string | null;
  nextActivitiesToken: string | null;
  
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
  
  // Actions
  setLocation: (lat: number, lng: number) => void;
  setFilters: (filters: { radius?: number; cuisine?: string; activityCategory?: string; locationMode?: "gps" | "zip"; zipCode?: string }) => void;
  setRestaurants: (restaurants: Place[], token: string | null) => void;
  setActivities: (activities: Place[], token: string | null) => void;
  setRestaurantIdx: (idx: number) => void;
  setActivityIdx: (idx: number) => void;
  setUserPreferences: (preferences: { cuisines: string[]; activities: string[] }) => void;
  setLastSearched: (cuisine: string, activity: string) => void;
  setLastSearchLocation: (lat: number, lng: number) => void;
  setSearchMode: (mode: SearchMode | null) => void;
  resetPlan: () => void;
}

export const usePlanStore = create<PlanState>((set) => ({
  // Initial state
  lat: null,
  lng: null,
  radius: 5,
  cuisine: "",
  activityCategory: "",
  locationMode: "gps",
  zipCode: "",
  
  lastSearchLat: null,
  lastSearchLng: null,
  
  restaurants: [],
  activities: [],
  restaurantIdx: 0,
  activityIdx: 0,
  
  nextRestaurantsToken: null,
  nextActivitiesToken: null,
  
  lastSearchedCuisine: null,
  lastSearchedActivity: null,
  
  userPreferences: {
    cuisines: [],
    activities: [],
  },
  
  searchMode: null,
  
  // Actions
  setLocation: (lat, lng) => set({ lat, lng }),
  
  setFilters: (filters) => set((state) => ({
    ...state,
    ...filters,
  })),
  
  setRestaurants: (restaurants, token) => set({
    restaurants,
    nextRestaurantsToken: token,
  }),
  
  setActivities: (activities, token) => set({
    activities,
    nextActivitiesToken: token,
  }),
  
  setRestaurantIdx: (idx) => set({ restaurantIdx: idx }),
  
  setActivityIdx: (idx) => set({ activityIdx: idx }),
  
  setUserPreferences: (preferences) => set({ userPreferences: preferences }),
  
  setLastSearched: (cuisine, activity) => set({ 
    lastSearchedCuisine: cuisine, 
    lastSearchedActivity: activity 
  }),
  
  setLastSearchLocation: (lat, lng) => set({
    lastSearchLat: lat,
    lastSearchLng: lng
  }),
  
  setSearchMode: (mode) => set({ searchMode: mode }),
  
  resetPlan: () => set({
    restaurants: [],
    activities: [],
    restaurantIdx: 0,
    activityIdx: 0,
    nextRestaurantsToken: null,
    nextActivitiesToken: null,
    lastSearchedCuisine: null,
    lastSearchedActivity: null,
  }),
}));
