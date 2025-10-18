import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface RadiusSelectorProps {
  value: number;
  onChange: (value: number) => void;
}

export const RadiusSelector = ({ value, onChange }: RadiusSelectorProps) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label className="text-base font-medium">Search Radius</Label>
        <span className="text-lg font-semibold text-primary">{value} miles</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(vals) => onChange(vals[0])}
        min={1}
        max={25}
        step={1}
        className="w-full"
      />
    </div>
  );
};
