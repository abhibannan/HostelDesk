import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LIGHT_COLORS, DARK_COLORS, ThemeColors, ThemeMode, applyTheme } from "../constants/theme";

const THEME_STORAGE_KEY = "@staynexa_theme_mode";

interface ThemeContextValue {
  themeMode: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeMode: "light",
  colors: LIGHT_COLORS,
  toggleTheme: () => {},
  setTheme: () => {},
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>("light");

  useEffect(() => {
    async function loadSavedTheme() {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved === "dark" || saved === "light") {
          setThemeModeState(saved);
          applyTheme(saved);
        }
      } catch {
        // default to light
      }
    }
    void loadSavedTheme();
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    applyTheme(mode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeModeState((prev) => {
      const next: ThemeMode = prev === "light" ? "dark" : "light";
      applyTheme(next);
      AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const colors = themeMode === "dark" ? DARK_COLORS : LIGHT_COLORS;
  const isDark = themeMode === "dark";

  return (
    <ThemeContext.Provider value={{ themeMode, colors, toggleTheme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
