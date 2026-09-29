import React, { createContext, useContext, useState, useCallback } from "react";
import { LIGHT_COLORS, DARK_COLORS, ThemeColors, ThemeMode } from "../constants/theme";

interface ThemeContextValue {
  themeMode: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeMode: "light",
  colors: LIGHT_COLORS,
  toggleTheme: () => {},
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");

  const toggleTheme = useCallback(() => {
    setThemeMode((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  const colors = themeMode === "dark" ? DARK_COLORS : LIGHT_COLORS;
  const isDark = themeMode === "dark";

  return (
    <ThemeContext.Provider value={{ themeMode, colors, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
