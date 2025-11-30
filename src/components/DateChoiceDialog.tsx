import { format, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

export interface DateOption {
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:mm"
  label: string; // "Friday, December 6 at 7:00 PM"
}

interface DateChoiceDialogProps {
  open: boolean;
  onClose: () => void;
  options: DateOption[];
  onSelect: (date: string, time: string) => void;
}

export const DateChoiceDialog = ({
  open,
  onClose,
  options,
  onSelect,
}: DateChoiceDialogProps) => {
  // Format the label nicely if not provided
  const formatOptionLabel = (option: DateOption): string => {
    if (option.label) return option.label;
    
    try {
      const date = parseISO(option.date);
      const [hours, minutes] = option.time.split(':').map(Number);
      date.setHours(hours, minutes);
      return format(date, "EEEE, MMMM d 'at' h:mm a");
    } catch {
      return `${option.date} at ${option.time}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Which date did you mean?
          </DialogTitle>
          <DialogDescription>
            Pick one to continue your search
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-4">
          {options.map((option, index) => (
            <Button
              key={`${option.date}-${option.time}`}
              variant="outline"
              className="w-full justify-start text-left h-auto py-4 px-4 hover:bg-primary/10 hover:border-primary transition-colors"
              onClick={() => onSelect(option.date, option.time)}
              autoFocus={index === 0}
            >
              <div className="flex flex-col items-start gap-1">
                <span className="font-medium text-foreground">
                  {formatOptionLabel(option)}
                </span>
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
