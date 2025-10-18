import { useState } from "react";
import { Heart, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LocationToggle } from "@/components/LocationToggle";
import { CuisinePicker } from "@/components/CuisinePicker";
import { ActivityPicker } from "@/components/ActivityPicker";
import { RadiusSelector } from "@/components/RadiusSelector";
import { RestaurantCard } from "@/components/RestaurantCard";
import { ActivityCard } from "@/components/ActivityCard";
import { RestaurantDetailsDrawer } from "@/components/RestaurantDetailsDrawer";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{ id: string; name: string } | null>(null);

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
      const functionName = searchType === "restaurants" ? "places-search" : "activities-search";
      const params = searchType === "restaurants" 
        ? { lat, lng, radiusMiles: radius, cuisine }
        : { lat, lng, radiusMiles: radius, category: activity };
      
      console.log(`Calling ${functionName} with:`, params);
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: params
      });

      console.log(`Response from ${functionName}:`, { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (!data) {
        throw new Error(`No data returned from ${functionName}`);
      }

      const items = data.items || [];
      console.log(`Setting ${items.length} results`);
      
      setResults(items);
      setNextPageToken(data.nextPageToken || null);
      setShowResults(true);
      
      const itemType = searchType === "restaurants" ? "restaurants" : "activities";
      toast({ 
        title: items.length > 0 ? "Success" : "No Results", 
        description: items.length > 0 
          ? `Found ${items.length} great ${itemType} for your date night!` 
          : `No ${itemType} found within ${radius} miles. Try different options or a larger radius.`,
        variant: items.length > 0 ? "default" : "destructive"
      });
    } catch (error) {
      console.error('Error fetching places:', error);
      toast({ title: "Error", description: `Failed to find ${searchType}. Please try again.`, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleReroll = async () => {
    if (nextPageToken && currentLocation) {
      // Fetch next page
      setLoading(true);
      try {
        const { lat, lng } = locationMode === "gps" 
          ? currentLocation 
          : ZIP_COORDS[zipCode] || currentLocation;

        const functionName = searchType === "restaurants" ? "places-search" : "activities-search";
        const params = searchType === "restaurants" 
          ? { lat, lng, radiusMiles: radius, cuisine, pagetoken: nextPageToken }
          : { lat, lng, radiusMiles: radius, category: activity, pagetoken: nextPageToken };

        const { data, error } = await supabase.functions.invoke(functionName, {
          body: params
        });

        if (error) throw error;

        setResults(data.items || []);
        setNextPageToken(data.nextPageToken || null);
        toast({ title: "Success", description: "Loaded more options!" });
      } catch (error) {
        console.error('Error fetching next page:', error);
        toast({ title: "Error", description: "Failed to load more results.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    } else {
      // Shuffle existing results
      const shuffled = [...results].sort(() => Math.random() - 0.5);
      setResults(shuffled);
      toast({ title: "Success", description: "Refreshed your options!" });
    }
  };

  if (showResults) {
    const itemType = searchType === "restaurants" ? "restaurants" : "activities";
    const selectedCategory = searchType === "restaurants" ? cuisine : activity;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Perfect Spots for Tonight
              </h1>
              <p className="text-muted-foreground mt-1">
                {searchType === "restaurants" ? cuisine : activity.replace('_', ' ')} {itemType} within {radius} miles
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleReroll} variant="outline" size="icon" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </Button>
              <Button onClick={() => setShowResults(false)} variant="outline">
                Change Preferences
              </Button>
            </div>
          </div>

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
