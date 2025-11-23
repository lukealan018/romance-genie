import { Cloud } from "lucide-react";
import { Card } from "@/components/ui/card";

interface WeatherWidgetProps {
  temperature?: number;
  description?: string;
  icon?: string;
  loading?: boolean;
}

export const WeatherWidget = ({ temperature, description, icon, loading }: WeatherWidgetProps) => {
  if (loading) {
    return (
      <Card className="px-3 py-2 flex items-center gap-2 bg-card/50 border-border/50">
        <Cloud className="w-4 h-4 text-muted-foreground animate-pulse" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </Card>
    );
  }

  if (!temperature || !description) {
    return null;
  }

  return (
    <Card className="px-3 py-2 flex items-center gap-2 bg-card/50 border-border/50">
      {icon && (
        <img
          src={`https://openweathermap.org/img/wn/${icon}.png`}
          alt={description}
          className="w-8 h-8"
        />
      )}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">{temperature}°F</span>
        <span className="text-sm text-muted-foreground hidden sm:inline capitalize">
          {description}
        </span>
      </div>
    </Card>
  );
};
