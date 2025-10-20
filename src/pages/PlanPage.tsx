import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanCard } from "@/components/PlanCard";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { buildPlanFromIndices, scorePlaces } from "@/lib/planner";

// Temporary ZIP to lat/lng stub
const ZIP_COORDS: Record<string, { lat: number; lng: number }> = {
  "10001": { lat: 40.7506, lng: -73.9971 },
  "90210": { lat: 34.0901, lng: -118.4065 },
  "60601": { lat: 41.8857, lng: -87.6180 },
};

const PlanPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const swapDebounceRef = useRef<{ restaurant: boolean; activity: boolean }>({ restaurant: false, activity: false });

  // Get initial state from navigation
  const initialState = location.state as any;

  const [plan, setPlan] = useState<any>(initialState?.plan || null);
  const [restaurantResults, setRestaurantResults] = useState<any[]>(initialState?.restaurantResults || []);
  const [activityResults, setActivityResults] = useState<any[]>(initialState?.activityResults || []);
  const [restaurantIndex, setRestaurantIndex] = useState(initialState?.restaurantIndex || 0);
  const [activityIndex, setActivityIndex] = useState(initialState?.activityIndex || 0);
  const [nextRestaurantsToken, setNextRestaurantsToken] = useState<string | null>(initialState?.nextRestaurantsToken || null);
  const [nextActivitiesToken, setNextActivitiesToken] = useState<string | null>(initialState?.nextActivitiesToken || null);
  const [loading, setLoading] = useState(false);
  
  // Location data
  const [currentLocation] = useState<{ lat: number; lng: number } | null>(initialState?.currentLocation || null);
  const [locationMode] = useState<"gps" | "zip">(initialState?.locationMode || "gps");
  const [zipCode] = useState(initialState?.zipCode || "");
  const [radius] = useState(initialState?.radius || 5);
  const [cuisine] = useState(initialState?.cuisine || "Italian");
  const [activity] = useState(initialState?.activity || "live_music");
  const [userPreferences] = useState(initialState?.userPreferences || { cuisines: [], activities: [] });

  // Redirect if no plan data
  useEffect(() => {
    if (!plan) {
      toast({ 
        title: "No plan found", 
        description: "Please create a plan first",
        variant: "destructive" 
      });
      navigate("/");
    }
  }, [plan, navigate]);

  const handleSwapRestaurant = async () => {
    if (swapDebounceRef.current.restaurant) return;
    swapDebounceRef.current.restaurant = true;
    setTimeout(() => { swapDebounceRef.current.restaurant = false; }, 300);

    if (restaurantIndex + 1 < restaurantResults.length) {
      const newIndex = restaurantIndex + 1;
      setRestaurantIndex(newIndex);
      
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

    if (nextRestaurantsToken) {
      setLoading(true);
      try {
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
      setRestaurantIndex(0);
      
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
    if (swapDebounceRef.current.activity) return;
    swapDebounceRef.current.activity = true;
    setTimeout(() => { swapDebounceRef.current.activity = false; }, 300);

    if (activityIndex + 1 < activityResults.length) {
      const newIndex = activityIndex + 1;
      setActivityIndex(newIndex);
      
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

    if (nextActivitiesToken) {
      setLoading(true);
      try {
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
      setActivityIndex(0);
      
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

  const handleReroll = () => {
    // For now, just cycle through both
    handleSwapRestaurant();
    setTimeout(() => handleSwapActivity(), 100);
  };

  if (!plan) {
    return null;
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
          distances={{
            toRestaurant: plan.distanceToRestaurant || 0,
            toActivity: plan.distanceToActivity || 0,
            betweenPlaces: plan.distanceBetween || 0,
          }}
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
