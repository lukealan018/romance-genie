import { useState, useRef, useEffect } from "react";
import { Heart, RefreshCw, Loader2, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserId } from "@/hooks/use-user-id";
import { Button } from "@/components/ui/button";
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
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { buildPlan, buildPlanFromIndices, scorePlaces } from "@/lib/planner";

// Temporary ZIP to lat/lng stub (will be replaced with server geocoding)
const ZIP_COORDS: Record<string, { lat: number; lng: number }> = {
  "10001": { lat: 40.7506, lng: -73.9971 }, // NYC
  "90210": { lat: 34.0901, lng: -118.4065 }, // Beverly Hills
  "60601": { lat: 41.8857, lng: -87.6180 }, // Chicago
};

const Index = () => {
  const navigate = useNavigate();
  const userId = useUserId();
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const [searchType, setSearchType] = useState<"restaurants" | "activities">("restaurants");
  const [nickname, setNickname] = useState<string>("");
  const [showProfileBanner, setShowProfileBanner] = useState(false);
  const [userPreferences, setUserPreferences] = useState<{ cuisines: string[]; activities: string[] }>({ 
    cuisines: [], 
    activities: [] 
  });
  const [locationMode, setLocationMode] = useState<"gps" | "zip">("gps");
  const [zipCode, setZipCode] = useState("");
  const [cuisine, setCuisine] = useState("Italian");
  const [activity, setActivity] = useState("live_music");
  const [radius, setRadius] = useState(5);
  const [restaurantResults, setRestaurantResults] = useState<any[]>([]);
  const [activityResults, setActivityResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextRestaurantsToken, setNextRestaurantsToken] = useState<string | null>(null);
  const [nextActivitiesToken, setNextActivitiesToken] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{ id: string; name: string } | null>(null);
  const [plan, setPlan] = useState<any>(null);
  const [restaurantIndex, setRestaurantIndex] = useState(0);
  const [activityIndex, setActivityIndex] = useState(0);
  const swapDebounceRef = useRef<{ restaurant: boolean; activity: boolean }>({ restaurant: false, activity: false });

  // Check onboarding status and fetch profile on mount
  useEffect(() => {
    const hasOnboarded = localStorage.getItem("hasOnboarded");
    if (!hasOnboarded) {
      navigate("/onboarding");
    } else {
      setIsCheckingOnboarding(false);
      // Fetch profile
      fetchProfile();
    }
  }, [navigate, userId]);

  // Check if profile needs refresh (after edit)
  useEffect(() => {
    const needsRefresh = localStorage.getItem("profileNeedsRefresh");
    if (needsRefresh === "true") {
      localStorage.removeItem("profileNeedsRefresh");
      fetchProfile();
    }
  }, []);

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
  }, [zipCode, locationMode]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/profile`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'X-User-Id': userId,
          },
        }
      );

      if (response.status === 200) {
        const profile = await response.json();
        console.log('Profile loaded:', profile);
        
        // Prefill controls
        if (profile.home_zip) {
          setZipCode(profile.home_zip);
          setLocationMode("zip");
        }
        if (profile.default_radius_mi !== null && profile.default_radius_mi !== undefined) {
          setRadius(profile.default_radius_mi);
        }
        if (profile.cuisines && Array.isArray(profile.cuisines) && profile.cuisines.length > 0) {
          setCuisine(profile.cuisines[0]);
          setUserPreferences(prev => ({ ...prev, cuisines: profile.cuisines }));
        }
        if (profile.activities && Array.isArray(profile.activities) && profile.activities.length > 0) {
          setActivity(profile.activities[0]);
          setUserPreferences(prev => ({ ...prev, activities: profile.activities }));
        }
        if (profile.nickname) {
          setNickname(profile.nickname);
        }
      } else if (response.status === 404) {
        console.log('Profile not found');
        setShowProfileBanner(true);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
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
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
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
    let lat: number, lng: number;

    if (locationMode === "gps") {
      if (!currentLocation) {
        toast({ title: "Error", description: "Please get your current location first", variant: "destructive" });
        return;
      }
      lat = currentLocation.lat;
      lng = currentLocation.lng;
    } else {
      if (zipCode.length !== 5) {
        toast({ title: "Error", description: "Please enter a valid 5-digit ZIP code", variant: "destructive" });
        return;
      }
      const coords = ZIP_COORDS[zipCode];
      if (!coords) {
        toast({ title: "Error", description: "ZIP code not found. Try: 10001, 90210, or 60601", variant: "destructive" });
        return;
      }
      lat = coords.lat;
      lng = coords.lng;
    }

    setLoading(true);
    try {
      // Fetch both restaurants and activities in parallel
      const [restaurantsResponse, activitiesResponse] = await Promise.all([
        supabase.functions.invoke('places-search', {
          body: { lat, lng, radiusMiles: radius, cuisine }
        }),
        supabase.functions.invoke('activities-search', {
          body: { lat, lng, radiusMiles: radius, category: activity }
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
        lat, 
        lng, 
        radius, 
        userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 
          ? userPreferences 
          : undefined,
        'restaurant'
      );
      const sortedActivities = scorePlaces(
        activities, 
        lat, 
        lng, 
        radius, 
        userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 
          ? userPreferences 
          : undefined,
        'activity'
      );
      
      setRestaurantResults(sortedRestaurants);
      setActivityResults(sortedActivities);
      setNextRestaurantsToken(restaurantsResponse.data?.nextPageToken || null);
      setNextActivitiesToken(activitiesResponse.data?.nextPageToken || null);

      // Build the initial plan using the sorted arrays
      const initialPlan = buildPlan({
        lat,
        lng,
        radius,
        restaurants: sortedRestaurants,
        activities: sortedActivities,
        preferences: userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 
          ? userPreferences 
          : undefined,
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

    // If next item exists, advance index
    if (restaurantIndex + 1 < restaurantResults.length) {
      const newIndex = restaurantIndex + 1;
      setRestaurantIndex(newIndex);
      
      // Get coordinates based on location mode
      let lat: number, lng: number;
      if (locationMode === "gps") {
        if (!currentLocation) return;
        lat = currentLocation.lat;
        lng = currentLocation.lng;
      } else {
        const coords = ZIP_COORDS[zipCode];
        if (!coords) return;
        lat = coords.lat;
        lng = coords.lng;
      }
      
      const newPlan = buildPlanFromIndices(
        {
          lat,
          lng,
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
        // Get coordinates based on location mode
        let lat: number, lng: number;
        if (locationMode === "gps") {
          if (!currentLocation) {
            setLoading(false);
            return;
          }
          lat = currentLocation.lat;
          lng = currentLocation.lng;
        } else {
          const coords = ZIP_COORDS[zipCode];
          if (!coords) {
            setLoading(false);
            return;
          }
          lat = coords.lat;
          lng = coords.lng;
        }

        const { data, error } = await supabase.functions.invoke('places-search', {
          body: { lat, lng, radiusMiles: radius, cuisine, pagetoken: nextRestaurantsToken }
        });

        if (error) throw error;

        const newRestaurants = [...restaurantResults, ...(data.items || [])];
        
        // Re-sort the combined list
        const sortedRestaurants = scorePlaces(
          newRestaurants,
          lat,
          lng,
          radius,
          userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 
            ? userPreferences 
            : undefined,
          'restaurant'
        );
        
        setRestaurantResults(sortedRestaurants);
        setNextRestaurantsToken(data.nextPageToken || null);
        
        const newIndex = restaurantIndex + 1;
        setRestaurantIndex(newIndex);

        const newPlan = buildPlanFromIndices(
          {
            lat,
            lng,
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
      
      // Get coordinates based on location mode
      let lat: number, lng: number;
      if (locationMode === "gps") {
        if (!currentLocation) return;
        lat = currentLocation.lat;
        lng = currentLocation.lng;
      } else {
        const coords = ZIP_COORDS[zipCode];
        if (!coords) return;
        lat = coords.lat;
        lng = coords.lng;
      }
      
      const newPlan = buildPlanFromIndices(
        {
          lat,
          lng,
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

    // Simple linear progression through the activity list
    if (activityIndex + 1 < activityResults.length) {
      const newIndex = activityIndex + 1;
      setActivityIndex(newIndex);
      
      // Get coordinates based on location mode
      let lat: number, lng: number;
      if (locationMode === "gps") {
        if (!currentLocation) return;
        lat = currentLocation.lat;
        lng = currentLocation.lng;
      } else {
        const coords = ZIP_COORDS[zipCode];
        if (!coords) return;
        lat = coords.lat;
        lng = coords.lng;
      }
      
      const newPlan = buildPlanFromIndices(
        {
          lat,
          lng,
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
        // Get coordinates based on location mode
        let lat: number, lng: number;
        if (locationMode === "gps") {
          if (!currentLocation) {
            setLoading(false);
            return;
          }
          lat = currentLocation.lat;
          lng = currentLocation.lng;
        } else {
          const coords = ZIP_COORDS[zipCode];
          if (!coords) {
            setLoading(false);
            return;
          }
          lat = coords.lat;
          lng = coords.lng;
        }

        const { data, error } = await supabase.functions.invoke('activities-search', {
          body: { lat, lng, radiusMiles: radius, category: activity, pagetoken: nextActivitiesToken }
        });

        if (error) throw error;

        const newActivities = [...activityResults, ...(data.items || [])];
        
        // Re-sort the combined list
        const sortedActivities = scorePlaces(
          newActivities,
          lat,
          lng,
          radius,
          userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 
            ? userPreferences 
            : undefined,
          'activity'
        );
        
        setActivityResults(sortedActivities);
        setNextActivitiesToken(data.nextPageToken || null);
        
        const newIndex = activityIndex + 1;
        setActivityIndex(newIndex);

        const newPlan = buildPlanFromIndices(
          {
            lat,
            lng,
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
      
      // Get coordinates based on location mode
      let lat: number, lng: number;
      if (locationMode === "gps") {
        if (!currentLocation) return;
        lat = currentLocation.lat;
        lng = currentLocation.lng;
      } else {
        const coords = ZIP_COORDS[zipCode];
        if (!coords) return;
        lat = coords.lat;
        lng = coords.lng;
      }
      
      const newPlan = buildPlanFromIndices(
        {
          lat,
          lng,
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
    let lat: number, lng: number;

    if (locationMode === "gps") {
      if (!currentLocation) {
        toast({ title: "Error", description: "Location not available", variant: "destructive" });
        return;
      }
      lat = currentLocation.lat;
      lng = currentLocation.lng;
    } else {
      const coords = ZIP_COORDS[zipCode];
      if (!coords) {
        toast({ title: "Error", description: "Invalid ZIP code", variant: "destructive" });
        return;
      }
      lat = coords.lat;
      lng = coords.lng;
    }

    setLoading(true);
    try {
      // Fetch both from page 1 (no pagetoken)
      const [restaurantsResponse, activitiesResponse] = await Promise.all([
        supabase.functions.invoke('places-search', {
          body: { lat, lng, radiusMiles: radius, cuisine }
        }),
        supabase.functions.invoke('activities-search', {
          body: { lat, lng, radiusMiles: radius, category: activity }
        })
      ]);

      if (restaurantsResponse.error) throw restaurantsResponse.error;
      if (activitiesResponse.error) throw activitiesResponse.error;

      const restaurants = restaurantsResponse.data?.items || [];
      const activities = activitiesResponse.data?.items || [];
      
      // Sort results by preference-based scoring before storing
      const sortedRestaurants = scorePlaces(
        restaurants,
        lat,
        lng,
        radius,
        userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 
          ? userPreferences 
          : undefined,
        'restaurant'
      );
      const sortedActivities = scorePlaces(
        activities,
        lat,
        lng,
        radius,
        userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 
          ? userPreferences 
          : undefined,
        'activity'
      );
      
      setRestaurantResults(sortedRestaurants);
      setActivityResults(sortedActivities);
      setNextRestaurantsToken(restaurantsResponse.data?.nextPageToken || null);
      setNextActivitiesToken(activitiesResponse.data?.nextPageToken || null);

      // Build fresh plan to determine which items to show
      const freshPlan = buildPlan({
        lat,
        lng,
        radius,
        restaurants,
        activities,
        preferences: userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 
          ? userPreferences 
          : undefined,
      });

      // Find the indices of the selected restaurant and activity
      const selectedRestaurantIndex = freshPlan.restaurant 
        ? restaurants.findIndex(r => r.id === freshPlan.restaurant?.id)
        : 0;
      const selectedActivityIndex = freshPlan.activity
        ? activities.findIndex(a => a.id === freshPlan.activity?.id)
        : 0;

      // Set indices to match what was actually selected
      setRestaurantIndex(selectedRestaurantIndex >= 0 ? selectedRestaurantIndex : 0);
      setActivityIndex(selectedActivityIndex >= 0 ? selectedActivityIndex : 0);
      
      setPlan(freshPlan);
      toast({ 
        title: "New Plan!", 
        description: "Found fresh options for your date night!",
      });
    } catch (error) {
      console.error('Error rerolling plan:', error);
      toast({ title: "Error", description: "Failed to refresh plan. Please try again.", variant: "destructive" });
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
    
    if (relevantToken && currentLocation) {
      // Fetch next page
      setLoading(true);
      try {
        const { lat, lng } = locationMode === "gps" 
          ? currentLocation 
          : ZIP_COORDS[zipCode] || currentLocation;

        const functionName = searchType === "restaurants" ? "places-search" : "activities-search";
        const params = searchType === "restaurants" 
          ? { lat, lng, radiusMiles: radius, cuisine, pagetoken: relevantToken }
          : { lat, lng, radiusMiles: radius, category: activity, pagetoken: relevantToken };

        const { data, error } = await supabase.functions.invoke(functionName, {
          body: params
        });

        if (error) throw error;

        if (searchType === "restaurants") {
          setRestaurantResults(data.items || []);
          setRestaurantIndex(0);
          setNextRestaurantsToken(data.nextPageToken || null);
        } else {
          setActivityResults(data.items || []);
          setActivityIndex(0);
          setNextActivitiesToken(data.nextPageToken || null);
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
        setRestaurantResults(shuffled);
        setRestaurantIndex(0);
      } else {
        const shuffled = [...activityResults].sort(() => Math.random() - 0.5);
        setActivityResults(shuffled);
        setActivityIndex(0);
      }
      toast({ title: "Success", description: "Refreshed your options!" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container max-w-2xl mx-auto px-4 py-8">
        {/* 1. Header with small title + Profile icon (top-right) */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Date Night Planner</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/profile')}
          >
            <User className="w-5 h-5" />
          </Button>
        </div>

        {/* 2. PlanCard (only if a plan exists) */}
        {plan && (
          <div className="mb-6">
            <PlanCard
              restaurant={plan.restaurant}
              activity={plan.activity}
              distances={plan.distances}
              onSwapRestaurant={handleSwapRestaurant}
              onSwapActivity={handleSwapActivity}
              onReroll={handleRerollPlan}
              loading={loading}
              canSwapRestaurant={restaurantResults.length > 1}
              canSwapActivity={activityResults.length > 1}
            />
          </div>
        )}

        {/* 3. Swap row: [Swap Food] [Swap Activity] (centered, equal size buttons) */}
        {plan && (
          <div className="flex gap-3 justify-center mb-6">
            <Button
              onClick={handleSwapRestaurant}
              disabled={loading || restaurantResults.length <= 1}
              className="flex-1 max-w-[200px]"
              variant="outline"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Swap Food"}
            </Button>
            <Button
              onClick={handleSwapActivity}
              disabled={loading || activityResults.length <= 1}
              className="flex-1 max-w-[200px]"
              variant="outline"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Swap Activity"}
            </Button>
          </div>
        )}

        {/* 4. CuisinePicker (section title: "Choose cuisine") */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Choose cuisine</h2>
          <CuisinePicker selected={cuisine} onSelect={setCuisine} />
        </div>

        {/* 5. ActivityPicker (section title: "Choose activity") */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Choose activity</h2>
          <ActivityPicker selected={activity} onSelect={setActivity} />
        </div>

        {/* Location and Radius controls */}
        <div className="bg-card rounded-xl border p-6 mb-6 space-y-6">
          <LocationToggle
            mode={locationMode}
            zipCode={zipCode}
            onModeChange={setLocationMode}
            onZipCodeChange={setZipCode}
            onUseCurrentLocation={handleUseCurrentLocation}
            locationDetected={!!currentLocation}
            gettingLocation={gettingLocation}
          />
          <div className="h-px bg-border" />
          <RadiusSelector value={radius} onChange={setRadius} />
        </div>

        {/* Search Button */}
        <Button onClick={handleFindPlaces} size="lg" className="w-full mb-6" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Finding Spots...
            </>
          ) : (
            "Find Perfect Spots"
          )}
        </Button>

        {/* 6. ResultsList (section title: "More options") */}
        {(restaurantResults.length > 0 || activityResults.length > 0) && (
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

            {searchType === "restaurants" && restaurantResults.length > 0 && (
              <div className="grid grid-cols-1 gap-4">
                {restaurantResults.map((item, idx) => (
                  <RestaurantCard 
                    key={idx} 
                    {...item}
                    onClick={() => setSelectedPlace({ id: item.id, name: item.name })}
                  />
                ))}
              </div>
            )}

            {searchType === "activities" && activityResults.length > 0 && (
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
