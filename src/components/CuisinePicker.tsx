import { AnimatedPickerButton, AnimatedPickerSection } from "@/components/AnimatedPickerComponents";

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
  "🌍 Around the World",
];

export const CuisinePicker = ({ selected, onSelect }: CuisinePickerProps) => {
  return (
    <AnimatedPickerSection title="Cuisine Type">
      <div className="flex flex-wrap gap-2">
        {cuisines.map((cuisine, index) => (
          <AnimatedPickerButton
            key={cuisine}
            label={cuisine}
            isSelected={selected === cuisine}
            onClick={() => onSelect(cuisine)}
            delay={index * 0.05}
          />
        ))}
      </div>
    </AnimatedPickerSection>
  );
};
