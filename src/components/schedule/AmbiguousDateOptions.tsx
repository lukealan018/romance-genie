import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface AmbiguousDateOptionsProps {
  options: Array<{ date: string; time: string; label: string }>;
  onSelect: (date: string, time: string) => void;
}

export function AmbiguousDateOptions({ options, onSelect }: AmbiguousDateOptionsProps) {
  return (
    <div className="space-y-3">
      <Label>Did you mean?</Label>
      {options.map((option, idx) => (
        <Button
          key={idx}
          variant="outline"
          className="w-full"
          onClick={() => onSelect(option.date, option.time)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
