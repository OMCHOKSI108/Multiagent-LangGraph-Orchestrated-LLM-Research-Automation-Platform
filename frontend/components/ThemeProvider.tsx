"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  resolvedTheme: Theme;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "marp-theme";

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  return null;
}

function getInitialTheme(): Theme {
  const stored = getStoredTheme();
  if (stored) return stored;
  return "light"; // Default to light — user can toggle to dark
}

// Subscribe to system theme changes
function subscribeToSystemTheme(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => callback();
  
  mediaQuery.addEventListener("change", handler);
  return () => mediaQuery.removeEventListener("change", handler);
}

function getSystemSnapshot(): Theme {
  return getSystemTheme();
}

function getServerSnapshot(): Theme {
  return "light"; // SSR default matches new CSS :root default
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);
  const [resolvedTheme, setResolvedTheme] = useState<Theme>("light");
  
  // Subscribe to system theme for live updates
  useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemSnapshot,
    getServerSnapshot
  );

  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    setResolvedTheme(getStoredTheme() || getSystemTheme());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const root = document.documentElement;
    
    // Set data-theme attribute (for CSS variables)
    root.setAttribute("data-theme", theme);
    
    // Add/remove .dark class for Tailwind dark mode
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    
    // Persist to localStorage
    localStorage.setItem(STORAGE_KEY, theme);
    setResolvedTheme(theme);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", theme === "dark" ? "#0B0F1A" : "#FFFFFF");
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === "dark" ? "light" : "dark";
      return next;
    });
  };

  // Prevent hydration mismatch by not rendering children until mounted
  // This prevents flash of wrong theme on initial load
  const contextValue: ThemeContextValue = {
    theme,
    toggleTheme,
    resolvedTheme: mounted ? resolvedTheme : "light",
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}

// Hook to check if theme has been resolved (for SSR hydration)
export function useThemeMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
