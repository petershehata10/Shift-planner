import test from "node:test";
import assert from "node:assert/strict";
import { loadSavedArray, persistSavedArray } from "./storage.js";

function fakeStorage(entries = {}) {
  const values = new Map(Object.entries(entries));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, value),
  };
}

function load(storage, key, fallback = [], normalize) {
  return loadSavedArray(key, fallback, normalize, () => storage);
}

test("missing keys use and persist the existing fallback", () => {
  const storage = fakeStorage();
  const fallback = [{ id: "baking", tasks: [] }];
  const loaded = load(storage, "departments", fallback);
  assert.equal(loaded.status, "missing");
  assert.deepEqual(loaded.value, fallback);
  assert.equal(persistSavedArray("departments", loaded.value, loaded), "saved");
  assert.deepEqual(JSON.parse(storage.getItem("departments")), fallback);
});

test("valid records load, normalize and persist edits normally", () => {
  const storage = fakeStorage({ shifts: '[{"id":1}]' });
  const loaded = load(storage, "shifts", [], (items) => items.map((item) => ({ ...item, type: "shift" })));
  assert.equal(loaded.status, "valid");
  assert.deepEqual(loaded.value, [{ id: 1, type: "shift" }]);
  const edited = [...loaded.value, { id: 2, type: "shift" }];
  assert.equal(persistSavedArray("shifts", edited, loaded), "saved");
  assert.deepEqual(JSON.parse(storage.getItem("shifts")), edited);
});

for (const raw of ['  {broken\n', '', 'null', '{}', '"text"', '42', 'false']) {
  test(`unsafe data survives repeated startup persistence and later edits: ${JSON.stringify(raw)}`, () => {
    const storage = fakeStorage({ employees: raw });
    const loaded = load(storage, "employees");
    assert.equal(loaded.status, raw === '' || raw.includes('broken') ? "malformed-json" : "invalid-shape");
    assert.deepEqual(loaded.value, []);
    // Same persistence function used by the hook's effect, including StrictMode replay.
    for (const value of [loaded.value, loaded.value, [{ id: 1 }]]) {
      assert.equal(persistSavedArray("employees", value, loaded), "blocked");
      assert.equal(storage.getItem("employees"), raw);
    }
  });
}

test("three keys load and persist independently", () => {
  const storage = fakeStorage({
    shiftPlannerEmployees: "broken",
    shiftPlannerShifts: '[{"id":1}]',
    shiftPlannerDepartments: '[]',
  });
  for (const key of ["shiftPlannerEmployees", "shiftPlannerShifts", "shiftPlannerDepartments"]) {
    const loaded = load(storage, key);
    assert.equal(persistSavedArray(key, loaded.value, loaded), key === "shiftPlannerEmployees" ? "blocked" : "saved");
  }
  assert.equal(storage.getItem("shiftPlannerEmployees"), "broken");
  assert.equal(storage.getItem("shiftPlannerShifts"), '[{"id":1}]');
  assert.equal(storage.getItem("shiftPlannerDepartments"), '[]');
});

test("unusable records rejected by normalization remain untouched", () => {
  const storage = fakeStorage({ shifts: '[null]' });
  const loaded = load(storage, "shifts", [], (items) => items.map((item) => item.id));
  assert.equal(loaded.status, "invalid-shape");
  assert.equal(persistSavedArray("shifts", [], loaded), "blocked");
  assert.equal(storage.getItem("shifts"), '[null]');
});

test("storage access and read exceptions block writes safely", () => {
  for (const getStorage of [
    () => { throw new Error("denied"); },
    () => ({ getItem() { throw new Error("denied"); } }),
  ]) {
    const loaded = loadSavedArray("employees", [], undefined, getStorage);
    assert.equal(loaded.status, "read-error");
    assert.deepEqual(loaded.value, []);
    assert.equal(persistSavedArray("employees", [], loaded), "blocked");
  }
});

test("failed writes do not throw and can be retried", () => {
  const storage = fakeStorage({ employees: '[]' });
  const loaded = load(storage, "employees");
  const originalSet = storage.setItem;
  storage.setItem = () => { throw new Error("quota exceeded"); };
  assert.equal(persistSavedArray("employees", [{ id: 1 }], loaded), "write-error");
  assert.equal(storage.getItem("employees"), '[]');
  storage.setItem = originalSet;
  assert.equal(persistSavedArray("employees", [{ id: 1 }], loaded), "saved");
});
