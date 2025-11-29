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
    const { lat, lng } = await req.json();
    
    if (!lat || !lng) {
      throw new Error('Latitude and longitude are required');
    }

    const apiKey = Deno.env.get('OPENWEATHER_API_KEY');
    if (!apiKey) {
      throw new Error('OpenWeather API key not configured');
    }

    console.log('Fetching weather for coordinates:', { lat, lng });

    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=imperial&appid=${apiKey}`;
    
    const response = await fetch(weatherUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenWeather API error:', errorText);
      throw new Error(`Weather API returned ${response.status}`);
    }

    const data = await response.json();
    
    console.log('Weather data fetched successfully');

    const weatherInfo = data?.weather?.[0];
    const weatherData = {
      temperature: Math.round(data?.main?.temp ?? 0),
      feelsLike: Math.round(data?.main?.feels_like ?? 0),
      description: weatherInfo?.description ?? 'Unknown',
      icon: weatherInfo?.icon ?? '01d',
      humidity: data?.main?.humidity ?? 0,
      windSpeed: Math.round(data?.wind?.speed ?? 0),
    };

    return new Response(
      JSON.stringify(weatherData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in weather function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
