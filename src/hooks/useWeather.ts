import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface WeatherData {
  temperature?: number;
  description?: string;
  icon?: string;
  cityName?: string;
}

export const useWeather = (userId: string | null) => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [profileWeatherData, setProfileWeatherData] = useState<WeatherData | null>(null);
  const [loadingProfileWeather, setLoadingProfileWeather] = useState(false);

  // Fetch weather data for a specific location
  const fetchWeather = async (latitude: number, longitude: number) => {
    setLoadingWeather(true);
    try {
      const { data, error } = await supabase.functions.invoke('weather', {
        body: { lat: latitude, lng: longitude }
      });

      if (error) throw error;

      setWeatherData({
        temperature: data.temperature,
        description: data.description,
        icon: data.icon
      });
    } catch (error) {
      console.error('Error fetching weather:', error);
    } finally {
      setLoadingWeather(false);
    }
  };

  // Fetch weather based on user's profile ZIP code
  const fetchProfileWeather = useCallback(async () => {
    if (!userId) return;
    
    setLoadingProfileWeather(true);
    try {
      // Fetch user profile to get home ZIP
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('home_zip')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;
      if (!profile?.home_zip) {
        console.log('No home ZIP code in profile');
        return;
      }

      // Geocode the ZIP code to get coordinates
      const { data: geoData, error: geoError } = await supabase.functions.invoke('geocode', {
        body: { zipCode: profile.home_zip }
      });

      if (geoError) throw geoError;
      if (!geoData?.lat || !geoData?.lng) {
        console.error('Failed to geocode ZIP code');
        return;
      }

      // Fetch weather for the coordinates
      const { data: weatherResponse, error: weatherError } = await supabase.functions.invoke('weather', {
        body: { lat: geoData.lat, lng: geoData.lng }
      });

      if (weatherError) throw weatherError;

      setProfileWeatherData({
        temperature: weatherResponse.temperature,
        description: weatherResponse.description,
        icon: weatherResponse.icon,
        cityName: geoData.city || undefined
      });
    } catch (error) {
      console.error('Error fetching profile weather:', error);
    } finally {
      setLoadingProfileWeather(false);
    }
  }, [userId]);

  // Refresh weather using current GPS location
  const handleWeatherRefresh = useCallback(() => {
    if (navigator.geolocation) {
      setLoadingProfileWeather(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            // Get city name from coordinates using reverse geocoding
            const { data: geocodeResponse, error: geocodeError } = await supabase.functions.invoke('geocode', {
              body: { lat: latitude, lng: longitude }
            });

            if (geocodeError) throw geocodeError;

            // Fetch weather data
            const { data: weatherResponse, error: weatherError } = await supabase.functions.invoke('weather', {
              body: { lat: latitude, lng: longitude }
            });

            if (weatherError) throw weatherError;

            setProfileWeatherData({
              temperature: weatherResponse.temperature,
              description: weatherResponse.description,
              icon: weatherResponse.icon,
              cityName: geocodeResponse.city || "Current Location"
            });
          } catch (error) {
            console.error('Error fetching current location weather:', error);
            toast({
              title: "Weather Error",
              description: "Could not fetch weather for your location.",
              variant: "destructive",
            });
          } finally {
            setLoadingProfileWeather(false);
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          toast({
            title: "Using home location",
            description: "Showing weather for your home ZIP code",
          });
          fetchProfileWeather();
        }
      );
    } else {
      toast({
        title: "Location Not Available",
        description: "Your browser doesn't support location services.",
        variant: "destructive",
      });
      fetchProfileWeather();
    }
  }, [fetchProfileWeather]);

  return {
    weatherData,
    profileWeatherData,
    loadingWeather,
    loadingProfileWeather,
    fetchWeather,
    fetchProfileWeather,
    handleWeatherRefresh
  };
};
