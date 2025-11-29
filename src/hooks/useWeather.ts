import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const geoOptions: PositionOptions = {
  enableHighAccuracy: true,  // Required for iOS to prompt properly
  timeout: 20000,            // 20 second timeout for cold starts
  maximumAge: 0              // Don't use cached position
};

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
      const response = await supabase.functions.invoke('weather', {
        body: { lat: latitude, lng: longitude }
      });

      if (response?.error) throw response.error;

      const data = response?.data;
      if (data) {
        setWeatherData({
          temperature: data.temperature,
          description: data.description,
          icon: data.icon
        });
      }
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
      const geoResponse = await supabase.functions.invoke('geocode', {
        body: { zipCode: profile.home_zip }
      });

      if (geoResponse?.error) throw geoResponse.error;
      const geoData = geoResponse?.data;
      if (!geoData?.lat || !geoData?.lng) {
        console.error('Failed to geocode ZIP code');
        return;
      }

      // Fetch weather for the coordinates
      const weatherResponse = await supabase.functions.invoke('weather', {
        body: { lat: geoData.lat, lng: geoData.lng }
      });

      if (weatherResponse?.error) throw weatherResponse.error;
      const weatherData = weatherResponse?.data;

      setProfileWeatherData({
        temperature: weatherData?.temperature,
        description: weatherData?.description,
        icon: weatherData?.icon,
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
      console.log('[GPS Init] Trying GPS on mount...');
      
      if (!navigator.geolocation) {
        console.log('[GPS Init] Navigator.geolocation not available');
        resolve(false);
        return;
      }

      const timeout = setTimeout(() => {
        console.log('[GPS Init] Timeout expired after 20s');
        resolve(false);
      }, 20000);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          console.log('[GPS Init] SUCCESS! Got coordinates:', position.coords.latitude, position.coords.longitude);
          clearTimeout(timeout);
          const { latitude, longitude } = position.coords;
          
          try {
            setLoadingProfileWeather(true);
            
            // Get city name from coordinates
            const geocodeResp = await supabase.functions.invoke('geocode', {
              body: { lat: latitude, lng: longitude }
            });

            if (geocodeResp?.error) throw geocodeResp.error;
            const geocodeResponse = geocodeResp?.data;

            // Fetch weather data
            const weatherResp = await supabase.functions.invoke('weather', {
              body: { lat: latitude, lng: longitude }
            });

            if (weatherResp?.error) throw weatherResp.error;
            const weatherResponse = weatherResp?.data;

            setProfileWeatherData({
              temperature: weatherResponse?.temperature,
              description: weatherResponse?.description,
              icon: weatherResponse?.icon,
              cityName: geocodeResponse?.city || "Current Location"
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
        (error) => {
          console.log('[GPS Init] Failed:', error.code, error.message, '- falling back to home location');
          clearTimeout(timeout);
          resolve(false);
        },
        geoOptions
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
    console.log('[GPS] switchToGPS called');
    
    if (!navigator.geolocation) {
      console.log('[GPS] Navigator.geolocation not available');
      toast({
        title: "GPS Unavailable",
        description: "Location services not supported on this device.",
      });
      return;
    }

    console.log('[GPS] Requesting location with options:', geoOptions);
    setLoadingProfileWeather(true);
    // Don't set locationSource here - wait for success
    
    toast({
      title: "📍 Getting Location...",
      description: "This may take a few seconds",
    });
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        console.log('[GPS] SUCCESS! Coordinates:', position.coords.latitude, position.coords.longitude);
        const { latitude, longitude } = position.coords;
        try {
          // Get city name from coordinates
          const geocodeResp = await supabase.functions.invoke('geocode', {
            body: { lat: latitude, lng: longitude }
          });

          if (geocodeResp?.error) throw geocodeResp.error;
          const geocodeResponse = geocodeResp?.data;

          // Fetch weather data
          const weatherResp = await supabase.functions.invoke('weather', {
            body: { lat: latitude, lng: longitude }
          });

          if (weatherResp?.error) throw weatherResp.error;
          const weatherResponse = weatherResp?.data;

          setProfileWeatherData({
            temperature: weatherResponse?.temperature,
            description: weatherResponse?.description,
            icon: weatherResponse?.icon,
            cityName: geocodeResponse?.city || "Current Location"
          });
          setLocationSource('gps');
          toast({
            title: "Location Updated",
            description: `Showing weather for ${geocodeResponse?.city || "your current location"}`,
          });
        } catch (error) {
          console.error('Error fetching GPS weather:', error);
          toast({
            title: "Staying on Current Location",
            description: "Couldn't fetch GPS weather. Try again later.",
          });
        } finally {
          setLoadingProfileWeather(false);
        }
      },
      (error) => {
        console.log('[GPS] FAILED! Code:', error.code, 'Message:', error.message);
        setLoadingProfileWeather(false);
        // Don't change locationSource on failure - keep the previous value
        
        let title = "GPS Error";
        let description = "Could not access your location.";
        
        if (error.code === 1) { // PERMISSION_DENIED
          title = "GPS Permission Needed";
          description = "Tap 'Allow' when prompted to use your current location.";
        } else if (error.code === 2) { // POSITION_UNAVAILABLE
          title = "GPS Unavailable";
          description = "GPS signal not available. Try again outside or near a window.";
        } else if (error.code === 3) { // TIMEOUT
          title = "GPS Timeout";
          description = "Taking longer than expected. Try again - often works on second attempt.";
        }
        
        toast({ title, description });
      },
      geoOptions
    );
  }, []);

  // Switch to home location
  const switchToHome = useCallback(async () => {
    setLoadingProfileWeather(true);
    try {
      await fetchProfileWeather();
      setLocationSource('home');
      toast({
        title: "Location Updated",
        description: "Showing weather for your home location",
      });
    } catch (error) {
      console.error('Error fetching home weather:', error);
      toast({
        title: "Could Not Switch",
        description: "Unable to fetch home location weather.",
      });
    } finally {
      setLoadingProfileWeather(false);
    }
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
