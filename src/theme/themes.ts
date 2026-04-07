import type { Theme } from "../types";

export const lightTheme: Theme = {
  name: "light",
  colors: {
    "bg-primary": "#faf8f4",
    "bg-secondary": "#f2ede6",
    "bg-tertiary": "#e7e0d6",
    "bg-hover": "#ece6dd",
    "bg-active": "#dfd8cc",
    "text-primary": "#2c2520",
    "text-secondary": "#7a7067",
    "text-tertiary": "#b0a89e",
    "border": "#d6cfc5",
    "border-light": "#e7e0d6",
    "accent": "#2e5c8a",
    "accent-hover": "#3a6d9e",
    "accent-text": "#faf8f4",
    "success": "#5a8a5c",
    "danger": "#c45a4a",
    "warning": "#c8923a",
    "chat-user": "#e5ddd2",
    "chat-assistant": "#f2ede6",
    "shadow": "rgba(60, 45, 30, 0.08)",
  },
  fonts: {
    body: '"Charter", "Bitstream Charter", "Sitka Text", Cambria, serif',
    mono: '"SF Mono", "Fira Code", "Fira Mono", Menlo, Consolas, monospace',
  },
};

export const darkTheme: Theme = {
  name: "dark",
  colors: {
    "bg-primary": "#1f1c18",
    "bg-secondary": "#2a2621",
    "bg-tertiary": "#36312a",
    "bg-hover": "#332e27",
    "bg-active": "#3f3930",
    "text-primary": "#e8e0d6",
    "text-secondary": "#9a9088",
    "text-tertiary": "#6a6058",
    "border": "#3a3530",
    "border-light": "#2e2a24",
    "accent": "#6a9ec4",
    "accent-hover": "#82b2d4",
    "accent-text": "#1f1c18",
    "success": "#7aaa7c",
    "danger": "#d4726a",
    "warning": "#d4a85a",
    "chat-user": "#2a3540",
    "chat-assistant": "#2a2621",
    "shadow": "rgba(0, 0, 0, 0.25)",
  },
  fonts: {
    body: '"Charter", "Bitstream Charter", "Sitka Text", Cambria, serif',
    mono: '"SF Mono", "Fira Code", "Fira Mono", Menlo, Consolas, monospace',
  },
};

export const themes: Record<string, Theme> = {
  light: lightTheme,
  dark: darkTheme,
};
