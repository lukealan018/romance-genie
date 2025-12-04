import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { AnimatedPickerButton, AnimatedPickerSection } from "@/components/AnimatedPickerComponents";

interface CuisinePickerProps {
  selected: string;
  onSelect: (cuisine: string) => void;
}

const primaryCuisines = [
  "Italian",
  "Mexican",
  "American",
  "Chinese",
  "Mediterranean",
  "Japanese",
];

const moreCuisines = [
  "Thai",
  "Indian",
  "French",
  "🌍 Around the World",
];

export const CuisinePicker = ({ selected, onSelect }: CuisinePickerProps) => {
  const [showMore, setShowMore] = useState(false);

  return (
    <AnimatedPickerSection title="Cuisine Type">
      <div className="flex flex-wrap gap-2">
        {primaryCuisines.map((cuisine, index) => (
          <AnimatedPickerButton
            key={cuisine}
            label={cuisine}
            isSelected={selected === cuisine}
            onClick={() => onSelect(cuisine)}
            delay={index * 0.05}
          />
        ))}
        
        {showMore && moreCuisines.map((cuisine, index) => (
          <AnimatedPickerButton
            key={cuisine}
            label={cuisine}
            isSelected={selected === cuisine}
            onClick={() => onSelect(cuisine)}
            delay={(primaryCuisines.length + index) * 0.05}
          />
        ))}
        
        <button
          onClick={() => setShowMore(!showMore)}
          className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {showMore ? (
            <>
              Less <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              More Cuisines <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </AnimatedPickerSection>
  );
};
