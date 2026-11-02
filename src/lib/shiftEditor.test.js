import test from "node:test";
import assert from "node:assert/strict";
import { createShiftEditorForm, editorSnapshot, hasUnsavedEditorChanges } from "./shiftEditor.js";

const defaults = { type: "shift", day: "Monday", start: "03:00", end: "11:00", employeeId: "", departmentId: "baking", taskAssignments: [] };
const departments = [{ id: "baking" }, { id: "drivers" }];

test("generic Add opening uses existing default start and calculated end", () => {
  const form = createShiftEditorForm(defaults, departments);
  assert.equal(form.day, "Monday");
  assert.equal(form.employeeId, "");
  assert.equal(form.start, "03:00");
  assert.equal(form.end, "11:30");
  assert.equal(form.type, "shift");
});

test("cell Add opening preserves employee/day with a compatible dropdown department", () => {
  const form = createShiftEditorForm(defaults, departments, {
    employee: { id: 7, departmentIds: ["drivers"] }, day: "Sunday",
  });
  assert.equal(form.employeeId, "7");
  assert.equal(form.day, "Sunday");
  assert.equal(form.departmentId, "drivers");
  assert.deepEqual(form.taskAssignments, []);
});

test("Edit preserves shift, vacation and unavailability values without mutating records", () => {
  for (const type of ["shift", "vacation", "unavailability"]) {
    const shift = { id: 9, type, day: "Tuesday", start: "22:00", end: "06:00", employeeId: 7,
      departmentId: "drivers", taskAssignments: [{ departmentId: "drivers", task: "Delivery" }] };
    const original = structuredClone(shift);
    const form = createShiftEditorForm(defaults, departments, { shift });
    assert.deepEqual(form, { type, day: shift.day, start: shift.start, end: shift.end,
      employeeId: "7", departmentId: "drivers", taskAssignments: shift.taskAssignments });
    form.taskAssignments[0].task = "Changed";
    assert.deepEqual(shift, original);
  }
});

test("closing unchanged forms needs no discard prompt; changing fields or week does", () => {
  const form = createShiftEditorForm(defaults, departments);
  const baseline = editorSnapshot(form, "2026-11-02");
  assert.equal(hasUnsavedEditorChanges(baseline, form, "2026-11-02"), false);
  assert.equal(hasUnsavedEditorChanges(baseline, { ...form, day: "Friday" }, "2026-11-02"), true);
  assert.equal(hasUnsavedEditorChanges(baseline, form, "2026-11-09"), true);
  assert.equal(hasUnsavedEditorChanges(null, form, "2026-11-02"), false);
});

test("reopening Add starts fresh after an edited form", () => {
  const first = createShiftEditorForm(defaults, departments);
  first.taskAssignments.push({ departmentId: "baking", task: "Bread" });
  first.employeeId = "7";
  const second = createShiftEditorForm(defaults, departments);
  assert.equal(second.employeeId, "");
  assert.deepEqual(second.taskAssignments, []);
  assert.deepEqual(defaults.taskAssignments, []);
});
