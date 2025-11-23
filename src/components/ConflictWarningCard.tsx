import { AlertCircle, Info, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ConflictWarningCardProps {
  conflict: {
    type: string;
    message: string;
    suggestion: string;
    severity: 'info' | 'warning' | 'error';
  };
}

export function ConflictWarningCard({ conflict }: ConflictWarningCardProps) {
  const icons = {
    info: Info,
    warning: AlertTriangle,
    error: AlertCircle
  };

  const Icon = icons[conflict.severity];

  return (
    <Alert variant={conflict.severity === 'error' ? 'destructive' : 'default'}>
      <Icon className="h-4 w-4" />
      <AlertDescription className="space-y-1">
        <p className="font-medium">{conflict.message}</p>
        <p className="text-sm text-muted-foreground">{conflict.suggestion}</p>
      </AlertDescription>
    </Alert>
  );
}
