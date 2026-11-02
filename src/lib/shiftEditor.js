import { calculateDefaultShiftEnd } from "./scheduling.js";

export function createShiftEditorForm(defaults, departments, { shift, employee, day } = {}) {
  if (shift) {
    return {
      type: shift.type || "shift", day: shift.day, start: shift.start, end: shift.end,
      employeeId: String(shift.employeeId),
      departmentId: shift.departmentId || departments[0]?.id || "",
      taskAssignments: shift.taskAssignments.map((assignment) => ({ ...assignment })),
    };
  }
  const departmentId = employee
    ? departments.find((department) => employee.departmentIds.includes(department.id))?.id
    : undefined;
  return {
    ...defaults,
    end: calculateDefaultShiftEnd(defaults.start),
    employeeId: employee ? String(employee.id) : "",
    day: day || defaults.day,
    departmentId: departmentId || departments[0]?.id || "",
    taskAssignments: [],
  };
}

export function editorSnapshot(form, weekStart) {
  return JSON.stringify({ form, weekStart });
}

export function hasUnsavedEditorChanges(baseline, form, weekStart) {
  return baseline !== null && baseline !== editorSnapshot(form, weekStart);
}
