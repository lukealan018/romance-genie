import { useState } from "react";
import { Loader2, User, Calendar as CalendarIcon, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ModeSelection } from "@/components/ModeSelection";
import { HeroSection } from "@/components/hero-section";
import { ManualFilters } from "@/components/ManualFilters";
import { LocationDialog } from "@/components/LocationDialog";
import { WeatherWidget } from "@/components/WeatherWidget";
import { ProfileCompletionPrompt, useProfileCompletionPrompt } from "@/components/ProfileCompletionPrompt";
import { NotificationBell } from "@/components/NotificationBell";
import { DateSelector } from "@/components/DateSelector";
import { toast } from "@/hooks/use-toast";
import { usePlanStore } from "@/store/planStore";
import { useWeather } from "@/hooks/useWeather";
import { useAuthAndProfile } from "@/hooks/useAuthAndProfile";
import { usePlaceSearch } from "@/hooks/usePlaceSearch";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";

const Index = () => {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<any>(null);
  const [showPickers, setShowPickers] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);

  const {
    lat, lng, radius, cuisine, activityCategory, locationMode, zipCode,
    restaurants: restaurantResults, activities: activityResults,
    searchMode, searchDate, searchTime,
    setLocation, setFilters, resetPlan, setSearchDate,
  } = usePlanStore();

  // Custom hooks
  const auth = useAuthAndProfile();
  const weather = useWeather(auth.userId);
  const { shouldShowPrompt, markFirstRecommendationSeen, markCompletionPromptSeen } = useProfileCompletionPrompt();
  const search = usePlaceSearch(auth.userId, auth.saveLocationSettings, markFirstRecommendationSeen);
  
  const voice = useVoiceSearch({
    userId: auth.userId,
    searchMode,
    handleUseCurrentLocation: search.handleUseCurrentLocation,
    trackInteraction: search.trackInteraction,
    setPlan,
    onSearchSuccess: markFirstRecommendationSeen,
    navigate,
  });

  if (auth.isCheckingOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-2 mb-4">
          <WeatherWidget
            temperature={weather.profileWeatherData?.temperature}
            description={weather.profileWeatherData?.description}
            icon={weather.profileWeatherData?.icon}
            cityName={weather.profileWeatherData?.cityName}
            loading={weather.loadingProfileWeather}
            locationSource={weather.locationSource}
            onSwitchToGPS={weather.switchToGPS}
            onSwitchToHome={weather.switchToHome}
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
              onModeSelect={(mode) => usePlanStore.getState().setSearchMode(mode)}
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
                  usePlanStore.getState().setSearchMode(null);
                  setShowPickers(false);
                  resetPlan();
                }}
              >
                Change Mode
              </Button>
            </div>

            {/* Date/Time Selection */}
            <div className="mb-6">
              <DateSelector
                selectedDate={searchDate}
                selectedTime={searchTime}
                onDateChange={setSearchDate}
              />
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
                      auth.saveLocationSettings(radius, value, false);
                    }
                  }}
                  onRadiusChange={(value) => {
                    setFilters({ radius: value });
                    auth.saveLocationSettings(value, zipCode, false);
                  }}
                  onUseCurrentLocation={() => search.handleUseCurrentLocation(false)}
                  onSeePlan={search.handleSeePlan}
                />
              )}
            </HeroSection>
          </>
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

        {shouldShowPrompt && (
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
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
