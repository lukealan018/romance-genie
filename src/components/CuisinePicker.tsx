import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface CuisinePickerProps {
  selected: string;
  onSelect: (cuisine: string) => void;
}

const cuisines = [
  "Italian",
  "Mexican",
  "Japanese",
  "Chinese",
  "Thai",
  "American",
  "Indian",
  "French",
  "Mediterranean",
];

export const CuisinePicker = ({ selected, onSelect }: CuisinePickerProps) => {
  return (
    <div className="space-y-4">
      <Label className="text-base font-medium">Cuisine Type</Label>
      <div className="grid grid-cols-3 gap-2">
        {cuisines.map((cuisine) => (
          <Button
            key={cuisine}
            variant={selected === cuisine ? "default" : "outline"}
            onClick={() => onSelect(cuisine)}
            className="h-auto py-3"
          >
            {cuisine}
          </Button>
        ))}
      </div>
    </div>
  );
};
