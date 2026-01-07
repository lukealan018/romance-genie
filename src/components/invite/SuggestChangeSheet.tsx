import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Clock, MapPin, Calendar, Utensils, Sparkles } from 'lucide-react';

interface SuggestChangeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (suggestion: {
    type: string;
    note: string;
    responderName: string;
  }) => void;
  isSubmitting: boolean;
}

const suggestionTypes = [
  { id: 'time', label: 'Different Time', icon: Clock },
  { id: 'date', label: 'Different Date', icon: Calendar },
  { id: 'location', label: 'Different Place', icon: MapPin },
  { id: 'restaurant', label: 'Different Restaurant', icon: Utensils },
  { id: 'activity', label: 'Different Activity', icon: Sparkles },
];

const SuggestChangeSheet: React.FC<SuggestChangeSheetProps> = ({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}) => {
  const [selectedType, setSelectedType] = useState<string>('');
  const [note, setNote] = useState('');
  const [responderName, setResponderName] = useState('');

  const handleSubmit = () => {
    if (!selectedType) return;
    onSubmit({
      type: selectedType,
      note,
      responderName,
    });
  };

  const resetForm = () => {
    setSelectedType('');
    setNote('');
    setResponderName('');
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetForm();
        onOpenChange(isOpen);
      }}
    >
      <SheetContent side="bottom" className="rounded-t-3xl bg-card border-border">
        <SheetHeader className="text-left mb-6">
          <SheetTitle className="text-xl text-foreground">Suggest a Change</SheetTitle>
          <SheetDescription className="text-muted-foreground">
            Let the host know what works better for you
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Your name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm text-foreground">
              Your Name
            </Label>
            <Input
              id="name"
              value={responderName}
              onChange={(e) => setResponderName(e.target.value)}
              placeholder="Enter your name"
              className="bg-background/50"
            />
          </div>

          {/* Suggestion type */}
          <div className="space-y-2">
            <Label className="text-sm text-foreground">What would you change?</Label>
            <div className="flex flex-wrap gap-2">
              {suggestionTypes.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setSelectedType(id)}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-all
                    ${
                      selectedType === id
                        ? 'bg-primary text-primary-foreground shadow-glow-sm'
                        : 'bg-card border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/50'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note" className="text-sm text-foreground">
              Details (optional)
            </Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any specific suggestions? e.g., 'How about 7pm instead?' or 'I know a great Italian place nearby'"
              className="bg-background/50 min-h-[100px]"
            />
          </div>

          {/* Submit button */}
          <Button
            onClick={handleSubmit}
            disabled={!selectedType || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Sending...' : 'Send Suggestion'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SuggestChangeSheet;
