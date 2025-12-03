import { useAppTheme, themeDisplayNames, ThemeName } from "@/contexts/ThemeContext";
import { Palette } from "lucide-react";
import { motion } from "framer-motion";

interface ThemeSwitcherProps {
  variant?: "button" | "pill";
}

export function ThemeSwitcher({ variant = "button" }: ThemeSwitcherProps) {
  const { theme, cycleTheme } = useAppTheme();

  if (variant === "pill") {
    return (
      <motion.button
        onClick={cycleTheme}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200"
        style={{
          background: 'rgba(var(--theme-accent-rgb), 0.15)',
          border: '1px solid rgba(var(--theme-accent-rgb), 0.4)',
          color: 'var(--header-title-color)',
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span>Change Mode</span>
      </motion.button>
    );
  }

  return (
    <motion.button
      onClick={cycleTheme}
      className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
      whileHover={{ 
        background: 'rgba(255,255,255,0.08)',
        borderColor: 'rgba(var(--theme-accent-rgb), 0.4)',
      }}
      whileTap={{ scale: 0.98 }}
    >
      <Palette className="h-4 w-4 header-icon" />
      <span className="text-sm" style={{ color: 'var(--header-title-color)' }}>
        {themeDisplayNames[theme]}
      </span>
    </motion.button>
  );
}

export function ThemeSelector() {
  const { theme, setTheme } = useAppTheme();
  const themes: ThemeName[] = ["sapphire-night", "rose-twilight", "midnight-matte"];

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium" style={{ color: 'var(--header-title-color)' }}>
        Theme
      </label>
      <div className="flex gap-2 flex-wrap">
        {themes.map((t) => (
          <motion.button
            key={t}
            onClick={() => setTheme(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
              theme === t ? 'ring-2 ring-[var(--theme-accent)]' : ''
            }`}
            style={{
              background: theme === t ? 'var(--chip-selected-bg)' : 'var(--chip-bg)',
              borderColor: theme === t ? 'var(--chip-selected-border)' : 'var(--chip-border)',
              color: theme === t ? 'var(--chip-selected-text)' : 'var(--chip-text)',
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {themeDisplayNames[t]}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
