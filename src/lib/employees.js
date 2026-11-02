function employeeNameKey(name) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

// Comparison only: never rewrite existing names or employee records.
export function hasDuplicateEmployeeName(employees, name, editingEmployeeId = null) {
  const nameKey = employeeNameKey(name);
  return employees.some((employee) =>
    employee.id !== editingEmployeeId && employeeNameKey(employee.name) === nameKey,
  );
}
