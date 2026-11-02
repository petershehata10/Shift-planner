// Keep the read result for the lifetime of the mounted app. An unsafe read
// must never become permission to replace the original value with a fallback.
export function loadSavedArray(key, fallback, normalize = (value) => value,
  getStorage = () => window.localStorage) {
  let storage;
  let raw;
  try {
    storage = getStorage();
    raw = storage.getItem(key);
  } catch {
    return { value: normalize(fallback), status: "read-error", writable: false };
  }

  if (raw === null) {
    return { value: normalize(fallback), status: "missing", writable: true, storage };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { value: normalize(fallback), status: "malformed-json", writable: false };
  }
  if (!Array.isArray(parsed)) {
    return { value: normalize(fallback), status: "invalid-shape", writable: false };
  }
  try {
    return { value: normalize(parsed), status: "valid", writable: true, storage };
  } catch {
    // Existing normalization can also reject unusable records within an array.
    return { value: normalize(fallback), status: "invalid-shape", writable: false };
  }
}

export function persistSavedArray(key, value, loaded) {
  if (!loaded.writable) return "blocked";
  try {
    loaded.storage.setItem(key, JSON.stringify(value));
    return "saved";
  } catch {
    return "write-error";
  }
}
