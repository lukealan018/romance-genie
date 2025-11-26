import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { buildPlan, scorePlaces } from "@/lib/planner";
import { getLearnedPreferences, getContextualSuggestions } from "@/lib/learning";
import { usePlanStore } from "@/store/planStore";

// Helper function to calculate distance
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

interface UseVoiceSearchProps {
  userId: string | null;
  searchMode: string | null;
  handleUseCurrentLocation: (silent: boolean) => Promise<void>;
  trackInteraction: (place: any, type: 'restaurant' | 'activity', interactionType: 'viewed' | 'selected' | 'skipped') => Promise<void>;
  setPlan: (plan: any) => void;
  onSearchSuccess?: () => void;
}

export const useVoiceSearch = ({
  userId,
  searchMode,
  handleUseCurrentLocation,
  trackInteraction,
  setPlan,
  onSearchSuccess,
}: UseVoiceSearchProps) => {
  const {
    radius,
    cuisine,
    activityCategory,
    setLocation,
    setFilters,
    setRestaurants,
    setActivities,
    setRestaurantIdx,
    setActivityIdx,
    setLastSearched,
    setLastSearchLocation,
    setSearchMode,
  } = usePlanStore();

  const handlePreferencesExtracted = useCallback(async (preferences: any) => {
    console.log('=== VOICE PREFERENCES EXTRACTION START ===');
    console.log('Raw preferences:', preferences);
    
    setLastSearched('', '');
    setLastSearchLocation(null, null);
    
    let restaurantLat = null;
    let restaurantLng = null;
    let activityLat = null;
    let activityLng = null;
    let restaurantCity: string | undefined = undefined;
    let activityCity: string | undefined = undefined;
    let searchRadius = radius;
    
    const currentMode = preferences.mode || searchMode || 'both';
    console.log('Detected mode:', currentMode);
    
    const geocodeLocation = async (location: string): Promise<{ lat: number; lng: number; city?: string } | null> => {
      try {
        console.log(`🌍 Attempting to geocode: "${location}"`);
        const { data, error } = await supabase.functions.invoke('geocode', {
          body: { address: location }
        });
        
        if (error || !data?.lat || !data?.lng) {
          console.error(`❌ Geocoding failed for "${location}"`);
          return null;
        }
        console.log(`✅ Successfully geocoded "${location}":`, { lat: data.lat, lng: data.lng, city: data.city });
        return { lat: data.lat, lng: data.lng, city: data.city };
      } catch (error) {
        console.error(`❌ Failed to geocode "${location}":`, error);
        return null;
      }
    };
    
    // Handle restaurant-specific location
    if (preferences.restaurantRequest?.location) {
      console.log(`📍 Restaurant location specified: "${preferences.restaurantRequest.location}"`);
      toast({
        title: "Finding restaurant location...",
        description: `Looking up ${preferences.restaurantRequest.location}`,
      });
      
      const coords = await geocodeLocation(preferences.restaurantRequest.location);
      if (coords) {
        restaurantLat = coords.lat;
        restaurantLng = coords.lng;
        restaurantCity = coords.city;
        
        const isZipCode = /^\d+$/.test(preferences.restaurantRequest.location.trim());
        if (!isZipCode) {
          searchRadius = 3;
        }
      }
    }
    
    // Handle activity-specific location
    if (preferences.activityRequest?.location) {
      console.log(`📍 Activity location specified: "${preferences.activityRequest.location}"`);
      toast({
        title: "Finding activity location...",
        description: `Looking up ${preferences.activityRequest.location}`,
      });
      
      const coords = await geocodeLocation(preferences.activityRequest.location);
      if (coords) {
        activityLat = coords.lat;
        activityLng = coords.lng;
        activityCity = coords.city;
        
        const isZipCode = /^\d+$/.test(preferences.activityRequest.location.trim());
        if (!isZipCode && searchRadius === radius) {
          searchRadius = 3;
        }
      }
    }
    
    // Fallback to general location
    if (!preferences.restaurantRequest?.location && 
        !preferences.activityRequest?.location && 
        preferences.generalLocation) {
      toast({
        title: "Setting location...",
        description: `Looking up ${preferences.generalLocation}`,
      });
      
      const coords = await geocodeLocation(preferences.generalLocation);
      if (coords) {
        if (currentMode === 'both') {
          restaurantLat = activityLat = coords.lat;
          restaurantLng = activityLng = coords.lng;
        } else if (currentMode === 'restaurant_only') {
          restaurantLat = coords.lat;
          restaurantLng = coords.lng;
        } else if (currentMode === 'activity_only') {
          activityLat = coords.lat;
          activityLng = coords.lng;
        }
        
        setLocation(coords.lat, coords.lng);
        
        if (/^\d{5}$/.test(preferences.generalLocation)) {
          setFilters({ 
            locationMode: 'zip',
            zipCode: preferences.generalLocation
          });
        }
        
        toast({
          title: "Location set!",
          description: `Searching in ${preferences.generalLocation}`,
        });
      }
    }
    
    // Smarter fallback logic for missing coordinates
    if (!restaurantLat || !restaurantLng || !activityLat || !activityLng) {
      if (restaurantLat && restaurantLng && (!activityLat || !activityLng) && currentMode === 'both') {
        activityLat = restaurantLat;
        activityLng = restaurantLng;
      } else if (activityLat && activityLng && (!restaurantLat || !restaurantLng) && currentMode === 'both') {
        restaurantLat = activityLat;
        restaurantLng = activityLng;
      }
      
      if (preferences.useCurrentLocation && (!restaurantLat || !restaurantLng || !activityLat || !activityLng)) {
        console.log('🎯 Immediacy detected - getting GPS location');
        try {
          await handleUseCurrentLocation(true);
          const currentLat = usePlanStore.getState().lat;
          const currentLng = usePlanStore.getState().lng;
          
          if (!currentLat || !currentLng) throw new Error('Could not get current location');
          
          if (!restaurantLat || !restaurantLng) {
            restaurantLat = currentLat;
            restaurantLng = currentLng;
          }
          if (!activityLat || !activityLng) {
            activityLat = currentLat;
            activityLng = currentLng;
          }
        } catch (error) {
          console.error('Failed to get location:', error);
          toast({
            title: "Location required",
            description: "Please enable location services or set a home ZIP code",
            variant: "destructive"
          });
          return;
        }
      } else if (!restaurantLat || !restaurantLng || !activityLat || !activityLng) {
        const storeState = usePlanStore.getState();
        if (storeState.lat && storeState.lng) {
          if (!restaurantLat || !restaurantLng) {
            restaurantLat = storeState.lat;
            restaurantLng = storeState.lng;
          }
          if (!activityLat || !activityLng) {
            activityLat = storeState.lat;
            activityLng = storeState.lng;
          }
          toast({
            title: "Using home location",
            description: "Searching in your default area",
          });
        }
      }
    }
    
    // Map venue types to search filters
    const updates: any = {};
    
    if (preferences.restaurantRequest?.type) {
      const restaurantType = preferences.restaurantRequest.type.toLowerCase();
      const cuisineMap: Record<string, string> = {
        'steakhouse': 'steak',
        'burger': 'american',
        'burgers': 'american',
        'pizza': 'italian',
        'sushi': 'japanese',
        'tacos': 'mexican',
        'pasta': 'italian',
      };
      updates.cuisine = cuisineMap[restaurantType] || restaurantType;
    } else if (preferences.cuisinePreferences && preferences.cuisinePreferences.length > 0) {
      updates.cuisine = preferences.cuisinePreferences[0].toLowerCase();
    }
    
    if (preferences.activityRequest?.type) {
      updates.activityCategory = preferences.activityRequest.type;
    } else if (preferences.activityPreferences && preferences.activityPreferences.length > 0) {
      updates.activityCategory = preferences.activityPreferences[0];
    }
    
    if (Object.keys(updates).length > 0) {
      setFilters(updates);
    }
    
    try {
      const searchCuisine = updates.cuisine || cuisine || "";
      const searchActivity = updates.activityCategory || activityCategory;
      const restaurantPriceLevel = preferences.restaurantRequest?.priceLevel || null;
      
      // Get fresh userPreferences from store
      const userPreferences = usePlanStore.getState().userPreferences;
      
      const learnedPrefs = userId ? await getLearnedPreferences(userId) : undefined;
      const voiceMode = preferences.mode || 'both';
      setSearchMode(voiceMode);
      
      let userInteractionPlaceIds: string[] = [];
      if (userId && preferences.intent === 'surprise') {
        try {
          const { data: interactions } = await supabase
            .from('user_interactions')
            .select('place_id')
            .eq('user_id', userId);
          
          if (interactions) {
            userInteractionPlaceIds = interactions.map(i => i.place_id);
          }
        } catch (error) {
          console.error('Failed to load user interactions:', error);
        }
      }
      
      // Search restaurants only if mode allows
      const restaurantsPromise = (voiceMode === 'both' || voiceMode === 'restaurant_only')
        ? supabase.functions.invoke('places-search', {
            body: { 
              lat: restaurantLat, 
              lng: restaurantLng, 
              radiusMiles: searchRadius, 
              cuisine: searchCuisine === "🌍 Around the World" ? "" : searchCuisine,
              priceLevel: restaurantPriceLevel,
              targetCity: restaurantCity
            }
          })
        : Promise.resolve({ data: { items: [] }, error: null });

      // Search activities only if mode allows
      const activitiesPromise = (voiceMode === 'both' || voiceMode === 'activity_only')
        ? supabase.functions.invoke('activities-search', {
            body: { 
              lat: activityLat, 
              lng: activityLng, 
              radiusMiles: searchRadius, 
              keyword: searchActivity || 'fun activity',
              targetCity: activityCity
            }
          })
        : Promise.resolve({ data: { items: [] }, error: null });

      const [restaurantsResponse, activitiesResponse] = await Promise.all([
        restaurantsPromise,
        activitiesPromise
      ]);

      if (restaurantsResponse.error) throw restaurantsResponse.error;
      if (activitiesResponse.error) throw activitiesResponse.error;

      const restaurants = restaurantsResponse.data?.items || [];
      const activities = activitiesResponse.data?.items || [];
      
      // Fallback strategy for activities
      let finalActivities = activities;
      
      if (activities.length === 0 && searchActivity && (voiceMode === 'both' || voiceMode === 'activity_only')) {
        const fallbackMap: Record<string, string> = {
          'whiskey bar': 'bar',
          'cocktail bar': 'bar',
          'wine bar': 'bar',
          'speakeasy': 'bar',
          'comedy club': 'comedy',
          'live music': 'music venue',
          'escape room': 'entertainment',
          'mini golf': 'golf',
        };
        
        const fallbackTerm = fallbackMap[searchActivity.toLowerCase()] || searchActivity.split(' ')[0];
        
        if (fallbackTerm !== searchActivity) {
          const fallbackResponse = await supabase.functions.invoke('activities-search', {
            body: { lat: activityLat, lng: activityLng, radiusMiles: searchRadius, keyword: fallbackTerm, targetCity: activityCity }
          });
          
          if (!fallbackResponse.error && fallbackResponse.data?.items?.length > 0) {
            finalActivities = fallbackResponse.data.items;
            toast({
              title: "Search expanded",
              description: `No ${searchActivity} found, showing ${fallbackTerm} instead`,
            });
          }
        }
      }
      
      // Calculate plan center with null guards
      const planLat = (restaurantLat && activityLat) ? (restaurantLat + activityLat) / 2 : (restaurantLat || activityLat || 0);
      const planLng = (restaurantLng && activityLng) ? (restaurantLng + activityLng) / 2 : (restaurantLng || activityLng || 0);
      
      let weatherData = null;
      try {
        const { data: weather, error: weatherError } = await supabase.functions.invoke('weather', {
          body: { lat: planLat, lng: planLng }
        });
        
        if (!weatherError && weather) {
          weatherData = weather;
        }
      } catch (weatherError) {
        console.error('Failed to fetch weather:', weatherError);
      }
      
      const contextual = getContextualSuggestions({ 
        weather: weatherData,
        occasion: preferences.occasion,
      });
      
      const sortedRestaurants = scorePlaces(
        restaurants, 
        restaurantLat,
        restaurantLng, 
        radius, 
        userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 
          ? userPreferences 
          : undefined,
        'restaurant',
        learnedPrefs,
        preferences.intent,
        preferences.noveltyLevel,
        userInteractionPlaceIds
      );
      const sortedActivities = scorePlaces(
        finalActivities, 
        activityLat,
        activityLng, 
        searchRadius, 
        userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 
          ? userPreferences 
          : undefined,
        'activity',
        learnedPrefs,
        preferences.intent,
        preferences.noveltyLevel,
        userInteractionPlaceIds
      );
      
      setRestaurants(sortedRestaurants, restaurantsResponse.data?.nextPageToken || null);
      setActivities(sortedActivities, activitiesResponse.data?.nextPageToken || null);
      setLastSearched(searchCuisine, searchActivity);
      setLocation(planLat, planLng);

      const initialPlan = buildPlan({
        lat: planLat,
        lng: planLng,
        radius,
        restaurants: sortedRestaurants,
        activities: sortedActivities,
        preferences: userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 
          ? userPreferences 
          : undefined,
        learnedPreferences: learnedPrefs,
        intent: preferences.intent,
        noveltyLevel: preferences.noveltyLevel,
        userInteractionPlaceIds,
        contextualHints: {
          indoorPreference: contextual.indoorPreference,
          energyLevel: contextual.message.toLowerCase().includes('chill') || contextual.message.toLowerCase().includes('unwind')
            ? 'low'
            : contextual.message.toLowerCase().includes('lively') || contextual.message.toLowerCase().includes('active')
            ? 'high'
            : 'medium',
        },
        searchMode: voiceMode,
      });

      const selectedRestaurantIndex = initialPlan.restaurant 
        ? sortedRestaurants.findIndex(r => r.id === initialPlan.restaurant?.id)
        : 0;
      const selectedActivityIndex = initialPlan.activity
        ? sortedActivities.findIndex(a => a.id === initialPlan.activity?.id)
        : 0;

      setRestaurantIdx(selectedRestaurantIndex >= 0 ? selectedRestaurantIndex : 0);
      setActivityIdx(selectedActivityIndex >= 0 ? selectedActivityIndex : 0);
      
      setPlan(initialPlan);

      if (initialPlan.restaurant) {
        await trackInteraction(initialPlan.restaurant, 'restaurant', 'selected');
      }
      if (initialPlan.activity) {
        await trackInteraction(initialPlan.activity, 'activity', 'selected');
      }

      toast({ 
        title: "Got it!", 
        description: `Found ${restaurants.length} restaurants and ${finalActivities.length} activities based on your request!`,
      });
      
      // Trigger first search completion
      onSearchSuccess?.();
    } catch (error) {
      console.error('Error in voice search:', error);
      toast({ 
        title: "Error", 
        description: "Failed to process your request. Please try again.", 
        variant: "destructive" 
      });
    }
  }, [userId, radius, cuisine, activityCategory, searchMode, handleUseCurrentLocation, trackInteraction, setPlan, onSearchSuccess, setLocation, setFilters, setRestaurants, setActivities, setRestaurantIdx, setActivityIdx, setLastSearched, setLastSearchLocation, setSearchMode]);

  const { isListening, isProcessing, transcript, startListening } = useVoiceInput({
    onPreferencesExtracted: handlePreferencesExtracted,
    userProfile: usePlanStore.getState().userPreferences,
  });

  return {
    isListening,
    isProcessing,
    transcript,
    startListening
  };
};
