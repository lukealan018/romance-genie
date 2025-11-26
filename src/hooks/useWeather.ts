import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface WeatherData {
  temperature?: number;
  description?: string;
  icon?: string;
  cityName?: string;
}

type LocationSource = 'gps' | 'home' | null;

export const useWeather = (userId: string | null) => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [profileWeatherData, setProfileWeatherData] = useState<WeatherData | null>(null);
  const [loadingProfileWeather, setLoadingProfileWeather] = useState(false);
  const [locationSource, setLocationSource] = useState<LocationSource>(null);

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

  // Initialize weather on mount (GPS first, fallback to home)
  const initializeWeather = useCallback(async () => {
    if (!userId) return;

    // Try GPS first with timeout
    const tryGPS = () => new Promise<boolean>((resolve) => {
      if (!navigator.geolocation) {
        resolve(false);
        return;
      }

      const timeout = setTimeout(() => resolve(false), 3000);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          clearTimeout(timeout);
          const { latitude, longitude } = position.coords;
          
          try {
            setLoadingProfileWeather(true);
            
            // Get city name from coordinates
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
            setLocationSource('gps');
            resolve(true);
          } catch (error) {
            console.error('Error fetching GPS weather:', error);
            resolve(false);
          } finally {
            setLoadingProfileWeather(false);
          }
        },
        () => {
          clearTimeout(timeout);
          resolve(false);
        }
      );
    });

    const gpsSuccess = await tryGPS();
    
    // Fallback to home location if GPS failed
    if (!gpsSuccess) {
      try {
        await fetchProfileWeather();
        setLocationSource('home');
      } catch (error) {
        console.error('Failed to fetch home weather:', error);
      }
    }
  }, [userId, fetchProfileWeather]);

  // Auto-initialize on mount
  useEffect(() => {
    if (userId) {
      initializeWeather();
    }
  }, [userId]); // Only run on userId change, not on initializeWeather change

  // Switch to GPS location
  const switchToGPS = useCallback(async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location Not Available",
        description: "Your browser doesn't support location services.",
        variant: "destructive",
      });
      return;
    }

    setLoadingProfileWeather(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Get city name from coordinates
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
          setLocationSource('gps');
        } catch (error) {
          console.error('Error fetching GPS weather:', error);
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
          title: "Location Error",
          description: "Could not access your location.",
          variant: "destructive",
        });
        setLoadingProfileWeather(false);
      }
    );
  }, []);

  // Switch to home location
  const switchToHome = useCallback(async () => {
    await fetchProfileWeather();
    setLocationSource('home');
  }, [fetchProfileWeather]);

  return {
    weatherData,
    profileWeatherData,
    loadingWeather,
    loadingProfileWeather,
    locationSource,
    fetchWeather,
    fetchProfileWeather,
    switchToGPS,
    switchToHome
  };
};
