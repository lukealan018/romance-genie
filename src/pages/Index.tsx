import { useState } from "react";
import { Heart, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocationToggle } from "@/components/LocationToggle";
import { CuisinePicker } from "@/components/CuisinePicker";
import { RadiusSelector } from "@/components/RadiusSelector";
import { RestaurantCard } from "@/components/RestaurantCard";
import { toast } from "sonner";

// Mock data for demonstration
const mockRestaurants = [
  { name: "Bella Notte", cuisine: "Italian", rating: 4.7, distance: 2.3, priceLevel: "$$" },
  { name: "Sakura Sushi", cuisine: "Japanese", rating: 4.8, distance: 1.8, priceLevel: "$$$" },
  { name: "La Taqueria", cuisine: "Mexican", rating: 4.6, distance: 3.1, priceLevel: "$" },
  { name: "Golden Wok", cuisine: "Chinese", rating: 4.5, distance: 2.7, priceLevel: "$$" },
  { name: "Thai Basil", cuisine: "Thai", rating: 4.9, distance: 1.5, priceLevel: "$$" },
  { name: "The Steakhouse", cuisine: "American", rating: 4.4, distance: 4.2, priceLevel: "$$$" },
];

const Index = () => {
  const [locationMode, setLocationMode] = useState<"gps" | "zip">("gps");
  const [zipCode, setZipCode] = useState("");
  const [cuisine, setCuisine] = useState("Italian");
  const [radius, setRadius] = useState(5);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState(mockRestaurants);

  const handleUseCurrentLocation = () => {
    toast.success("Location detected! Ready to find date spots near you.");
  };

  const handleFindPlaces = () => {
    if (locationMode === "zip" && zipCode.length !== 5) {
      toast.error("Please enter a valid 5-digit ZIP code");
      return;
    }
    
    // Filter mock data by selected cuisine
    const filtered = mockRestaurants
      .filter((r) => r.cuisine === cuisine)
      .filter((r) => r.distance <= radius);
    
    setResults(filtered);
    setShowResults(true);
    toast.success(`Found ${filtered.length} great spots for your date night!`);
  };

  const handleReroll = () => {
    const shuffled = [...results].sort(() => Math.random() - 0.5);
    setResults(shuffled);
    toast.success("Refreshed your options!");
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
              <Button onClick={handleReroll} variant="outline" size="icon">
                <RefreshCw className="w-4 h-4" />
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

          <Button onClick={handleFindPlaces} size="lg" className="w-full">
            Find Perfect Spots
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
