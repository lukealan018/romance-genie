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
      <div style={{display:'flex', flexWrap:'wrap', gap:'8px'}}>
        {activities.map((activity) => {
          const Icon = activity.icon;
          return (
            <button
              key={activity.id}
              onClick={() => onSelect(activity.id)}
              className={`chip ${selected === activity.id ? 'selected' : ''}`}
              style={{display:'inline-flex', alignItems:'center', gap:'6px'}}
            >
              <Icon className="w-4 h-4" />
              <span>{activity.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
