import { Card } from "@/components/ui/card";
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
      <Card className="px-3 py-1.5 flex items-center gap-2 bg-card/50 border-border/50 max-w-sm">
        <Skeleton className="w-8 h-8 rounded" />
        <Skeleton className="h-4 flex-1" />
      </Card>
    );
  }

  if (!temperature || !description) {
    return null;
  }

  return (
    <Card 
      className="px-3 py-1.5 flex items-center gap-2 bg-card/50 border-border/50 max-w-sm hover:bg-card/60 transition-colors cursor-pointer"
      onClick={onRefresh}
    >
      {icon && (
        <img
          src={`https://openweathermap.org/img/wn/${icon}.png`}
          alt={description}
          className="w-8 h-8 flex-shrink-0"
        />
      )}
      <div className="flex items-center gap-1 min-w-0 flex-1">
        {cityName && (
          <>
            <span className="text-base font-semibold text-slate-300 truncate">{cityName}</span>
            <span className="text-slate-400">|</span>
          </>
        )}
        <span className="text-sm text-slate-400 whitespace-nowrap">
          {temperature}°F • <span className="capitalize">{description}</span>
        </span>
      </div>
    </Card>
  );
};
