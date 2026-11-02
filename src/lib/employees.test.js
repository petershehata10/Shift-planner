import test from "node:test";
import assert from "node:assert/strict";
import { hasDuplicateEmployeeName } from "./employees.js";
import { loadSavedArray, persistSavedArray } from "./storage.js";

const employees = [
  { id: 1, name: "Peter", departmentIds: ["baking"] },
  { id: 2, name: "Alex Morgan", departmentIds: ["mixers"] },
];

test("adding the same name, case variants and surrounding spaces is blocked", () => {
  for (const name of ["Peter", "peter", " Peter ", " PETER "]) {
    assert.equal(hasDuplicateEmployeeName(employees, name), true);
  }
});

test("repeated internal whitespace cannot bypass duplicate checks", () => {
  for (const name of ["Alex  Morgan", " alex   MORGAN ", "Alex\tMorgan"]) {
    assert.equal(hasDuplicateEmployeeName(employees, name), true);
  }
  assert.equal(hasDuplicateEmployeeName([
    { id: 3, name: "  Alex   Morgan  " },
  ], "Alex Morgan"), true);
});

test("editing excludes only the employee being edited", () => {
  assert.equal(hasDuplicateEmployeeName(employees, "Peter", 1), false);
  assert.equal(hasDuplicateEmployeeName(employees, " peter ", 1), false);
  assert.equal(hasDuplicateEmployeeName(employees, "Alex  Morgan", 1), true);
  assert.equal(hasDuplicateEmployeeName(employees, "Peter", 2), true);
});

test("different names are allowed for creation and renaming", () => {
  assert.equal(hasDuplicateEmployeeName([], "Peter"), false);
  assert.equal(hasDuplicateEmployeeName(employees, "Taylor"), false);
  assert.equal(hasDuplicateEmployeeName(employees, "Taylor", 1), false);
});

test("existing duplicates load and persist without being removed or changed", () => {
  const records = [
    ...employees,
    { id: 3, name: " peter ", departmentIds: ["drivers"] },
  ];
  const snapshot = structuredClone(records);
  let raw = JSON.stringify(records);
  const storage = {
    getItem: () => raw,
    setItem: (_key, value) => { raw = value; },
  };
  const loaded = loadSavedArray("shiftPlannerEmployees", [], undefined, () => storage);
  assert.equal(loaded.status, "valid");
  assert.deepEqual(loaded.value, snapshot);
  assert.equal(hasDuplicateEmployeeName(loaded.value, "PETER"), true);
  assert.equal(hasDuplicateEmployeeName(loaded.value, "Taylor", 1), false);
  assert.deepEqual(loaded.value, snapshot);
  assert.equal(persistSavedArray("shiftPlannerEmployees", loaded.value, loaded), "saved");
  assert.deepEqual(JSON.parse(raw), snapshot);
});
