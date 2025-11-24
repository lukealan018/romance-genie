import { Cloud, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface WeatherWidgetProps {
  temperature?: number;
  description?: string;
  icon?: string;
  loading?: boolean;
  cityName?: string;
  onRefresh?: () => void;
}

export const WeatherWidget = ({ temperature, description, icon, loading, cityName, onRefresh }: WeatherWidgetProps) => {
  if (loading) {
    return (
      <Card className="px-3 py-2 flex items-center gap-3 bg-card/50 border-border/50">
        <Skeleton className="w-8 h-8 rounded" />
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      </Card>
    );
  }

  if (!temperature || !description) {
    return null;
  }

  return (
    <Card className="px-3 py-2 flex items-center gap-3 bg-card/50 border-border/50 group">
      {icon && (
        <img
          src={`https://openweathermap.org/img/wn/${icon}.png`}
          alt={description}
          className="w-8 h-8"
        />
      )}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          {cityName && (
            <>
              <span className="text-xs font-medium text-muted-foreground">{cityName}</span>
              <span className="text-xs text-muted-foreground/50">•</span>
            </>
          )}
          <span className="text-sm font-semibold text-foreground">{temperature}°F</span>
        </div>
        <span className="text-xs text-muted-foreground capitalize leading-tight">
          {description}
        </span>
      </div>
      {onRefresh && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onRefresh}
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      )}
    </Card>
  );
};
