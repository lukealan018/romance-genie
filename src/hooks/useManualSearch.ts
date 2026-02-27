import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { buildPlan, buildPlanFromIndices, scorePlaces } from "@/lib/planner";
import { getLearnedPreferences, getContextualSuggestions } from "@/lib/learning";
import { usePlanStore, buildSearchSignature } from "@/store/planStore";

// Geolocation options for consistent iOS behavior
const geoOptions: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 20000,
  maximumAge: 0
};

/**
 * Hook for manual search (handleFindPlaces, handleSeePlan, handleReroll) and location.
 */
export const useManualSearch = (
  userId: string | null,
  saveLocationSettings: (radius: number, zipCode: string, immediate: boolean) => Promise<void>,
  trackInteraction: (place: any, type: 'restaurant' | 'activity', interactionType: 'viewed' | 'selected' | 'skipped') => Promise<void>,
  setPlan: (plan: any) => void,
  onSearchSuccess?: () => void
) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const {
    lat, lng, radius, cuisine, activityCategory, locationMode, zipCode,
    searchDate, userPreferences, searchMode,
    setLocation, setFilters, setRestaurants, setActivities,
    setRestaurantIdx: setRestaurantIndex, setActivityIdx: setActivityIndex,
    setLastSearched, setLastSearchLocation, setSearchSignature,
    clearResults,
    getCurrentRestaurants, getCurrentActivities,
    getCurrentRestaurantIdx, getCurrentActivityIdx,
  } = usePlanStore();

  const getPrefs = () =>
    userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0
      ? userPreferences
      : undefined;

  // Helper to shuffle results while keeping top-scored items at front
  const shuffleResults = <T,>(results: T[]): T[] => {
    if (results.length <= 5) return results;
    const top = results.slice(0, 5);
    const rest = [...results.slice(5)].sort(() => Math.random() - 0.5);
    return [...top, ...rest];
  };

  const handleUseCurrentLocation = (silent: boolean = false): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const message = "Geolocation is not supported by your browser";
        if (!silent) toast({ title: "Error", description: message, variant: "destructive" });
        reject(new Error(message));
        return;
      }

      setGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation(position.coords.latitude, position.coords.longitude);
          setGettingLocation(false);
          if (!silent) toast({ title: "Success", description: "Location detected! Ready to find date spots near you." });
          resolve();
        },
        (error) => {
          setGettingLocation(false);
          if (!silent) {
            let title = "Location Error";
            let description = "Could not get your location";
            if (error.code === 1) {
              title = "Location Access Blocked";
              description = "Location permission was denied. To use GPS:\n\n• Safari: Go to Settings → Safari → Location → Allow\n• Or use ZIP code mode instead";
            } else if (error.code === 2) {
              title = "Location Unavailable";
              description = "Location services may be disabled. Check your device settings or use ZIP code instead.";
            } else if (error.code === 3) {
              title = "Location Timeout";
              description = "Location request timed out. Please try again or use ZIP code instead.";
            }
            toast({ title, description, variant: "destructive", duration: 8000 });
          }
          reject(error);
        },
        geoOptions
      );
    });
  };

  const resolveCoordinates = async (): Promise<{ lat: number; lng: number } | null> => {
    if (locationMode === "gps") {
      if (lat === null || lng === null) {
        toast({ title: "Error", description: "Please get your current location first", variant: "destructive" });
        return null;
      }
      return { lat, lng };
    } else {
      const cleanZip = zipCode.trim();
      if (!cleanZip) {
        toast({ title: "ZIP code required", description: "Please enter a ZIP code to continue.", variant: "destructive" });
        return null;
      }
      if (!/^\d{5}$/.test(cleanZip)) {
        toast({ title: "Invalid ZIP code", description: "Please enter a valid 5-digit US ZIP code.", variant: "destructive" });
        return null;
      }
      try {
        const { data: geocodeData, error: geocodeError } = await supabase.functions.invoke('geocode', {
          body: { zipCode: cleanZip }
        });
        if (geocodeError || !geocodeData) {
          toast({ title: "Location error", description: geocodeData?.error || geocodeError?.message || "Could not find location for this ZIP code.", variant: "destructive" });
          return null;
        }
        setLocation(geocodeData.lat, geocodeData.lng);
        return { lat: geocodeData.lat, lng: geocodeData.lng };
      } catch (error) {
        console.error('Geocoding error:', error);
        toast({ title: "Error", description: "Could not find location for this ZIP code", variant: "destructive" });
        return null;
      }
    }
  };

  const handleFindPlaces = async (
    overrideCuisine?: string,
    overrideActivity?: string,
    forceFresh: boolean = false,
    userTriggered: boolean = false,
    navigateOnSuccess: boolean = false
  ) => {
    const searchCuisine = overrideCuisine ?? cuisine;
    const searchActivity = overrideActivity ?? activityCategory;
    
    const coords = await resolveCoordinates();
    if (!coords) return;
    const { lat: searchLat, lng: searchLng } = coords;

    const currentMode = searchMode || 'both';
    const { priceLevel, lastSearchSignature: freshSignature } = usePlanStore.getState();

    const currentSignature = buildSearchSignature({
      mode: currentMode, cuisine: searchCuisine, activityCategory: searchActivity,
      radius, priceLevel, searchDate, lat: searchLat, lng: searchLng,
    });

    if (!forceFresh && !userTriggered && currentSignature === freshSignature) {
      const currentRestaurants = getCurrentRestaurants();
      const currentActivities = getCurrentActivities();
      if (currentRestaurants.length > 0 || currentActivities.length > 0) {
        const cachedPlan = buildPlanFromIndices({
          lat: searchLat, lng: searchLng, radius,
          restaurants: currentRestaurants, activities: currentActivities,
          preferences: getPrefs(), searchMode: currentMode,
        }, getCurrentRestaurantIdx(), getCurrentActivityIdx());
        setPlan(cachedPlan);
        return;
      }
    }

    clearResults();
    setLoading(true);
    try {
      let weatherData = null;
      try {
        const { data: weather, error: weatherError } = await supabase.functions.invoke('weather', {
          body: { lat: searchLat, lng: searchLng }
        });
        if (!weatherError && weather) weatherData = weather;
      } catch (weatherError) {
        console.error('Failed to fetch weather:', weatherError);
      }
      
      const contextual = getContextualSuggestions({ weather: weatherData });
      const learnedPrefs = userId ? await getLearnedPreferences(userId) : undefined;
      
      const variationSeed = Math.floor(Math.random() * 1000000);
      const { venueType, searchTime } = usePlanStore.getState();
      
      const restaurantsPromise = (currentMode === 'both' || currentMode === 'restaurant_only')
        ? supabase.functions.invoke('places-search', {
            body: {
              lat: searchLat, lng: searchLng, radiusMiles: radius,
              cuisine: searchCuisine, priceLevel: priceLevel || undefined,
              seed: variationSeed, forceFresh: forceFresh || userTriggered,
              venueType: venueType || 'any', searchMode: currentMode,
              searchTime: searchTime || undefined
            }
          })
        : Promise.resolve({ data: { items: [] }, error: null });
      
      const activitiesPromise = (currentMode === 'both' || currentMode === 'activity_only')
        ? supabase.functions.invoke('activities-search', {
            body: {
              lat: searchLat, lng: searchLng, radiusMiles: radius,
              keyword: searchActivity, seed: variationSeed,
              forceFresh: forceFresh || userTriggered
            }
          })
        : Promise.resolve({ data: { items: [] }, error: null });
      
      const [restaurantsResponse, activitiesResponse] = await Promise.all([restaurantsPromise, activitiesPromise]);

      if (restaurantsResponse.error) throw restaurantsResponse.error;
      if (activitiesResponse.error) throw activitiesResponse.error;

      const restaurants = restaurantsResponse.data?.items || [];
      const activities = activitiesResponse.data?.items || [];

      if (restaurants.length > 0 || activities.length > 0) {
        setLastSearchLocation(searchLat, searchLng);
      }

      let finalActivities = activities;
      let usedRadius = radius;
      let usedKeyword = searchActivity;
      
      // Fallback logic for activities
      if (activities.length === 0 && searchActivity && (currentMode === 'both' || currentMode === 'activity_only')) {
        const fallbackMap: Record<string, string> = {
          'whiskey bar': 'bar', 'cocktail bar': 'bar', 'wine bar': 'bar', 'speakeasy': 'bar',
          'comedy club': 'comedy', 'live music': 'music venue', 'escape room': 'entertainment', 'mini golf': 'golf',
        };
        const fallbackTerm = fallbackMap[searchActivity.toLowerCase()] || searchActivity.split(' ')[0];
        
        if (fallbackTerm !== searchActivity) {
          usedKeyword = fallbackTerm;
          const fallbackResponse = await supabase.functions.invoke('activities-search', {
            body: { lat: searchLat, lng: searchLng, radiusMiles: radius, keyword: fallbackTerm, forceFresh }
          });
          if (!fallbackResponse.error && fallbackResponse.data?.items?.length > 0) {
            finalActivities = fallbackResponse.data.items;
            toast({ title: "Search expanded", description: `No ${searchActivity} found, showing ${fallbackTerm} instead` });
          }
        }
      }
      
      // Radius expansion fallback
      if (finalActivities.length === 0 && usedKeyword && (currentMode === 'both' || currentMode === 'activity_only')) {
        for (const expandedRadius of [10, 15]) {
          if (expandedRadius <= radius) continue;
          const expandedResponse = await supabase.functions.invoke('activities-search', {
            body: { lat: searchLat, lng: searchLng, radiusMiles: expandedRadius, keyword: usedKeyword, forceFresh }
          });
          if (!expandedResponse.error && expandedResponse.data?.items?.length > 0) {
            finalActivities = expandedResponse.data.items;
            usedRadius = expandedRadius;
            toast({ title: "Expanded search area", description: `Found ${finalActivities.length} options within ${expandedRadius} miles` });
            break;
          }
        }
      }
      
      const scoredRestaurants = scorePlaces(restaurants, searchLat, searchLng, radius, getPrefs(), 'restaurant', learnedPrefs, undefined, undefined, undefined, undefined, undefined, undefined);
      const scoredActivities = scorePlaces(finalActivities, searchLat, searchLng, usedRadius, getPrefs(), 'activity', learnedPrefs, undefined, undefined, undefined, undefined, undefined, undefined);
      
      const sortedRestaurants = shuffleResults(scoredRestaurants);
      const sortedActivities = shuffleResults(scoredActivities);
      
      setRestaurants(sortedRestaurants, restaurantsResponse.data?.nextPageToken || null);
      setActivities(sortedActivities, activitiesResponse.data?.nextPageToken || null);
      setLastSearched(searchCuisine, searchActivity);
      setLocation(searchLat, searchLng);
      setSearchSignature(currentSignature);

      const initialPlan = buildPlan({
        lat: searchLat, lng: searchLng, radius,
        restaurants: sortedRestaurants, activities: sortedActivities,
        preferences: getPrefs(), learnedPreferences: learnedPrefs,
        contextualHints: {
          indoorPreference: contextual.indoorPreference,
          energyLevel: contextual.message.toLowerCase().includes('chill') || contextual.message.toLowerCase().includes('unwind')
            ? 'low'
            : contextual.message.toLowerCase().includes('lively') || contextual.message.toLowerCase().includes('active')
            ? 'high' : 'medium',
        },
        searchMode: currentMode,
      });

      const selectedRestaurantIndex = initialPlan.restaurant ? sortedRestaurants.findIndex(r => r.id === initialPlan.restaurant?.id) : 0;
      const selectedActivityIndex = initialPlan.activity ? sortedActivities.findIndex(a => a.id === initialPlan.activity?.id) : 0;

      setRestaurantIndex(selectedRestaurantIndex >= 0 ? selectedRestaurantIndex : 0);
      setActivityIndex(selectedActivityIndex >= 0 ? selectedActivityIndex : 0);
      
      setPlan(initialPlan);
      
      if (initialPlan.restaurant) await trackInteraction(initialPlan.restaurant, 'restaurant', 'selected');
      if (initialPlan.activity) await trackInteraction(initialPlan.activity, 'activity', 'selected');
      
      await saveLocationSettings(radius, zipCode, true);
      onSearchSuccess?.();

      if (navigateOnSuccess) {
        setTimeout(() => { navigate("/plan", { replace: true }); }, 50);
      }
    } catch (error) {
      console.error('Error fetching places:', error);
      toast({ title: "Error", description: "Failed to find places. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleReroll = async () => {
    if (!lat || !lng) {
      toast({ title: "No location set", description: "Please set your location first", variant: "destructive" });
      return;
    }
    
    clearResults();
    setLoading(true);
    try {
      const currentMode = searchMode || 'both';
      const randomSeed = Math.floor(Math.random() * 1000000);
      const { priceLevel } = usePlanStore.getState();
      
      const restaurantsPromise = (currentMode === 'both' || currentMode === 'restaurant_only')
        ? supabase.functions.invoke('places-search', {
            body: { lat, lng, radiusMiles: radius, cuisine, priceLevel: priceLevel || undefined, seed: randomSeed, searchMode: currentMode, forceFresh: true }
          })
        : Promise.resolve({ data: { items: [] }, error: null });
      
      const activitiesPromise = (currentMode === 'both' || currentMode === 'activity_only')
        ? supabase.functions.invoke('activities-search', {
            body: { lat, lng, radiusMiles: radius, keyword: activityCategory, seed: randomSeed, forceFresh: true }
          })
        : Promise.resolve({ data: { items: [] }, error: null });
      
      const [restaurantsResponse, activitiesResponse] = await Promise.all([restaurantsPromise, activitiesPromise]);

      if (restaurantsResponse.error) throw restaurantsResponse.error;
      if (activitiesResponse.error) throw activitiesResponse.error;

      const sortedRestaurants = scorePlaces(restaurantsResponse.data?.items || [], lat, lng, radius, getPrefs(), 'restaurant');
      const sortedActivities = scorePlaces(activitiesResponse.data?.items || [], lat, lng, radius, getPrefs(), 'activity');
      
      setRestaurants(sortedRestaurants, restaurantsResponse.data?.nextPageToken || null);
      setActivities(sortedActivities, activitiesResponse.data?.nextPageToken || null);

      const restaurantStartIdx = sortedRestaurants.length > 1 ? Math.floor(Math.random() * Math.min(3, sortedRestaurants.length)) : 0;
      const activityStartIdx = sortedActivities.length > 1 ? Math.floor(Math.random() * Math.min(3, sortedActivities.length)) : 0;

      const freshPlan = buildPlanFromIndices({
        lat, lng, radius,
        restaurants: sortedRestaurants, activities: sortedActivities,
        preferences: getPrefs(), searchMode: currentMode,
      }, restaurantStartIdx, activityStartIdx);

      setRestaurantIndex(restaurantStartIdx);
      setActivityIndex(activityStartIdx);
      
      const { priceLevel: currentPriceLevel } = usePlanStore.getState();
      const newSignature = buildSearchSignature({
        mode: currentMode, cuisine, activityCategory, radius, priceLevel: currentPriceLevel,
        searchDate, lat, lng, seed: randomSeed,
      });
      setSearchSignature(newSignature);
      
      setPlan(freshPlan);
      toast({ title: "Rerolled!", description: "Fresh picks served up!" });
    } catch (error) {
      console.error('Error rerolling plan:', error);
      toast({ title: "Error", description: "Failed to reroll. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSeePlan = async () => {
    const currentMode = searchMode || 'both';
    
    if (radius <= 0) {
      toast({ title: "Error", description: "Please set a valid search radius", variant: "destructive" });
      return;
    }
    
    const { venueType } = usePlanStore.getState();
    
    if ((currentMode === 'both' || currentMode === 'restaurant_only') && !cuisine && venueType !== 'coffee' && venueType !== 'brunch') {
      toast({ title: "Error", description: "Please select a cuisine", variant: "destructive" });
      return;
    }
    
    if ((currentMode === 'both' || currentMode === 'activity_only') && !activityCategory) {
      toast({ title: "Error", description: "Please select an activity", variant: "destructive" });
      return;
    }
    
    if (!lat || !lng) {
      if (locationMode === "gps") {
        toast({ title: "Getting your location...", description: "Please wait while we determine your location" });
        try {
          await handleUseCurrentLocation();
        } catch (error) {
          toast({ title: "Location Required", description: "Please allow location access or switch to ZIP code mode", variant: "destructive" });
          return;
        }
      } else {
        const cleanZip = zipCode.trim();
        if (!cleanZip) {
          toast({ title: "ZIP Code Required", description: "Please enter your ZIP code to continue", variant: "destructive" });
          return;
        }
        if (!/^\d{5}$/.test(cleanZip)) {
          toast({ title: "Invalid ZIP Code", description: "Please enter a valid 5-digit US ZIP code", variant: "destructive" });
          return;
        }
      }
    }

    const { priceLevel, lastSearchSignature: freshSignature } = usePlanStore.getState();
    const currentSignature = buildSearchSignature({
      mode: currentMode, cuisine, activityCategory, radius, priceLevel, searchDate, lat, lng,
    });

    const needsFreshSearch = currentSignature !== freshSignature;
    const currentRestaurants = getCurrentRestaurants();
    const currentActivities = getCurrentActivities();
    const hasResults = currentRestaurants.length > 0 || currentActivities.length > 0;

    if (needsFreshSearch || hasResults) {
      await handleFindPlaces(undefined, undefined, false, true, true);
    } else {
      navigate("/plan", { replace: true });
    }
    
    usePlanStore.setState({ lastSearchMode: currentMode, lastSearchDate: searchDate });
  };

  const handleSelectRecentPlan = (plan: any) => {
    setFilters({
      radius: plan.search_params.radius,
      cuisine: plan.search_params.cuisine,
      activityCategory: plan.search_params.activityCategory,
    });
    if (plan.search_params.lat && plan.search_params.lng) {
      setLocation(plan.search_params.lat, plan.search_params.lng);
    }
    setSearchSignature('');
    toast({ title: "Loaded", description: "Search settings restored from saved plan" });
  };

  return {
    loading,
    gettingLocation,
    handleUseCurrentLocation,
    handleFindPlaces,
    handleReroll,
    handleRerollPlan: handleReroll,
    handleSeePlan,
    handleSelectRecentPlan,
  };
};
