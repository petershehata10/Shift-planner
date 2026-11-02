import { useEffect, useState } from "react";
import { loadSavedArray, persistSavedArray } from "./storage.js";

export function useSavedArray(key, fallback, normalize) {
  const [loaded] = useState(() => loadSavedArray(key, fallback, normalize));
  const [value, setValue] = useState(loaded.value);
  const [writeFailed, setWriteFailed] = useState(false);

  useEffect(() => {
    const result = persistSavedArray(key, value, loaded);
    setWriteFailed(result === "write-error");
  }, [key, value, loaded]);

  return [value, setValue, !loaded.writable, writeFailed];
}
