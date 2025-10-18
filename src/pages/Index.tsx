import { useState, useRef } from "react";
import { Heart, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { buildPlan, buildPlanFromIndices } from "@/lib/planner";

// Temporary ZIP to lat/lng stub (will be replaced with server geocoding)
const ZIP_COORDS: Record<string, { lat: number; lng: number }> = {
  "10001": { lat: 40.7506, lng: -73.9971 }, // NYC
  "90210": { lat: 34.0901, lng: -118.4065 }, // Beverly Hills
  "60601": { lat: 41.8857, lng: -87.6180 }, // Chicago
};

const Index = () => {
  const [searchType, setSearchType] = useState<"restaurants" | "activities">("restaurants");
  const [locationMode, setLocationMode] = useState<"gps" | "zip">("gps");
  const [zipCode, setZipCode] = useState("");
  const [cuisine, setCuisine] = useState("Italian");
  const [activity, setActivity] = useState("live_music");
  const [radius, setRadius] = useState(5);
  const [showResults, setShowResults] = useState(false);
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
      
      setRestaurantResults(restaurants);
      setActivityResults(activities);
      setNextRestaurantsToken(restaurantsResponse.data?.nextPageToken || null);
      setNextActivitiesToken(activitiesResponse.data?.nextPageToken || null);

      // Build the initial plan to determine which items to show
      const initialPlan = buildPlan({
        lat,
        lng,
        radius,
        restaurants,
        activities,
      });

      // Find the indices of the selected restaurant and activity
      const selectedRestaurantIndex = initialPlan.restaurant 
        ? restaurants.findIndex(r => r.id === initialPlan.restaurant?.id)
        : 0;
      const selectedActivityIndex = initialPlan.activity
        ? activities.findIndex(a => a.id === initialPlan.activity?.id)
        : 0;

      // Set indices to match what was actually selected
      setRestaurantIndex(selectedRestaurantIndex >= 0 ? selectedRestaurantIndex : 0);
      setActivityIndex(selectedActivityIndex >= 0 ? selectedActivityIndex : 0);
      
      setPlan(initialPlan);
      setShowResults(true);
      
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
      
      if (currentLocation) {
        const newPlan = buildPlanFromIndices(
          {
            lat: currentLocation.lat,
            lng: currentLocation.lng,
            radius,
            restaurants: restaurantResults,
            activities: activityResults,
          },
          newIndex,
          activityIndex
        );
        setPlan(newPlan);
      }
      return;
    }

    // No next item: if we have a token, fetch next page and append
    if (nextRestaurantsToken && currentLocation) {
      setLoading(true);
      try {
        const { lat, lng } = locationMode === "gps" 
          ? currentLocation 
          : ZIP_COORDS[zipCode] || currentLocation;

        const { data, error } = await supabase.functions.invoke('places-search', {
          body: { lat, lng, radiusMiles: radius, cuisine, pagetoken: nextRestaurantsToken }
        });

        if (error) throw error;

        const newRestaurants = [...restaurantResults, ...(data.items || [])];
        setRestaurantResults(newRestaurants);
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
      
      if (currentLocation) {
        const newPlan = buildPlanFromIndices(
          {
            lat: currentLocation.lat,
            lng: currentLocation.lng,
            radius,
            restaurants: restaurantResults,
            activities: activityResults,
          },
          0,
          activityIndex
        );
        setPlan(newPlan);
      }
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
      
      if (currentLocation) {
        const newPlan = buildPlanFromIndices(
          {
            lat: currentLocation.lat,
            lng: currentLocation.lng,
            radius,
            restaurants: restaurantResults,
            activities: activityResults,
          },
          restaurantIndex,
          newIndex
        );
        setPlan(newPlan);
      }
      return;
    }

    // No next item: if we have a token, fetch next page and append
    if (nextActivitiesToken && currentLocation) {
      setLoading(true);
      try {
        const { lat, lng } = locationMode === "gps" 
          ? currentLocation 
          : ZIP_COORDS[zipCode] || currentLocation;

        const { data, error } = await supabase.functions.invoke('activities-search', {
          body: { lat, lng, radiusMiles: radius, category: activity, pagetoken: nextActivitiesToken }
        });

        if (error) throw error;

        const newActivities = [...activityResults, ...(data.items || [])];
        setActivityResults(newActivities);
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
      
      if (currentLocation) {
        const newPlan = buildPlanFromIndices(
          {
            lat: currentLocation.lat,
            lng: currentLocation.lng,
            radius,
            restaurants: restaurantResults,
            activities: activityResults,
          },
          restaurantIndex,
          0
        );
        setPlan(newPlan);
      }
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
      
      setRestaurantResults(restaurants);
      setActivityResults(activities);
      setNextRestaurantsToken(restaurantsResponse.data?.nextPageToken || null);
      setNextActivitiesToken(activitiesResponse.data?.nextPageToken || null);

      // Build fresh plan to determine which items to show
      const freshPlan = buildPlan({
        lat,
        lng,
        radius,
        restaurants,
        activities,
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

  if (showResults) {
    const results = searchType === "restaurants" ? restaurantResults : activityResults;
    const itemType = searchType === "restaurants" ? "restaurants" : "activities";
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Your Date Night Options
              </h1>
              <p className="text-muted-foreground mt-1">
                {cuisine} & {activity.replace('_', ' ')} within {radius} miles
              </p>
            </div>
            <Button onClick={() => setShowResults(false)} variant="outline">
              Change Preferences
            </Button>
          </div>

          {/* Empty State Warning */}
          {(restaurantResults.length === 0 || activityResults.length === 0) && (
            <div className="bg-card border border-border rounded-xl p-6 mb-6">
              <div className="text-center space-y-4">
                <div className="text-xl font-semibold text-foreground">
                  {restaurantResults.length === 0 && activityResults.length === 0 
                    ? "No restaurants or activities found"
                    : restaurantResults.length === 0 
                    ? "No restaurants found"
                    : "No activities found"}
                </div>
                <p className="text-muted-foreground">
                  Try these options to find more results:
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={() => {
                      setRadius(radius + 5);
                      handleRerollPlan();
                    }}
                    variant="outline"
                  >
                    Widen radius to {radius + 5} miles
                  </Button>
                  <Button onClick={() => setShowResults(false)} variant="outline">
                    Try different {restaurantResults.length === 0 ? "cuisine" : "activity"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Tonight's Plan Card */}
          {plan && restaurantResults.length > 0 && activityResults.length > 0 && (
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
          )}

          {/* Tab navigation for browsing all options */}
          <Tabs value={searchType} onValueChange={(v) => setSearchType(v as "restaurants" | "activities")} className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="restaurants">All Restaurants ({restaurantResults.length})</TabsTrigger>
                <TabsTrigger value="activities">All Activities ({activityResults.length})</TabsTrigger>
              </TabsList>
              <Button onClick={handleReroll} variant="outline" size="icon" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </Button>
            </div>
          </Tabs>

          {results.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {results.map((item, idx) => (
                searchType === "restaurants" ? (
                  <RestaurantCard 
                    key={idx} 
                    {...item}
                    onClick={() => setSelectedPlace({ id: item.id, name: item.name })}
                  />
                ) : (
                  <ActivityCard 
                    key={idx} 
                    {...item}
                    onClick={() => setSelectedPlace({ id: item.id, name: item.name })}
                  />
                )
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">
                No {itemType} found within {radius} miles.
              </p>
              <Button onClick={() => setShowResults(false)} className="mt-4">
                Try Different Options
              </Button>
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
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent mb-4">
            <Heart className="w-8 h-8 text-primary-foreground fill-current" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Date Night Planner
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Discover the perfect spot for your next date. Let us help you create memorable moments.
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-lg border p-6 md:p-8 space-y-8">
          <Tabs value={searchType} onValueChange={(v) => setSearchType(v as "restaurants" | "activities")}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="restaurants">Restaurants</TabsTrigger>
              <TabsTrigger value="activities">Activities</TabsTrigger>
            </TabsList>

            <TabsContent value="restaurants" className="space-y-8 mt-0">
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

              <CuisinePicker selected={cuisine} onSelect={setCuisine} />

              <div className="h-px bg-border" />

              <RadiusSelector value={radius} onChange={setRadius} />
            </TabsContent>

            <TabsContent value="activities" className="space-y-8 mt-0">
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

              <ActivityPicker selected={activity} onSelect={setActivity} />

              <div className="h-px bg-border" />

              <RadiusSelector value={radius} onChange={setRadius} />
            </TabsContent>
          </Tabs>

          <Button onClick={handleFindPlaces} size="lg" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Finding Spots...
              </>
            ) : (
              "Find Perfect Spots"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
