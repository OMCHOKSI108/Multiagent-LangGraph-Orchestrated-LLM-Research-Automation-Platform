import { useEffect, useState } from "react";

const SETTINGS_KEY = "deepResearchUserSettings";

export interface UserSettings {
  fullName: string;
  username: string;
  bio: string;
  dob: string; // ISO date string or empty
  personalizationPrompt: string;
  defaultDepth: "Fast" | "Balanced" | "Deep";
  outputStyle: "Concise" | "Detailed" | "Report-like";
  citationPreference: "Minimal" | "Standard" | "Full";
  exportPreference: "PDF" | "LaTeX" | "Markdown";
}

// Default settings
export const defaultSettings: UserSettings = {
  fullName: "Om Choksi",
  username: "omchoksi108",
  bio: "AI/ML student building research automation and multi-agent systems.",
  dob: "",
  personalizationPrompt: "I prefer structured explanations with clear steps, technical depth, examples, and source-backed reasoning.",
  defaultDepth: "Deep",
  outputStyle: "Detailed",
  citationPreference: "Standard",
  exportPreference: "PDF",
};

// Load settings from localStorage
export const loadSettings = (): UserSettings => {
  if (typeof window === "undefined") return defaultSettings;
  const stored = localStorage.getItem(SETTINGS_KEY);
  if (!stored) return defaultSettings;
  try {
    const parsed = JSON.parse(stored) as Partial<UserSettings>;
    return { ...defaultSettings, ...parsed };
  } catch {
    return defaultSettings;
  }
};

// Save settings to localStorage
export const saveSettings = (settings: UserSettings) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

// Hook to manage settings in component state
export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings>(() => loadSettings());

  // Update localStorage when settings change
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  return { settings, updateSettings };
}