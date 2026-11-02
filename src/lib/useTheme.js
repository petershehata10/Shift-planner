import { useState, useEffect, useCallback } from "react";
import {
  THEMES,
  getStoredTheme,
  setStoredTheme,
  resolveTheme,
  applyThemeToDocument,
} from "./theme.js";

/**
 * Hook to manage theme preference ('system' | 'light' | 'dark')
 * and apply data-theme attribute on document.documentElement.
 */
export function useTheme() {
  const [themePreference, setThemePreferenceState] = useState(() => getStoredTheme());
  const [resolvedTheme, setResolvedTheme] = useState(() => resolveTheme(getStoredTheme()));

  const setTheme = useCallback((newTheme) => {
    setStoredTheme(newTheme);
    setThemePreferenceState(newTheme);
    const resolved = resolveTheme(newTheme);
    setResolvedTheme(resolved);
    applyThemeToDocument(resolved);
  }, []);

  useEffect(() => {
    const resolved = resolveTheme(themePreference);
    setResolvedTheme(resolved);
    applyThemeToDocument(resolved);

    if (themePreference === THEMES.SYSTEM && typeof window !== "undefined" && typeof window.matchMedia === "function") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e) => {
        const sysTheme = e.matches ? THEMES.DARK : THEMES.LIGHT;
        setResolvedTheme(sysTheme);
        applyThemeToDocument(sysTheme);
      };

      if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.addEventListener("change", handler);
        return () => mediaQuery.removeEventListener("change", handler);
      } else if (typeof mediaQuery.addListener === "function") {
        mediaQuery.addListener(handler);
        return () => mediaQuery.removeListener(handler);
      }
    }
  }, [themePreference]);

  return {
    themePreference,
    resolvedTheme,
    setTheme,
  };
}

