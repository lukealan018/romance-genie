import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanCard } from "@/components/PlanCard";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { buildPlanFromIndices, scorePlaces } from "@/lib/planner";
import { usePlanStore } from "@/store/planStore";

// Temporary ZIP to lat/lng stub
const ZIP_COORDS: Record<string, { lat: number; lng: number }> = {
  "10001": { lat: 40.7506, lng: -73.9971 },
  "90210": { lat: 34.0901, lng: -118.4065 },
  "60601": { lat: 41.8857, lng: -87.6180 },
};

const PlanPage = () => {
  const navigate = useNavigate();
  const swapDebounceRef = useRef<{ restaurant: boolean; activity: boolean }>({ restaurant: false, activity: false });

  // Get state from global store
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
    userPreferences,
    setRestaurants,
    setActivities,
    setRestaurantIdx: setRestaurantIndex,
    setActivityIdx: setActivityIndex,
  } = usePlanStore();

  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<any>(null);

  // Redirect to home if no data available
  useEffect(() => {
    if (restaurantResults.length === 0 || activityResults.length === 0) {
      console.log('No plan data available, redirecting to home');
      navigate('/');
    }
  }, [restaurantResults, activityResults, navigate]);

  // Build plan from current indices whenever data changes
  useEffect(() => {
    if (restaurantResults.length > 0 && activityResults.length > 0 && lat !== null && lng !== null) {
      console.log('Building plan with:', { 
        restaurantCount: restaurantResults.length, 
        activityCount: activityResults.length,
        restaurantIndex,
        activityIndex 
      });
      
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
        activityIndex
      );
      
      console.log('Plan built:', newPlan);
      setPlan(newPlan);
    }
  }, [restaurantResults, activityResults, restaurantIndex, activityIndex, lat, lng, radius, userPreferences]);

  const handleSwapRestaurant = async () => {
    if (swapDebounceRef.current.restaurant) return;
    swapDebounceRef.current.restaurant = true;
    setTimeout(() => { swapDebounceRef.current.restaurant = false; }, 300);

    let searchLat: number, searchLng: number;
    if (locationMode === "gps") {
      if (lat === null || lng === null) return;
      searchLat = lat;
      searchLng = lng;
    } else {
      const coords = ZIP_COORDS[zipCode];
      if (!coords) return;
      searchLat = coords.lat;
      searchLng = coords.lng;
    }

    if (restaurantIndex + 1 < restaurantResults.length) {
      const newIndex = restaurantIndex + 1;
      setRestaurantIndex(newIndex);
      
      const newPlan = buildPlanFromIndices(
        { lat: searchLat, lng: searchLng, radius, restaurants: restaurantResults, activities: activityResults,
          preferences: userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 ? userPreferences : undefined },
        newIndex, activityIndex
      );
      setPlan(newPlan);
      return;
    }

    if (nextRestaurantsToken) {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('places-search', {
          body: { lat: searchLat, lng: searchLng, radiusMiles: radius, cuisine, pagetoken: nextRestaurantsToken }
        });
        if (error) throw error;

        const newRestaurants = [...restaurantResults, ...(data.items || [])];
        const sortedRestaurants = scorePlaces(newRestaurants, searchLat, searchLng, radius,
          userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 ? userPreferences : undefined, 'restaurant');
        
        setRestaurants(sortedRestaurants, data.nextPageToken || null);
        const newIndex = restaurantIndex + 1;
        setRestaurantIndex(newIndex);

        const newPlan = buildPlanFromIndices(
          { lat: searchLat, lng: searchLng, radius, restaurants: newRestaurants, activities: activityResults,
            preferences: userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 ? userPreferences : undefined },
          newIndex, activityIndex
        );
        setPlan(newPlan);
        toast({ title: "Success", description: "Loaded more restaurants!" });
      } catch (error) {
        toast({ title: "Error", description: "Failed to load more restaurants.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    } else {
      setRestaurantIndex(0);
      const newPlan = buildPlanFromIndices(
        { lat: searchLat, lng: searchLng, radius, restaurants: restaurantResults, activities: activityResults,
          preferences: userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 ? userPreferences : undefined },
        0, activityIndex
      );
      setPlan(newPlan);
    }
  };

  const handleSwapActivity = async () => {
    if (swapDebounceRef.current.activity) return;
    swapDebounceRef.current.activity = true;
    setTimeout(() => { swapDebounceRef.current.activity = false; }, 300);

    let searchLat: number, searchLng: number;
    if (locationMode === "gps") {
      if (lat === null || lng === null) return;
      searchLat = lat;
      searchLng = lng;
    } else {
      const coords = ZIP_COORDS[zipCode];
      if (!coords) return;
      searchLat = coords.lat;
      searchLng = coords.lng;
    }

    if (activityIndex + 1 < activityResults.length) {
      const newIndex = activityIndex + 1;
      setActivityIndex(newIndex);
      
      const newPlan = buildPlanFromIndices(
        { lat: searchLat, lng: searchLng, radius, restaurants: restaurantResults, activities: activityResults,
          preferences: userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 ? userPreferences : undefined },
        restaurantIndex, newIndex
      );
      setPlan(newPlan);
      return;
    }

    if (nextActivitiesToken) {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('activities-search', {
          body: { lat: searchLat, lng: searchLng, radiusMiles: radius, category: activityCategory, pagetoken: nextActivitiesToken }
        });
        if (error) throw error;

        const newActivities = [...activityResults, ...(data.items || [])];
        const sortedActivities = scorePlaces(newActivities, searchLat, searchLng, radius,
          userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 ? userPreferences : undefined, 'activity');
        
        setActivities(sortedActivities, data.nextPageToken || null);
        const newIndex = activityIndex + 1;
        setActivityIndex(newIndex);

        const newPlan = buildPlanFromIndices(
          { lat: searchLat, lng: searchLng, radius, restaurants: restaurantResults, activities: newActivities,
            preferences: userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 ? userPreferences : undefined },
          restaurantIndex, newIndex
        );
        setPlan(newPlan);
        toast({ title: "Success", description: "Loaded more activities!" });
      } catch (error) {
        toast({ title: "Error", description: "Failed to load more activities.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    } else {
      setActivityIndex(0);
      const newPlan = buildPlanFromIndices(
        { lat: searchLat, lng: searchLng, radius, restaurants: restaurantResults, activities: activityResults,
          preferences: userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 ? userPreferences : undefined },
        restaurantIndex, 0
      );
      setPlan(newPlan);
    }
  };

  const handleReroll = () => {
    // For now, just cycle through both
    handleSwapRestaurant();
    setTimeout(() => handleSwapActivity(), 100);
  };

  if (!plan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Your Plan</h1>
        </div>
      </header>

      {/* Content */}
      <div className="container max-w-2xl py-6 space-y-6">
        {/* Plan Card */}
        <PlanCard
          restaurant={plan.restaurant}
          activity={plan.activity}
          distances={plan.distances}
          onSwapRestaurant={handleSwapRestaurant}
          onSwapActivity={handleSwapActivity}
          onReroll={handleReroll}
          loading={loading}
          canSwapRestaurant={restaurantIndex + 1 < restaurantResults.length || !!nextRestaurantsToken}
          canSwapActivity={activityIndex + 1 < activityResults.length || !!nextActivitiesToken}
        />

        {/* Swap Buttons */}
        <div className="flex gap-4">
          <Button
            onClick={handleSwapRestaurant}
            disabled={loading || (!restaurantResults[restaurantIndex + 1] && !nextRestaurantsToken)}
            className="flex-1"
            variant="outline"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Swap Food"}
          </Button>
          <Button
            onClick={handleSwapActivity}
            disabled={loading || (!activityResults[activityIndex + 1] && !nextActivitiesToken)}
            className="flex-1"
            variant="outline"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Swap Activity"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PlanPage;
