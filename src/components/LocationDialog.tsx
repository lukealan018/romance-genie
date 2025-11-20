import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin } from "lucide-react";

interface LocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (zipCode: string, radius: number) => void;
  onUseGPS: () => void;
  defaultZipCode?: string;
  defaultRadius?: number;
}

export const LocationDialog = ({
  open,
  onOpenChange,
  onSave,
  onUseGPS,
  defaultZipCode = "",
  defaultRadius = 10,
}: LocationDialogProps) => {
  const [zipCode, setZipCode] = useState(defaultZipCode);
  const [selectedRadius, setSelectedRadius] = useState(defaultRadius);

  const radiusOptions = [5, 10, 15, 20, 25];

  const handleSave = () => {
    if (zipCode.length === 5) {
      onSave(zipCode, selectedRadius);
      onOpenChange(false);
    }
  };

  const handleUseGPS = () => {
    onUseGPS();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Set Your Location
          </DialogTitle>
          <DialogDescription>
            Where should we search for your adventure?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="zipcode">ZIP Code</Label>
            <Input
              id="zipcode"
              type="text"
              inputMode="numeric"
              maxLength={5}
              placeholder="Enter 5-digit ZIP code"
              value={zipCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setZipCode(value);
              }}
              className="text-lg"
            />
          </div>

          <div className="space-y-3">
            <Label>Search Distance</Label>
            <div className="grid grid-cols-5 gap-2">
              {radiusOptions.map((radius) => (
                <Button
                  key={radius}
                  type="button"
                  variant={selectedRadius === radius ? "default" : "outline"}
                  onClick={() => setSelectedRadius(radius)}
                  className="font-medium"
                >
                  {radius}mi
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={zipCode.length !== 5}
              className="flex-1"
            >
              Save
            </Button>
          </div>
          <Button
            variant="ghost"
            onClick={handleUseGPS}
            className="w-full"
          >
            Use GPS Instead
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
