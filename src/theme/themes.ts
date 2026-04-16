import type { Theme } from "../types";

const baseFonts = {
  body: '"Charter", "Bitstream Charter", "Sitka Text", Cambria, serif',
  mono: '"SF Mono", "Fira Code", "Fira Mono", Menlo, Consolas, monospace',
};

export const lightTheme: Theme = {
  name: "light",
  label: "Light",
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
  fonts: baseFonts,
  background: { type: "solid" },
};

export const darkTheme: Theme = {
  name: "dark",
  label: "Dark",
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
  fonts: baseFonts,
  background: { type: "solid" },
};

// Translucent dark palette used by shader-backed themes so the shader shows through.
const translucentDarkColors: Record<string, string> = {
  "bg-primary": "rgba(20, 18, 22, 0.55)",
  "bg-secondary": "rgba(32, 28, 36, 0.72)",
  "bg-tertiary": "rgba(44, 38, 50, 0.78)",
  "bg-hover": "rgba(44, 38, 50, 0.82)",
  "bg-active": "rgba(56, 48, 64, 0.88)",
  "text-primary": "#f2ece6",
  "text-secondary": "#b9b0b7",
  "text-tertiary": "#7a7080",
  "border": "rgba(255, 255, 255, 0.10)",
  "border-light": "rgba(255, 255, 255, 0.06)",
  "accent": "#c7a3ff",
  "accent-hover": "#d9bbff",
  "accent-text": "#1a1620",
  "success": "#8ecf9d",
  "danger": "#ef8a7c",
  "warning": "#f1c270",
  "chat-user": "rgba(60, 50, 80, 0.75)",
  "chat-assistant": "rgba(30, 26, 38, 0.78)",
  "shadow": "rgba(0, 0, 0, 0.4)",
};

export const auroraTheme: Theme = {
  name: "aurora",
  label: "Aurora",
  colors: {
    ...translucentDarkColors,
    "accent": "#a6f3d5",
    "accent-hover": "#c5f9e4",
    "chat-user": "rgba(50, 80, 90, 0.72)",
  },
  fonts: baseFonts,
  background: {
    type: "meshGradient",
    colors: ["#1a2b3c", "#2d6a7f", "#8ae6c7", "#5b3a8a", "#1a1626"],
    distortion: 0.85,
    swirl: 0.55,
    speed: 0.25,
    grainOverlay: 0.08,
  },
  backgroundOpacity: 1,
};

export const wavesTheme: Theme = {
  name: "waves",
  label: "Waves",
  colors: {
    ...translucentDarkColors,
    "bg-primary": "rgba(16, 20, 30, 0.58)",
    "bg-secondary": "rgba(26, 32, 46, 0.76)",
    "bg-tertiary": "rgba(36, 44, 62, 0.82)",
    "bg-hover": "rgba(36, 44, 62, 0.86)",
    "bg-active": "rgba(50, 60, 82, 0.9)",
    "accent": "#7fd4ff",
    "accent-hover": "#a1e0ff",
    "chat-user": "rgba(40, 70, 110, 0.72)",
    "chat-assistant": "rgba(22, 28, 42, 0.8)",
  },
  fonts: baseFonts,
  background: {
    type: "waves",
    colorBack: "#0c1220",
    colorFront: "#2a4a7a",
    frequency: 0.75,
    amplitude: 0.5,
    spacing: 0.55,
    softness: 0.9,
    rotation: 15,
  },
  backgroundOpacity: 1,
};

export const dotsTheme: Theme = {
  name: "dots",
  label: "Dots",
  colors: {
    ...translucentDarkColors,
    "bg-primary": "rgba(18, 18, 22, 0.62)",
    "bg-secondary": "rgba(28, 28, 34, 0.78)",
    "bg-tertiary": "rgba(40, 38, 48, 0.84)",
    "bg-hover": "rgba(40, 38, 48, 0.88)",
    "bg-active": "rgba(56, 52, 68, 0.92)",
    "accent": "#ffb27a",
    "accent-hover": "#ffc79a",
    "chat-user": "rgba(80, 50, 40, 0.75)",
  },
  fonts: baseFonts,
  background: {
    type: "dotOrbit",
    colorBack: "#100d14",
    colors: ["#ff8a5a", "#ffd27a", "#a6f3d5", "#c7a3ff", "#7fd4ff"],
    size: 0.22,
    sizeRange: 0.35,
    spreading: 0.55,
    speed: 0.7,
  },
  backgroundOpacity: 1,
};

export const themes: Record<string, Theme> = {
  light: lightTheme,
  dark: darkTheme,
  aurora: auroraTheme,
  waves: wavesTheme,
  dots: dotsTheme,
};

export const themeList: Theme[] = [
  lightTheme,
  darkTheme,
  auroraTheme,
  wavesTheme,
  dotsTheme,
];
