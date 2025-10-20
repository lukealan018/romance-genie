import { Label } from "@/components/ui/label";

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
      <div style={{display:'flex', flexWrap:'wrap', gap:'8px'}}>
        {cuisines.map((cuisine) => (
          <button
            key={cuisine}
            className={`chip ${selected === cuisine ? 'selected' : ''}`}
            onClick={() => onSelect(cuisine)}
          >
            {cuisine}
          </button>
        ))}
      </div>
    </div>
  );
};
