import { useState, useRef, useEffect, useCallback } from "react";
import { Heart, RefreshCw, Loader2, User, Calendar as CalendarIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import CustomButton from "@/components/CustomButton";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LocationToggle } from "@/components/LocationToggle";
import { CuisinePicker } from "@/components/CuisinePicker";
import { ActivityPicker } from "@/components/ActivityPicker";
import { RadiusSelector } from "@/components/RadiusSelector";
import { RestaurantCard } from "@/components/RestaurantCard";
import { ActivityCard } from "@/components/ActivityCard";
import { PlanCard } from "@/components/PlanCard";
import { RestaurantDetailsDrawer } from "@/components/RestaurantDetailsDrawer";
import { HeroSection } from "@/components/hero-section";
import { LocationDialog } from "@/components/LocationDialog";
import { WeatherWidget } from "@/components/WeatherWidget";
import { RecentSearches } from "@/components/RecentSearches";
import { ProfileCompletionPrompt, useProfileCompletionPrompt } from "@/components/ProfileCompletionPrompt";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { toast } from "@/hooks/use-toast";
import { buildPlan, buildPlanFromIndices, scorePlaces } from "@/lib/planner";
import { getLearnedPreferences, getContextualSuggestions } from "@/lib/learning";
import { usePlanStore } from "@/store/planStore";
import { isDevModeActive, getDevUserId, getMockProfile, logDevMode } from "@/lib/dev-utils";

// Helper function to calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};


