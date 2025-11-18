import { useState, useRef, useEffect } from "react";
import { Heart, RefreshCw, Loader2, User } from "lucide-react";
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
import { ThemeToggle } from "@/components/ThemeToggle";
import { RecentSearches } from "@/components/RecentSearches";
import { toast } from "@/hooks/use-toast";
import { buildPlan, buildPlanFromIndices, scorePlaces } from "@/lib/planner";
import { getLearnedPreferences, getContextualSuggestions } from "@/lib/learning";
import { usePlanStore } from "@/store/planStore";
import { isDevModeActive, getDevUserId, getMockProfile, logDevMode } from "@/lib/dev-utils";

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
    userPreferences,
    setLocation,
    setFilters,
    setRestaurants,
    setActivities,
    setRestaurantIdx: setRestaurantIndex,
    setActivityIdx: setActivityIndex,
    setUserPreferences,
    setLastSearched,
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
  const swapDebounceRef = useRef<{ restaurant: boolean; activity: boolean }>({ restaurant: false, activity: false });
  const locationSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      
      const hasOnboarded = localStorage.getItem("hasOnboarded");
      if (!hasOnboarded) {
        navigate("/onboarding");
      } else {
        await fetchProfile(session.user.id);
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
        
        // Prefill controls
        if (profile.home_zip) {
          setFilters({ zipCode: profile.home_zip, locationMode: "zip" });
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

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Error", description: "Geolocation is not supported by your browser", variant: "destructive" });
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation(position.coords.latitude, position.coords.longitude);
        setGettingLocation(false);
        toast({ title: "Success", description: "Location detected! Ready to find date spots near you." });
      },
      (error) => {
        setGettingLocation(false);
        console.error('Geolocation error:', error);
        toast({ 
          title: "Location Error", 
          description: error.code === 1 
            ? "Location permission denied. Please enable location access or use ZIP code." 
            : "Could not get your location. Please try ZIP code instead.", 
          variant: "destructive" 
        });
      }
    );
  };

  const handleFindPlaces = async () => {
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
      // Get learned preferences
      const learnedPrefs = userId ? await getLearnedPreferences(userId) : undefined;
      
      // Fetch both restaurants and activities in parallel
      const [restaurantsResponse, activitiesResponse] = await Promise.all([
        supabase.functions.invoke('places-search', {
          body: { lat: searchLat, lng: searchLng, radiusMiles: radius, cuisine }
        }),
        supabase.functions.invoke('activities-search', {
          body: { lat: searchLat, lng: searchLng, radiusMiles: radius, category: activityCategory }
        })
      ]);

      console.log('Restaurants response:', restaurantsResponse);
      console.log('Activities response:', activitiesResponse);

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
          body: { lat: searchLat, lng: searchLng, radiusMiles: radius, category: activityCategory, pagetoken: nextActivitiesToken }
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
          body: { lat: searchLat, lng: searchLng, radiusMiles: radius, category: activityCategory }
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
          : { lat: searchLat, lng: searchLng, radiusMiles: radius, category: activityCategory, pagetoken: relevantToken };

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
      toast({ 
        title: "Error", 
        description: "Please set your location first", 
        variant: "destructive" 
      });
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

      // Get learned preferences
      const learnedPrefs = userId ? await getLearnedPreferences(userId) : undefined;
      
      // Fetch both restaurants and activities with the randomly selected values
      const [restaurantsResponse, activitiesResponse] = await Promise.all([
        supabase.functions.invoke('places-search', {
          body: { lat: searchLat, lng: searchLng, radiusMiles: radius, cuisine: selectedCuisine }
        }),
        supabase.functions.invoke('activities-search', {
          body: { lat: searchLat, lng: searchLng, radiusMiles: radius, category: selectedActivity }
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
        {/* 1. Header with small title + Profile icon (top-right) */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Date Night Planner</h1>
            {isDevModeActive() && (
              <span className="text-xs bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded border border-yellow-500/30">
                DEV MODE
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/history')}
              title="Saved Plans"
            >
              <Heart className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/profile')}
              title="Profile"
            >
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Recent Searches */}
        {userId && (
          <RecentSearches 
            userId={userId} 
            onSelectPlan={handleSelectRecentPlan} 
          />
        )}

        {/* 4. CuisinePicker (section title: "Choose cuisine") */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Choose cuisine</h2>
          <CuisinePicker selected={cuisine} onSelect={(value) => setFilters({ cuisine: value })} />
        </div>

        {/* 5. ActivityPicker (section title: "Choose activity") */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Choose activity</h2>
          <ActivityPicker selected={activityCategory} onSelect={(value) => setFilters({ activityCategory: value })} />
        </div>

        {/* Location and Radius controls */}
        <div className="bg-card rounded-xl border p-6 mb-6 space-y-6">
          <LocationToggle
            mode={locationMode}
            zipCode={zipCode}
            onModeChange={(mode) => setFilters({ locationMode: mode })}
            onZipCodeChange={(value) => {
              setFilters({ zipCode: value });
              if (value.length === 5) {
                debouncedSaveLocation(radius, value);
              }
            }}
            onUseCurrentLocation={handleUseCurrentLocation}
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
<div className="mb-6 space-y-3">
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
  
  {/* Surprise Me Button */}
  <div className="text-center">
    <button
      onClick={handleSurpriseMe}
      disabled={loading}
      className="text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
    >
      <span className="text-lg">✨</span>
      <span>or let us surprise you</span>
    </button>
  </div>
</div>

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
      </div>
    </div>
  );
};

export default Index;
