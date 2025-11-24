import { motion } from "framer-motion";
import { Utensils, PartyPopper, Heart } from "lucide-react";

export type SearchMode = "both" | "restaurant_only" | "activity_only";

interface ModeSelectionProps {
  selectedMode: SearchMode | null;
  onModeSelect: (mode: SearchMode) => void;
}

export const ModeSelection = ({ selectedMode, onModeSelect }: ModeSelectionProps) => {
  const modes = [
    {
      id: "both" as SearchMode,
      icon: Heart,
      title: "Full Date Night",
      subtitle: "Dinner + Activity",
      gradient: "from-purple-600 to-pink-600",
      hoverGradient: "from-purple-700 to-pink-700",
    },
    {
      id: "restaurant_only" as SearchMode,
      icon: Utensils,
      title: "Just Dinner",
      subtitle: "Find the perfect spot",
      gradient: "from-blue-600 to-cyan-600",
      hoverGradient: "from-blue-700 to-cyan-700",
    },
    {
      id: "activity_only" as SearchMode,
      icon: PartyPopper,
      title: "Just Activity",
      subtitle: "Something fun to do",
      gradient: "from-orange-600 to-red-600",
      hoverGradient: "from-orange-700 to-red-700",
    },
  ];

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          What's the vibe tonight?
        </h2>
        <p className="text-muted-foreground text-sm">
          Choose what you're looking for
        </p>
      </div>

      {/* Mode Cards */}
      <div className="grid grid-cols-1 gap-4 px-4">
        {modes.map((mode, index) => {
          const Icon = mode.icon;
          const isSelected = selectedMode === mode.id;

          return (
            <motion.button
              key={mode.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              onClick={() => onModeSelect(mode.id)}
              className={`
                relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300
                ${isSelected 
                  ? `bg-gradient-to-r ${mode.gradient} shadow-2xl scale-105` 
                  : 'bg-card hover:bg-accent border border-border'
                }
              `}
            >
              {/* Background gradient effect when selected */}
              {isSelected && (
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-r ${mode.hoverGradient} opacity-0`}
                  animate={{ opacity: [0, 0.3, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}

              {/* Content */}
              <div className="relative z-10 flex items-center gap-4">
                {/* Icon */}
                <div className={`
                  w-14 h-14 rounded-full flex items-center justify-center
                  ${isSelected 
                    ? 'bg-white/20' 
                    : `bg-gradient-to-r ${mode.gradient}`
                  }
                `}>
                  <Icon className="h-7 w-7 text-white" />
                </div>

                {/* Text */}
                <div className="flex-1">
                  <h3 className={`text-xl font-bold ${isSelected ? 'text-white' : 'text-foreground'}`}>
                    {mode.title}
                  </h3>
                  <p className={`text-sm ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>
                    {mode.subtitle}
                  </p>
                </div>

                {/* Selected indicator */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-6 h-6 rounded-full bg-white flex items-center justify-center"
                  >
                    <svg
                      className="w-4 h-4 text-purple-600"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="3"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                  </motion.div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
