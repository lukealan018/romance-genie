import { Music, Laugh, Film, Target, Building2, Lock, ToyBrick, Wine, Trophy, Mic2, Martini } from "lucide-react";
import { AnimatedPickerButton, AnimatedPickerSection } from "@/components/AnimatedPickerComponents";

const activities = [
  { id: "live_music", label: "Live Music", icon: Music },
  { id: "comedy", label: "Comedy", icon: Laugh },
  { id: "movies", label: "Movies", icon: Film },
  { id: "bowling", label: "Bowling", icon: Target },
  { id: "museum", label: "Museum", icon: Building2 },
  { id: "escape_room", label: "Escape Room", icon: Lock },
  { id: "mini_golf", label: "Mini Golf", icon: ToyBrick },
  { id: "wine", label: "Wine Bar", icon: Wine },
  { id: "sports", label: "Sports", icon: Trophy },
  { id: "karaoke", label: "Karaoke", icon: Mic2 },
  { id: "cocktail_bar", label: "Cocktail Bar", icon: Martini },
];

interface ActivityPickerProps {
  selected: string;
  onSelect: (activity: string) => void;
}

export const ActivityPicker = ({ selected, onSelect }: ActivityPickerProps) => {
  return (
    <AnimatedPickerSection title="What type of activity?">
      <div className="flex flex-wrap gap-2">
        {activities.map((activity, index) => (
          <AnimatedPickerButton
            key={activity.id}
            label={activity.label}
            icon={activity.icon}
            isSelected={selected === activity.id}
            onClick={() => onSelect(activity.id)}
            delay={index * 0.05}
          />
        ))}
      </div>
    </AnimatedPickerSection>
  );
};
