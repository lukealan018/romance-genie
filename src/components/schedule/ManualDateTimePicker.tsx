import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Loader2 } from "lucide-react";
import { ConflictWarningCard } from "@/components/ConflictWarningCard";

interface ManualDateTimePickerProps {
  date: string;
  time: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  conflicts: any[];
  confirmationNumbers: { restaurant: string; activity: string };
  onConfirmationChange: (field: 'restaurant' | 'activity', value: string) => void;
  searchMode: 'both' | 'restaurant_only' | 'activity_only';
  hasRestaurant: boolean;
  hasActivity: boolean;
  isProcessing: boolean;
  onSchedule: () => void;
}

export function ManualDateTimePicker({
  date,
  time,
  onDateChange,
  onTimeChange,
  conflicts,
  confirmationNumbers,
  onConfirmationChange,
  searchMode,
  hasRestaurant,
  hasActivity,
  isProcessing,
  onSchedule,
}: ManualDateTimePickerProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Date
        </Label>
        <Input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="h-14 text-base"
        />
      </div>
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Time
        </Label>
        <Input
          type="time"
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
          className="h-14 text-base"
        />
      </div>

      {conflicts.length > 0 && (
        <div className="space-y-2">
          {conflicts.map((conflict: any, idx: number) => (
            <ConflictWarningCard key={idx} conflict={conflict} />
          ))}
        </div>
      )}

      <div className="space-y-4 pt-4 border-t border-border">
        <p className="text-sm font-medium">Confirmation Numbers (Optional)</p>
        {(searchMode === 'both' || searchMode === 'restaurant_only') && hasRestaurant && (
          <Input
            placeholder="Restaurant confirmation"
            value={confirmationNumbers.restaurant}
            onChange={(e) => onConfirmationChange('restaurant', e.target.value)}
            className="h-12"
          />
        )}
        {(searchMode === 'both' || searchMode === 'activity_only') && hasActivity && (
          <Input
            placeholder="Activity confirmation"
            value={confirmationNumbers.activity}
            onChange={(e) => onConfirmationChange('activity', e.target.value)}
            className="h-12"
          />
        )}
      </div>

      <Button size="lg" onClick={onSchedule} disabled={isProcessing} className="w-full py-6 text-lg mt-8">
        {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Clock className="w-4 h-4 mr-2" />}
        {searchMode === 'restaurant_only' && "Schedule Dinner"}
        {searchMode === 'activity_only' && "Schedule Activity"}
        {(!searchMode || searchMode === 'both') && "Schedule Plan"}
      </Button>
    </div>
  );
}
