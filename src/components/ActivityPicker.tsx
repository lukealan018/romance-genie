import { useState } from "react";
import { Music, Laugh, Film, Target, Building2, Lock, ToyBrick, Wine, Trophy, Mic2, Martini, ChevronDown, ChevronUp } from "lucide-react";
import { AnimatedPickerButton, AnimatedPickerSection } from "@/components/AnimatedPickerComponents";

const primaryActivities = [
  { id: "live_music", label: "Live Music", icon: Music },
  { id: "comedy", label: "Comedy", icon: Laugh },
  { id: "movies", label: "Movies", icon: Film },
  { id: "escape_room", label: "Escape Room", icon: Lock },
  { id: "cocktail_bar", label: "Cocktail Bar", icon: Martini },
];

const moreActivities = [
  { id: "bowling", label: "Bowling", icon: Target },
  { id: "museum", label: "Museum", icon: Building2 },
  { id: "mini_golf", label: "Mini Golf", icon: ToyBrick },
  { id: "wine", label: "Wine Bar", icon: Wine },
  { id: "sports", label: "Sports", icon: Trophy },
  { id: "karaoke", label: "Karaoke", icon: Mic2 },
];

interface ActivityPickerProps {
  selected: string;
  onSelect: (activity: string) => void;
}

export const ActivityPicker = ({ selected, onSelect }: ActivityPickerProps) => {
  const [showMore, setShowMore] = useState(false);

  return (
    <AnimatedPickerSection title="What type of activity?">
      <div className="flex flex-wrap gap-2">
        {primaryActivities.map((activity, index) => (
          <AnimatedPickerButton
            key={activity.id}
            label={activity.label}
            icon={activity.icon}
            isSelected={selected === activity.label}
            onClick={() => onSelect(activity.label)}
            delay={index * 0.05}
          />
        ))}
        
        {showMore && moreActivities.map((activity, index) => (
          <AnimatedPickerButton
            key={activity.id}
            label={activity.label}
            icon={activity.icon}
            isSelected={selected === activity.label}
            onClick={() => onSelect(activity.label)}
            delay={(primaryActivities.length + index) * 0.05}
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
              More Activities <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </AnimatedPickerSection>
  );
};
