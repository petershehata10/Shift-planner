export const THEME_STORAGE_KEY = "shiftPlannerTheme";

export const THEMES = {
  SYSTEM: "system",
  LIGHT: "light",
  DARK: "dark",
};

export const VALID_THEMES = [THEMES.SYSTEM, THEMES.LIGHT, THEMES.DARK];

/**
 * Reads the stored theme safely.
 * Never touches shiftPlannerEmployees, shiftPlannerShifts, or shiftPlannerDepartments.
 */
export function getStoredTheme(storage = typeof localStorage !== "undefined" ? localStorage : null) {
  if (!storage) return THEMES.SYSTEM;
  try {
    const val = storage.getItem(THEME_STORAGE_KEY);
    if (val && VALID_THEMES.includes(val)) {
      return val;
    }
  } catch {
    // If access is restricted or throws, safely default to system
  }
  return THEMES.SYSTEM;
}

/**
 * Saves the theme preference.
 */
export function setStoredTheme(theme, storage = typeof localStorage !== "undefined" ? localStorage : null) {
  if (!VALID_THEMES.includes(theme)) return;
  if (!storage) return;
  try {
    storage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Graceful fallback for storage quota or privacy mode errors
  }
}

/**
 * Detects whether the system/OS prefers dark mode.
 */
export function getSystemTheme() {
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    try {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? THEMES.DARK : THEMES.LIGHT;
    } catch {
      return THEMES.LIGHT;
    }
  }
  return THEMES.LIGHT;
}

/**
 * Resolves a preference (system/light/dark) into an effective 'light' or 'dark' value.
 */
export function resolveTheme(preference) {
  if (preference === THEMES.DARK || preference === THEMES.LIGHT) {
    return preference;
  }
  return getSystemTheme();
}

/**
 * Applies the theme attribute to the root document element.
 */
export function applyThemeToDocument(resolvedTheme, doc = typeof document !== "undefined" ? document : null) {
  if (!doc?.documentElement) return;
  doc.documentElement.setAttribute("data-theme", resolvedTheme);
}

