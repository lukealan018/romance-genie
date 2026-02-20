import { useState } from "react";
import { Loader2, User, Calendar as CalendarIcon, Heart, Utensils, Sparkles } from "lucide-react";
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
import { FloatingPlanAheadButton } from "@/components/FloatingPlanAheadButton";
import { PlanAheadDialog } from "@/components/PlanAheadDialog";
import { DateChoiceDialog } from "@/components/DateChoiceDialog";
import { NextAvailableDateDialog } from "@/components/NextAvailableDateDialog";
import { ClarificationChips } from "@/components/ClarificationChips";

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
  const [isPlanAheadOpen, setIsPlanAheadOpen] = useState(false);

  const {
    lat, lng, radius, cuisine, activityCategory, priceLevel, locationMode, zipCode,
    restaurants: restaurantResults, activities: activityResults,
    searchMode, searchDate, searchTime, venueType,
    setLocation, setFilters, resetPlan, setSearchDate, clearSearchDateTime, setVenueType,
  } = usePlanStore();

  // Custom hooks
  const auth = useAuthAndProfile();
  const weather = useWeather(auth.userId);
  const { shouldShowPrompt, markFirstRecommendationSeen, markCompletionPromptSeen } = useProfileCompletionPrompt();
  const search = usePlaceSearch(auth.userId, auth.saveLocationSettings, markFirstRecommendationSeen);
  
  const {
    isListening,
    isProcessing,
    transcript,
    startListening,
    showDateChoice,
    dateChoiceOptions,
    handleDateChoice,
    closeDateChoice,
    showClarification,
    clarificationOptions,
    handleClarificationSelect,
    closeClarification,
  } = useVoiceSearch({
    userId: auth.userId,
    searchMode,
    handleUseCurrentLocation: search.handleUseCurrentLocation,
    trackInteraction: search.trackInteraction,
    setPlan,
    onSearchSuccess: markFirstRecommendationSeen,
    navigate,
    currentWeather: weather.profileWeatherData ? {
      temperature: weather.profileWeatherData.temperature,
      description: weather.profileWeatherData.description,
      isRaining: weather.profileWeatherData.description?.toLowerCase().includes('rain') ||
        weather.profileWeatherData.description?.toLowerCase().includes('storm') ||
        weather.profileWeatherData.description?.toLowerCase().includes('drizzle'),
    } : null,
  });

  if (auth.isCheckingOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="themed-page-bg min-h-screen">
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
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/history')} 
              title="Saved Plans"
              className="header-icon hover:bg-transparent"
            >
              <Heart className="w-6 h-6" style={{ color: 'var(--header-icon-color)', filter: 'drop-shadow(var(--header-icon-glow))' }} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/calendar')} 
              title="Calendar"
              className="header-icon hover:bg-transparent"
            >
              <CalendarIcon className="w-6 h-6" style={{ color: 'var(--header-icon-color)', filter: 'drop-shadow(var(--header-icon-glow))' }} />
            </Button>
            <NotificationBell />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/profile')} 
              title="Profile"
              className="header-icon hover:bg-transparent"
            >
              <User className="w-6 h-6" style={{ color: 'var(--header-icon-color)', filter: 'drop-shadow(var(--header-icon-glow))' }} />
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
            <div className="flex items-center justify-between mt-4 mb-6">
              {/* Date mode indicator */}
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--chip-text)' }}>
                {searchMode === 'both' && (
                  <>
                    <Utensils className="w-4 h-4" style={{ color: 'var(--header-icon-color)' }} strokeWidth={2} />
                    <span>Full Date Night</span>
                  </>
                )}
                {searchMode === 'restaurant_only' && (
                  <>
                    <Utensils className="w-4 h-4" style={{ color: 'var(--header-icon-color)' }} strokeWidth={2} />
                    <span>Just Dinner</span>
                  </>
                )}
                {searchMode === 'activity_only' && (
                  <>
                    <Sparkles className="w-4 h-4" style={{ color: 'var(--header-icon-color)' }} strokeWidth={2} />
                    <span>Just Activity</span>
                  </>
                )}
              </div>
              {/* Change Mode button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => usePlanStore.getState().setSearchMode(null)}
                className="text-sm"
                style={{ color: 'var(--chip-text)' }}
              >
                Change Mode
              </Button>
            </div>

            <HeroSection
              userName={auth.nickname}
              isLoggedIn={!!auth.userId}
              loading={search.loading || isProcessing}
              isListening={isListening}
              onVoiceInput={startListening}
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
                  priceLevel={priceLevel}
                  locationMode={locationMode}
                  zipCode={zipCode}
                  radius={radius}
                  lat={lat}
                  lng={lng}
                  loading={search.loading}
                  gettingLocation={search.gettingLocation}
                  venueType={venueType}
                  onCuisineChange={(value) => setFilters({ cuisine: value })}
                  onActivityChange={(value) => setFilters({ activityCategory: value })}
                  onPriceLevelChange={(value) => setFilters({ priceLevel: value })}
                  onVenueTypeChange={(type) => setVenueType(type)}
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

            {/* Clarification chips - shown when voice intent is ambiguous */}
            {showClarification && (
              <ClarificationChips
                options={clarificationOptions}
                onSelect={handleClarificationSelect}
                onDismiss={closeClarification}
              />
            )}
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

        {/* Date Choice Dialog for ambiguous voice dates */}
        <DateChoiceDialog
          open={showDateChoice}
          onClose={closeDateChoice}
          options={dateChoiceOptions}
          onSelect={handleDateChoice}
        />

        {/* Next Available Date Dialog for live events */}
        <NextAvailableDateDialog
          open={!!search.nextAvailableDateInfo}
          onOpenChange={(open) => {
            if (!open) search.handleDismissNextAvailableDate();
          }}
          nextAvailableDate={search.nextAvailableDateInfo?.date || ""}
          nextAvailableDayName={search.nextAvailableDateInfo?.dayName || ""}
          onAccept={search.handleSearchWithDate}
          onDecline={search.handleDismissNextAvailableDate}
        />

        {/* Plan Ahead Floating Button & Dialog */}
        {searchMode && (
          <FloatingPlanAheadButton 
            onClick={() => setIsPlanAheadOpen(true)}
            hasScheduledDate={!!searchDate}
          />
        )}

        <PlanAheadDialog
          open={isPlanAheadOpen}
          onOpenChange={setIsPlanAheadOpen}
          onConfirm={({ customDate, timeChoice }) => {
            if (customDate) {
              // Map timeChoice to time string
              const timeMap = {
                lunch: "12:00",
                dinner: "19:00",
                late_night: "21:30",
              };
              setSearchDate(customDate, timeMap[timeChoice]);
              toast({
                title: "Date set",
                description: `Planning for ${customDate.toLocaleDateString()} at ${timeChoice === 'lunch' ? 'lunch' : timeChoice === 'dinner' ? 'dinner' : 'late night'}`,
              });
            } else {
              clearSearchDateTime();
            }
            setIsPlanAheadOpen(false);
            
            // Trigger fresh search if we have results
            if (restaurantResults.length > 0 || activityResults.length > 0) {
              search.handleSeePlan();
            }
          }}
        />
      </div>
    </div>
  );
};

export default Index;
