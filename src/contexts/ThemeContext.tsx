import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ThemeName = "sapphire-night" | "rose-twilight" | "midnight-matte";

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "app-theme";
const THEME_ORDER: ThemeName[] = ["sapphire-night", "rose-twilight", "midnight-matte"];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeName | null;
      if (stored && THEME_ORDER.includes(stored)) {
        return stored;
      }
    }
    return "sapphire-night"; // Default theme
  });

  useEffect(() => {
    // Remove all theme classes
    document.documentElement.classList.remove(...THEME_ORDER);
    // Add current theme class
    document.documentElement.classList.add(theme);
    // Persist to localStorage
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
  };

  const cycleTheme = () => {
    const currentIndex = THEME_ORDER.indexOf(theme);
    const nextIndex = (currentIndex + 1) % THEME_ORDER.length;
    setThemeState(THEME_ORDER[nextIndex]);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useAppTheme must be used within a ThemeProvider");
  }
  return context;
}

export const themeDisplayNames: Record<ThemeName, string> = {
  "sapphire-night": "Sapphire",
  "rose-twilight": "Pink Glow",
  "midnight-matte": "Matte",
};
