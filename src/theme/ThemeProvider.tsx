import { createContext } from "preact";
import { useContext, useEffect } from "preact/hooks";
import { signal, computed } from "@preact/signals";
import type { Theme } from "../types";
import { themes, darkTheme } from "./themes";

const themeName = signal<string>("dark");

export const currentTheme = computed<Theme>(
  () => themes[themeName.value] ?? darkTheme,
);

export function setTheme(name: string) {
  themeName.value = name;
}

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (name: string) => void;
}>({
  theme: darkTheme,
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme.colors)) {
    root.style.setProperty(`--color-${key}`, value);
  }
  root.style.setProperty("--font-body", theme.fonts.body);
  root.style.setProperty("--font-mono", theme.fonts.mono);
}

export function ThemeProvider({ children }: { children: preact.ComponentChildren }) {
  const theme = currentTheme.value;

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
