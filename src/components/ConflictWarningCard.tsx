import { AlertCircle, Info, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface ConflictWarningCardProps {
  conflict: {
    type: string;
    message: string;
    suggestion: string;
    severity: 'info' | 'warning' | 'error';
  };
}

const conflictTypeLabels: Record<string, string> = {
  restaurant_closing: "Restaurant Hours",
  restaurant_closed: "Venue Closed",
  activity_timing: "Activity Timing",
  activity_closed: "Activity Closed",
  activity_closing: "Activity Hours",
  date_proximity: "Schedule Note"
};

export function ConflictWarningCard({ conflict }: ConflictWarningCardProps) {
  const icons = {
    info: Info,
    warning: AlertTriangle,
    error: AlertCircle
  };

  const borderColors = {
    info: "border-l-blue-500",
    warning: "border-l-amber-500",
    error: "border-l-red-500"
  };

  const bgColors = {
    info: "bg-blue-500/5",
    warning: "bg-amber-500/5",
    error: "bg-red-500/5"
  };

  const Icon = icons[conflict.severity];
  const label = conflictTypeLabels[conflict.type] || "Note";

  return (
    <Alert 
      variant={conflict.severity === 'error' ? 'destructive' : 'default'}
      className={cn(
        "border-l-4",
        borderColors[conflict.severity],
        bgColors[conflict.severity]
      )}
    >
      <Icon className="h-5 w-5" />
      <AlertDescription className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <p className="font-semibold text-base leading-snug">{conflict.message}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{conflict.suggestion}</p>
      </AlertDescription>
    </Alert>
  );
}
