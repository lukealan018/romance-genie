import { Music, Laugh, Film, Target, Gamepad2, Building2, Lock, ToyBrick, Mountain, Wine } from "lucide-react";

const activities = [
  { id: "live_music", label: "Live Music", icon: Music },
  { id: "comedy", label: "Comedy", icon: Laugh },
  { id: "movies", label: "Movies", icon: Film },
  { id: "bowling", label: "Bowling", icon: Target },
  { id: "arcade", label: "Arcade", icon: Gamepad2 },
  { id: "museum", label: "Museum", icon: Building2 },
  { id: "escape_room", label: "Escape Room", icon: Lock },
  { id: "mini_golf", label: "Mini Golf", icon: ToyBrick },
  { id: "hike", label: "Hiking", icon: Mountain },
  { id: "wine", label: "Wine Bar", icon: Wine },
];

interface ActivityPickerProps {
  selected: string;
  onSelect: (activity: string) => void;
}

export const ActivityPicker = ({ selected, onSelect }: ActivityPickerProps) => {
  return (
    <div>
      <label className="block text-sm font-medium mb-3">What type of activity?</label>
      <div className="grid grid-cols-2 gap-2">
        {activities.map((activity) => {
          const Icon = activity.icon;
          return (
            <button
              key={activity.id}
              onClick={() => onSelect(activity.id)}
              className={`p-3 rounded-lg border transition-all flex items-center gap-2 ${
                selected === activity.id
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background hover:bg-accent hover:border-accent-foreground/20"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{activity.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
