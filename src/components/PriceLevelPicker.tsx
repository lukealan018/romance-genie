import { AnimatedPickerButton, AnimatedPickerSection } from "@/components/AnimatedPickerComponents";

interface PriceLevelPickerProps {
  selected: string;
  onSelect: (priceLevel: string) => void;
}

const priceLevels = [
  { value: '', label: 'Any Price' },
  { value: 'budget', label: '$ Budget' },
  { value: 'moderate', label: '$$ Moderate' },
  { value: 'upscale', label: '$$$ Upscale' },
  { value: 'fine_dining', label: '$$$$ Fine Dining' },
];

export const PriceLevelPicker = ({ selected, onSelect }: PriceLevelPickerProps) => {
  return (
    <AnimatedPickerSection title="Price Range">
      <div className="flex flex-wrap gap-2">
        {priceLevels.map((level, index) => (
          <AnimatedPickerButton
            key={level.value}
            label={level.label}
            isSelected={selected === level.value}
            onClick={() => onSelect(level.value)}
            delay={index * 0.05}
          />
        ))}
      </div>
    </AnimatedPickerSection>
  );
};
