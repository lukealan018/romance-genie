import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lng, scheduledDate } = await req.json();

    if (!lat || !lng || !scheduledDate) {
      throw new Error('Missing required parameters: lat, lng, scheduledDate');
    }

    const OPENWEATHER_API_KEY = Deno.env.get('OPENWEATHER_API_KEY');
    if (!OPENWEATHER_API_KEY) {
      throw new Error('OPENWEATHER_API_KEY not configured');
    }

    // Calculate days until scheduled date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(scheduledDate);
    targetDate.setHours(0, 0, 0, 0);
    const daysUntil = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let weatherData;

    if (daysUntil === 0) {
      // Use current weather for today
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}&units=imperial`
      );

      if (!response.ok) {
        throw new Error(`OpenWeather API error: ${response.status}`);
      }

      const data = await response.json();
      weatherData = {
        temp: Math.round(data.main.temp),
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        fetched_at: new Date().toISOString()
      };

    } else if (daysUntil > 0 && daysUntil <= 5) {
      // Use 5-day forecast
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}&units=imperial`
      );

      if (!response.ok) {
        throw new Error(`OpenWeather API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Find forecast for the scheduled date at evening time (19:00)
      const targetDateTime = new Date(scheduledDate);
      targetDateTime.setHours(19, 0, 0, 0);
      
      const forecast = data.list.find((item: any) => {
        const forecastDate = new Date(item.dt * 1000);
        return forecastDate.toDateString() === targetDateTime.toDateString() &&
               forecastDate.getHours() >= 18 && forecastDate.getHours() <= 20;
      }) || data.list.find((item: any) => {
        const forecastDate = new Date(item.dt * 1000);
        return forecastDate.toDateString() === targetDateTime.toDateString();
      });

      if (forecast) {
        weatherData = {
          temp: Math.round(forecast.main.temp),
          description: forecast.weather[0].description,
          icon: forecast.weather[0].icon,
          fetched_at: new Date().toISOString()
        };
      } else {
        throw new Error('No forecast available for this date');
      }

    } else {
      throw new Error('Weather forecast only available for the next 5 days');
    }

    return new Response(
      JSON.stringify(weatherData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in fetch-weather-forecast:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
