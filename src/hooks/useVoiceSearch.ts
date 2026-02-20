import { useCallback, useState } from "react";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { buildPlan, scorePlaces } from "@/lib/planner";
import { getLearnedPreferences, getContextualSuggestions } from "@/lib/learning";
import { usePlanStore } from "@/store/planStore";
import type { DateOption } from "@/components/DateChoiceDialog";

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

interface CurrentWeatherData {
  temperature?: number;
  description?: string;
  isRaining?: boolean;
}

interface UseVoiceSearchProps {
  userId: string | null;
  searchMode: string | null;
  handleUseCurrentLocation: (silent: boolean) => Promise<void>;
  trackInteraction: (place: any, type: 'restaurant' | 'activity', interactionType: 'viewed' | 'selected' | 'skipped') => Promise<void>;
  setPlan: (plan: any) => void;
  onSearchSuccess?: () => void;
  navigate: (path: string, options?: { replace?: boolean }) => void;
  currentWeather?: CurrentWeatherData | null;
}

export const useVoiceSearch = ({
  userId,
  searchMode,
  handleUseCurrentLocation,
  trackInteraction,
  setPlan,
  onSearchSuccess,
  navigate,
  currentWeather,
}: UseVoiceSearchProps) => {
  const {
    setLocation,
    setFilters,
    setRestaurants,
    setActivities,
    setRestaurantIdx,
    setActivityIdx,
    setLastSearched,
    setLastSearchLocation,
    setSearchMode,
    setSearchDate,
    clearResults,
    addToExcludePlaceIds,
    addToExcludeActivityIds,
    clearExclusions,
    getExcludePlaceIds,
    getExcludeActivityIds,
  } = usePlanStore();

  // State for date ambiguity handling
  const [showDateChoice, setShowDateChoice] = useState(false);
  const [dateChoiceOptions, setDateChoiceOptions] = useState<DateOption[]>([]);
  const [pendingSearchData, setPendingSearchData] = useState<any>(null);
  
  // State for clarification chips
  const [showClarification, setShowClarification] = useState(false);
  const [clarificationOptions, setClarificationOptions] = useState<string[]>([]);
  const [pendingClarificationData, setPendingClarificationData] = useState<any>(null);

  // Core search logic - extracted for reuse
  // VOICE SEARCH COMPLETELY OVERRIDES PROFILE - builds params ONLY from voice intent
  const executeSearch = useCallback(async (preferences: any) => {
    console.log('=== EXECUTING VOICE SEARCH (PROFILE OVERRIDE MODE) ===');
    
    let restaurantLat = null;
    let restaurantLng = null;
    let activityLat = null;
    let activityLng = null;
    let restaurantCity: string | undefined = undefined;
    let activityCity: string | undefined = undefined;
    
    // Dynamic radius: 8 miles for vague/surprise prompts, 5 miles for specific requests
    const isSurpriseIntent = preferences.intent === 'surprise' || 
      (!preferences.restaurantRequest?.cuisine && !preferences.restaurantRequest?.type && 
       !preferences.activityRequest?.type && !preferences.activityRequest?.activity);
    let searchRadius = preferences.radiusMiles || (isSurpriseIntent ? 8 : 5);
    
    // CRITICAL: Voice mode takes priority over store searchMode
    // preferences.mode comes directly from AI interpretation and should NOT fall back to the 
    // previously-selected UI mode (which could be "both" from ModeSelection)
    const currentMode = preferences.mode || 'both';
    console.log('Detected mode from voice:', currentMode, '(store mode was:', searchMode, ')');
    
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
        if (!isZipCode && !isSurpriseIntent) {
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
        // If searching a city (not ZIP) and we haven't tightened radius yet, use 3mi
        if (!isZipCode && searchRadius === 5 && !isSurpriseIntent) {
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
      // First: copy coords between venue types if one has them
      if (restaurantLat && restaurantLng && (!activityLat || !activityLng) && currentMode === 'both') {
        activityLat = restaurantLat;
        activityLng = restaurantLng;
      } else if (activityLat && activityLng && (!restaurantLat || !restaurantLng) && currentMode === 'both') {
        restaurantLat = activityLat;
        restaurantLng = activityLng;
      }
      
      // VOICE SEARCH: If no location specified, ALWAYS try GPS first (not profile location)
      if (!restaurantLat || !restaurantLng || !activityLat || !activityLng) {
        console.log('🎯 No location specified in voice - trying GPS first');
        
        // Try to get GPS location
        const gpsPromise = new Promise<{ lat: number; lng: number } | null>((resolve) => {
          if (!navigator.geolocation) {
            console.log('❌ Geolocation not available');
            resolve(null);
            return;
          }
          
          navigator.geolocation.getCurrentPosition(
            (position) => {
              console.log('✅ GPS location obtained:', position.coords);
              resolve({
                lat: position.coords.latitude,
                lng: position.coords.longitude
              });
            },
            (error) => {
              console.log('❌ GPS failed:', error.message);
              resolve(null);
            },
            { 
              enableHighAccuracy: true, 
              timeout: 10000,  // 10 second timeout
              maximumAge: 60000  // Accept cached position up to 1 minute old
            }
          );
        });
        
        const gpsCoords = await gpsPromise;
        
        if (gpsCoords) {
          // GPS succeeded - use current location
          if (!restaurantLat || !restaurantLng) {
            restaurantLat = gpsCoords.lat;
            restaurantLng = gpsCoords.lng;
          }
          if (!activityLat || !activityLng) {
            activityLat = gpsCoords.lat;
            activityLng = gpsCoords.lng;
          }
          setLocation(gpsCoords.lat, gpsCoords.lng);
          toast({
            title: "Using current location",
            description: "Searching near you",
          });
        } else {
          // GPS failed - fall back to profile/store location
          console.log('📍 GPS unavailable, falling back to stored location');
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
              description: "GPS unavailable, searching in your default area",
            });
          } else {
            // No GPS and no stored location
            toast({
              title: "Location required",
              description: "Please enable location services or set a home ZIP code",
              variant: "destructive"
            });
            return;
          }
        }
      }
    }
    
    // Map venue types to search filters - ONLY from voice intent, NOT from profile
    let searchCuisine = "";
    let searchActivity = "";
    
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
      searchCuisine = cuisineMap[restaurantType] || restaurantType;
    } else if (preferences.cuisinePreferences && preferences.cuisinePreferences.length > 0) {
      searchCuisine = preferences.cuisinePreferences[0].toLowerCase();
    }
    // If voice didn't specify cuisine, leave it empty (do NOT fill from profile)
    
    if (preferences.activityRequest?.type) {
      searchActivity = preferences.activityRequest.type;
    } else if (preferences.activityPreferences && preferences.activityPreferences.length > 0) {
      searchActivity = preferences.activityPreferences[0];
    }
    // If voice didn't specify activity, leave it empty (do NOT fill from profile)
    
    // Update filters with voice-extracted values only
    if (searchCuisine || searchActivity) {
      setFilters({ 
        cuisine: searchCuisine || undefined, 
        activityCategory: searchActivity || undefined 
      });
    }
    
    try {
      // Price level ONLY from voice intent, not profile
      // Price level from voice: check both restaurantRequest.priceLevel and top-level priceLevel
      const restaurantPriceLevel = preferences.restaurantRequest?.priceLevel || preferences.priceLevel || null;
      console.log('💰 Voice price level:', restaurantPriceLevel);
      
      // VOICE SEARCH: Do NOT use profile preferences for filtering
      // Learned preferences are ONLY used for scoring/ranking, never as hard filters
      const learnedPrefs = userId ? await getLearnedPreferences(userId) : undefined;
      
      // VenueType from voice (e.g., coffee detection)
      const venueType = preferences.venueType || 'any';
      
      // CRITICAL: Coffee search forces restaurant_only mode (no activities search)
      let voiceMode = preferences.mode || 'both';
      if (venueType === 'coffee') {
        console.log('☕ Coffee detected - forcing restaurant_only mode');
        voiceMode = 'restaurant_only';
      }
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
      
      // Generate fresh random seed for every voice search to ensure variety
      const randomSeed = Math.floor(Math.random() * 1000000);
      console.log('🎲 Voice search random seed:', randomSeed);
      
      // Get current exclusions to pass to backend
      const excludePlaceIds = getExcludePlaceIds();
      const excludeActivityIds = getExcludeActivityIds();
      console.log('🚫 Excluding previously shown places:', excludePlaceIds.length, 'restaurants,', excludeActivityIds.length, 'activities');
      
      // Search restaurants only if mode allows
      // VOICE SEARCH: Pass only voice-extracted params, no profile defaults
      const restaurantsPromise = (voiceMode === 'both' || voiceMode === 'restaurant_only')
        ? supabase.functions.invoke('places-search', {
            body: { 
              lat: restaurantLat, 
              lng: restaurantLng, 
              radiusMiles: searchRadius, 
              cuisine: searchCuisine === "🌍 Around the World" ? "" : searchCuisine,
              priceLevel: restaurantPriceLevel,
              targetCity: restaurantCity,
              venueType: venueType,
              seed: randomSeed,
              forceFresh: true,
              voiceTriggered: true,
              excludePlaceIds,
              // Intent routing: pass bundles and negatives from voice interpretation
              queryBundles: preferences.restaurantQueryBundles || [],
              negativeKeywords: preferences.negativeKeywords || [],
            }
          })
        : Promise.resolve({ data: { items: [] }, error: null });

      // Fallback: ensure activity search always has a keyword or bundles
      const activityKeyword = searchActivity || 'fun things to do';
      const activityBundles = (preferences.activityQueryBundles?.length > 0)
        ? preferences.activityQueryBundles
        : (!searchActivity ? ['fun things to do', 'nightlife', 'entertainment'] : []);

      // Search activities only if mode allows
      const activitiesPromise = (voiceMode === 'both' || voiceMode === 'activity_only')
        ? supabase.functions.invoke('activities-search', {
            body: { 
              lat: activityLat, 
              lng: activityLng, 
              radiusMiles: searchRadius, 
              keyword: activityKeyword,
              targetCity: activityCity,
              seed: randomSeed,
              forceFresh: true,
              voiceTriggered: true,
              excludePlaceIds: excludeActivityIds,
              // Intent routing: pass bundles and negatives from voice interpretation
              queryBundles: activityBundles,
              negativeKeywords: preferences.negativeKeywords || [],
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
        occasion: preferences.occasion || preferences.mood,
      });

      // Show weather warning toast if present from voice interpretation
      if (preferences.weatherWarning) {
        toast({
          title: "🌦️ Weather heads-up",
          description: preferences.weatherWarning,
          duration: 6000,
        });
      }
      
      // VOICE SEARCH: Do NOT pass profile preferences to scoring
      // Learned preferences are used for scoring boost only, not hard filtering
      const sortedRestaurants = scorePlaces(
        restaurants, 
        restaurantLat,
        restaurantLng, 
        searchRadius,  // Use voice-determined radius, not profile
        undefined,  // NO profile preferences - voice overrides everything
        'restaurant',
        learnedPrefs,  // Learned prefs for scoring boost only
        preferences.intent,
        preferences.noveltyLevel,
        userInteractionPlaceIds
      );
      const sortedActivities = scorePlaces(
        finalActivities, 
        activityLat,
        activityLng, 
        searchRadius,
        undefined,  // NO profile preferences - voice overrides everything
        'activity',
        learnedPrefs,  // Learned prefs for scoring boost only
        preferences.intent,
        preferences.noveltyLevel,
        userInteractionPlaceIds
      );
      
      
      console.log('🎤 [VoiceSearch] Setting search results:', {
        restaurants: sortedRestaurants.length,
        activities: sortedActivities.length,
        mode: voiceMode
      });
      
      setRestaurants(sortedRestaurants, restaurantsResponse.data?.nextPageToken || null);
      setActivities(sortedActivities, activitiesResponse.data?.nextPageToken || null);
      setLastSearched(searchCuisine, searchActivity);
      setLocation(planLat, planLng);
      
      // Exclude top 3 results (not just 1) to force deeper rotation on next search
      const displayedRestaurantIds = sortedRestaurants.slice(0, 3).map(r => r.id);
      const displayedActivityIds = sortedActivities.slice(0, 3).map(a => a.id);
      addToExcludePlaceIds(displayedRestaurantIds);
      addToExcludeActivityIds(displayedActivityIds);
      console.log('📝 Added to exclusions: top', displayedRestaurantIds.length, 'restaurants, top', displayedActivityIds.length, 'activities');
      
      // Track the location for smart exclusion clearing
      usePlanStore.setState({ lastExclusionLocation: { lat: planLat, lng: planLng } });
      
      console.log('✅ [VoiceSearch] Store updated successfully');

      // VOICE SEARCH: Build plan without profile preferences
      const initialPlan = buildPlan({
        lat: planLat,
        lng: planLng,
        radius: searchRadius,  // Use voice-determined radius
        restaurants: sortedRestaurants,
        activities: sortedActivities,
        preferences: undefined,  // NO profile preferences - voice overrides
        learnedPreferences: learnedPrefs,  // Learned prefs for scoring only
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
        duration: 4000,
      });
      
      // Trigger first search completion
      onSearchSuccess?.();
      
      // Navigate to plan page after a short delay to let store update
      setTimeout(() => {
        navigate("/plan", { replace: true });
      }, 100);
    } catch (error) {
      console.error('Error in voice search:', error);
      toast({ 
        title: "Error", 
        description: "Failed to process your request. Please try again.", 
        variant: "destructive" 
      });
    }
  }, [
    userId,
    setLocation, setFilters, setRestaurants, setActivities,
    setRestaurantIdx, setActivityIdx, setLastSearched, setLastSearchLocation,
    setSearchMode, handleUseCurrentLocation, trackInteraction, setPlan,
    onSearchSuccess, navigate, addToExcludePlaceIds, addToExcludeActivityIds,
    getExcludePlaceIds, getExcludeActivityIds
  ]);

  const handlePreferencesExtracted = useCallback(async (preferences: any) => {
    console.log('=== VOICE PREFERENCES EXTRACTION START (PROFILE OVERRIDE MODE) ===');
    console.log('Raw preferences:', preferences);
    
    // === CLARIFICATION CHECK ===
    // If voice AI says intent is ambiguous, show clarification chips instead of searching
    if (preferences.needsClarification && preferences.clarificationOptions?.length > 0) {
      console.log('🤔 Clarification needed, showing chips:', preferences.clarificationOptions);
      setClarificationOptions(preferences.clarificationOptions);
      setPendingClarificationData(preferences);
      setShowClarification(true);
      return; // Don't search yet - wait for chip selection
    }
    
    // Smart exclusion clearing: Only clear when location changes SIGNIFICANTLY (>5 miles)
    const storeState = usePlanStore.getState();
    const currentExclusions = storeState.excludePlaceIds.length + storeState.excludeActivityIds.length;
    console.log('📊 Current exclusion count:', currentExclusions);
    
    // Don't auto-clear exclusions on location detection - let them persist within session
    // Exclusions will auto-expire after 30 min of inactivity (handled in store getters)
    // This ensures "steakhouse + bar" search excludes places from prior "steakhouse only" search
    
    // VOICE SEARCH: Clear ALL previous results and signatures to force completely fresh search
    usePlanStore.getState().clearAllResults();
    clearResults();
    setLastSearched('', '');
    setLastSearchLocation(null, null);
    
    // Reset filters to prevent profile data from leaking
    // Only set venueType from voice if detected
    if (preferences.venueType === 'coffee') {
      setFilters({ 
        venueType: 'coffee',
        cuisine: undefined,  // Clear profile cuisine
        activityCategory: undefined,  // Clear profile activity
        priceLevel: null  // Clear profile price level
      });
      console.log('☕ Coffee shop mode detected from voice');
    } else {
      // Clear profile-based filters
      setFilters({ 
        venueType: 'any',
        cuisine: undefined,
        activityCategory: undefined,
        priceLevel: null
      });
    }
    
    // Handle date extraction
    if (preferences.searchDate && !preferences.searchDateAmbiguous) {
      // Clear date - set it immediately and proceed
      try {
        const parsedDate = parseISO(preferences.searchDate);
        const time = preferences.searchTime || '19:00';
        setSearchDate(parsedDate, time);
        
        toast({
          title: "Date set",
          description: `Searching for ${format(parsedDate, 'EEEE, MMMM d')}`,
        });
      } catch (err) {
        console.error('Failed to parse date:', err);
      }
      
      // Proceed with search
      await executeSearch(preferences);
      
    } else if (preferences.searchDateAmbiguous && preferences.searchDateOptions?.length > 0) {
      // Ambiguous date - PAUSE and show dialog
      console.log('📅 Ambiguous date detected, showing choice dialog');
      setDateChoiceOptions(preferences.searchDateOptions);
      setPendingSearchData(preferences);
      setShowDateChoice(true);
      // Don't proceed with search yet - wait for user selection
      return;
      
    } else {
      // No date mentioned - proceed with today (backward compatible)
      await executeSearch(preferences);
    }
    
    // Update tracking state after voice search
    const voiceMode = preferences.mode || searchMode || 'both';
    usePlanStore.setState({ 
      lastSearchMode: voiceMode,
      lastSearchDate: preferences.searchDate ? parseISO(preferences.searchDate) : null
    });
  }, [executeSearch, setSearchDate, clearResults, setLastSearched, setLastSearchLocation, searchMode]);

  // Handler for when user selects a date from the ambiguity dialog
  const handleDateChoice = useCallback(async (date: string, time: string) => {
    setShowDateChoice(false);
    
    try {
      const parsedDate = parseISO(date);
      setSearchDate(parsedDate, time);
      
      // Format time for display
      const [hours, minutes] = time.split(':').map(Number);
      const displayDate = new Date(parsedDate);
      displayDate.setHours(hours, minutes);
      
      toast({
        title: "Date set",
        description: `Searching for ${format(displayDate, "EEEE, MMMM d 'at' h:mm a")}`,
      });
    } catch (err) {
      console.error('Failed to parse selected date:', err);
    }
    
    // Resume search with pending data
    if (pendingSearchData) {
      await executeSearch(pendingSearchData);
      setPendingSearchData(null);
    }
  }, [executeSearch, setSearchDate, pendingSearchData]);

  const closeDateChoice = useCallback(() => {
    setShowDateChoice(false);
    setPendingSearchData(null);
  }, []);

  // Handler for clarification chip selection
  const handleClarificationSelect = useCallback(async (selectedOption: string) => {
    setShowClarification(false);
    
    if (!pendingClarificationData) return;
    
    console.log(`✅ Clarification selected: "${selectedOption}"`);
    
    // Build refined preferences based on the selected chip
    const refinedPreferences = { ...pendingClarificationData };
    refinedPreferences.needsClarification = false;
    refinedPreferences.clarificationOptions = [];
    
    // Map the chip selection to specific search terms
    const lowerOption = selectedOption.toLowerCase();
    
    // Determine if this is a restaurant or activity clarification
    const restaurantChips = ['italian', 'steakhouse', 'sushi', 'seafood', 'mexican', 'thai', 'french', 'fine dining', 'casual dining'];
    const isRestaurantChoice = restaurantChips.some(c => lowerOption.includes(c));
    
    if (selectedOption.toLowerCase() === 'surprise me') {
      refinedPreferences.intent = 'surprise';
      refinedPreferences.noveltyLevel = 'adventurous';
    } else if (isRestaurantChoice) {
      refinedPreferences.restaurantRequest = { 
        ...(refinedPreferences.restaurantRequest || {}),
        type: selectedOption.toLowerCase()
      };
      refinedPreferences.restaurantQueryBundles = [selectedOption.toLowerCase()];
    } else {
      // Activity clarification
      refinedPreferences.activityRequest = {
        ...(refinedPreferences.activityRequest || {}),
        type: selectedOption.toLowerCase()
      };
      refinedPreferences.activityQueryBundles = [selectedOption.toLowerCase()];
    }
    
    setPendingClarificationData(null);
    
    // Re-run the full preferences extraction flow (which will now skip clarification)
    await handlePreferencesExtracted(refinedPreferences);
  }, [pendingClarificationData, handlePreferencesExtracted]);

  const closeClarification = useCallback(() => {
    setShowClarification(false);
    setPendingClarificationData(null);
  }, []);

  // Build weather data for voice interpretation from the prop
  const weatherForVoice = currentWeather?.temperature != null ? {
    temperature: currentWeather.temperature,
    description: currentWeather.description || 'unknown',
    isRaining: currentWeather.isRaining || 
      (currentWeather.description?.toLowerCase().includes('rain') || 
       currentWeather.description?.toLowerCase().includes('storm') || 
       currentWeather.description?.toLowerCase().includes('drizzle') || false),
  } : null;

  const { isListening, isProcessing, transcript, startListening } = useVoiceInput({
    onPreferencesExtracted: handlePreferencesExtracted,
    currentWeather: weatherForVoice,
  });

  return {
    isListening,
    isProcessing,
    transcript,
    startListening,
    // Date choice dialog state
    showDateChoice,
    dateChoiceOptions,
    handleDateChoice,
    closeDateChoice,
    // Clarification chips state
    showClarification,
    clarificationOptions,
    handleClarificationSelect,
    closeClarification,
  };
};
