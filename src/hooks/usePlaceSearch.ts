import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { buildPlan, buildPlanFromIndices, scorePlaces } from "@/lib/planner";
import { getLearnedPreferences, getContextualSuggestions } from "@/lib/learning";
import { usePlanStore } from "@/store/planStore";

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

  const {
    lat,
    lng,
    radius,
    cuisine,
    activityCategory,
    locationMode,
    zipCode,
    restaurants: restaurantResults,
    activities: activityResults,
    restaurantIdx: restaurantIndex,
    activityIdx: activityIndex,
    nextRestaurantsToken,
    nextActivitiesToken,
    lastSearchedCuisine,
    lastSearchedActivity,
    userPreferences,
    searchMode,
    setLocation,
    setFilters,
    setRestaurants,
    setActivities,
    setRestaurantIdx: setRestaurantIndex,
    setActivityIdx: setActivityIndex,
    setLastSearched,
    setLastSearchLocation,
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
        geoOptions  // Use consistent geolocation options for iOS
      );
    });
  };

  const handleFindPlaces = async (overrideCuisine?: string, overrideActivity?: string) => {
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

    setLoading(true);
    try {
      console.log('🔍 MANUAL SEARCH INITIATED');
      console.log('Store searchMode:', searchMode);
      
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
      
      const currentMode = searchMode || 'both';
      
      console.log('=== MANUAL SEARCH MODE CHECK ===');
      console.log('Mode:', currentMode);
      console.log('Will search restaurants?', currentMode === 'both' || currentMode === 'restaurant_only');
      console.log('Will search activities?', currentMode === 'both' || currentMode === 'activity_only');
      
      const restaurantsPromise = (currentMode === 'both' || currentMode === 'restaurant_only')
        ? supabase.functions.invoke('places-search', {
            body: { lat: searchLat, lng: searchLng, radiusMiles: radius, cuisine: searchCuisine }
          })
        : Promise.resolve({ data: { items: [] }, error: null });
      
      const activitiesPromise = (currentMode === 'both' || currentMode === 'activity_only')
        ? supabase.functions.invoke('activities-search', {
            body: { lat: searchLat, lng: searchLng, radiusMiles: radius, keyword: searchActivity }
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
            body: { lat: searchLat, lng: searchLng, radiusMiles: radius, keyword: fallbackTerm }
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
            body: { lat: searchLat, lng: searchLng, radiusMiles: expandedRadius, keyword: usedKeyword }
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
      
      const sortedRestaurants = scorePlaces(
        restaurants, 
        searchLat, 
        searchLng, 
        radius, 
        userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 
          ? userPreferences 
          : undefined,
        'restaurant',
        learnedPrefs
      );
      const sortedActivities = scorePlaces(
        finalActivities, 
        searchLat, 
        searchLng, 
        usedRadius,
        userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 
          ? userPreferences 
          : undefined,
        'activity',
        learnedPrefs
      );
      
      setRestaurants(sortedRestaurants, restaurantsResponse.data?.nextPageToken || null);
      setActivities(sortedActivities, activitiesResponse.data?.nextPageToken || null);
      setLastSearched(cuisine, activityCategory);
      setLocation(searchLat, searchLng);

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
      
      toast({ 
        title: "Success", 
        description: `Found ${restaurants.length} restaurants and ${activities.length} activities for your date night!`,
      });
      
      // Trigger first search completion
      onSearchSuccess?.();
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
      toast({ 
        title: "End of list", 
        description: "Try rerolling for fresh options", 
        variant: "destructive" 
      });
    }
  };

  const handleSwapActivity = async () => {
    if (swapDebounceRef.current.activity) return;
    swapDebounceRef.current.activity = true;
    setTimeout(() => { swapDebounceRef.current.activity = false; }, 300);

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
      toast({ 
        title: "End of list", 
        description: "Try rerolling for fresh options", 
        variant: "destructive" 
      });
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
    
    setLoading(true);
    try {
      const searchLat = lat;
      const searchLng = lng;

      const currentMode = searchMode || 'both';
      
      const restaurantsPromise = (currentMode === 'both' || currentMode === 'restaurant_only')
        ? supabase.functions.invoke('places-search', {
            body: { lat: searchLat, lng: searchLng, radiusMiles: radius, cuisine }
          })
        : Promise.resolve({ data: { items: [] }, error: null });
      
      const activitiesPromise = (currentMode === 'both' || currentMode === 'activity_only')
        ? supabase.functions.invoke('activities-search', {
            body: { lat: searchLat, lng: searchLng, radiusMiles: radius, keyword: activityCategory }
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

      const freshPlan = buildPlan({
        lat: searchLat,
        lng: searchLng,
        radius,
        restaurants: sortedRestaurants,
        activities: sortedActivities,
        preferences: userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 
          ? userPreferences 
          : undefined,
        searchMode: searchMode || 'both',
      });

      const selectedRestaurantIndex = freshPlan.restaurant 
        ? sortedRestaurants.findIndex(r => r.id === freshPlan.restaurant?.id)
        : 0;
      const selectedActivityIndex = freshPlan.activity
        ? sortedActivities.findIndex(a => a.id === freshPlan.activity?.id)
        : 0;

      setRestaurantIndex(selectedRestaurantIndex >= 0 ? selectedRestaurantIndex : 0);
      setActivityIndex(selectedActivityIndex >= 0 ? selectedActivityIndex : 0);
      
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
    const relevantToken = searchType === "restaurants" ? nextRestaurantsToken : nextActivitiesToken;
    
    if (relevantToken && lat !== null && lng !== null) {
      setLoading(true);
      try {
        const searchLat = lat;
        const searchLng = lng;

        const functionName = searchType === "restaurants" ? "places-search" : "activities-search";
        const params = searchType === "restaurants" 
          ? { lat: searchLat, lng: searchLng, radiusMiles: radius, cuisine, pagetoken: relevantToken }
          : { lat: searchLat, lng: searchLng, radiusMiles: radius, keyword: activityCategory, pagetoken: relevantToken };

        const { data, error } = await supabase.functions.invoke(functionName, {
          body: params
        });

        if (error) throw error;

        if (searchType === "restaurants") {
          setRestaurants(data.items || [], data.nextPageToken || null);
          setRestaurantIndex(0);
        } else {
          setActivities(data.items || [], data.nextPageToken || null);
          setActivityIndex(0);
        }
        toast({ title: "Success", description: "Loaded more options!" });
      } catch (error) {
        console.error('Error fetching next page:', error);
        toast({ title: "Error", description: "Failed to load more results.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    } else {
      if (searchType === "restaurants") {
        const shuffled = [...restaurantResults].sort(() => Math.random() - 0.5);
        setRestaurants(shuffled, nextRestaurantsToken);
        setRestaurantIndex(0);
      } else {
        const shuffled = [...activityResults].sort(() => Math.random() - 0.5);
        setActivities(shuffled, nextActivitiesToken);
        setActivityIndex(0);
      }
      toast({ title: "Success", description: "Refreshed your options!" });
    }
  };

  const handleSeePlan = async () => {
    const currentMode = searchMode || 'both';
    
    if (radius <= 0) {
      toast({ title: "Error", description: "Please set a valid search radius", variant: "destructive" });
      return;
    }
    
    if ((currentMode === 'both' || currentMode === 'restaurant_only') && !cuisine) {
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

    if (restaurantIndex === null || restaurantIndex === undefined) setRestaurantIndex(0);
    if (activityIndex === null || activityIndex === undefined) setActivityIndex(0);

    const filtersChanged = 
      lastSearchedCuisine !== cuisine || 
      lastSearchedActivity !== activityCategory;

    const hasRestaurants = restaurantResults.length > 0;
    const hasActivities = activityResults.length > 0;
    const hasRequiredResults = 
      (currentMode === 'both' && hasRestaurants && hasActivities) ||
      (currentMode === 'restaurant_only' && hasRestaurants) ||
      (currentMode === 'activity_only' && hasActivities);

    if (hasRequiredResults && !filtersChanged) {
      navigate("/plan");
      return;
    }

    await handleFindPlaces();
    navigate("/plan");
  };

  const handleSurpriseMe = async () => {
    if (radius <= 0) {
      toast({ 
        title: "Error", 
        description: "Please set a valid search radius", 
        variant: "destructive" 
      });
      return;
    }
    
    if (!lat || !lng) {
      toast({ 
        title: "Location Required", 
        description: "Please set your location first",
        variant: "destructive"
      });
      return;
    }
    
    const cuisineOptions = ["Italian", "Mexican", "Japanese", "Chinese", "Thai", "American", "Indian", "French", "Mediterranean"];
    const activityOptions = ["live_music", "comedy", "movies", "bowling", "arcade", "museum", "escape_room", "mini_golf", "hike", "wine"];
    
    let selectedCuisine: string;
    if (userPreferences.cuisines && userPreferences.cuisines.length > 0) {
      const matchingCuisines = cuisineOptions.filter(c => 
        userPreferences.cuisines.some(pref => pref.toLowerCase() === c.toLowerCase())
      );
      selectedCuisine = matchingCuisines.length > 0 
        ? matchingCuisines[Math.floor(Math.random() * matchingCuisines.length)]
        : cuisineOptions[Math.floor(Math.random() * cuisineOptions.length)];
    } else {
      selectedCuisine = cuisineOptions[Math.floor(Math.random() * cuisineOptions.length)];
    }
    
    let selectedActivity: string;
    if (userPreferences.activities && userPreferences.activities.length > 0) {
      const matchingActivities = activityOptions.filter(a => 
        userPreferences.activities.includes(a)
      );
      selectedActivity = matchingActivities.length > 0
        ? matchingActivities[Math.floor(Math.random() * matchingActivities.length)]
        : activityOptions[Math.floor(Math.random() * activityOptions.length)];
    } else {
      selectedActivity = activityOptions[Math.floor(Math.random() * activityOptions.length)];
    }
    
    const activityLabel = selectedActivity.replace('_', ' ');
    toast({
      title: "✨ Surprise!",
      description: `Finding ${selectedCuisine} restaurants and ${activityLabel} nearby...`,
    });
    
    setLoading(true);
    try {
      const searchLat = lat;
      const searchLng = lng;

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
      const learnedPrefs = userId ? await getLearnedPreferences(userId) : undefined;
      
      const currentMode = searchMode || 'both';

      const restaurantsPromise = (currentMode === 'both' || currentMode === 'restaurant_only')
        ? supabase.functions.invoke('places-search', {
            body: { lat: searchLat, lng: searchLng, radiusMiles: radius, cuisine: selectedCuisine }
          })
        : Promise.resolve({ data: { items: [] }, error: null });

      const activitiesPromise = (currentMode === 'both' || currentMode === 'activity_only')
        ? supabase.functions.invoke('activities-search', {
            body: { lat: searchLat, lng: searchLng, radiusMiles: radius, keyword: selectedActivity }
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
        'restaurant',
        learnedPrefs
      );
      const sortedActivities = scorePlaces(
        activities, 
        searchLat, 
        searchLng, 
        radius, 
        userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 
          ? userPreferences 
          : undefined,
        'activity',
        learnedPrefs
      );
      
      setRestaurants(sortedRestaurants, restaurantsResponse.data?.nextPageToken || null);
      setActivities(sortedActivities, activitiesResponse.data?.nextPageToken || null);
      setLastSearched(selectedCuisine, selectedActivity);

      const initialPlan = buildPlan({
        lat: searchLat,
        lng: searchLng,
        radius,
        restaurants: sortedRestaurants,
        activities: sortedActivities,
        preferences: userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 
          ? userPreferences 
          : undefined,
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

      setFilters({ 
        cuisine: selectedCuisine, 
        activityCategory: selectedActivity 
      });
      
      // Trigger first search completion
      onSearchSuccess?.();

      setTimeout(() => {
        navigate("/plan");
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
    
    toast({
      title: "Plan loaded! 💫",
      description: "Click 'See Tonight's Plan' to search again with these settings",
    });
  };

  return {
    loading,
    gettingLocation,
    plan,
    searchType,
    setSearchType,
    handleFindPlaces,
    handleSwapRestaurant,
    handleSwapActivity,
    handleRerollPlan,
    handleReroll,
    handleSeePlan,
    handleSurpriseMe,
    handleSelectRecentPlan,
    handleUseCurrentLocation,
    trackInteraction
  };
};

