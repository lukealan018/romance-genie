import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateICSFile, downloadICS, ScheduledPlan } from "@/lib/calendar-export";
import { toast } from "sonner";

interface ExportCalendarButtonProps {
  plan: ScheduledPlan;
  variant?: "default" | "outline" | "ghost";
}

export function ExportCalendarButton({ plan, variant = "outline" }: ExportCalendarButtonProps) {
  const handleExport = () => {
    try {
      const icsContent = generateICSFile(plan);
      const filename = `date-night-${plan.scheduled_date}.ics`;
      downloadICS(icsContent, filename);
      toast.success("Calendar event exported!");
    } catch (error) {
      console.error('Error exporting calendar:', error);
      toast.error("Failed to export calendar");
    }
  };

  return (
    <Button variant={variant} size="sm" onClick={handleExport}>
      <Download className="w-4 h-4 mr-2" />
      Export .ics
    </Button>
  );
}