const Index = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  
  // Global store
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
    lastSearchLat,
    lastSearchLng,
    userPreferences,
    setLocation,
    setFilters,
    setRestaurants,
    setActivities,
    setRestaurantIdx: setRestaurantIndex,
    setActivityIdx: setActivityIndex,
    setUserPreferences,
    setLastSearched,
    setLastSearchLocation,
    resetPlan,
  } = usePlanStore();
  
  // Local UI state only
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const [searchType, setSearchType] = useState<"restaurants" | "activities">("restaurants");
  const [nickname, setNickname] = useState<string>("");
  const [showProfileBanner, setShowProfileBanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{ id: string; name: string } | null>(null);
  const [plan, setPlan] = useState<any>(null);
  const [showPickers, setShowPickers] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [weatherData, setWeatherData] = useState<{
    temperature?: number;
    description?: string;
    icon?: string;
  } | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [profileWeatherData, setProfileWeatherData] = useState<{
    temperature?: number;
    description?: string;
    icon?: string;
    cityName?: string;
  } | null>(null);
  const [loadingProfileWeather, setLoadingProfileWeather] = useState(false);
  const swapDebounceRef = useRef<{ restaurant: boolean; activity: boolean }>({ restaurant: false, activity: false });
  const locationSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Profile data for completion prompt
  const [profileData, setProfileData] = useState<{
    profile_picture_url?: string;
    voice_notes?: string;
  }>({});

  // Profile completion prompt
  const {
    shouldShowPrompt,
    markFirstRecommendationSeen,
    markCompletionPromptSeen
  } = useProfileCompletionPrompt();
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false);

  // Fetch weather data for the plan location
  const fetchWeather = async (latitude: number, longitude: number) => {
    setLoadingWeather(true);
    try {
      const { data, error } = await supabase.functions.invoke('weather', {
        body: { lat: latitude, lng: longitude }
      });

      if (error) throw error;

      setWeatherData({
        temperature: data.temperature,
        description: data.description,
        icon: data.icon
      });
    } catch (error) {
      console.error('Error fetching weather:', error);
    } finally {
      setLoadingWeather(false);
    }
  };

  // Fetch weather based on user's profile ZIP code
  const fetchProfileWeather = useCallback(async () => {
    if (!userId) return;
    
    setLoadingProfileWeather(true);
    try {
      // Fetch user profile to get home ZIP
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('home_zip')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;
      if (!profile?.home_zip) {
        console.log('No home ZIP code in profile');
        return;
      }

      // Geocode the ZIP code to get coordinates
      const { data: geoData, error: geoError } = await supabase.functions.invoke('geocode', {
        body: { zipCode: profile.home_zip }
      });

      if (geoError) throw geoError;
      if (!geoData?.lat || !geoData?.lng) {
        console.error('Failed to geocode ZIP code');
        return;
      }

      // Fetch weather for the coordinates
      const { data: weatherResponse, error: weatherError } = await supabase.functions.invoke('weather', {
        body: { lat: geoData.lat, lng: geoData.lng }
      });

      if (weatherError) throw weatherError;

      setProfileWeatherData({
        temperature: weatherResponse.temperature,
        description: weatherResponse.description,
        icon: weatherResponse.icon,
        cityName: geoData.city || undefined
      });
    } catch (error) {
      console.error('Error fetching profile weather:', error);
    } finally {
      setLoadingProfileWeather(false);
    }
  }, [userId]);

  // Initialize voice input hook
  const handlePreferencesExtracted = useCallback(async (preferences: any) => {
    console.log('=== VOICE PREFERENCES EXTRACTION START ===');
    console.log('Raw preferences:', preferences);
    console.log('Original transcript:', preferences.transcript);
    console.log('Restaurant location from AI:', preferences.restaurantRequest?.location);
    console.log('Activity location from AI:', preferences.activityRequest?.location);
    console.log('General location from AI:', preferences.generalLocation);
    
    // Determine search centers for restaurant and activity
    // Start with current location if available, otherwise will get location later
    let restaurantLat = lat || null;
    let restaurantLng = lng || null;
    let activityLat = lat || null;
    let activityLng = lng || null;
    let needsLocationSetup = false;
    
    // Helper function to geocode a location
    const geocodeLocation = async (location: string): Promise<{ lat: number; lng: number } | null> => {
      try {
        const { data, error } = await supabase.functions.invoke('geocode', {
          body: { address: location }
        });
        
        if (error) throw error;
        if (data?.lat && data?.lng) {
          console.log(`Geocoded "${location}":`, data);
          return { lat: data.lat, lng: data.lng };
        }
        return null;
      } catch (error) {
        console.error(`Failed to geocode "${location}":`, error);
        return null;
      }
    };
    
    // Handle restaurant-specific location
    if (preferences.restaurantRequest?.location) {
      toast({
        title: "Finding restaurant location...",
        description: `Looking up ${preferences.restaurantRequest.location}`,
      });
      
      const coords = await geocodeLocation(preferences.restaurantRequest.location);
      if (coords) {
        restaurantLat = coords.lat;
        restaurantLng = coords.lng;
        needsLocationSetup = true;
        console.log(`Restaurant search centered on ${preferences.restaurantRequest.location}`);
      } else {
        // Geocoding failed - use default location if available
        if (lat && lng) {
          restaurantLat = lat;
          restaurantLng = lng;
          console.log(`Geocoding failed for ${preferences.restaurantRequest.location}, using default location`);
        }
        toast({
          title: "Couldn't find restaurant location",
          description: `Using your current location instead`,
          variant: "destructive"
        });
      }
    }
    
    // Handle activity-specific location (could be different!)
    if (preferences.activityRequest?.location) {
      toast({
        title: "Finding activity location...",
        description: `Looking up ${preferences.activityRequest.location}`,
      });
      
      const coords = await geocodeLocation(preferences.activityRequest.location);
      if (coords) {
        activityLat = coords.lat;
        activityLng = coords.lng;
        needsLocationSetup = true;
        console.log(`Activity search centered on ${preferences.activityRequest.location}`);
      } else {
        // Geocoding failed - use default location if available
        if (lat && lng) {
          activityLat = lat;
          activityLng = lng;
          console.log(`Geocoding failed for ${preferences.activityRequest.location}, using default location`);
        }
        toast({
          title: "Couldn't find activity location",
          description: `Using your current location instead`,
          variant: "destructive"
        });
      }
    }
    
    // Fallback to general location if no specific locations provided
    if (!preferences.restaurantRequest?.location && 
        !preferences.activityRequest?.location && 
        preferences.generalLocation) {
      toast({
        title: "Setting location...",
        description: `Looking up ${preferences.generalLocation}`,
      });
      
      const coords = await geocodeLocation(preferences.generalLocation);
      if (coords) {
        restaurantLat = activityLat = coords.lat;
        restaurantLng = activityLng = coords.lng;
        needsLocationSetup = true;
        setLocation(coords.lat, coords.lng);
        
        // If it's a ZIP code, update the ZIP field
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
      } else {
        toast({
          title: "Couldn't find location",
          description: `Using your default location instead of ${preferences.generalLocation}`,
          variant: "destructive"
        });
      }
    }
    
    // Distance validation: warn if venues are far apart
    if (restaurantLat && restaurantLng && activityLat && activityLng) {
      const distance = calculateDistance(restaurantLat, restaurantLng, activityLat, activityLng);
      
      console.log('=== LOCATION VALIDATION ===');
      console.log(`Restaurant coords: (${restaurantLat}, ${restaurantLng})`);
      console.log(`Activity coords: (${activityLat}, ${activityLng})`);
      console.log(`Distance between venues: ${distance.toFixed(1)} miles`);
      console.log('===========================');
      
      if (distance > 50) {
        toast({
          title: "Large distance detected",
          description: `Restaurant and activity are ${Math.round(distance)} miles apart. Consider adjusting search radius.`,
        });
      }
    }
    
    // Check if we still don't have valid coordinates - try last search location first
    if ((!restaurantLat || !restaurantLng || !activityLat || !activityLng)) {
      const { lastSearchLat, lastSearchLng } = usePlanStore.getState();
      
      // Try last search location first (if available)
      if (lastSearchLat && lastSearchLng) {
        console.log('Using last search location as fallback:', { lat: lastSearchLat, lng: lastSearchLng });
        
        if (!restaurantLat || !restaurantLng) {
          restaurantLat = lastSearchLat;
          restaurantLng = lastSearchLng;
        }
        if (!activityLat || !activityLng) {
          activityLat = lastSearchLat;
          activityLng = lastSearchLng;
        }
        
        toast({
          title: "Using previous location",
          description: "Searching near where you last looked",
        });
      } else {
        // Fall back to GPS if no last location
        console.log('No last search location, getting current location...');
        toast({
          title: "Getting your location...",
          description: "Please wait while we determine your location",
        });
        try {
          await handleUseCurrentLocation(true);
          const currentLat = usePlanStore.getState().lat;
          const currentLng = usePlanStore.getState().lng;
          
          if (!currentLat || !currentLng) {
            throw new Error('Could not get current location');
          }
          
          if (!restaurantLat || !restaurantLng) {
            restaurantLat = currentLat;
            restaurantLng = currentLng;
          }
          if (!activityLat || !activityLng) {
            activityLat = currentLat;
            activityLng = currentLng;
          }
          
          console.log('Using current location:', { lat: currentLat, lng: currentLng });
        } catch (error) {
          console.error('Failed to get location:', error);
          toast({
            title: "Location required",
            description: "Please enable location services or set a ZIP code in settings",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
      }
    }
    
    // Debug: Log final location assignments before search
    console.log('=== FINAL LOCATION ASSIGNMENT ===');
    console.log('Restaurant search center:', { lat: restaurantLat, lng: restaurantLng });
    console.log('Activity search center:', { lat: activityLat, lng: activityLng });
    console.log('Location from:', preferences.restaurantRequest?.location 
      ? `restaurant-specific (${preferences.restaurantRequest.location})`
      : preferences.activityRequest?.location
      ? `activity-specific (${preferences.activityRequest.location})`
      : preferences.generalLocation
      ? `general location (${preferences.generalLocation})`
      : 'default/current location');
    console.log('=================================');
    
    // Map venue types to search filters
    const updates: any = {};
    
    // Handle restaurant type
    if (preferences.restaurantRequest?.type) {
      const restaurantType = preferences.restaurantRequest.type.toLowerCase();
      // Direct mapping for common terms
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
      // Fallback to old format
      updates.cuisine = preferences.cuisinePreferences[0].toLowerCase();
    }
    
    // Pass through raw activity keyword - no mapping
    if (preferences.activityRequest?.type) {
      updates.activityCategory = preferences.activityRequest.type;
    } else if (preferences.activityPreferences && preferences.activityPreferences.length > 0) {
      // Fallback to old format
      updates.activityCategory = preferences.activityPreferences[0];
    }
    
    // Apply filter updates
    if (Object.keys(updates).length > 0) {
      setFilters(updates);
    }
    
    // Now perform the dual-location search
    setLoading(true);
    try {
      const searchCuisine = updates.cuisine || cuisine || "";
      const searchActivity = updates.activityCategory || activityCategory;
      const restaurantPriceLevel = preferences.restaurantRequest?.priceLevel || null;
      
      console.log('Voice search params:', { searchCuisine, searchActivity, restaurantPriceLevel });
      
      // Get learned preferences and interaction history
      const learnedPrefs = userId ? await getLearnedPreferences(userId) : undefined;
      
      // Get user's interaction history (place IDs they've seen/selected before) for novelty scoring
      let userInteractionPlaceIds: string[] = [];
      if (userId && preferences.intent === 'surprise') {
        try {
          const { data: interactions } = await supabase
            .from('user_interactions')
            .select('place_id')
            .eq('user_id', userId);
          
          if (interactions) {
            userInteractionPlaceIds = interactions.map(i => i.place_id);
            console.log(`Loaded ${userInteractionPlaceIds.length} previous interactions for novelty scoring`);
          }
        } catch (error) {
          console.error('Failed to load user interactions:', error);
        }
      }
      
      // Search restaurants and activities at their respective locations
      const restaurantsPromise = supabase.functions.invoke('places-search', {
        body: { 
          lat: restaurantLat, 
          lng: restaurantLng, 
          radiusMiles: radius, 
          cuisine: searchCuisine === "🌍 Around the World" ? "" : searchCuisine,
          priceLevel: restaurantPriceLevel
        }
      });

      // Only search activities if we have a keyword
      const activitiesPromise = searchActivity 
        ? supabase.functions.invoke('activities-search', {
            body: { 
              lat: activityLat, 
              lng: activityLng, 
              radiusMiles: radius, 
              keyword: searchActivity 
            }
          })
        : Promise.resolve({ data: { items: [] }, error: null });

      const [restaurantsResponse, activitiesResponse] = await Promise.all([
        restaurantsPromise,
        activitiesPromise
      ]);

      console.log('Voice search - Restaurants response:', restaurantsResponse);
      console.log('Voice search - Activities response:', activitiesResponse);

      if (restaurantsResponse.error) throw restaurantsResponse.error;
      if (activitiesResponse.error) throw activitiesResponse.error;

      const restaurants = restaurantsResponse.data?.items || [];
      const activities = activitiesResponse.data?.items || [];
      
      // ===== FALLBACK STRATEGY FOR ACTIVITIES (VOICE PATH) =====
      let finalActivities = activities;
      let usedRadius = radius;
      let usedKeyword = searchActivity;

      // STEP 1: Keyword fallback
      if (activities.length === 0 && searchActivity) {
        console.log(`⚠️ Voice search: No results for "${searchActivity}", trying fallback...`);
        
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
          console.log(`🔄 Voice search: Retrying with broader term: "${fallbackTerm}"`);
          usedKeyword = fallbackTerm;
          
          const fallbackResponse = await supabase.functions.invoke('activities-search', {
            body: { lat: activityLat, lng: activityLng, radiusMiles: radius, keyword: fallbackTerm }
          });
          
          if (!fallbackResponse.error && fallbackResponse.data?.items?.length > 0) {
            finalActivities = fallbackResponse.data.items;
            console.log(`✅ Voice search: Fallback found ${finalActivities.length} results`);
            toast({
              title: "Search expanded",
              description: `No ${searchActivity} found, showing ${fallbackTerm} instead`,
            });
          }
        }
      }

      // STEP 2: Radius expansion fallback
      if (finalActivities.length === 0 && usedKeyword) {
        console.log(`⚠️ Voice search: Still no results for "${usedKeyword}" in ${radius} miles, expanding radius...`);
        
        const radiusSteps = [10, 15];
        
        for (const expandedRadius of radiusSteps) {
          if (expandedRadius <= radius) continue;
          
          console.log(`🔄 Voice search: Retrying with ${expandedRadius} mile radius`);
          
          const expandedResponse = await supabase.functions.invoke('activities-search', {
            body: { lat: activityLat, lng: activityLng, radiusMiles: expandedRadius, keyword: usedKeyword }
          });
          
          if (!expandedResponse.error && expandedResponse.data?.items?.length > 0) {
            finalActivities = expandedResponse.data.items;
            usedRadius = expandedRadius;
            console.log(`✅ Voice search: Found ${finalActivities.length} results at ${expandedRadius} miles`);
            
            toast({
              title: "Expanded search area",
              description: `Found ${finalActivities.length} options within ${expandedRadius} miles`,
            });
            
            break;
          }
        }
        
        if (finalActivities.length === 0) {
          console.log(`❌ Voice search: No results found even with expanded radius`);
          toast({
            title: "No results nearby",
            description: `Couldn't find any ${usedKeyword} within 15 miles. Try a different activity.`,
            variant: "destructive"
          });
        }
      }
      
      // Use the midpoint between restaurant and activity locations for plan building
      const planLat = (restaurantLat + activityLat) / 2;
      const planLng = (restaurantLng + activityLng) / 2;
      
      // Fetch weather for contextual suggestions
      let weatherData = null;
      try {
        const { data: weather, error: weatherError } = await supabase.functions.invoke('weather', {
          body: { lat: planLat, lng: planLng }
        });
        
        if (!weatherError && weather) {
          weatherData = weather;
          console.log('Weather data:', weatherData);
        }
      } catch (weatherError) {
        console.error('Failed to fetch weather:', weatherError);
      }
      
      // Get contextual suggestions
      const contextual = getContextualSuggestions({ 
        weather: weatherData,
        occasion: preferences.occasion,
      });
      console.log('Contextual suggestions:', contextual);
      
      // Score and sort results
      const sortedRestaurants = scorePlaces(
        restaurants, 
        restaurantLat,  // Score restaurants relative to their search center
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
        activityLat,  // Score activities relative to their search center
        activityLng, 
        usedRadius, 
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
      
      // Record what we searched for
      setLastSearched(searchCuisine, searchActivity);
      
      // Update primary location to midpoint for display purposes
      setLocation(planLat, planLng);

      // Build the plan
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
      });

      // Set indices
      const selectedRestaurantIndex = initialPlan.restaurant 
        ? sortedRestaurants.findIndex(r => r.id === initialPlan.restaurant?.id)
        : 0;
      const selectedActivityIndex = initialPlan.activity
        ? sortedActivities.findIndex(a => a.id === initialPlan.activity?.id)
        : 0;

      setRestaurantIndex(selectedRestaurantIndex >= 0 ? selectedRestaurantIndex : 0);
      setActivityIndex(selectedActivityIndex >= 0 ? selectedActivityIndex : 0);
      
      setPlan(initialPlan);
      
      // Trigger profile completion prompt if first recommendation
      if (initialPlan && !localStorage.getItem("hasSeenFirstRecommendation")) {
        markFirstRecommendationSeen();
        setTimeout(() => {
          setShowCompletionPrompt(shouldShowPrompt);
        }, 2000);
      }
      
      // Track and save
      if (initialPlan.restaurant) {
        await trackInteraction(initialPlan.restaurant, 'restaurant', 'selected');
      }
      if (initialPlan.activity) {
        await trackInteraction(initialPlan.activity, 'activity', 'selected');
      }
      await savePlan(initialPlan);
      
      toast({ 
        title: "Found your spots!", 
        description: `${restaurants.length} restaurants and ${activities.length} activities`,
      });
      
      setLoading(false);
      navigate("/plan");
      
    } catch (error) {
      console.error('Voice search error:', error);
      setLoading(false);
      toast({
        title: "Search failed",
        description: "Could not complete your search. Please try again.",
        variant: "destructive"
      });
    }
  }, [setFilters, setLocation, locationMode, lat, lng, radius, cuisine, activityCategory, userId, userPreferences, navigate, setRestaurants, setActivities, setLastSearched, setRestaurantIndex, setActivityIndex]);

  const { isListening, isProcessing, startListening } = useVoiceInput({
    onPreferencesExtracted: handlePreferencesExtracted,
    userProfile: {
      cuisines: userPreferences?.cuisines || [],
      activities: userPreferences?.activities || [],
      home_zip: zipCode,
    },
  });

  // Fetch weather when location changes
  useEffect(() => {
    if (lat && lng) {
      fetchWeather(lat, lng);
    }
  }, [lat, lng]);

  // Check authentication and onboarding status
  useEffect(() => {
    const checkAuth = async () => {
      setIsCheckingOnboarding(true);
      
      // Development mode bypass
      if (isDevModeActive()) {
        logDevMode('Dev mode active - bypassing authentication');
        const devUserId = getDevUserId();
        setUserId(devUserId);
        
        // Load mock profile data
        const mockProfile = getMockProfile();
        setNickname(mockProfile.nickname || '');
        setUserPreferences({
          cuisines: mockProfile.cuisines || [],
          activities: mockProfile.activities || [],
        });
        
        // Set default location from mock profile
        if (mockProfile.home_zip) {
          setFilters({ 
            zipCode: mockProfile.home_zip,
            radius: mockProfile.default_radius_mi || 5 
          });
        }
        
        localStorage.setItem("hasOnboarded", "true");
        setIsCheckingOnboarding(false);
        logDevMode('Mock profile loaded', mockProfile);
        return;
      }
      
      // Normal authentication flow
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/login");
        return;
      }
      
      setUserId(session.user.id);
      
      // Check if profile is complete (only nickname and home_zip required)
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('nickname, home_zip, cuisines, activities, default_radius_mi, profile_picture_url, voice_notes')
          .eq('user_id', session.user.id)
          .maybeSingle();
        
        if (error) throw error;
        
        if (!profile || !profile.nickname || !profile.home_zip) {
          navigate("/onboarding");
          return;
        }
        
        localStorage.setItem("hasOnboarded", "true");
        await fetchProfile(session.user.id);
      } catch (error) {
        console.error('Error checking profile:', error);
        navigate("/onboarding");
        return;
      }
      
      setIsCheckingOnboarding(false);
    };
    
    checkAuth();
  }, [navigate]);

  // Check if profile needs refresh (after edit)
  useEffect(() => {
    const needsRefresh = localStorage.getItem("profileNeedsRefresh");
    if (needsRefresh === "true" && userId) {
      localStorage.removeItem("profileNeedsRefresh");
      fetchProfile(userId);
    }
  }, [userId]);

  // Save location settings to database with debounce
  const saveLocationSettings = async (newRadius: number, newZipCode: string, showToast = false) => {
    if (!userId || isDevModeActive()) return;

    // Validate ZIP code before saving
    if (newZipCode && !/^\d{5}$/.test(newZipCode.trim())) {
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          default_radius_mi: newRadius,
          home_zip: newZipCode || null
        })
        .eq('user_id', userId);

      if (error) throw error;

      if (showToast) {
        toast({
          title: "Location saved",
          description: "Your default location has been updated.",
        });
      }
    } catch (error) {
      console.error('Error saving location settings:', error);
      if (showToast) {
        toast({
          title: "Error",
          description: "Failed to save location settings",
          variant: "destructive"
        });
      }
    }
  };

  // Debounced location save - waits 2 seconds after user stops adjusting
  const debouncedSaveLocation = (newRadius: number, newZipCode: string) => {
    if (locationSaveTimeoutRef.current) {
      clearTimeout(locationSaveTimeoutRef.current);
    }

    locationSaveTimeoutRef.current = setTimeout(() => {
      saveLocationSettings(newRadius, newZipCode);
    }, 2000);
  };

  // Show onboarding complete toast and auto-search
  useEffect(() => {
    const showToast = localStorage.getItem("showOnboardingCompleteToast");
    if (showToast === "true") {
      localStorage.removeItem("showOnboardingCompleteToast");
      toast({
        title: "Profile saved",
        description: "Picks tailored to you — finding your perfect spots!",
      });
      
      // Auto-search if we have a ZIP and location is set to zip mode
      if (zipCode && locationMode === "zip") {
        setTimeout(() => {
          handleFindPlaces();
        }, 1000);
      }
    }
  }, []);

  // Fetch weather based on user's profile ZIP code when they log in
  useEffect(() => {
    if (userId) {
      fetchProfileWeather();
    }
  }, [userId, fetchProfileWeather]);

  // Removed auto-GPS request - only request GPS when user explicitly enables it

  const fetchProfile = async (uid: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/login");
        return;
      }

      const { data: profile, error } = await supabase.functions.invoke('profile', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      if (profile) {
        
        // Prefill controls and geocode home_zip
        if (profile.home_zip) {
          setFilters({ zipCode: profile.home_zip, locationMode: "zip" });
          
          // Geocode the home ZIP to get coordinates
          try {
            const { data: geocodeData, error: geocodeError } = await supabase.functions.invoke('geocode', {
              body: { zipCode: profile.home_zip }
            });
            
            if (!geocodeError && geocodeData?.lat && geocodeData?.lng) {
              setLocation(geocodeData.lat, geocodeData.lng);
              console.log('Home ZIP geocoded:', geocodeData);
            }
          } catch (geocodeError) {
            console.error('Failed to geocode home ZIP:', geocodeError);
          }
        }
        if (profile.default_radius_mi !== null && profile.default_radius_mi !== undefined) {
          setFilters({ radius: profile.default_radius_mi });
        }
        
        // Valid options in the UI
        const validCuisines = ["Italian", "Mexican", "Japanese", "Chinese", "Thai", "American", "Indian", "French", "Mediterranean"];
        const validActivities = ["live_music", "comedy", "movies", "bowling", "arcade", "museum", "escape_room", "mini_golf", "hike", "wine"];
        
        // Set user preferences and find matching cuisine
        const newPreferences = { ...userPreferences };
        if (profile.cuisines && Array.isArray(profile.cuisines) && profile.cuisines.length > 0) {
          newPreferences.cuisines = profile.cuisines;
          // Find first matching cuisine (case-insensitive)
          const matchingCuisine = validCuisines.find(valid => 
            profile.cuisines.some(pref => pref.toLowerCase() === valid.toLowerCase())
          );
          if (matchingCuisine) {
            setFilters({ cuisine: matchingCuisine });
          }
        }
        if (profile.activities && Array.isArray(profile.activities) && profile.activities.length > 0) {
          newPreferences.activities = profile.activities;
          // Find first matching activity
          const matchingActivity = validActivities.find(valid => 
            profile.activities.includes(valid)
          );
          if (matchingActivity) {
            setFilters({ activityCategory: matchingActivity });
          }
        }
        setUserPreferences(newPreferences);
        
        if (profile.nickname) {
          setNickname(profile.nickname);
        }
        
        // Store profile data for completion prompt
        setProfileData({
          profile_picture_url: profile.profile_picture_url,
          voice_notes: profile.voice_notes,
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

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

  // Save the current plan
  const savePlan = async (currentPlan: any) => {
    if (!userId || !currentPlan) return;
    
    try {
      await supabase.from('saved_plans').insert({
        user_id: userId,
        restaurant_id: currentPlan.restaurant.id,
        restaurant_name: currentPlan.restaurant.name,
        restaurant_cuisine: currentPlan.restaurant.cuisine,
        activity_id: currentPlan.activity.id,
        activity_name: currentPlan.activity.name,
        activity_category: currentPlan.activity.category,
        search_params: {
          lat,
          lng,
          radius,
          cuisine,
          activityCategory,
        },
      });
    } catch (error) {
      console.error('Error saving plan:', error);
    }
  };

  const handleUseCurrentLocation = (silent: boolean = false): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
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
          setLocation(position.coords.latitude, position.coords.longitude);
          setGettingLocation(false);
          if (!silent) {
            toast({ title: "Success", description: "Location detected! Ready to find date spots near you." });
          }
          resolve();
        },
        (error) => {
          setGettingLocation(false);
          console.log('Geolocation error (silent=' + silent + '):', error);
          
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
        }
      );
    });
  };

  const handleFindPlaces = async (overrideCuisine?: string, overrideActivity?: string) => {
    // Use override values or fall back to current state
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
        // Continue without weather - it's not critical
      }
      
      // Get contextual suggestions based on weather, time, etc.
      const contextual = getContextualSuggestions({ weather: weatherData });
      console.log('Contextual suggestions:', contextual);
      
      // Get learned preferences
      const learnedPrefs = userId ? await getLearnedPreferences(userId) : undefined;
      
      // Fetch both restaurants and activities in parallel
      const [restaurantsResponse, activitiesResponse] = await Promise.all([
        supabase.functions.invoke('places-search', {
          body: { lat: searchLat, lng: searchLng, radiusMiles: radius, cuisine: searchCuisine }
        }),
        supabase.functions.invoke('activities-search', {
          body: { lat: searchLat, lng: searchLng, radiusMiles: radius, keyword: searchActivity }
        })
      ]);

      console.log('Restaurants response:', restaurantsResponse);
      console.log('Activities response:', activitiesResponse);

      if (restaurantsResponse.error) throw restaurantsResponse.error;
      if (activitiesResponse.error) throw activitiesResponse.error;

      const restaurants = restaurantsResponse.data?.items || [];
      const activities = activitiesResponse.data?.items || [];

      console.log('=== SEARCH PARAMETERS ===');
      console.log('Cuisine search:', searchCuisine);
      console.log('Activity search:', searchActivity);
      console.log('Location:', { lat: searchLat, lng: searchLng, radius });
      console.log('========================');

      console.log('=== SEARCH RESULTS ===');
      console.log('Restaurants found:', restaurants.length);
      console.log('Activities found:', activities.length);
      console.log('======================');

      // Save this location for future fallback (if search was successful)
      if (restaurants.length > 0 || activities.length > 0) {
        setLastSearchLocation(searchLat, searchLng);
        console.log('Saved search location for future fallback:', { lat: searchLat, lng: searchLng });
      }

      // ===== FALLBACK STRATEGY FOR ACTIVITIES =====
      let finalActivities = activities;
      let usedRadius = radius;
      let usedKeyword = searchActivity;
      if (activities.length === 0 && searchActivity) {
        console.log(`⚠️ No results for "${searchActivity}", trying fallback...`);
        
        // Intelligent fallback map
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
          console.log(`🔄 Retrying with broader term: "${fallbackTerm}"`);
          usedKeyword = fallbackTerm;
          
          const fallbackResponse = await supabase.functions.invoke('activities-search', {
            body: { lat: searchLat, lng: searchLng, radiusMiles: radius, keyword: fallbackTerm }
          });
          
          if (!fallbackResponse.error && fallbackResponse.data?.items?.length > 0) {
            finalActivities = fallbackResponse.data.items;
            console.log(`✅ Fallback found ${finalActivities.length} results`);
            toast({
              title: "Search expanded",
              description: `No ${searchActivity} found, showing ${fallbackTerm} instead`,
            });
          }
        }
      }
      
      // STEP 2: Radius expansion fallback
      if (finalActivities.length === 0 && usedKeyword) {
        console.log(`⚠️ Still no results for "${usedKeyword}" in ${radius} miles, expanding radius...`);
        
        // Try expanding in steps: 10 miles, then 15 miles
        const radiusSteps = [10, 15];
        
        for (const expandedRadius of radiusSteps) {
          if (expandedRadius <= radius) continue; // Skip if already searching this wide
          
          console.log(`🔄 Retrying with ${expandedRadius} mile radius`);
          
          const expandedResponse = await supabase.functions.invoke('activities-search', {
            body: { lat: searchLat, lng: searchLng, radiusMiles: expandedRadius, keyword: usedKeyword }
          });
          
          if (!expandedResponse.error && expandedResponse.data?.items?.length > 0) {
            finalActivities = expandedResponse.data.items;
            usedRadius = expandedRadius;
            console.log(`✅ Found ${finalActivities.length} results at ${expandedRadius} miles`);
            
            toast({
              title: "Expanded search area",
              description: `Found ${finalActivities.length} options within ${expandedRadius} miles`,
            });
            
            break; // Stop once we find results
          }
        }
        
        // If still nothing after all attempts
        if (finalActivities.length === 0) {
          console.log(`❌ No results found even with expanded radius`);
          toast({
            title: "No results nearby",
            description: `Couldn't find any ${usedKeyword} within 15 miles. Try a different activity or location.`,
            variant: "destructive"
          });
        }
      }
      
      // Sort results by preference-based scoring before storing
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
        usedRadius, // Use the radius that worked (5, 10, or 15)
        userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 
          ? userPreferences 
          : undefined,
        'activity',
        learnedPrefs
      );
      
      setRestaurants(sortedRestaurants, restaurantsResponse.data?.nextPageToken || null);
      setActivities(sortedActivities, activitiesResponse.data?.nextPageToken || null);
      
      // Record what we just searched for
      setLastSearched(cuisine, activityCategory);
      
      // Update location in store
      setLocation(searchLat, searchLng);

      // Build the initial plan using the sorted arrays
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
      });

      // Find the indices of the selected restaurant and activity in the sorted arrays
      const selectedRestaurantIndex = initialPlan.restaurant 
        ? sortedRestaurants.findIndex(r => r.id === initialPlan.restaurant?.id)
        : 0;
      const selectedActivityIndex = initialPlan.activity
        ? sortedActivities.findIndex(a => a.id === initialPlan.activity?.id)
        : 0;

      // Set indices to match what was actually selected
      setRestaurantIndex(selectedRestaurantIndex >= 0 ? selectedRestaurantIndex : 0);
      setActivityIndex(selectedActivityIndex >= 0 ? selectedActivityIndex : 0);
      
      setPlan(initialPlan);
      
      // Trigger profile completion prompt if first recommendation
      if (initialPlan && !localStorage.getItem("hasSeenFirstRecommendation")) {
        markFirstRecommendationSeen();
        setTimeout(() => {
          setShowCompletionPrompt(shouldShowPrompt);
        }, 2000);
      }
      
      // Track selections and save plan
      if (initialPlan.restaurant) {
        await trackInteraction(initialPlan.restaurant, 'restaurant', 'selected');
      }
      if (initialPlan.activity) {
        await trackInteraction(initialPlan.activity, 'activity', 'selected');
      }
      await savePlan(initialPlan);
      
      // Auto-save location settings after successful search
      await saveLocationSettings(radius, zipCode, true);
      
      toast({ 
        title: "Success", 
        description: `Found ${restaurants.length} restaurants and ${activities.length} activities for your date night!`,
      });
    } catch (error) {
      console.error('Error fetching places:', error);
      toast({ title: "Error", description: "Failed to find places. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSwapRestaurant = async () => {
    // Debounce to prevent double-taps
    if (swapDebounceRef.current.restaurant) return;
    swapDebounceRef.current.restaurant = true;
    setTimeout(() => { swapDebounceRef.current.restaurant = false; }, 300);

    // Track skip before moving to next
    if (restaurantResults[restaurantIndex]) {
      await trackInteraction(restaurantResults[restaurantIndex], 'restaurant', 'skipped');
    }

    // Get coordinates based on location mode
    // Get coordinates from store (already geocoded during initial search)
    if (lat === null || lng === null) return;
    const searchLat = lat;
    const searchLng = lng;

    // If next item exists, advance index
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
        },
        newIndex,
        activityIndex
      );
      setPlan(newPlan);
      return;
    }

    // No next item: if we have a token, fetch next page and append
    if (nextRestaurantsToken) {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('places-search', {
          body: { lat: searchLat, lng: searchLng, radiusMiles: radius, cuisine, pagetoken: nextRestaurantsToken }
        });

        if (error) throw error;

        const newRestaurants = [...restaurantResults, ...(data.items || [])];
        
        // Re-sort the combined list
        const sortedRestaurants = scorePlaces(
          newRestaurants,
          searchLat,
          searchLng,
          radius,
          userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 
            ? userPreferences 
            : undefined,
          'restaurant'
        );
        
        setRestaurants(sortedRestaurants, data.nextPageToken || null);
        
        const newIndex = restaurantIndex + 1;
        setRestaurantIndex(newIndex);

        const newPlan = buildPlanFromIndices(
          {
            lat: searchLat,
            lng: searchLng,
            radius,
            restaurants: newRestaurants,
            activities: activityResults,
            preferences: userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 
              ? userPreferences 
              : undefined,
          },
          newIndex,
          activityIndex
        );
        setPlan(newPlan);
        toast({ title: "Success", description: "Loaded more restaurants!" });
      } catch (error) {
        console.error('Error fetching more restaurants:', error);
        toast({ title: "Error", description: "Failed to load more restaurants.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    } else {
      // Fallback: wrap to start
      setRestaurantIndex(0);
      
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
        },
        0,
        activityIndex
      );
      setPlan(newPlan);
      toast({ description: "Showing earlier options" });
    }
  };

  const handleSwapActivity = async () => {
    // Debounce to prevent double-taps
    if (swapDebounceRef.current.activity) return;
    swapDebounceRef.current.activity = true;
    setTimeout(() => { swapDebounceRef.current.activity = false; }, 300);

    // Track skip before moving to next
    if (activityResults[activityIndex]) {
      await trackInteraction(activityResults[activityIndex], 'activity', 'skipped');
    }

    // Get coordinates from store (already geocoded during initial search)
    if (lat === null || lng === null) return;
    const searchLat = lat;
    const searchLng = lng;

    // Simple linear progression through the activity list
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
        },
        restaurantIndex,
        newIndex
      );
      setPlan(newPlan);
      return;
    }

    // No next item: if we have a token, fetch next page and append
    if (nextActivitiesToken) {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('activities-search', {
          body: { lat: searchLat, lng: searchLng, radiusMiles: radius, keyword: activityCategory, pagetoken: nextActivitiesToken }
        });

        if (error) throw error;

        const newActivities = [...activityResults, ...(data.items || [])];
        
        // Re-sort the combined list
        const sortedActivities = scorePlaces(
          newActivities,
          searchLat,
          searchLng,
          radius,
          userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 
            ? userPreferences 
            : undefined,
          'activity'
        );
        
        setActivities(sortedActivities, data.nextPageToken || null);
        
        const newIndex = activityIndex + 1;
        setActivityIndex(newIndex);

        const newPlan = buildPlanFromIndices(
          {
            lat: searchLat,
            lng: searchLng,
            radius,
            restaurants: restaurantResults,
            activities: newActivities,
            preferences: userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 
              ? userPreferences 
              : undefined,
          },
          restaurantIndex,
          newIndex
        );
        setPlan(newPlan);
        toast({ title: "Success", description: "Loaded more activities!" });
      } catch (error) {
        console.error('Error fetching more activities:', error);
        toast({ title: "Error", description: "Failed to load more activities.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    } else {
      // Fallback: wrap to start
      setActivityIndex(0);
      
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
        },
        restaurantIndex,
        0
      );
      setPlan(newPlan);
      toast({ description: "Showing earlier options" });
    }
  };


  const handleRerollPlan = async () => {
    // Full refresh: re-fetch both from page 1, reset tokens and indices
    
    // Get coordinates from store (already geocoded during initial search)
    if (lat === null || lng === null) {
      toast({ title: "Error", description: "Location not available", variant: "destructive" });
      return;
    }
    const searchLat = lat;
    const searchLng = lng;

    setLoading(true);
    try {
      // Fetch both from page 1 (no pagetoken)
      const [restaurantsResponse, activitiesResponse] = await Promise.all([
        supabase.functions.invoke('places-search', {
          body: { lat: searchLat, lng: searchLng, radiusMiles: radius, cuisine }
        }),
        supabase.functions.invoke('activities-search', {
          body: { lat: searchLat, lng: searchLng, radiusMiles: radius, keyword: activityCategory }
        })
      ]);

      if (restaurantsResponse.error) throw restaurantsResponse.error;
      if (activitiesResponse.error) throw activitiesResponse.error;

      const restaurants = restaurantsResponse.data?.items || [];
      const activities = activitiesResponse.data?.items || [];
      
      // Sort results by preference-based scoring before storing
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

      // Build fresh plan to determine which items to show
      const freshPlan = buildPlan({
        lat: searchLat,
        lng: searchLng,
        radius,
        restaurants: sortedRestaurants,
        activities: sortedActivities,
        preferences: userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 
          ? userPreferences 
          : undefined,
      });

      // Find the indices of the selected restaurant and activity in the sorted arrays
      const selectedRestaurantIndex = freshPlan.restaurant 
        ? sortedRestaurants.findIndex(r => r.id === freshPlan.restaurant?.id)
        : 0;
      const selectedActivityIndex = freshPlan.activity
        ? sortedActivities.findIndex(a => a.id === freshPlan.activity?.id)
        : 0;

      // Set indices to match what was actually selected
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

  // Show loading state while checking onboarding
  if (isCheckingOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleReroll = async () => {
    const relevantToken = searchType === "restaurants" ? nextRestaurantsToken : nextActivitiesToken;
    
    if (relevantToken && lat !== null && lng !== null) {
      // Fetch next page using stored coordinates
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
      // Shuffle existing results
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
    // Validation
    if (radius <= 0) {
      toast({ title: "Error", description: "Please set a valid search radius", variant: "destructive" });
      return;
    }
    if (!cuisine) {
      toast({ title: "Error", description: "Please select a cuisine", variant: "destructive" });
      return;
    }
    if (!activityCategory) {
      toast({ title: "Error", description: "Please select an activity", variant: "destructive" });
      return;
    }
    
    // Location validation
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
        // ZIP mode - validate ZIP format but DON'T require lat/lng yet
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
        // ZIP is valid format - continue to handleFindPlaces which will geocode it
      }
    }

    // Ensure indices are set
    if (restaurantIndex === null || restaurantIndex === undefined) setRestaurantIndex(0);
    if (activityIndex === null || activityIndex === undefined) setActivityIndex(0);

    // Check if we have results AND they match the current filters
    const filtersChanged = 
      lastSearchedCuisine !== cuisine || 
      lastSearchedActivity !== activityCategory;

    // Only reuse cached results if filters haven't changed
    if (restaurantResults.length > 0 && 
        activityResults.length > 0 && 
        !filtersChanged) {
      navigate("/plan");
      return;
    }

    // Filters changed or no results - fetch fresh data
    await handleFindPlaces();
    navigate("/plan");
  };

  const handleSurpriseMe = async () => {
    // Validate only location requirements
    if (radius <= 0) {
      toast({ 
        title: "Error", 
        description: "Please set a valid search radius", 
        variant: "destructive" 
      });
      return;
    }
    
    if (!lat || !lng) {
      setShowLocationDialog(true);
      return;
    }
    
    // Available options
    const cuisineOptions = ["Italian", "Mexican", "Japanese", "Chinese", "Thai", "American", "Indian", "French", "Mediterranean"];
    const activityOptions = ["live_music", "comedy", "movies", "bowling", "arcade", "museum", "escape_room", "mini_golf", "hike", "wine"];
    
    // Smart selection: prefer user preferences if available
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
    
    // Show fun toast message
    const activityLabel = selectedActivity.replace('_', ' ');
    toast({
      title: "✨ Surprise!",
      description: `Finding ${selectedCuisine} restaurants and ${activityLabel} nearby...`,
    });
    
    setLoading(true);
    try {
      const searchLat = lat;
      const searchLng = lng;

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
      
      // Get contextual suggestions
      const contextual = getContextualSuggestions({ weather: weatherData });
      console.log('Contextual suggestions:', contextual);

      // Get learned preferences
      const learnedPrefs = userId ? await getLearnedPreferences(userId) : undefined;
      
      // Fetch both restaurants and activities with the randomly selected values
      const [restaurantsResponse, activitiesResponse] = await Promise.all([
        supabase.functions.invoke('places-search', {
          body: { lat: searchLat, lng: searchLng, radiusMiles: radius, cuisine: selectedCuisine }
        }),
        supabase.functions.invoke('activities-search', {
          body: { lat: searchLat, lng: searchLng, radiusMiles: radius, keyword: selectedActivity }
        })
      ]);

      if (restaurantsResponse.error) throw restaurantsResponse.error;
      if (activitiesResponse.error) throw activitiesResponse.error;

      const restaurants = restaurantsResponse.data?.items || [];
      const activities = activitiesResponse.data?.items || [];
      
      // Sort results by preference-based scoring
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

      // Record what we searched for
      setLastSearched(selectedCuisine, selectedActivity);

      // Build the initial plan
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
      });

      // Find the indices of the selected items
      const selectedRestaurantIndex = initialPlan.restaurant 
        ? sortedRestaurants.findIndex(r => r.id === initialPlan.restaurant?.id)
        : 0;
      const selectedActivityIndex = initialPlan.activity
        ? sortedActivities.findIndex(a => a.id === initialPlan.activity?.id)
        : 0;

      setRestaurantIndex(selectedRestaurantIndex >= 0 ? selectedRestaurantIndex : 0);
      setActivityIndex(selectedActivityIndex >= 0 ? selectedActivityIndex : 0);
      
      setPlan(initialPlan);

      // Update filters AFTER successful search
      setFilters({ 
        cuisine: selectedCuisine, 
        activityCategory: selectedActivity 
      });

      // Use setTimeout to ensure store updates have flushed before navigation
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
    // Apply the search params from the recent plan
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container max-w-2xl mx-auto px-4 py-8">
        {/* Header with WeatherWidget and navigation buttons */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <WeatherWidget
            temperature={profileWeatherData?.temperature}
            description={profileWeatherData?.description}
            icon={profileWeatherData?.icon}
            cityName={profileWeatherData?.cityName}
            loading={loadingProfileWeather}
            onRefresh={fetchProfileWeather}
          />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/history')} title="Saved Plans">
              <Heart className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/calendar')} title="Calendar">
              <CalendarIcon className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/profile')} title="Profile">
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Hero Section with Voice Input */}
        <HeroSection
          userName={nickname}
          isLoggedIn={!!userId}
          loading={loading || isProcessing}
          isListening={isListening}
          onVoiceInput={startListening}
          onSurpriseMe={handleSurpriseMe}
          onTogglePickers={() => setShowPickers(!showPickers)}
          showPickers={showPickers}
        >
          {/* Pickers inside HeroSection */}
          <div className="space-y-6 mt-6">
            {/* CuisinePicker */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Choose cuisine</h2>
              <CuisinePicker selected={cuisine} onSelect={(value) => setFilters({ cuisine: value })} />
            </div>

            {/* ActivityPicker */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Choose activity</h2>
              <ActivityPicker selected={activityCategory} onSelect={(value) => setFilters({ activityCategory: value })} />
            </div>

            {/* Location and Radius */}
            <div className="bg-card rounded-xl border p-6 space-y-6">
              <LocationToggle
                mode={locationMode}
                zipCode={zipCode}
                onModeChange={(mode) => {
                  // Clear stored coordinates when switching modes
                  // This forces fresh validation and geocoding on next search
                  setLocation(null, null);
                  setFilters({ locationMode: mode });
                  
                  // Clear old search results since they're from a different location
                  resetPlan();
                  
                  toast({
                    title: mode === "gps" ? "Switched to GPS" : "Switched to ZIP Code",
                    description: mode === "gps" 
                      ? "Click 'Get Current Location' to use GPS" 
                      : "Enter your ZIP code to continue",
                  });
                }}
                onZipCodeChange={(value) => {
                  setFilters({ zipCode: value });
                  if (value.length === 5) {
                    debouncedSaveLocation(radius, value);
                  }
                }}
                onUseCurrentLocation={() => handleUseCurrentLocation(false)}
                locationDetected={lat !== null && lng !== null}
                gettingLocation={gettingLocation}
              />
              <div className="h-px bg-border" />
              <RadiusSelector value={radius} onChange={(value) => {
                setFilters({ radius: value });
                debouncedSaveLocation(value, zipCode);
              }} />
            </div>

            {/* See Tonight's Plan Button */}
            <CustomButton full onClick={handleSeePlan} disabled={loading} size="lg">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Finding Spots...
                </>
              ) : (
                "See Tonight's Plan"
              )}
            </CustomButton>
          </div>
        </HeroSection>

        {/* Results section */}

        {/* 6. ResultsList (section title: "More options") */}
        {(loading || restaurantResults.length > 0 || activityResults.length > 0) && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">More options</h2>
              <Button onClick={handleRerollPlan} variant="outline" size="sm" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </Button>
            </div>

            <Tabs value={searchType} onValueChange={(v) => setSearchType(v as "restaurants" | "activities")} className="mb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="restaurants">Restaurants ({restaurantResults.length})</TabsTrigger>
                <TabsTrigger value="activities">Activities ({activityResults.length})</TabsTrigger>
              </TabsList>
            </Tabs>

            {loading && (
              <div className="muted text-center py-8">Finding great spots…</div>
            )}

            {!loading && searchType === "restaurants" && restaurantResults.length === 0 && (
              <div className="muted text-center py-8">
                <div>No matches nearby. Try widening your radius or switching cuisines.</div>
                <div style={{marginTop:'12px', display:'flex', gap:'8px', justifyContent:'center'}}>
                  <CustomButton 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => {
                      const newRadius = Math.min(radius + 5, 25);
                      setFilters({ radius: newRadius });
                      toast({ title: "Radius updated", description: `Searching within ${newRadius} miles` });
                    }}
                  >
                    Widen radius +5
                  </CustomButton>
                  <CustomButton 
                    variant="quiet" 
                    size="sm" 
                    onClick={() => {
                      const currentIndex = ["Italian", "Mexican", "Japanese", "Chinese", "Thai", "American", "Indian", "French", "Mediterranean"].indexOf(cuisine);
                      const nextCuisine = ["Italian", "Mexican", "Japanese", "Chinese", "Thai", "American", "Indian", "French", "Mediterranean"][(currentIndex + 1) % 9];
                      setFilters({ cuisine: nextCuisine });
                    }}
                  >
                    Switch cuisine
                  </CustomButton>
                </div>
              </div>
            )}

            {!loading && searchType === "activities" && activityResults.length === 0 && (
              <div className="muted text-center py-8">
                <div>No matches nearby. Try widening your radius or switching activities.</div>
                <div style={{marginTop:'12px', display:'flex', gap:'8px', justifyContent:'center'}}>
                  <CustomButton 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => {
                      const newRadius = Math.min(radius + 5, 25);
                      setFilters({ radius: newRadius });
                      toast({ title: "Radius updated", description: `Searching within ${newRadius} miles` });
                    }}
                  >
                    Widen radius +5
                  </CustomButton>
                </div>
              </div>
            )}

            {!loading && searchType === "restaurants" && restaurantResults.length > 0 && (
              <div className="grid grid-cols-1 gap-4">
                {restaurantResults.map((item, idx) => (
                  <RestaurantCard 
                    key={idx} 
                    {...item}
                    priceLevel={item.priceLevel || ""}
                    onClick={() => setSelectedPlace({ id: item.id, name: item.name })}
                  />
                ))}
              </div>
            )}

            {!loading && searchType === "activities" && activityResults.length > 0 && (
              <div className="grid grid-cols-1 gap-4">
                {activityResults.map((item, idx) => (
                  <ActivityCard 
                    key={idx} 
                    {...item}
                    onClick={() => setSelectedPlace({ id: item.id, name: item.name })}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {selectedPlace && (
          <RestaurantDetailsDrawer
            isOpen={!!selectedPlace}
            onClose={() => setSelectedPlace(null)}
            placeId={selectedPlace.id}
            initialName={selectedPlace.name}
          />
        )}

        <LocationDialog
          open={showLocationDialog}
          onOpenChange={setShowLocationDialog}
          defaultZipCode={zipCode}
          defaultRadius={radius}
          onSave={async (zip, radiusValue) => {
            setFilters({ locationMode: "zip", zipCode: zip, radius: radiusValue });
            
            // Geocode the ZIP to get coordinates
            try {
              const { data: geocodeData, error: geocodeError } = await supabase.functions.invoke('geocode', {
                body: { zipCode: zip }
              });
              
              if (!geocodeError && geocodeData?.lat && geocodeData?.lng) {
                setLocation(geocodeData.lat, geocodeData.lng);
              }
            } catch (error) {
              console.error('Failed to geocode ZIP:', error);
            }
            
            toast({
              title: "Location Saved",
              description: `Set to ${zip} with ${radiusValue} mile radius`,
            });
          }}
          onUseGPS={async () => {
            try {
              await handleUseCurrentLocation();
              toast({
                title: "Location Updated",
                description: "Using your current GPS location",
              });
            } catch (error) {
              toast({
                title: "Location Access Denied",
                description: "Please allow location access or enter a ZIP code",
                variant: "destructive",
              });
              setShowLocationDialog(true);
            }
          }}
        />

        {showCompletionPrompt && (
          <ProfileCompletionPrompt
            userName={nickname}
            hasProfilePicture={!!profileData?.profile_picture_url}
            hasVoicePreferences={!!profileData?.voice_notes}
            onComplete={() => {
              markCompletionPromptSeen();
              navigate('/profile/edit');
            }}
            onDismiss={() => {
              markCompletionPromptSeen();
              setShowCompletionPrompt(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
