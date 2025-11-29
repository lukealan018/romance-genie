import { useState } from "react";
import { format, addDays, isToday, isTomorrow, isThisWeek, isFriday, isSaturday } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type QuickOption = "today" | "tomorrow" | "weekend" | "custom";
type TimePreset = "lunch" | "dinner" | "late";

interface DateSelectorProps {
  selectedDate: Date | null;
  selectedTime: string | null;
  onDateChange: (date: Date | null, time: string | null) => void;
}

const timePresets = {
  lunch: { label: "Lunch", time: "12:00", icon: "☀️" },
  dinner: { label: "Dinner", time: "19:00", icon: "🌆" },
  late: { label: "Late Night", time: "21:00", icon: "🌙" },
};

export function DateSelector({ selectedDate, selectedTime, onDateChange }: DateSelectorProps) {
  const [activeOption, setActiveOption] = useState<QuickOption>("today");
  const [activeTime, setActiveTime] = useState<TimePreset>("dinner");
  const [calendarOpen, setCalendarOpen] = useState(false);

  const getNextFriday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 7 - dayOfWeek + 5;
    return addDays(today, daysUntilFriday === 0 && dayOfWeek === 5 ? 0 : daysUntilFriday);
  };

  const getNextSaturday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilSaturday = dayOfWeek <= 6 ? 6 - dayOfWeek : 7 - dayOfWeek + 6;
    return addDays(today, daysUntilSaturday === 0 && dayOfWeek === 6 ? 0 : daysUntilSaturday);
  };

  const handleQuickOption = (option: QuickOption) => {
    setActiveOption(option);
    const time = timePresets[activeTime].time;
    
    switch (option) {
      case "today":
        onDateChange(new Date(), time);
        break;
      case "tomorrow":
        onDateChange(addDays(new Date(), 1), time);
        break;
      case "weekend":
        // Default to Friday for weekend
        onDateChange(getNextFriday(), time);
        break;
      case "custom":
        setCalendarOpen(true);
        break;
    }
  };

  const handleTimePreset = (preset: TimePreset) => {
    setActiveTime(preset);
    const time = timePresets[preset].time;
    onDateChange(selectedDate || new Date(), time);
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      setActiveOption("custom");
      onDateChange(date, timePresets[activeTime].time);
      setCalendarOpen(false);
    }
  };

  const getDisplayText = () => {
    if (!selectedDate) return "Today";
    
    if (isToday(selectedDate)) return "Today";
    if (isTomorrow(selectedDate)) return "Tomorrow";
    if (isFriday(selectedDate) || isSaturday(selectedDate)) {
      return format(selectedDate, "EEEE");
    }
    return format(selectedDate, "EEE, MMM d");
  };

  const getTimeDisplay = () => {
    if (!selectedTime) return "7pm";
    const [hours] = selectedTime.split(":");
    const hour = parseInt(hours);
    if (hour === 12) return "12pm";
    if (hour > 12) return `${hour - 12}pm`;
    return `${hour}am`;
  };

  return (
    <div className="space-y-3">
      {/* Date Selection Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <span className="text-xs text-muted-foreground shrink-0">When?</span>
        
        <Button
          variant={activeOption === "today" ? "default" : "outline"}
          size="sm"
          className="shrink-0 h-8 px-3 text-xs"
          onClick={() => handleQuickOption("today")}
        >
          Today
        </Button>
        
        <Button
          variant={activeOption === "tomorrow" ? "default" : "outline"}
          size="sm"
          className="shrink-0 h-8 px-3 text-xs"
          onClick={() => handleQuickOption("tomorrow")}
        >
          Tomorrow
        </Button>
        
        <Button
          variant={activeOption === "weekend" ? "default" : "outline"}
          size="sm"
          className="shrink-0 h-8 px-3 text-xs"
          onClick={() => handleQuickOption("weekend")}
        >
          This Weekend
        </Button>
        
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={activeOption === "custom" ? "default" : "outline"}
              size="sm"
              className="shrink-0 h-8 px-3 text-xs"
            >
              <CalendarIcon className="w-3 h-3 mr-1" />
              Pick Date
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate || undefined}
              onSelect={handleCalendarSelect}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Time Selection Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <span className="text-xs text-muted-foreground shrink-0">
          <Clock className="w-3 h-3 inline mr-1" />
          Time?
        </span>
        
        {(Object.entries(timePresets) as [TimePreset, typeof timePresets.lunch][]).map(([key, preset]) => (
          <Button
            key={key}
            variant={activeTime === key ? "default" : "outline"}
            size="sm"
            className="shrink-0 h-8 px-3 text-xs"
            onClick={() => handleTimePreset(key)}
          >
            {preset.icon} {preset.label}
          </Button>
        ))}
      </div>

      {/* Selected Date/Time Display */}
      <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground bg-muted/50 rounded-lg py-2 px-3">
        <CalendarIcon className="w-4 h-4" />
        <span className="font-medium text-foreground">{getDisplayText()}</span>
        <span>at</span>
        <span className="font-medium text-foreground">{getTimeDisplay()}</span>
      </div>
    </div>
  );
}
