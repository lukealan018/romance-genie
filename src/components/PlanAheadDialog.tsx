import { useState } from "react";
import { format, addDays, isFriday, isSaturday, nextFriday, nextSaturday } from "date-fns";
import { CalendarIcon, Clock, Sun, Sunset, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type DateChoice = "today" | "tomorrow" | "weekend" | "custom";
type TimeChoice = "lunch" | "dinner" | "late_night";

interface PlanAheadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (options: { 
    dateChoice: DateChoice; 
    customDate?: Date | null; 
    timeChoice: TimeChoice 
  }) => void;
}

const timePresets: Record<TimeChoice, { label: string; time: string; icon: React.ReactNode; description: string }> = {
  lunch: { label: "Lunch", time: "12:00", icon: <Sun className="w-4 h-4" />, description: "Around noon" },
  dinner: { label: "Dinner", time: "19:00", icon: <Sunset className="w-4 h-4" />, description: "Evening meal" },
  late_night: { label: "Late Night", time: "21:30", icon: <Moon className="w-4 h-4" />, description: "After 9pm" },
};

export function PlanAheadDialog({ open, onOpenChange, onConfirm }: PlanAheadDialogProps) {
  const [dateChoice, setDateChoice] = useState<DateChoice>("today");
  const [customDate, setCustomDate] = useState<Date | null>(null);
  const [timeChoice, setTimeChoice] = useState<TimeChoice>("dinner");
  const [calendarOpen, setCalendarOpen] = useState(false);

  const today = new Date();
  const tomorrow = addDays(today, 1);
  
  const getWeekendDate = () => {
    const dayOfWeek = today.getDay();
    // If it's Friday or Saturday, use today/tomorrow
    if (dayOfWeek === 5) return today; // Friday
    if (dayOfWeek === 6) return today; // Saturday
    // Otherwise get next Friday
    return nextFriday(today);
  };

  const getDisplayDate = (): string => {
    switch (dateChoice) {
      case "today":
        return "Today";
      case "tomorrow":
        return "Tomorrow";
      case "weekend":
        const weekendDate = getWeekendDate();
        return format(weekendDate, "EEEE, MMM d");
      case "custom":
        return customDate ? format(customDate, "EEE, MMM d") : "Pick a date";
      default:
        return "Today";
    }
  };

  const handleDateChoiceClick = (choice: DateChoice) => {
    setDateChoice(choice);
    if (choice === "custom") {
      setCalendarOpen(true);
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      setCustomDate(date);
      setDateChoice("custom");
      setCalendarOpen(false);
    }
  };

  const handleConfirm = () => {
    let finalDate: Date | null = null;
    
    switch (dateChoice) {
      case "today":
        finalDate = today;
        break;
      case "tomorrow":
        finalDate = tomorrow;
        break;
      case "weekend":
        finalDate = getWeekendDate();
        break;
      case "custom":
        finalDate = customDate;
        break;
    }

    onConfirm({ 
      dateChoice, 
      customDate: finalDate, 
      timeChoice 
    });
  };

  const handleClearAndClose = () => {
    onConfirm({ dateChoice: "today", customDate: null, timeChoice: "dinner" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            Plan Ahead
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">When?</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={dateChoice === "today" ? "default" : "outline"}
                className="justify-start"
                onClick={() => handleDateChoiceClick("today")}
              >
                Today
              </Button>
              <Button
                variant={dateChoice === "tomorrow" ? "default" : "outline"}
                className="justify-start"
                onClick={() => handleDateChoiceClick("tomorrow")}
              >
                Tomorrow
              </Button>
              <Button
                variant={dateChoice === "weekend" ? "default" : "outline"}
                className="justify-start"
                onClick={() => handleDateChoiceClick("weekend")}
              >
                This Weekend
              </Button>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={dateChoice === "custom" ? "default" : "outline"}
                    className="justify-start"
                  >
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {dateChoice === "custom" && customDate 
                      ? format(customDate, "MMM d") 
                      : "Pick Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customDate || undefined}
                    onSelect={handleCalendarSelect}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Time Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              What time?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(timePresets) as [TimeChoice, typeof timePresets.lunch][]).map(([key, preset]) => (
                <Button
                  key={key}
                  variant={timeChoice === key ? "default" : "outline"}
                  className="flex flex-col items-center py-3 h-auto"
                  onClick={() => setTimeChoice(key)}
                >
                  {preset.icon}
                  <span className="text-sm mt-1">{preset.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-sm text-muted-foreground">Planning for</p>
            <p className="text-lg font-semibold text-foreground">
              {getDisplayDate()} • {timePresets[timeChoice].label}
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={handleClearAndClose} className="sm:mr-auto">
            Clear & Use Tonight
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

