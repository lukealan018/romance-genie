import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { buildPlan, buildPlanFromIndices, scorePlaces } from "@/lib/planner";
import { getLearnedPreferences, getContextualSuggestions } from "@/lib/learning";
import { usePlanStore, buildSearchSignature } from "@/store/planStore";

// Geolocation options for consistent iOS behavior
const geoOptions: PositionOptions = {
  enableHighAccuracy: true,  // Critical for iOS permission prompts
  timeout: 20000,            // 20 second timeout for cold-start GPS
  maximumAge: 0              // Prevent cached/stale positions
};

export const usePlaceSearch = (
  userId: string | null, 
  saveLocationSettings: (radius: number, zipCode: string, immediate: boolean) => Promise<void>,
  onSearchSuccess?: () => void
) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [searchType, setSearchType] = useState<"restaurants" | "activities">("restaurants");
  const swapDebounceRef = useRef<{ restaurant: boolean; activity: boolean }>({ restaurant: false, activity: false });
  
  // State for next available date suggestion dialog
  const [nextAvailableDateInfo, setNextAvailableDateInfo] = useState<{
    date: string;
    dayName: string;
  } | null>(null);

  const {
    lat,
    lng,
    radius,
    cuisine,
    activityCategory,
    locationMode,
    zipCode,
    searchDate,
    userPreferences,
    searchMode,
    lastSearchSignature,
    setLocation,
    setFilters,
    setRestaurants,
    setActivities,
    setRestaurantIdx: setRestaurantIndex,
    setActivityIdx: setActivityIndex,
    setLastSearched,
    setLastSearchLocation,
    setSearchSignature,
    clearResults,
    clearAllResults,
    getCurrentRestaurants,
    getCurrentActivities,
    getCurrentRestaurantIdx,
    getCurrentActivityIdx,
    getNextRestaurantsToken,
    getNextActivitiesToken,
  } = usePlanStore();

  // Track user interactions
  const trackInteraction = async (
    place: any,
    type: 'restaurant' | 'activity',
    interactionType: 'viewed' | 'selected' | 'skipped'
  ) => {
    if (!userId) return;
    
    try {
      await supabase.from('user_interactions').insert({
        user_id: userId,
        place_id: place.id,
        place_name: place.name,
        place_type: type,
        interaction_type: interactionType,
        cuisine: place.cuisine,
        category: place.category,
        rating: place.rating,
      });
    } catch (error) {
      console.error('Error tracking interaction:', error);
    }
  };

  const handleUseCurrentLocation = (silent: boolean = false): Promise<void> => {
    return new Promise((resolve, reject) => {
      console.log('[GPS Location] Requesting location... (silent=' + silent + ')');
      
      if (!navigator.geolocation) {
        console.log('[GPS Location] Navigator.geolocation not available');
        const message = "Geolocation is not supported by your browser";
        if (!silent) {
          toast({ title: "Error", description: message, variant: "destructive" });
        }
        reject(new Error(message));
        return;
      }

      setGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('[GPS Location] SUCCESS! Coordinates:', position.coords.latitude, position.coords.longitude);
          setLocation(position.coords.latitude, position.coords.longitude);
          setGettingLocation(false);
          if (!silent) {
            toast({ title: "Success", description: "Location detected! Ready to find date spots near you." });
          }
          resolve();
        },
        (error) => {
          console.log('[GPS Location] FAILED! Code:', error.code, 'Message:', error.message);
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
            
            toast({ 
              title,
              description,
              variant: "destructive",
              duration: 8000,
            });
          }
          reject(error);
        },
        geoOptions
      );
    });
  };

  // Helper to shuffle results while keeping top-scored items at front
  const shuffleResults = <T,>(results: T[]): T[] => {
    if (results.length <= 5) return results;
    
    // Keep top 5 highest-scored, shuffle the rest for variety
    const top = results.slice(0, 5);
    const rest = [...results.slice(5)].sort(() => Math.random() - 0.5);
    return [...top, ...rest];
  };

  const handleFindPlaces = async (
    overrideCuisine?: string, 
    overrideActivity?: string, 
    forceFresh: boolean = false,
    userTriggered: boolean = false,  // Bypass cache on explicit user action
    navigateOnSuccess: boolean = false  // Navigate to /plan after storing results
  ) => {
    const searchCuisine = overrideCuisine ?? cuisine;
    const searchActivity = overrideActivity ?? activityCategory;
    
    // Validate and get coordinates
    let searchLat: number, searchLng: number;

    if (locationMode === "gps") {
      if (lat === null || lng === null) {
        toast({ title: "Error", description: "Please get your current location first", variant: "destructive" });
        return;
      }
      searchLat = lat;
      searchLng = lng;
    } else {
      // Client-side ZIP validation
      const cleanZip = zipCode.trim();
      if (!cleanZip) {
        toast({ title: "ZIP code required", description: "Please enter a ZIP code to continue.", variant: "destructive" });
        return;
      }
      if (!/^\d{5}$/.test(cleanZip)) {
        toast({ title: "Invalid ZIP code", description: "Please enter a valid 5-digit US ZIP code.", variant: "destructive" });
        return;
      }
      
      // Geocode the ZIP code using edge function
      try {
        const { data: geocodeData, error: geocodeError } = await supabase.functions.invoke('geocode', {
          body: { zipCode: cleanZip }
        });
        
        if (geocodeError || !geocodeData) {
          const errorMessage = geocodeData?.error || geocodeError?.message || "Could not find location for this ZIP code.";
          toast({ 
            title: "Location error", 
            description: errorMessage, 
            variant: "destructive" 
          });
          return;
        }
        
        searchLat = geocodeData.lat;
        searchLng = geocodeData.lng;
        setLocation(searchLat, searchLng);
        console.log(`Geocoded ${cleanZip} to ${geocodeData.city}:`, searchLat, searchLng);
      } catch (error) {
        console.error('Geocoding error:', error);
        toast({ title: "Error", description: "Could not find location for this ZIP code", variant: "destructive" });
        return;
      }
    }

    const currentMode = searchMode || 'both';
    const { priceLevel, lastSearchSignature: freshSignature } = usePlanStore.getState();

    // Build search signature (without seed - seed is for variation, not cache key)
    const currentSignature = buildSearchSignature({
      mode: currentMode,
      cuisine: searchCuisine,
      activityCategory: searchActivity,
      radius,
      priceLevel,
      searchDate,
      lat: searchLat,
      lng: searchLng,
    });

    // Check if we can use cached results (unless forceFresh OR userTriggered)
    // NOTE: userTriggered means the user clicked "See Tonight's Plan" again - they want fresh results!
    // Read signature fresh from store to avoid stale closure
    if (!forceFresh && !userTriggered && currentSignature === freshSignature) {
      console.log('🔄 Same search signature, using cached results');
      const currentRestaurants = getCurrentRestaurants();
      const currentActivities = getCurrentActivities();
      
      if (currentRestaurants.length > 0 || currentActivities.length > 0) {
        // Build plan from cached results
        const cachedPlan = buildPlanFromIndices({
          lat: searchLat,
          lng: searchLng,
          radius,
          restaurants: currentRestaurants,
          activities: currentActivities,
          preferences: userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 
            ? userPreferences 
            : undefined,
          searchMode: currentMode,
        }, getCurrentRestaurantIdx(), getCurrentActivityIdx());
        
        setPlan(cachedPlan);
        return;
      }
    }
    
    // When user triggers search again (same params), force fresh results with new shuffle
    const shouldForceNewShuffle = userTriggered && currentSignature === freshSignature;
    if (shouldForceNewShuffle) {
      console.log('🔀 User triggered re-search - forcing new shuffle for variety');
    }

    // Clear results for fresh search
    clearResults();

    setLoading(true);
    try {
      console.log('🔍 MANUAL SEARCH INITIATED (forceFresh:', forceFresh, ')');
      console.log('Store searchMode:', searchMode);
      console.log('Search signature:', currentSignature);
      
      // Fetch weather for contextual suggestions
      let weatherData = null;
      try {
        const { data: weather, error: weatherError } = await supabase.functions.invoke('weather', {
          body: { lat: searchLat, lng: searchLng }
        });
        
        if (!weatherError && weather) {
          weatherData = weather;
          console.log('Weather data:', weatherData);
        }
      } catch (weatherError) {
        console.error('Failed to fetch weather:', weatherError);
      }
      
      const contextual = getContextualSuggestions({ weather: weatherData });
      const learnedPrefs = userId ? await getLearnedPreferences(userId) : undefined;
      
      console.log('=== MANUAL SEARCH MODE CHECK ===');
      console.log('Mode:', currentMode);
      console.log('Will search restaurants?', currentMode === 'both' || currentMode === 'restaurant_only');
      console.log('Will search activities?', currentMode === 'both' || currentMode === 'activity_only');
      
      // Generate variation seed for result shuffling
      const variationSeed = Math.floor(Math.random() * 1000000);
      console.log('🎲 Using variation seed:', variationSeed);

      // Get venueType and searchTime from store
      const { venueType, searchTime } = usePlanStore.getState();
      
      const restaurantsPromise = (currentMode === 'both' || currentMode === 'restaurant_only')
        ? supabase.functions.invoke('places-search', {
            body: { 
              lat: searchLat, 
              lng: searchLng, 
              radiusMiles: radius, 
              cuisine: searchCuisine,
              priceLevel: priceLevel || undefined,
              seed: variationSeed,
              forceFresh: forceFresh || userTriggered,
              venueType: venueType || 'any',
              searchTime: searchTime || undefined
            }
          })
        : Promise.resolve({ data: { items: [] }, error: null });
      
      const activitiesPromise = (currentMode === 'both' || currentMode === 'activity_only')
        ? supabase.functions.invoke('activities-search', {
            body: { 
              lat: searchLat, 
              lng: searchLng, 
              radiusMiles: radius, 
              keyword: searchActivity,
              seed: variationSeed,
              forceFresh: forceFresh || userTriggered
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

      if (restaurants.length > 0 || activities.length > 0) {
        setLastSearchLocation(searchLat, searchLng);
      }

      let finalActivities = activities;
      let usedRadius = radius;
      let usedKeyword = searchActivity;
      
      if (activities.length === 0 && searchActivity && (currentMode === 'both' || currentMode === 'activity_only')) {
        console.log(`⚠️ No results for "${searchActivity}", trying fallback...`);
        
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
          usedKeyword = fallbackTerm;
          
          const fallbackResponse = await supabase.functions.invoke('activities-search', {
            body: { lat: searchLat, lng: searchLng, radiusMiles: radius, keyword: fallbackTerm, forceFresh }
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
      
      if (finalActivities.length === 0 && usedKeyword && (currentMode === 'both' || currentMode === 'activity_only')) {
        const radiusSteps = [10, 15];
        
        for (const expandedRadius of radiusSteps) {
          if (expandedRadius <= radius) continue;
          
          const expandedResponse = await supabase.functions.invoke('activities-search', {
            body: { lat: searchLat, lng: searchLng, radiusMiles: expandedRadius, keyword: usedKeyword, forceFresh }
          });
          
          if (!expandedResponse.error && expandedResponse.data?.items?.length > 0) {
            finalActivities = expandedResponse.data.items;
            usedRadius = expandedRadius;
            toast({
              title: "Expanded search area",
              description: `Found ${finalActivities.length} options within ${expandedRadius} miles`,
            });
            break;
          }
        }
      }
      
      // Score and shuffle for variety
      const prefs = userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 
        ? userPreferences 
        : undefined;
      const scoredRestaurants = scorePlaces(
        restaurants, searchLat, searchLng, radius, prefs, 'restaurant',
        learnedPrefs, undefined, undefined, undefined, undefined,
        undefined, undefined  // planIntent/mood not available in manual path yet
      );
      const scoredActivities = scorePlaces(
        finalActivities, searchLat, searchLng, usedRadius, prefs, 'activity',
        learnedPrefs, undefined, undefined, undefined, undefined,
        undefined, undefined
      );
      
      // Shuffle results for variety (keeps top 5, shuffles rest)
      const sortedRestaurants = shuffleResults(scoredRestaurants);
      const sortedActivities = shuffleResults(scoredActivities);
      
      console.log('🔍 [usePlaceSearch] Setting search results:', {
        restaurants: sortedRestaurants.length,
        activities: sortedActivities.length,
        mode: searchMode || 'both'
      });
      
      setRestaurants(sortedRestaurants, restaurantsResponse.data?.nextPageToken || null);
      setActivities(sortedActivities, activitiesResponse.data?.nextPageToken || null);
      setLastSearched(searchCuisine, searchActivity);
      setLocation(searchLat, searchLng);
      
      // Store the search signature
      setSearchSignature(currentSignature);
      
      console.log('✅ [usePlaceSearch] Store updated successfully');

      const initialPlan = buildPlan({
        lat: searchLat,
        lng: searchLng,
        radius,
        restaurants: sortedRestaurants,
        activities: sortedActivities,
        preferences: userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 
          ? userPreferences 
          : undefined,
        learnedPreferences: learnedPrefs,
        contextualHints: {
          indoorPreference: contextual.indoorPreference,
          energyLevel: contextual.message.toLowerCase().includes('chill') || contextual.message.toLowerCase().includes('unwind') 
            ? 'low' 
            : contextual.message.toLowerCase().includes('lively') || contextual.message.toLowerCase().includes('active')
            ? 'high'
            : 'medium',
        },
        searchMode: searchMode || 'both',
      });

      const selectedRestaurantIndex = initialPlan.restaurant 
        ? sortedRestaurants.findIndex(r => r.id === initialPlan.restaurant?.id)
        : 0;
      const selectedActivityIndex = initialPlan.activity
        ? sortedActivities.findIndex(a => a.id === initialPlan.activity?.id)
        : 0;

      setRestaurantIndex(selectedRestaurantIndex >= 0 ? selectedRestaurantIndex : 0);
      setActivityIndex(selectedActivityIndex >= 0 ? selectedActivityIndex : 0);
      
      setPlan(initialPlan);
      
      if (initialPlan.restaurant) {
        await trackInteraction(initialPlan.restaurant, 'restaurant', 'selected');
      }
      if (initialPlan.activity) {
        await trackInteraction(initialPlan.activity, 'activity', 'selected');
      }
      
      await saveLocationSettings(radius, zipCode, true);
      
      // Trigger first search completion
      onSearchSuccess?.();

      // Navigate to plan page NOW — after store is fully populated
      if (navigateOnSuccess) {
        setTimeout(() => {
          navigate("/plan", { replace: true });
        }, 50);
      }
    } catch (error) {
      console.error('Error fetching places:', error);
      toast({ title: "Error", description: "Failed to find places. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSwapRestaurant = async () => {
    if (swapDebounceRef.current.restaurant) return;
    swapDebounceRef.current.restaurant = true;
    setTimeout(() => { swapDebounceRef.current.restaurant = false; }, 300);

    const restaurantResults = getCurrentRestaurants();
    const restaurantIndex = getCurrentRestaurantIdx();
    const activityResults = getCurrentActivities();
    const activityIndex = getCurrentActivityIdx();

    if (restaurantResults[restaurantIndex]) {
      await trackInteraction(restaurantResults[restaurantIndex], 'restaurant', 'skipped');
    }

    if (lat === null || lng === null) return;
    const searchLat = lat;
    const searchLng = lng;

    if (restaurantIndex + 1 < restaurantResults.length) {
      const newIndex = restaurantIndex + 1;
      setRestaurantIndex(newIndex);
      
      const newPlan = buildPlanFromIndices(
        {
          lat: searchLat,
          lng: searchLng,
          radius,
          restaurants: restaurantResults,
          activities: activityResults,
          preferences: userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 
            ? userPreferences 
            : undefined,
          searchMode: searchMode || 'both',
        },
        newIndex,
        activityIndex
      );
      
      setPlan(newPlan);
      if (newPlan.restaurant) {
        await trackInteraction(newPlan.restaurant, 'restaurant', 'viewed');
      }
    } else {
      // Exhausted cached options - fetch fresh
      console.log('🔄 Exhausted restaurant options, fetching fresh');
      const randomSeed = Math.floor(Math.random() * 1000000);
      const { priceLevel } = usePlanStore.getState();
      
      try {
        const { data, error } = await supabase.functions.invoke('places-search', {
          body: { 
            lat: searchLat, 
            lng: searchLng, 
            radiusMiles: radius, 
            cuisine,
            priceLevel: priceLevel || undefined,
            seed: randomSeed,
            forceFresh: true
          }
        });
        
        if (!error && data?.items?.length > 0) {
          const sortedRestaurants = scorePlaces(
            data.items, 
            searchLat, 
            searchLng, 
            radius, 
            userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 
              ? userPreferences 
              : undefined,
            'restaurant'
          );
          
          setRestaurants(sortedRestaurants, null);
          setRestaurantIndex(0);
          
          const newPlan = buildPlanFromIndices(
            {
              lat: searchLat,
              lng: searchLng,
              radius,
              restaurants: sortedRestaurants,
              activities: activityResults,
              preferences: userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 
                ? userPreferences 
                : undefined,
              searchMode: searchMode || 'both',
            },
            0,
            activityIndex
          );
          
          setPlan(newPlan);
          toast({ title: "Fresh picks!", description: "Found new restaurant options" });
        } else {
          toast({ 
            title: "End of list", 
            description: "No more options in this area", 
            variant: "destructive" 
          });
        }
      } catch (error) {
        console.error('Error fetching fresh restaurants:', error);
        toast({ 
          title: "End of list", 
          description: "Try rerolling for fresh options", 
          variant: "destructive" 
        });
      }
    }
  };

  const handleSwapActivity = async () => {
    if (swapDebounceRef.current.activity) return;
    swapDebounceRef.current.activity = true;
    setTimeout(() => { swapDebounceRef.current.activity = false; }, 300);

    const restaurantResults = getCurrentRestaurants();
    const restaurantIndex = getCurrentRestaurantIdx();
    const activityResults = getCurrentActivities();
    const activityIndex = getCurrentActivityIdx();

    if (activityResults[activityIndex]) {
      await trackInteraction(activityResults[activityIndex], 'activity', 'skipped');
    }

    if (lat === null || lng === null) return;
    const searchLat = lat;
    const searchLng = lng;

    if (activityIndex + 1 < activityResults.length) {
      const newIndex = activityIndex + 1;
      setActivityIndex(newIndex);
      
      const newPlan = buildPlanFromIndices(
        {
          lat: searchLat,
          lng: searchLng,
          radius,
          restaurants: restaurantResults,
          activities: activityResults,
          preferences: userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 
            ? userPreferences 
            : undefined,
          searchMode: searchMode || 'both',
        },
        restaurantIndex,
        newIndex
      );
      
      setPlan(newPlan);
      if (newPlan.activity) {
        await trackInteraction(newPlan.activity, 'activity', 'viewed');
      }
    } else {
      // Exhausted cached options - fetch fresh
      console.log('🔄 Exhausted activity options, fetching fresh');
      const randomSeed = Math.floor(Math.random() * 1000000);
      
      try {
        const { data, error } = await supabase.functions.invoke('activities-search', {
          body: { 
            lat: searchLat, 
            lng: searchLng, 
            radiusMiles: radius, 
            keyword: activityCategory,
            seed: randomSeed,
            forceFresh: true
          }
        });
        
        if (!error && data?.items?.length > 0) {
          const sortedActivities = scorePlaces(
            data.items, 
            searchLat, 
            searchLng, 
            radius, 
            userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 
              ? userPreferences 
              : undefined,
            'activity'
          );
          
          setActivities(sortedActivities, null);
          setActivityIndex(0);
          
          const newPlan = buildPlanFromIndices(
            {
              lat: searchLat,
              lng: searchLng,
              radius,
              restaurants: restaurantResults,
              activities: sortedActivities,
              preferences: userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 
                ? userPreferences 
                : undefined,
              searchMode: searchMode || 'both',
            },
            restaurantIndex,
            0
          );
          
          setPlan(newPlan);
          toast({ title: "Fresh picks!", description: "Found new activity options" });
        } else {
          toast({ 
            title: "End of list", 
            description: "No more options in this area", 
            variant: "destructive" 
          });
        }
      } catch (error) {
        console.error('Error fetching fresh activities:', error);
        toast({ 
          title: "End of list", 
          description: "Try rerolling for fresh options", 
          variant: "destructive" 
        });
      }
    }
  };

  const handleRerollPlan = async () => {
    if (!lat || !lng) {
      toast({ 
        title: "No location set", 
        description: "Please set your location first", 
        variant: "destructive" 
      });
      return;
    }
    
    // ALWAYS clear results for reroll
    clearResults();
    
    setLoading(true);
    try {
      const searchLat = lat;
      const searchLng = lng;
      const currentMode = searchMode || 'both';
      
      // Generate a random seed to get different results
      const randomSeed = Math.floor(Math.random() * 1000000);
      const { priceLevel } = usePlanStore.getState();
      
      console.log('🎲 [handleRerollPlan] Rerolling with seed:', randomSeed, 'forceFresh: true');
      
      const restaurantsPromise = (currentMode === 'both' || currentMode === 'restaurant_only')
        ? supabase.functions.invoke('places-search', {
            body: { 
              lat: searchLat, 
              lng: searchLng, 
              radiusMiles: radius, 
              cuisine, 
              priceLevel: priceLevel || undefined,
              seed: randomSeed,
              forceFresh: true  // ALWAYS force fresh on reroll
            }
          })
        : Promise.resolve({ data: { items: [] }, error: null });
      
      const activitiesPromise = (currentMode === 'both' || currentMode === 'activity_only')
        ? supabase.functions.invoke('activities-search', {
            body: { 
              lat: searchLat, 
              lng: searchLng, 
              radiusMiles: radius, 
              keyword: activityCategory, 
              seed: randomSeed,
              forceFresh: true  // ALWAYS force fresh on reroll
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

      const sortedRestaurants = scorePlaces(
        restaurants, 
        searchLat, 
        searchLng, 
        radius, 
        userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 
          ? userPreferences 
          : undefined,
        'restaurant'
      );
      const sortedActivities = scorePlaces(
        activities, 
        searchLat, 
        searchLng, 
        radius, 
        userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 
          ? userPreferences 
          : undefined,
        'activity'
      );
      
      setRestaurants(sortedRestaurants, restaurantsResponse.data?.nextPageToken || null);
      setActivities(sortedActivities, activitiesResponse.data?.nextPageToken || null);

      // Pick a random starting index instead of always index 0
      const restaurantStartIdx = sortedRestaurants.length > 1 
        ? Math.floor(Math.random() * Math.min(3, sortedRestaurants.length)) 
        : 0;
      const activityStartIdx = sortedActivities.length > 1 
        ? Math.floor(Math.random() * Math.min(3, sortedActivities.length)) 
        : 0;

      const freshPlan = buildPlanFromIndices({
        lat: searchLat,
        lng: searchLng,
        radius,
        restaurants: sortedRestaurants,
        activities: sortedActivities,
        preferences: userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 
          ? userPreferences 
          : undefined,
        searchMode: currentMode,
      }, restaurantStartIdx, activityStartIdx);

      setRestaurantIndex(restaurantStartIdx);
      setActivityIndex(activityStartIdx);
      
      // Update signature with seed to mark this as a unique search
      const { priceLevel: currentPriceLevel } = usePlanStore.getState();
      const newSignature = buildSearchSignature({
        mode: currentMode,
        cuisine,
        activityCategory,
        radius,
        priceLevel: currentPriceLevel,
        searchDate,
        lat: searchLat,
        lng: searchLng,
        seed: randomSeed,  // Include seed to make signature unique
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

  const handleReroll = async () => {
    // Delegate to handleRerollPlan for consistent behavior
    // This ensures reroll ALWAYS fetches fresh data
    await handleRerollPlan();
  };

  const handleSeePlan = async () => {
    const currentMode = searchMode || 'both';
    
    if (radius <= 0) {
      toast({ title: "Error", description: "Please set a valid search radius", variant: "destructive" });
      return;
    }
    
    // Get venueType from store - coffee/brunch bypass cuisine requirement
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
        toast({ 
          title: "Getting your location...", 
          description: "Please wait while we determine your location",
        });
        try {
          await handleUseCurrentLocation();
        } catch (error) {
          toast({ 
            title: "Location Required", 
            description: "Please allow location access or switch to ZIP code mode",
            variant: "destructive"
          });
          return;
        }
      } else {
        const cleanZip = zipCode.trim();
        if (!cleanZip) {
          toast({ 
            title: "ZIP Code Required", 
            description: "Please enter your ZIP code to continue",
            variant: "destructive"
          });
          return;
        }
        if (!/^\d{5}$/.test(cleanZip)) {
          toast({ 
            title: "Invalid ZIP Code", 
            description: "Please enter a valid 5-digit US ZIP code",
            variant: "destructive"
          });
          return;
        }
      }
    }

    // Build current signature - read fresh from store to avoid stale closure
    const { priceLevel, lastSearchSignature: freshSignature } = usePlanStore.getState();
    const currentSignature = buildSearchSignature({
      mode: currentMode,
      cuisine,
      activityCategory,
      radius,
      priceLevel,
      searchDate,
      lat,
      lng,
    });

    // Check if signature changed (using fresh value from store)
    const needsFreshSearch = currentSignature !== freshSignature;
    
    // Check if we have any results cached
    const currentRestaurants = getCurrentRestaurants();
    const currentActivities = getCurrentActivities();
    const hasResults = currentRestaurants.length > 0 || currentActivities.length > 0;
    
    console.log('🔍 [handleSeePlan] Signature check:', {
      currentSignature,
      lastSignature: freshSignature,
      needsFreshSearch,
      hasResults
    });

    if (needsFreshSearch) {
      // New search parameters - fetch fresh, navigate inside after store is populated
      await handleFindPlaces(undefined, undefined, false, true, true);
    } else if (hasResults) {
      // Same parameters but user clicked again - re-fetch for variety
      // userTriggered=true forces new shuffle even with same signature
      console.log('🔀 Same search params but user wants new results - forcing fresh shuffle');
      await handleFindPlaces(undefined, undefined, false, true, true);
    } else {
      // No results and no new signature — navigate anyway (cached path)
      navigate("/plan", { replace: true });
    }
    
    // Update tracking state after successful search
    usePlanStore.setState({ 
      lastSearchMode: currentMode,
      lastSearchDate: searchDate 
    });
  };

  // SURPRISE ME: Completely ignores profile preferences - pure random discovery
  const handleSurpriseMe = async (options?: { liveEventsOnly?: boolean }) => {
    const liveEventsOnly = options?.liveEventsOnly ?? false;
    // ALWAYS clear results for Surprise Me - fresh experience
    clearAllResults();
    
    // Live Events need a much larger radius to find concerts/shows in major venues
    // Regular discovery stays tight at 5 miles for local hidden gems
    const surpriseRadius = liveEventsOnly ? 25 : 5;
    
    // Try to resolve location if not set (use current GPS location)
    let searchLat = lat;
    let searchLng = lng;
    
    if (!searchLat || !searchLng) {
      // Try GPS first for Surprise Me
      try {
        await handleUseCurrentLocation(true);
        const storeState = usePlanStore.getState();
        searchLat = storeState.lat;
        searchLng = storeState.lng;
      } catch (error) {
        console.error('GPS error in SurpriseMe:', error);
      }
      
      // If GPS failed, try geocoding profile ZIP code as fallback
      if ((!searchLat || !searchLng) && zipCode && /^\d{5}$/.test(zipCode.trim())) {
        try {
          const { data: geocodeData } = await supabase.functions.invoke('geocode', {
            body: { zipCode: zipCode.trim() }
          });
          if (geocodeData?.lat && geocodeData?.lng) {
            searchLat = geocodeData.lat;
            searchLng = geocodeData.lng;
            setLocation(searchLat, searchLng);
            toast({ title: "Using home location", description: `Searching near ${geocodeData.city || zipCode}` });
          }
        } catch (error) {
          console.error('Geocoding error in SurpriseMe:', error);
        }
      }
      
      // Final check - if still no location, show error
      if (!searchLat || !searchLng) {
        toast({ 
          title: "Location Required", 
          description: "Please set your location or ZIP code first",
          variant: "destructive"
        });
        return;
      }
    }
    
    // Get current venueType from store - if user was searching for coffee, keep that intent
    const { venueType: currentVenueType } = usePlanStore.getState();
    
    // SURPRISE ME: Unique, out-of-the-box experiences - NOT mainstream!
    const cuisineOptions = [
      // Unique dining experiences instead of generic cuisines
      "omakase", "tasting menu", "supper club", "chef's table", 
      "farm to table", "wine bar", "tapas", "izakaya",
      "Ethiopian", "Peruvian", "Korean BBQ", "Vietnamese pho"
    ];
    const activityOptions = [
      // Unique, hidden gem activities - NOT mainstream!
      "speakeasy", "rooftop bar", "jazz lounge", "tiki bar", "whiskey bar",
      "axe throwing", "paint and sip", "pottery class", "cooking class", 
      "wine tasting", "escape room", "comedy club", "karaoke",
      "art gallery", "theater", "hookah lounge", "pool hall",
      "food hall", "arcade bar", "board game cafe", "trivia night"
    ];
    
    // If venueType is coffee, keep it as coffee search (don't randomize to restaurant)
    const isCoffeeMode = currentVenueType === 'coffee';
    
    // Pure random selection - NO profile preference influence (unless coffee mode)
    const selectedCuisine = isCoffeeMode ? 'coffee' : cuisineOptions[Math.floor(Math.random() * cuisineOptions.length)];
    const selectedActivity = activityOptions[Math.floor(Math.random() * activityOptions.length)];
    
    const activityLabel = selectedActivity.replace('_', ' ');
    const cuisineLabel = isCoffeeMode ? 'coffee shops' : `${selectedCuisine} spots`;
    toast({
      title: "✨ Surprise!",
      description: `Finding hidden gem ${cuisineLabel} and ${activityLabel} nearby...`,
      duration: 3000,
    });
    
    setLoading(true);
    try {
      let weatherData = null;
      try {
        const { data: weather, error: weatherError } = await supabase.functions.invoke('weather', {
          body: { lat: searchLat, lng: searchLng }
        });
        
        if (!weatherError && weather) {
          weatherData = weather;
        }
      } catch (weatherError) {
        console.error('Failed to fetch weather:', weatherError);
      }
      
      const contextual = getContextualSuggestions({ weather: weatherData });
      // SURPRISE ME: Learned preferences for scoring only (not filtering)
      const learnedPrefs = userId ? await getLearnedPreferences(userId) : undefined;
      
      const currentMode = searchMode || 'both';
      const randomSeed = Math.floor(Math.random() * 1000000);

      // SURPRISE ME: Use fixed 5mi radius, not profile
      // FORCE hidden_gems mode for truly unique venues!
      const restaurantsPromise = (currentMode === 'both' || currentMode === 'restaurant_only')
        ? supabase.functions.invoke('places-search', {
            body: { 
              lat: searchLat, 
              lng: searchLng, 
              radiusMiles: surpriseRadius,  // Fixed 5mi radius
              cuisine: isCoffeeMode ? '' : selectedCuisine,  // No cuisine for coffee search
              venueType: isCoffeeMode ? 'coffee' : 'any',    // Pass coffee mode
              noveltyMode: 'hidden_gems',  // FORCE hidden gems mode!
              seed: randomSeed,
              forceFresh: true,
              voiceTriggered: true,  // Signal this bypasses profile
              surpriseMe: true       // Signal to skip random shuffle, keep top gems
            }
          })
        : Promise.resolve({ data: { items: [] }, error: null });

      // Get today's date in YYYY-MM-DD format for live events search
      const today = new Date();
      const searchDateStr = today.toISOString().split('T')[0];
      
      const activitiesPromise = (currentMode === 'both' || currentMode === 'activity_only')
        ? supabase.functions.invoke('activities-search', {
            body: { 
              lat: searchLat, 
              lng: searchLng, 
              radiusMiles: surpriseRadius,  // Fixed radius (25mi for live events, 5mi otherwise)
              keyword: selectedActivity,
              noveltyMode: 'hidden_gems',  // FORCE hidden gems mode!
              seed: randomSeed,
              forceFresh: true,
              voiceTriggered: true,  // Signal this bypasses profile
              surpriseMe: true,      // Signal to skip random shuffle, keep top gems
              liveEventsOnly,        // Pass Live Events toggle state
              // For live events, search specifically for today to enable "next available" fallback
              searchDate: liveEventsOnly ? searchDateStr : undefined,
              findNextAvailable: liveEventsOnly, // Enable next available date detection
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
      let activities = activitiesResponse.data?.items || [];
      
      // === LIVE EVENTS ONLY: Handle empty results with next available date ===
      if (liveEventsOnly && activities.length === 0) {
        const nextDate = activitiesResponse.data?.nextAvailableDate;
        const nextDayName = activitiesResponse.data?.nextAvailableDayName;
        
        if (nextDate && nextDayName) {
          // Show next available date dialog instead of just a toast
          console.log(`📅 No live events tonight, next available: ${nextDayName} (${nextDate})`);
          setNextAvailableDateInfo({ date: nextDate, dayName: nextDayName });
          setLoading(false);
          return; // Don't navigate - dialog will handle next steps
        } else {
          // No events in the next 14 days
          toast({
            title: "No live events found",
            description: "No upcoming events in your area for the next 2 weeks. Try a different activity or check back later.",
            variant: "destructive",
            duration: 5000,
          });
          setLoading(false);
          return; // Don't navigate - stay on current page
        }
      }
      
      // SURPRISE ME: Score with learned prefs for boost only, NOT profile preferences
      const sortedRestaurants = scorePlaces(
        restaurants, 
        searchLat, 
        searchLng, 
        surpriseRadius,  // Fixed 5mi radius
        undefined,  // NO profile preferences
        'restaurant',
        learnedPrefs  // Learned prefs for scoring boost only
      );
      const sortedActivities = scorePlaces(
        activities, 
        searchLat, 
        searchLng, 
        surpriseRadius,  // Fixed 5mi radius
        undefined,  // NO profile preferences
        'activity',
        learnedPrefs  // Learned prefs for scoring boost only
      );
      
      console.log('🎉 [SurpriseMe] Setting search results:', {
        restaurants: sortedRestaurants.length,
        activities: sortedActivities.length,
        mode: searchMode || 'both'
      });
      
      setRestaurants(sortedRestaurants, restaurantsResponse.data?.nextPageToken || null);
      setActivities(sortedActivities, activitiesResponse.data?.nextPageToken || null);
      setLastSearched(selectedCuisine, selectedActivity);
      
      // Update signature for Surprise Me with fixed radius
      const newSignature = buildSearchSignature({
        mode: currentMode,
        cuisine: selectedCuisine,
        activityCategory: selectedActivity,
        radius: surpriseRadius,  // Fixed 5mi radius
        priceLevel: null,  // No price filter for Surprise Me
        searchDate,
        lat: searchLat,
        lng: searchLng,
        seed: randomSeed,
      });
      setSearchSignature(newSignature);
      
      console.log('✅ [SurpriseMe] Store updated successfully');

      // SURPRISE ME: Build plan without profile preferences
      const initialPlan = buildPlan({
        lat: searchLat,
        lng: searchLng,
        radius: surpriseRadius,  // Fixed 5mi radius
        restaurants: sortedRestaurants,
        activities: sortedActivities,
        preferences: undefined,  // NO profile preferences
        learnedPreferences: learnedPrefs,  // Learned prefs for scoring only
        contextualHints: {
          indoorPreference: contextual.indoorPreference,
          energyLevel: contextual.message.toLowerCase().includes('chill') || contextual.message.toLowerCase().includes('unwind')
            ? 'low'
            : contextual.message.toLowerCase().includes('lively') || contextual.message.toLowerCase().includes('active')
            ? 'high'
            : 'medium',
        },
        searchMode: currentMode,
      });

      const selectedRestaurantIndex = initialPlan.restaurant 
        ? sortedRestaurants.findIndex(r => r.id === initialPlan.restaurant?.id)
        : 0;
      const selectedActivityIndex = initialPlan.activity
        ? sortedActivities.findIndex(a => a.id === initialPlan.activity?.id)
        : 0;

      setRestaurantIndex(selectedRestaurantIndex >= 0 ? selectedRestaurantIndex : 0);
      setActivityIndex(selectedActivityIndex >= 0 ? selectedActivityIndex : 0);
      
      setPlan(initialPlan);

      setFilters({ 
        cuisine: selectedCuisine, 
        activityCategory: selectedActivity 
      });
      
      // Trigger first search completion
      onSearchSuccess?.();

      setTimeout(() => {
        navigate("/plan", { replace: true });
      }, 100);
    } catch (error) {
      console.error('Error in surprise me:', error);
      toast({ 
        title: "Error", 
        description: "Failed to find places. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
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
    
    // Clear signature to force fresh search with new params
    setSearchSignature('');
    
    toast({
      title: "Loaded",
      description: "Search settings restored from saved plan",
    });
  };

  // Handler to search with a specific date (called when user accepts next available date)
  const handleSearchWithDate = useCallback(async (targetDate: string) => {
    console.log(`🎫 Searching for live events on ${targetDate}`);
    
    // Clear the dialog state
    setNextAvailableDateInfo(null);
    
    // Update the search date in store
    const { setSearchDate } = usePlanStore.getState();
    setSearchDate(new Date(targetDate + 'T12:00:00'));
    
    // Trigger a new search with the specific date
    // Re-invoke handleSurpriseMe with liveEventsOnly - but this time with the date set
    await handleSurpriseMe({ liveEventsOnly: true });
  }, [handleSurpriseMe]);

  // Handler to dismiss the next available date dialog
  const handleDismissNextAvailableDate = useCallback(() => {
    setNextAvailableDateInfo(null);
  }, []);

  return {
    loading,
    gettingLocation,
    plan,
    searchType,
    setSearchType,
    trackInteraction,
    handleUseCurrentLocation,
    handleFindPlaces,
    handleSwapRestaurant,
    handleSwapActivity,
    handleReroll,
    handleRerollPlan,
    handleSeePlan,
    handleSurpriseMe,
    handleSelectRecentPlan,
    // Next available date handling
    nextAvailableDateInfo,
    handleSearchWithDate,
    handleDismissNextAvailableDate,
  };
};
