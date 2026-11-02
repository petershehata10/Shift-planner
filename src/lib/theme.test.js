import test from "node:test";
import assert from "node:assert/strict";
import {
  THEME_STORAGE_KEY,
  THEMES,
  VALID_THEMES,
  getStoredTheme,
  setStoredTheme,
  resolveTheme,
  applyThemeToDocument,
} from "./theme.js";

function createMockStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    has(key) {
      return store.has(key);
    },
    get(key) {
      return store.get(key);
    },
  };
}

test("theme storage defaults to 'system' when unconfigured", () => {
  const storage = createMockStorage();
  assert.equal(getStoredTheme(storage), THEMES.SYSTEM);
});

test("theme storage retrieves valid configured themes", () => {
  for (const theme of VALID_THEMES) {
    const storage = createMockStorage({ [THEME_STORAGE_KEY]: theme });
    assert.equal(getStoredTheme(storage), theme);
  }
});

test("theme storage ignores invalid values and falls back to 'system'", () => {
  const invalidValues = ["blue", "high-contrast", "", "123", "SYSTEM", "LIGHT"];
  for (const val of invalidValues) {
    const storage = createMockStorage({ [THEME_STORAGE_KEY]: val });
    assert.equal(getStoredTheme(storage), THEMES.SYSTEM);
  }
});

test("setStoredTheme safely writes only valid themes", () => {
  const storage = createMockStorage();

  setStoredTheme("light", storage);
  assert.equal(storage.get(THEME_STORAGE_KEY), "light");

  setStoredTheme("dark", storage);
  assert.equal(storage.get(THEME_STORAGE_KEY), "dark");

  setStoredTheme("system", storage);
  assert.equal(storage.get(THEME_STORAGE_KEY), "system");

  // Invalid value should not overwrite current valid preference
  setStoredTheme("invalid-theme", storage);
  assert.equal(storage.get(THEME_STORAGE_KEY), "system");
});

test("theme storage is completely isolated from core shift-planner keys", () => {
  const initialData = {
    shiftPlannerEmployees: JSON.stringify([{ id: 1, name: "Test Baker" }]),
    shiftPlannerShifts: JSON.stringify([]),
    shiftPlannerDepartments: JSON.stringify([]),
  };
  const storage = createMockStorage(initialData);

  setStoredTheme("dark", storage);

  // Core application data keys must remain 100% untouched
  assert.equal(storage.get("shiftPlannerEmployees"), initialData.shiftPlannerEmployees);
  assert.equal(storage.get("shiftPlannerShifts"), initialData.shiftPlannerShifts);
  assert.equal(storage.get("shiftPlannerDepartments"), initialData.shiftPlannerDepartments);
  assert.equal(storage.get(THEME_STORAGE_KEY), "dark");
});

test("resolveTheme correctly resolves explicit choices", () => {
  assert.equal(resolveTheme("light"), "light");
  assert.equal(resolveTheme("dark"), "dark");
  // In node environment without matchMedia, system resolves to fallback 'light'
  assert.equal(resolveTheme("system"), "light");
  assert.equal(resolveTheme("unknown"), "light");
});

test("applyThemeToDocument sets data-theme attribute on documentElement", () => {
  const mockDoc = {
    documentElement: {
      attributes: {},
      setAttribute(name, value) {
        this.attributes[name] = value;
      },
      getAttribute(name) {
        return this.attributes[name];
      },
    },
  };

  applyThemeToDocument("dark", mockDoc);
  assert.equal(mockDoc.documentElement.getAttribute("data-theme"), "dark");

  applyThemeToDocument("light", mockDoc);
  assert.equal(mockDoc.documentElement.getAttribute("data-theme"), "light");
});

