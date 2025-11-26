import { useState, useRef } from "react";
import { Loader2, User, Calendar as CalendarIcon, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ModeSelection } from "@/components/ModeSelection";
import { HeroSection } from "@/components/hero-section";
import { ManualFilters } from "@/components/ManualFilters";
import { ResultsList } from "@/components/ResultsList";
import { RestaurantDetailsDrawer } from "@/components/RestaurantDetailsDrawer";
import { LocationDialog } from "@/components/LocationDialog";
import { WeatherWidget } from "@/components/WeatherWidget";
import { ProfileCompletionPrompt, useProfileCompletionPrompt } from "@/components/ProfileCompletionPrompt";
import { NotificationBell } from "@/components/NotificationBell";
import { toast } from "@/hooks/use-toast";
import { usePlanStore } from "@/store/planStore";
import { useWeather } from "@/hooks/useWeather";
import { useAuthAndProfile } from "@/hooks/useAuthAndProfile";
import { usePlaceSearch } from "@/hooks/usePlaceSearch";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";

const Index = () => {
  const navigate = useNavigate();
  const [selectedPlace, setSelectedPlace] = useState<{ id: string; name: string } | null>(null);
  const [plan, setPlan] = useState<any>(null);
  const [showPickers, setShowPickers] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false);
  const locationSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    lat, lng, radius, cuisine, activityCategory, locationMode, zipCode,
    restaurants: restaurantResults, activities: activityResults,
    searchMode, setLocation, setFilters, resetPlan,
  } = usePlanStore();

  // Custom hooks
  const auth = useAuthAndProfile();
  const weather = useWeather(auth.userId);
  const search = usePlaceSearch(auth.userId, auth.saveLocationSettings);
  
  const voice = useVoiceSearch({
    userId: auth.userId,
    userPreferences: usePlanStore.getState().userPreferences,
    searchMode,
    handleUseCurrentLocation: search.handleUseCurrentLocation,
    trackInteraction: search.trackInteraction,
    setLoading: () => {},
    setPlan,
  });

  const { shouldShowPrompt, markFirstRecommendationSeen, markCompletionPromptSeen } = useProfileCompletionPrompt();

  const debouncedSaveLocation = (radiusVal: number, zipCodeVal: string) => {
    if (locationSaveTimeoutRef.current) {
      clearTimeout(locationSaveTimeoutRef.current);
    }
    locationSaveTimeoutRef.current = setTimeout(() => {
      auth.saveLocationSettings(radiusVal, zipCodeVal, false);
    }, 2000);
  };

  if (auth.isCheckingOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {searchMode && (
        <div className="fixed top-20 right-4 z-50 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="text-xs font-medium">Current Mode:</div>
          <div className="text-sm font-bold">
            {searchMode === 'both' && '🍽️ + 🎉 Both'}
            {searchMode === 'restaurant_only' && '🍽️ Restaurant Only'}
            {searchMode === 'activity_only' && '🎉 Activity Only'}
          </div>
        </div>
      )}
      
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-2 mb-4">
          <WeatherWidget
            temperature={weather.profileWeatherData?.temperature}
            description={weather.profileWeatherData?.description}
            icon={weather.profileWeatherData?.icon}
            cityName={weather.profileWeatherData?.cityName}
            loading={weather.loadingProfileWeather}
            onRefresh={weather.handleWeatherRefresh}
          />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/history')} title="Saved Plans">
              <Heart className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/calendar')} title="Calendar">
              <CalendarIcon className="w-5 h-5" />
            </Button>
            <NotificationBell />
            <Button variant="ghost" size="icon" onClick={() => navigate('/profile')} title="Profile">
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {!searchMode && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <ModeSelection 
              selectedMode={searchMode}
              onModeSelect={(mode) => setFilters({ searchMode: mode })}
            />
          </motion.div>
        )}

        {searchMode && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {searchMode === 'both' && "🍽️ + 🎉 Full Date Night"}
                  {searchMode === 'restaurant_only' && "🍽️ Just Dinner"}
                  {searchMode === 'activity_only' && "🎉 Just Activity"}
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setFilters({ searchMode: null });
                  setShowPickers(false);
                  resetPlan();
                }}
              >
                Change Mode
              </Button>
            </div>

            <HeroSection
              userName={auth.nickname}
              isLoggedIn={!!auth.userId}
              loading={search.loading || voice.isProcessing}
              isListening={voice.isListening}
              onVoiceInput={voice.startListening}
              onSurpriseMe={search.handleSurpriseMe}
              onTogglePickers={() => setShowPickers(!showPickers)}
              showPickers={showPickers}
              searchMode={searchMode}
            >
              {showPickers && (
                <ManualFilters
                  searchMode={searchMode}
                  cuisine={cuisine}
                  activityCategory={activityCategory}
                  locationMode={locationMode}
                  zipCode={zipCode}
                  radius={radius}
                  lat={lat}
                  lng={lng}
                  loading={search.loading}
                  gettingLocation={search.gettingLocation}
                  onCuisineChange={(value) => setFilters({ cuisine: value })}
                  onActivityChange={(value) => setFilters({ activityCategory: value })}
                  onLocationModeChange={(mode) => {
                    setLocation(null, null);
                    setFilters({ locationMode: mode });
                    resetPlan();
                    toast({
                      title: mode === "gps" ? "Switched to GPS" : "Switched to ZIP Code",
                      description: mode === "gps" ? "Click 'Get Current Location' to use GPS" : "Enter your ZIP code to continue",
                    });
                  }}
                  onZipCodeChange={(value) => {
                    setFilters({ zipCode: value });
                    if (value.length === 5) {
                      debouncedSaveLocation(radius, value);
                    }
                  }}
                  onRadiusChange={(value) => {
                    setFilters({ radius: value });
                    debouncedSaveLocation(value, zipCode);
                  }}
                  onUseCurrentLocation={() => search.handleUseCurrentLocation(false)}
                  onSeePlan={search.handleSeePlan}
                />
              )}
            </HeroSection>
          </>
        )}

        <ResultsList
          loading={search.loading}
          searchType={search.searchType}
          onSearchTypeChange={search.setSearchType}
          restaurants={restaurantResults}
          activities={activityResults}
          radius={radius}
          cuisine={cuisine}
          onReroll={search.handleRerollPlan}
          onSelectPlace={setSelectedPlace}
          onWidenRadius={() => {
            const newRadius = Math.min(radius + 5, 25);
            setFilters({ radius: newRadius });
            toast({ title: "Radius updated", description: `Searching within ${newRadius} miles` });
          }}
          onSwitchCuisine={() => {
            const cuisines = ["Italian", "Mexican", "Japanese", "Chinese", "Thai", "American", "Indian", "French", "Mediterranean"];
            const currentIndex = cuisines.indexOf(cuisine);
            const nextCuisine = cuisines[(currentIndex + 1) % 9];
            setFilters({ cuisine: nextCuisine });
          }}
        />

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
            toast({ title: "Location Saved", description: `Set to ${zip} with ${radiusValue} mile radius` });
          }}
          onUseGPS={async () => {
            try {
              await search.handleUseCurrentLocation(false);
              toast({ title: "Location Updated", description: "Using your current GPS location" });
            } catch (error) {
              toast({ title: "Location Access Denied", description: "Please allow location access or enter a ZIP code", variant: "destructive" });
            }
          }}
        />

        {showCompletionPrompt && (
          <ProfileCompletionPrompt
            userName={auth.nickname}
            hasProfilePicture={!!auth.profileData?.profile_picture_url}
            hasVoicePreferences={!!auth.profileData?.voice_notes}
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
