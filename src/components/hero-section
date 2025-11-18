import { useState } from “react”;
import { Button } from “@/components/ui/button”;
import { Mic, Sparkles, ChevronDown, Loader2, Moon, Zap } from “lucide-react”;
import { motion, AnimatePresence } from “framer-motion”;

interface HeroSectionProps {
userName?: string;
isLoggedIn: boolean;
loading: boolean;
onVoiceInput: () => void;
onSurpriseMe: () => void;
onTogglePickers: () => void;
showPickers: boolean;
}

export const HeroSection = ({
userName,
isLoggedIn,
loading,
onVoiceInput,
onSurpriseMe,
onTogglePickers,
showPickers
}: HeroSectionProps) => {
const [isListening, setIsListening] = useState(false);

return (
<div className="space-y-6 pb-6">
{/* Animated Hero Section */}
<motion.div
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.6 }}
className=“relative px-6 pt-8 pb-10 bg-gradient-to-br from-purple-900/40 via-pink-900/30 to-purple-900/40 rounded-3xl overflow-hidden”
>
{/* Animated background gradient */}
<div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-pink-600/10 to-purple-600/10 animate-gradient" />

```
    <div className="relative z-10 text-center space-y-6">
      {/* Welcome Message */}
      <div className="space-y-2">
        {isLoggedIn && userName ? (
          <>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-purple-300 text-lg">Welcome back,</p>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                {userName}! 👋
              </h1>
            </motion.div>
            <p className="text-gray-300 text-base mt-2">
              Ready for tonight's adventure?
            </p>
          </>
        ) : (
          <>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Your Perfect Night
              </h1>
              <p className="text-xl text-purple-300 mt-1">Awaits ✨</p>
            </motion.div>
            <p className="text-gray-300 text-sm max-w-sm mx-auto mt-3">
              Stop scrolling. Stop debating. Get the perfect dinner + activity combo in seconds.
            </p>
          </>
        )}
      </div>

      {/* Primary CTA - Voice Button */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
      >
        <Button
          onClick={onVoiceInput}
          disabled={loading || isListening}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-8 rounded-2xl shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 text-lg relative overflow-hidden group"
        >
          {/* Pulse animation when listening */}
          {isListening && (
            <motion.div
              className="absolute inset-0 bg-white/20"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
          
          <div className="relative z-10 flex items-center justify-center gap-3">
            {isListening ? (
              <>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                >
                  <Mic className="h-6 w-6" />
                </motion.div>
                <span>Listening...</span>
              </>
            ) : loading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Thinking...</span>
              </>
            ) : (
              <>
                <Mic className="h-6 w-6 group-hover:scale-110 transition-transform" />
                <span>Tell me about your night 🎤</span>
              </>
            )}
          </div>
        </Button>
      </motion.div>

      {/* Secondary Option - Manual Picker Toggle */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <button
          onClick={onTogglePickers}
          className="text-purple-300 hover:text-purple-200 text-sm font-medium transition-colors flex items-center justify-center gap-2 mx-auto group"
        >
          <span>prefer to choose?</span>
          <ChevronDown 
            className={`h-4 w-4 transition-transform duration-300 ${
              showPickers ? 'rotate-180' : ''
            }`}
          />
        </button>
      </motion.div>

      {/* Tertiary Option - Surprise Me */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="pt-4 border-t border-purple-500/20"
      >
        <p className="text-purple-300/60 text-xs mb-3">or skip the questions...</p>
        <Button
          onClick={onSurpriseMe}
          disabled={loading}
          variant="outline"
          className="w-full border-2 border-purple-400/30 hover:border-purple-400/60 bg-transparent hover:bg-purple-500/10 text-purple-300 hover:text-purple-200 font-semibold py-4 rounded-xl transition-all duration-300"
        >
          {loading ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-5 w-5" />
          )}
          Surprise Me! 🎲
        </Button>
      </motion.div>
    </div>
  </motion.div>

  {/* Collapsible Pickers Section */}
  <AnimatePresence>
    {showPickers && (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="overflow-hidden"
      >
        <div className="space-y-6 pt-4">
          {/* This is where your existing pickers will go */}
          {/* Cuisine Type, Activity Selection, Location, etc. */}
          <div className="text-center text-purple-300 text-sm">
            {/* Placeholder - your existing picker components go here */}
            [Your existing cuisine/activity/location pickers]
          </div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
</div>
```

);
};

// Add this to your global CSS or tailwind config for the gradient animation
// @keyframes gradient {
//   0%, 100% { background-position: 0% 50%; }
//   50% { background-position: 100% 50%; }
// }
// .animate-gradient {
//   background-size: 200% 200%;
//   animation: gradient 8s ease infinite;
// }
