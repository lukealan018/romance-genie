import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AvailabilityBadgeProps {
  status: 'available' | 'limited' | 'closed' | null | undefined;
}

export function AvailabilityBadge({ status }: AvailabilityBadgeProps) {
  if (!status) return null;

  const config = {
    available: {
      icon: CheckCircle,
      label: "Available",
      className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
    },
    limited: {
      icon: AlertTriangle,
      label: "Limited",
      className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
    },
    closed: {
      icon: XCircle,
      label: "Closed",
      className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/20"
    }
  };

  const { icon: Icon, label, className } = config[status];

  return (
    <Badge variant="outline" className={className}>
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
}
