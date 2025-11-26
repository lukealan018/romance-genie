import { Card } from "@/components/ui/card";
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
      <Card className="px-3 py-1.5 flex items-center gap-2 bg-card/50 border-border/50 max-w-sm">
        <Skeleton className="w-8 h-8 rounded" />
        <Skeleton className="h-4 flex-1" />
      </Card>
    );
  }

  const LocationIcon = locationSource === 'gps' ? Navigation : Home;
  const showPopover = temperature && description && (onSwitchToGPS || onSwitchToHome);

  if (!temperature || !description) {
    return (
      <Card className="px-3 py-1.5 flex items-center gap-2 bg-card/50 border-border/50 max-w-sm">
        <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        <span className="text-sm text-muted-foreground whitespace-nowrap">Getting Weather...</span>
      </Card>
    );
  }

  const weatherContent = (
    <Card className="px-3 py-1.5 flex items-center gap-2 bg-card/50 border-border/50 max-w-sm hover:bg-card/60 transition-colors cursor-pointer">
      {icon && (
        <img
          src={`https://openweathermap.org/img/wn/${icon}.png`}
          alt={description}
          className="w-8 h-8 flex-shrink-0"
        />
      )}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        {locationSource && <LocationIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
        {cityName && (
          <>
            <span className="text-base font-semibold text-foreground truncate">{cityName}</span>
            <span className="text-muted-foreground">|</span>
          </>
        )}
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {temperature}°F
        </span>
      </div>
    </Card>
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
