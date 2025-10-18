import { useState } from "react";
import { Heart, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocationToggle } from "@/components/LocationToggle";
import { CuisinePicker } from "@/components/CuisinePicker";
import { RadiusSelector } from "@/components/RadiusSelector";
import { RestaurantCard } from "@/components/RestaurantCard";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Temporary ZIP to lat/lng stub (will be replaced with server geocoding)
const ZIP_COORDS: Record<string, { lat: number; lng: number }> = {
  "10001": { lat: 40.7506, lng: -73.9971 }, // NYC
  "90210": { lat: 34.0901, lng: -118.4065 }, // Beverly Hills
  "60601": { lat: 41.8857, lng: -87.6180 }, // Chicago
};

const Index = () => {
  const [locationMode, setLocationMode] = useState<"gps" | "zip">("gps");
  const [zipCode, setZipCode] = useState("");
  const [cuisine, setCuisine] = useState("Italian");
  const [radius, setRadius] = useState(5);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Error", description: "Geolocation is not supported by your browser", variant: "destructive" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        toast({ title: "Success", description: "Location detected! Ready to find date spots near you." });
      },
      (error) => {
        toast({ title: "Error", description: "Could not get your location. Please try ZIP code instead.", variant: "destructive" });
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
      const { data, error } = await supabase.functions.invoke('places-search', {
        body: { lat, lng, radiusMiles: radius, cuisine }
      });

      if (error) throw error;

      setResults(data.items || []);
      setNextPageToken(data.nextPageToken || null);
      setShowResults(true);
      toast({ title: "Success", description: `Found ${data.items?.length || 0} great spots for your date night!` });
    } catch (error) {
      console.error('Error fetching places:', error);
      toast({ title: "Error", description: "Failed to find restaurants. Please try again.", variant: "destructive" });
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

        const { data, error } = await supabase.functions.invoke('places-search', {
          body: { lat, lng, radiusMiles: radius, cuisine, pagetoken: nextPageToken }
        });

        if (error) throw error;

        setResults(data.items || []);
        setNextPageToken(data.nextPageToken || null);
        toast({ title: "Success", description: "Loaded more options!" });
      } catch (error) {
        console.error('Error fetching next page:', error);
        toast({ title: "Error", description: "Failed to load more restaurants.", variant: "destructive" });
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Perfect Spots for Tonight
              </h1>
              <p className="text-muted-foreground mt-1">
                {cuisine} restaurants within {radius} miles
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
              {results.map((restaurant, idx) => (
                <RestaurantCard key={idx} {...restaurant} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">
                No {cuisine} restaurants found within {radius} miles.
              </p>
              <Button onClick={() => setShowResults(false)} className="mt-4">
                Try Different Options
              </Button>
            </div>
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
          <LocationToggle
            mode={locationMode}
            zipCode={zipCode}
            onModeChange={setLocationMode}
            onZipCodeChange={setZipCode}
            onUseCurrentLocation={handleUseCurrentLocation}
          />

          <div className="h-px bg-border" />

          <CuisinePicker selected={cuisine} onSelect={setCuisine} />

          <div className="h-px bg-border" />

          <RadiusSelector value={radius} onChange={setRadius} />

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
