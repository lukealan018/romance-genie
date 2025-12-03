import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Navigation, Home, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface WeatherWidgetProps {
  temperature?: number;
  description?: string;
  icon?: string;
  loading?: boolean;
  cityName?: string;
  locationSource?: 'gps' | 'home' | null;
  onSwitchToGPS?: () => void;
  onSwitchToHome?: () => void;
}

export const WeatherWidget = ({ 
  temperature, 
  description, 
  icon, 
  loading, 
  cityName, 
  locationSource,
  onSwitchToGPS,
  onSwitchToHome 
}: WeatherWidgetProps) => {
  if (loading) {
    return (
      <div className="weather-pill px-3 py-1.5 flex items-center gap-2 max-w-sm">
        <Skeleton className="w-8 h-8 rounded" />
        <Skeleton className="h-4 flex-1" />
      </div>
    );
  }

  const LocationIcon = locationSource === 'gps' ? Navigation : Home;
  const showPopover = temperature && description && (onSwitchToGPS || onSwitchToHome);

  if (!temperature || !description) {
    return (
      <div className="weather-pill px-3 py-1.5 flex items-center gap-2 max-w-sm">
        <MapPin className="w-5 h-5 weather-icon flex-shrink-0" />
        <span className="text-sm whitespace-nowrap" style={{ color: 'var(--weather-pill-text)' }}>
          Getting Weather...
        </span>
      </div>
    );
  }

  const weatherContent = (
    <div 
      className="weather-pill px-3 py-1.5 flex items-center gap-2 max-w-sm cursor-pointer transition-all duration-200 hover:brightness-110 hover:-translate-y-0.5"
    >
      {icon && (
        <img
          src={`https://openweathermap.org/img/wn/${icon}.png`}
          alt={description}
          className="w-8 h-8 flex-shrink-0"
        />
      )}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        {locationSource && (
          <LocationIcon 
            className="w-4 h-4 flex-shrink-0 weather-icon" 
          />
        )}
        {cityName && (
          <>
            <span 
              className="text-base font-semibold truncate"
              style={{ color: 'var(--weather-pill-text)' }}
            >
              {cityName}
            </span>
            <span style={{ color: 'var(--weather-pill-text)', opacity: 0.5 }}>|</span>
          </>
        )}
        <span 
          className="text-sm whitespace-nowrap font-medium"
          style={{ color: 'var(--weather-pill-text)' }}
        >
          {temperature}°F
        </span>
      </div>
    </div>
  );

  if (!showPopover) {
    return weatherContent;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        {weatherContent}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="space-y-1">
          {onSwitchToGPS && (
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 h-auto py-2"
              onClick={onSwitchToGPS}
            >
              <Navigation className="w-4 h-4" />
              <span className="flex-1 text-left">Use Current Location</span>
              {locationSource === 'gps' && <Check className="w-4 h-4 text-primary" />}
            </Button>
          )}
          {onSwitchToHome && (
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 h-auto py-2"
              onClick={onSwitchToHome}
            >
              <Home className="w-4 h-4" />
              <span className="flex-1 text-left">Use Home Location</span>
              {locationSource === 'home' && <Check className="w-4 h-4 text-primary" />}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
