import { Fragment, useMemo, useRef, useState } from "react";
import "./App.css";
import { useSavedArray } from "./lib/useSavedArray.js";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const DEFAULT_DEPARTMENTS = [
  {
    id: "baking",
    name: "Baking",
    color: "#8B5E3C",
    tasks: [
      "Focaccia & Pizza",
      "Baking Breads",
      "Preparations & Shaping",
      "Cleaning",
      "Sandwiches",
    ],
  },
  {
    id: "mixers",
    name: "Mixers",
    color: "#E58A2B",
    tasks: [
      "Mix Breads",
      "Mix Brioche",
      "Mix Sourdough",
      "Mix Zito",
    ],
  },
  {
    id: "sweets",
    name: "Sweets",
    color: "#D65A8A",
    tasks: [
      "Snails",
      "Loupák & Bulky",
      "Koláčky",
      "Preparations",
    ],
  },
  {
    id: "drivers",
    name: "Drivers",
    color: "#C83A3A",
    tasks: ["Shop Delivery", "Companies Delivery"],
  },
  {
    id: "cleaners",
    name: "Cleaners",
    color: "#687386",
    tasks: [
      "Dishes",
      "Mixers",
      "Trays",
      "Floor",
      "Garage",
      "Closing",
    ],
  },
];

const EMPTY_EMPLOYEE_FORM = {
  name: "",
  departmentIds: [],
};

const EMPTY_SHIFT_FORM = {
  type: "shift",
  day: "Monday",
  start: "03:00",
  end: "11:00",
  employeeId: "",
  departmentId: "baking",
  taskAssignments: [],
};

function toLocalISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonday(date = new Date()) {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);

  const day = result.getDay();
  const distanceFromMonday = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + distanceFromMonday);

  return result;
}

function addDays(date, amount) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function parseLocalDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function formatWeekRange(weekStart) {
  const monday = parseLocalDate(weekStart);
  const sunday = addDays(monday, 6);

  const sameMonth = monday.getMonth() === sunday.getMonth();
  const sameYear = monday.getFullYear() === sunday.getFullYear();

  const monthDay = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });

  if (sameMonth && sameYear) {
    const month = new Intl.DateTimeFormat("en-US", {
      month: "short",
    }).format(monday);

    return `${month} ${monday.getDate()} – ${sunday.getDate()}, ${sunday.getFullYear()}`;
  }

  if (sameYear) {
    return `${monthDay.format(monday)} – ${monthDay.format(sunday)}, ${sunday.getFullYear()}`;
  }

  const fullDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${fullDate.format(monday)} – ${fullDate.format(sunday)}`;
}

function formatDayDate(weekStart, dayIndex) {
  const date = addDays(parseLocalDate(weekStart), dayIndex);

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function normalizeShift(shift) {
  const currentWeekStart = toLocalISODate(getMonday());

  const taskAssignments = Array.isArray(shift.taskAssignments)
    ? shift.taskAssignments
    : (shift.tasks || []).map((task) => ({
      departmentId: shift.departmentId,
      task,
    }));

  /*
   * Repair older records:
   * A real shift always had one or more assigned tasks.
   * Some records from the migration were incorrectly changed to
   * "unavailability" and lost their primary department.
   */
  const hasAssignedTasks = taskAssignments.length > 0;

  const repairedType = hasAssignedTasks
    ? "shift"
    : shift.type || "shift";

  const repairedDepartmentId =
    shift.departmentId ||
    taskAssignments[0]?.departmentId ||
    "";

  return {
    ...shift,
    type: repairedType,
    departmentId: repairedDepartmentId,
    weekStart: shift.weekStart || currentWeekStart,
    taskAssignments,
  };
}

function normalizeDepartments(savedDepartments) {
  const departments = Array.isArray(savedDepartments)
    ? savedDepartments
    : [];

  const missingDefaults = DEFAULT_DEPARTMENTS.filter(
    (defaultDepartment) =>
      !departments.some(
        (department) => department.id === defaultDepartment.id,
      ),
  );

  return [...departments, ...missingDefaults].map((department) => {
    const defaultDepartment = DEFAULT_DEPARTMENTS.find(
      (item) => item.id === department.id,
    );

    if (!defaultDepartment) {
      return {
        ...department,
        color: department.color || "#4F6D7A",
      };
    }

    const oldFallbackColor = "#4F6D7A";

    const shouldUseNewDefaultColor =
      !department.color ||
      department.color.toUpperCase() === oldFallbackColor;

    return {
      ...department,
      color: shouldUseNewDefaultColor
        ? defaultDepartment.color
        : department.color,
      tasks: [
        ...department.tasks,
        ...defaultDepartment.tasks.filter(
          (task) => !department.tasks.includes(task),
        ),
      ],
    };
  });
}

function getContrastText(hexColor) {
  const hex = (hexColor || "#4F6D7A").replace("#", "");

  if (hex.length !== 6) return "#FFFFFF";

  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);

  const brightness =
    (red * 299 + green * 587 + blue * 114) / 1000;

  return brightness > 165 ? "#241F1B" : "#FFFFFF";
}

function minutesToTime(totalMinutes) {
  const normalizedMinutes =
    ((totalMinutes % 1440) + 1440) % 1440;
  const hours = String(
    Math.floor(normalizedMinutes / 60),
  ).padStart(2, "0");
  const minutes = String(
    normalizedMinutes % 60,
  ).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function snapTimeToQuarterHour(time) {
  if (!time) return "00:00";

  const totalMinutes = timeToMinutes(time);
  const roundedMinutes = Math.round(totalMinutes / 15) * 15;

  return minutesToTime(roundedMinutes);
}

function calculateDefaultShiftEnd(start) {
  return minutesToTime(timeToMinutes(start) + 8 * 60 + 30);
}

function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function calculateShiftHours(start, end) {
  const startMinutes = timeToMinutes(start);
  let endMinutes = timeToMinutes(end);

  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }

  const hours = (endMinutes - startMinutes) / 60;
  return Number.isInteger(hours) ? hours : Number(hours.toFixed(2));
}

function shiftsOverlap(first, second) {
  if (
    first.weekStart !== second.weekStart ||
    first.day !== second.day ||
    Number(first.employeeId) !== Number(second.employeeId)
  ) {
    return false;
  }

  const firstStart = timeToMinutes(first.start);
  let firstEnd = timeToMinutes(first.end);
  const secondStart = timeToMinutes(second.start);
  let secondEnd = timeToMinutes(second.end);

  if (firstEnd <= firstStart) firstEnd += 1440;
  if (secondEnd <= secondStart) secondEnd += 1440;

  return firstStart < secondEnd && secondStart < firstEnd;
}

function App() {
  const [employees, setEmployees, employeesBlocked, employeesWriteFailed] = useSavedArray(
    "shiftPlannerEmployees", [],
  );

  const [shifts, setShifts, shiftsBlocked, shiftsWriteFailed] = useSavedArray(
    "shiftPlannerShifts", [], (value) => value.map(normalizeShift),
  );

  const [departments, setDepartments, departmentsBlocked, departmentsWriteFailed] = useSavedArray(
    "shiftPlannerDepartments", DEFAULT_DEPARTMENTS, normalizeDepartments,
  );

  const [employeeForm, setEmployeeForm] = useState(EMPTY_EMPLOYEE_FORM);
  const [shiftForm, setShiftForm] = useState(EMPTY_SHIFT_FORM);

  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [newTaskNames, setNewTaskNames] = useState({});
  const [activePage, setActivePage] = useState("schedule");
  const [message, setMessage] = useState("");
  const [selectedWeekStart, setSelectedWeekStart] = useState(() =>
    toLocalISODate(getMonday()),
  );
  const [scheduleView, setScheduleView] = useState("grid");
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [editingDepartmentId, setEditingDepartmentId] = useState(null);
  const [editingDepartmentName, setEditingDepartmentName] = useState("");
  const [editingTask, setEditingTask] = useState(null);
  const [editingTaskName, setEditingTaskName] = useState("");
  const [editingShiftId, setEditingShiftId] = useState(null);
  const [taskDepartmentId, setTaskDepartmentId] = useState("baking");
  const [highlightShiftForm, setHighlightShiftForm] = useState(false);
  const shiftFormRef = useRef(null);
  const [highlightEmployeeForm, setHighlightEmployeeForm] = useState(false);
  const employeeFormRef = useRef(null);
  const calendarInputRef = useRef(null);
  const shiftCalendarInputRef = useRef(null);
  const backupFileInputRef = useRef(null);
  const pendingImportModeRef = useRef("replace");

  const blockedStorage = [
    employeesBlocked && "employees",
    shiftsBlocked && "shifts",
    departmentsBlocked && "departments",
  ].filter(Boolean).join(", ");
  const failedStorage = [
    employeesWriteFailed && "employees",
    shiftsWriteFailed && "shifts",
    departmentsWriteFailed && "departments",
  ].filter(Boolean).join(", ");

  const selectedDepartment = departments.find(
    (department) => department.id === shiftForm.departmentId,
  );

  const selectedTaskDepartment = departments.find(
    (department) => department.id === taskDepartmentId,
  );

  const employeesForSelectedDepartment = employees.filter((employee) =>
    employee.departmentIds.includes(shiftForm.departmentId),
  );

  const liveShiftDuration = calculateShiftHours(
    shiftForm.start,
    shiftForm.end,
  );

  const visibleWeekShifts = shifts.filter(
    (shift) => shift.weekStart === selectedWeekStart,
  );

  function changeWeek(numberOfWeeks) {
    const currentMonday = parseLocalDate(selectedWeekStart);
    const nextMonday = addDays(currentMonday, numberOfWeeks * 7);
    setSelectedWeekStart(toLocalISODate(nextMonday));
    cancelEditingShift();
  }

  function goToCurrentWeek() {
    setSelectedWeekStart(toLocalISODate(getMonday()));
    cancelEditingShift();
  }

  function openPrintPreview() {
    if (visibleWeekShifts.length === 0) {
      showMessage("There are no shifts to print for this week.");
      return;
    }

    setShowPrintPreview(true);
  }

  function printSchedule() {
    window.setTimeout(() => {
      window.print();
    }, 50);
  }

  function openDatePicker(inputRef = calendarInputRef) {
    const input = inputRef.current;

    if (!input) return;

    if (typeof input.showPicker === "function") {
      input.showPicker();
    } else {
      input.focus();
      input.click();
    }
  }

  function selectDateWeek(event) {
    const selectedDate = event.target.value;

    if (!selectedDate) return;

    const selectedMonday = getMonday(parseLocalDate(selectedDate));
    setSelectedWeekStart(toLocalISODate(selectedMonday));
    cancelEditingShift();
  }

  const employeeHours = useMemo(() => {
    const totals = {};

    employees.forEach((employee) => {
      totals[employee.id] = 0;
    });

    visibleWeekShifts
      .filter((shift) => shift.type === "shift")
      .forEach((shift) => {
        totals[shift.employeeId] =
          (totals[shift.employeeId] || 0) +
          calculateShiftHours(shift.start, shift.end);
      });

    return totals;
  }, [employees, visibleWeekShifts]);

  const warnings = useMemo(() => {
    const result = [];

    visibleWeekShifts.forEach((shift, index) => {
      const employee = employees.find(
        (item) => item.id === Number(shift.employeeId),
      );

      if (
        shift.type === "shift" &&
        employee &&
        !employee.departmentIds.includes(shift.departmentId)
      ) {
        result.push({
          id: `department-${shift.id}`,
          text: `${employee.name} is not assigned to this department.`,
        });
      }

      visibleWeekShifts.slice(index + 1).forEach((otherShift) => {
        if (shiftsOverlap(shift, otherShift)) {
          result.push({
            id: `overlap-${shift.id}-${otherShift.id}`,
            text: `${employee?.name || "Employee"} has overlapping shifts on ${shift.day}.`,
          });
        }
      });
    });

    return result;
  }, [employees, visibleWeekShifts]);

  function showMessage(text) {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 2500);
  }

  function toggleEmployeeDepartment(departmentId) {
    setEmployeeForm((current) => ({
      ...current,
      departmentIds: current.departmentIds.includes(departmentId)
        ? current.departmentIds.filter((id) => id !== departmentId)
        : [...current.departmentIds, departmentId],
    }));
  }

  function toggleShiftTask(departmentId, task) {
    setShiftForm((current) => {
      const exists = current.taskAssignments.some(
        (assignment) =>
          assignment.departmentId === departmentId &&
          assignment.task === task,
      );

      return {
        ...current,
        taskAssignments: exists
          ? current.taskAssignments.filter(
            (assignment) =>
              !(
                assignment.departmentId === departmentId &&
                assignment.task === task
              ),
          )
          : [
            ...current.taskAssignments,
            { departmentId, task },
          ],
      };
    });
  }

  function addEmployee(event) {
    event.preventDefault();

    if (!employeeForm.name.trim()) {
      showMessage("Enter the employee name.");
      return;
    }

    if (employeeForm.departmentIds.length === 0) {
      showMessage("Choose at least one department.");
      return;
    }

    if (editingEmployeeId) {
      setEmployees((current) =>
        current.map((employee) =>
          employee.id === editingEmployeeId
            ? {
              ...employee,
              name: employeeForm.name.trim(),
              departmentIds: employeeForm.departmentIds,
            }
            : employee,
        ),
      );

      setEditingEmployeeId(null);
      setEmployeeForm(EMPTY_EMPLOYEE_FORM);
      showMessage("Employee updated.");
      return;
    }

    const employee = {
      id: Date.now(),
      name: employeeForm.name.trim(),
      departmentIds: employeeForm.departmentIds,
    };

    setEmployees((current) => [...current, employee]);
    setEmployeeForm(EMPTY_EMPLOYEE_FORM);
    showMessage("Employee added.");
  }

  function startEditingEmployee(employee) {
    setEditingEmployeeId(employee.id);
    setEmployeeForm({
      name: employee.name,
      departmentIds: [...employee.departmentIds],
    });

    window.setTimeout(() => {
      employeeFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      setHighlightEmployeeForm(true);
      window.setTimeout(
        () => setHighlightEmployeeForm(false),
        1800,
      );
    }, 50);
  }

  function cancelEditingEmployee() {
    setEditingEmployeeId(null);
    setEmployeeForm(EMPTY_EMPLOYEE_FORM);
  }

  function deleteEmployee(employeeId) {
    const hasShifts = shifts.some(
      (shift) => Number(shift.employeeId) === Number(employeeId),
    );

    if (hasShifts) {
      showMessage("Delete this employee's shifts first.");
      return;
    }

    if (!window.confirm("Delete this employee?")) return;

    setEmployees((current) =>
      current.filter((employee) => employee.id !== employeeId),
    );
  }

  function addShift(event) {
    event.preventDefault();

    if (!shiftForm.employeeId) {
      showMessage("Choose an employee.");
      return;
    }

    if (
      shiftForm.type === "shift" &&
      shiftForm.taskAssignments.length === 0
    ) {
      showMessage("Choose at least one task.");
      return;
    }

    const selectedEmployee = employees.find(
      (employee) => employee.id === Number(shiftForm.employeeId),
    );

    if (
      shiftForm.type === "shift" &&
      (
        !selectedEmployee ||
        !selectedEmployee.departmentIds.includes(
          shiftForm.departmentId,
        )
      )
    ) {
      showMessage(
        "This employee is not assigned to the selected primary department.",
      );
      return;
    }

    const shiftToSave = {
      ...shiftForm,
      id: editingShiftId || Date.now(),
      weekStart: selectedWeekStart,
      employeeId: Number(shiftForm.employeeId),
      start:
        shiftForm.type === "vacation"
          ? "00:00"
          : shiftForm.start,
      end:
        shiftForm.type === "vacation"
          ? "23:59"
          : shiftForm.end,
      departmentId:
        shiftForm.type === "shift"
          ? shiftForm.departmentId
          : "",
      taskAssignments:
        shiftForm.type === "shift"
          ? shiftForm.taskAssignments
          : [],
    };

    const conflict = shifts.find(
      (shift) =>
        shift.id !== editingShiftId &&
        shiftsOverlap(shift, shiftToSave),
    );

    if (conflict) {
      showMessage(
        "This employee already has another event during this time.",
      );
      return;
    }

    if (editingShiftId) {
      setShifts((current) =>
        current.map((shift) =>
          shift.id === editingShiftId ? shiftToSave : shift,
        ),
      );
      showMessage("Schedule entry updated.");
    } else {
      setShifts((current) => [...current, shiftToSave]);
      showMessage("Schedule entry added.");
    }

    const savedDay = shiftForm.day;
    const savedStart = shiftForm.start;

    setEditingShiftId(null);
    setShiftForm({
      ...EMPTY_SHIFT_FORM,
      day: savedDay,
      start: savedStart,
      end: calculateDefaultShiftEnd(savedStart),
      departmentId: departments[0]?.id || "",
    });
    setTaskDepartmentId(departments[0]?.id || "");
  }

  function startEditingShift(shift) {
    setSelectedWeekStart(shift.weekStart);
    setEditingShiftId(shift.id);
    setShiftForm({
      type: shift.type || "shift",
      day: shift.day,
      start: shift.start,
      end: shift.end,
      employeeId: String(shift.employeeId),
      departmentId:
        shift.departmentId || departments[0]?.id || "",
      taskAssignments: [...shift.taskAssignments],
    });
    setTaskDepartmentId(shift.departmentId);

    window.setTimeout(() => {
      shiftFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      setHighlightShiftForm(true);
      window.setTimeout(() => setHighlightShiftForm(false), 1800);
    }, 50);
  }

  function startAddingFromGrid(employeeId, day) {
    setEditingShiftId(null);
    setShiftForm({
      ...EMPTY_SHIFT_FORM,
      end: calculateDefaultShiftEnd(
        EMPTY_SHIFT_FORM.start,
      ),
      employeeId: String(employeeId),
      day,
      departmentId: departments[0]?.id || "",
    });
    setTaskDepartmentId(departments[0]?.id || "");

    window.setTimeout(() => {
      shiftFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      setHighlightShiftForm(true);
      window.setTimeout(
        () => setHighlightShiftForm(false),
        1800,
      );
    }, 50);
  }

  function cancelEditingShift() {
    setEditingShiftId(null);
    setShiftForm({
      ...EMPTY_SHIFT_FORM,
      end: calculateDefaultShiftEnd(
        EMPTY_SHIFT_FORM.start,
      ),
      departmentId: departments[0]?.id || "",
    });
    setTaskDepartmentId(departments[0]?.id || "");
  }

  function deleteShift(shiftId) {
    if (!window.confirm("Delete this shift?")) return;

    setShifts((current) =>
      current.filter((shift) => shift.id !== shiftId),
    );
  }

  function addDepartment(event) {
    event.preventDefault();

    const name = newDepartmentName.trim();

    if (!name) {
      showMessage("Enter a department name.");
      return;
    }

    const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;

    setDepartments((current) => [
      ...current,
      {
        id,
        name,
        color: "#4F6D7A",
        tasks: [],
      },
    ]);

    setNewDepartmentName("");
    showMessage("Department added.");
  }

  function addTaskToDepartment(departmentId) {
    const taskName = (newTaskNames[departmentId] || "").trim();

    if (!taskName) {
      showMessage("Enter a task name.");
      return;
    }

    setDepartments((current) =>
      current.map((department) =>
        department.id === departmentId
          ? {
            ...department,
            tasks: [...department.tasks, taskName],
          }
          : department,
      ),
    );

    setNewTaskNames((current) => ({
      ...current,
      [departmentId]: "",
    }));

    showMessage("Task added.");
  }

  function deleteDepartment(departmentId) {
    const departmentIsUsed =
      employees.some((employee) =>
        employee.departmentIds.includes(departmentId),
      ) ||
      shifts.some(
        (shift) =>
          shift.departmentId === departmentId ||
          shift.taskAssignments.some(
            (assignment) =>
              assignment.departmentId === departmentId,
          ),
      );

    if (departmentIsUsed) {
      showMessage("This department is used by employees or shifts.");
      return;
    }

    if (!window.confirm("Delete this department?")) return;

    const nextDepartments = departments.filter(
      (department) => department.id !== departmentId,
    );

    setDepartments(nextDepartments);

    if (shiftForm.departmentId === departmentId) {
      setShiftForm((current) => ({
        ...current,
        departmentId: nextDepartments[0]?.id || "",
        tasks: [],
      }));
    }
  }

  function deleteTask(departmentId, taskName) {
    const taskIsUsed = shifts.some((shift) =>
      shift.taskAssignments.some(
        (assignment) =>
          assignment.departmentId === departmentId &&
          assignment.task === taskName,
      ),
    );

    if (taskIsUsed) {
      showMessage("This task is already used in a shift.");
      return;
    }

    setDepartments((current) =>
      current.map((department) =>
        department.id === departmentId
          ? {
            ...department,
            tasks: department.tasks.filter(
              (task) => task !== taskName,
            ),
          }
          : department,
      ),
    );
  }

  function updateDepartmentColor(departmentId, color) {
    setDepartments((current) =>
      current.map((department) =>
        department.id === departmentId
          ? { ...department, color }
          : department,
      ),
    );
  }

  function startEditingDepartment(department) {
    setEditingDepartmentId(department.id);
    setEditingDepartmentName(department.name);
  }

  function saveDepartmentName(departmentId) {
    const name = editingDepartmentName.trim();

    if (!name) {
      showMessage("Department name cannot be empty.");
      return;
    }

    setDepartments((current) =>
      current.map((department) =>
        department.id === departmentId
          ? { ...department, name }
          : department,
      ),
    );

    setEditingDepartmentId(null);
    setEditingDepartmentName("");
    showMessage("Department updated.");
  }

  function cancelEditingDepartment() {
    setEditingDepartmentId(null);
    setEditingDepartmentName("");
  }

  function startEditingTask(departmentId, taskName) {
    setEditingTask({ departmentId, oldName: taskName });
    setEditingTaskName(taskName);
  }

  function saveTaskName() {
    const name = editingTaskName.trim();

    if (!editingTask || !name) {
      showMessage("Task name cannot be empty.");
      return;
    }

    const { departmentId, oldName } = editingTask;

    setDepartments((current) =>
      current.map((department) =>
        department.id === departmentId
          ? {
            ...department,
            tasks: department.tasks.map((task) =>
              task === oldName ? name : task,
            ),
          }
          : department,
      ),
    );

    setShifts((current) =>
      current.map((shift) =>
        shift.taskAssignments.some(
          (assignment) =>
            assignment.departmentId === departmentId &&
            assignment.task === oldName,
        )
          ? {
            ...shift,
            taskAssignments: shift.taskAssignments.map(
              (assignment) =>
                assignment.departmentId === departmentId &&
                  assignment.task === oldName
                  ? { ...assignment, task: name }
                  : assignment,
            ),
          }
          : shift,
      ),
    );

    setEditingTask(null);
    setEditingTaskName("");
    showMessage("Task updated.");
  }

  function cancelEditingTask() {
    setEditingTask(null);
    setEditingTaskName("");
  }

  function getEmployee(employeeId) {
    return employees.find(
      (employee) => employee.id === Number(employeeId),
    );
  }

  function getDepartment(departmentId) {
    return departments.find(
      (department) => department.id === departmentId,
    );
  }

  function exportAllData() {
    const backup = {
      app: "Bread Guy Shift Planner",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: { employees, shifts, departments },
    };

    const fileDate = toLocalISODate(new Date());
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.download = `bread-guy-shift-backup-${fileDate}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
    showMessage("Backup exported.");
  }

  function openImportFilePicker(mode) {
    pendingImportModeRef.current = mode;

    if (backupFileInputRef.current) {
      backupFileInputRef.current.value = "";
      backupFileInputRef.current.click();
    }
  }

  function validateBackupData(parsedBackup) {
    const importedData = parsedBackup?.data || parsedBackup;

    if (
      !importedData ||
      !Array.isArray(importedData.employees) ||
      !Array.isArray(importedData.shifts) ||
      !Array.isArray(importedData.departments)
    ) {
      throw new Error("This is not a valid Bread Guy backup file.");
    }

    return {
      employees: importedData.employees,
      shifts: importedData.shifts.map(normalizeShift),
      departments: normalizeDepartments(importedData.departments),
    };
  }

  function mergeBackupData(importedData) {
    const mergedDepartments = departments.map((department) => ({
      ...department,
      tasks: [...department.tasks],
    }));

    importedData.departments.forEach((importedDepartment) => {
      const existingDepartment = mergedDepartments.find(
        (department) => department.id === importedDepartment.id,
      );

      if (existingDepartment) {
        existingDepartment.tasks = [
          ...existingDepartment.tasks,
          ...importedDepartment.tasks.filter(
            (task) => !existingDepartment.tasks.includes(task),
          ),
        ];
      } else {
        mergedDepartments.push(importedDepartment);
      }
    });

    const mergedEmployees = employees.map((employee) => ({
      ...employee,
      departmentIds: [...employee.departmentIds],
    }));
    const importedEmployeeIdMap = new Map();

    importedData.employees.forEach((importedEmployee) => {
      const normalizedImportedName = importedEmployee.name.trim().toLowerCase();
      const existingEmployee = mergedEmployees.find(
        (employee) =>
          employee.id === importedEmployee.id ||
          employee.name.trim().toLowerCase() === normalizedImportedName,
      );

      if (existingEmployee) {
        existingEmployee.departmentIds = [
          ...new Set([
            ...existingEmployee.departmentIds,
            ...importedEmployee.departmentIds,
          ]),
        ];
        importedEmployeeIdMap.set(
          Number(importedEmployee.id),
          Number(existingEmployee.id),
        );
      } else {
        mergedEmployees.push(importedEmployee);
        importedEmployeeIdMap.set(
          Number(importedEmployee.id),
          Number(importedEmployee.id),
        );
      }
    });

    const mergedShifts = [...shifts];

    importedData.shifts.forEach((importedShift) => {
      const mappedShift = {
        ...importedShift,
        employeeId:
          importedEmployeeIdMap.get(Number(importedShift.employeeId)) ??
          Number(importedShift.employeeId),
      };

      const importedSignature = JSON.stringify({
        employeeId: mappedShift.employeeId,
        weekStart: mappedShift.weekStart,
        day: mappedShift.day,
        start: mappedShift.start,
        end: mappedShift.end,
        type: mappedShift.type,
        departmentId: mappedShift.departmentId,
        taskAssignments: mappedShift.taskAssignments,
      });

      const alreadyExists = mergedShifts.some((shift) => {
        if (shift.id === mappedShift.id) return true;

        const existingSignature = JSON.stringify({
          employeeId: Number(shift.employeeId),
          weekStart: shift.weekStart,
          day: shift.day,
          start: shift.start,
          end: shift.end,
          type: shift.type,
          departmentId: shift.departmentId,
          taskAssignments: shift.taskAssignments,
        });

        return existingSignature === importedSignature;
      });

      if (!alreadyExists) mergedShifts.push(mappedShift);
    });

    return {
      employees: mergedEmployees,
      shifts: mergedShifts,
      departments: mergedDepartments,
    };
  }

  async function importBackupFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileText = await file.text();
      const importedData = validateBackupData(JSON.parse(fileText));
      const mode = pendingImportModeRef.current;

      if (mode === "replace") {
        const confirmed = window.confirm(
          "Replace all current employees, departments, tasks, and schedules with this backup?",
        );
        if (!confirmed) return;

        setEmployees(importedData.employees);
        setShifts(importedData.shifts);
        setDepartments(importedData.departments);
        cancelEditingEmployee();
        cancelEditingShift();
        showMessage("Backup restored. Current data was replaced.");
        return;
      }

      const confirmed = window.confirm(
        "Merge this backup with the current data? Existing records will be kept and missing records will be added.",
      );
      if (!confirmed) return;

      const mergedData = mergeBackupData(importedData);
      setEmployees(mergedData.employees);
      setShifts(mergedData.shifts);
      setDepartments(mergedData.departments);
      cancelEditingEmployee();
      cancelEditingShift();
      showMessage("Backup merged successfully.");
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "The backup file could not be imported.",
      );
    } finally {
      event.target.value = "";
    }
  }

  function clearAllData() {
    if (
      !window.confirm(
        "Delete all employees and shifts? Departments will stay.",
      )
    ) {
      return;
    }

    setEmployees([]);
    setShifts([]);
    showMessage("Employees and shifts cleared.");
  }

  return (
    <div className="app">
      {message && <div className="toast">{message}</div>}

      <aside className="sidebar">
        <div className="brand">
          <div className="logo">
            <img src="/breadguylogo.png" alt="Bread Guy logo" />
          </div>

          <div>
            <strong>Bread Guy</strong>
            <span>Shift Planner</span>
          </div>
        </div>

        <nav>
          <button
            className={activePage === "schedule" ? "active" : ""}
            onClick={() => setActivePage("schedule")}
          >
            Weekly Schedule
          </button>

          <button
            className={activePage === "employees" ? "active" : ""}
            onClick={() => setActivePage("employees")}
          >
            Employees
          </button>

          <button
            className={activePage === "departments" ? "active" : ""}
            onClick={() => setActivePage("departments")}
          >
            Departments & Tasks
          </button>

          <button
            className={activePage === "backup" ? "active" : ""}
            onClick={() => setActivePage("backup")}
          >
            Backup & Restore
          </button>

          <button
            className={activePage === "warnings" ? "active" : ""}
            onClick={() => setActivePage("warnings")}
          >
            Warnings {warnings.length > 0 && `(${warnings.length})`}
          </button>
        </nav>

        <button className="clear-button" onClick={clearAllData}>
          Clear employees & shifts
        </button>
      </aside>

      <main>
        {blockedStorage && (
          <div className="notice" role="alert">
            Some local data could not be loaded ({blockedStorage}). Existing stored
            data has not been replaced. Changes to these records will not be saved
            in this session. Keep any original backups before closing or reloading.
          </div>
        )}
        {failedStorage && (
          <div className="notice" role="alert">
            Changes could not be saved locally ({failedStorage}). Export a backup
            before closing or reloading to keep your current changes.
          </div>
        )}
        <input
          ref={backupFileInputRef}
          className="backup-file-input"
          type="file"
          accept=".json,application/json"
          onChange={importBackupFile}
        />

        <header className="page-header">
          <div>
            <p>Bakery operations</p>
            <h1>Smart Shift Planner</h1>
            <span>
              Build and manage a separate schedule for every week.
            </span>
          </div>
        </header>

        <section className="summary">
          <article>
            <span>Employees</span>
            <strong>{employees.length}</strong>
          </article>
          <article>
            <span>Shifts</span>
            <strong>{visibleWeekShifts.length}</strong>
          </article>
          <article>
            <span>Departments</span>
            <strong>{departments.length}</strong>
          </article>
          <article className={warnings.length ? "warning" : ""}>
            <span>Warnings</span>
            <strong>{warnings.length}</strong>
          </article>
        </section>

        {activePage === "schedule" && (
          <div
            className={`two-panel-layout ${scheduleView === "grid" ? "grid-view-layout" : ""
              }`}
          >
            <section className="panel printable-schedule">
              <div className="panel-title week-panel-title">
                <div>
                  <h2>{formatWeekRange(selectedWeekStart)}</h2>
                  <p>
                    Monday to Sunday weekly schedule.
                    {selectedWeekStart ===
                      toLocalISODate(getMonday()) && (
                        <span className="current-week-label">
                          Current week
                        </span>
                      )}
                  </p>
                </div>

                <div className="schedule-toolbar">
                  <div className="view-switcher">
                    <button
                      type="button"
                      className={
                        scheduleView === "grid" ? "active" : ""
                      }
                      onClick={() => setScheduleView("grid")}
                    >
                      Grid
                    </button>
                    <button
                      type="button"
                      className={
                        scheduleView === "list" ? "active" : ""
                      }
                      onClick={() => setScheduleView("list")}
                    >
                      List
                    </button>
                  </div>

                  <div className="week-navigation">
                    <button
                      type="button"
                      onClick={() => changeWeek(-1)}
                      aria-label="Previous week"
                      title="Previous week"
                    >
                      ←
                    </button>

                    <button
                      type="button"
                      className="current-week-button"
                      onClick={goToCurrentWeek}
                    >
                      Current week
                    </button>

                    <button
                      type="button"
                      onClick={() => changeWeek(1)}
                      aria-label="Next week"
                      title="Next week"
                    >
                      →
                    </button>

                    <div className="calendar-picker-wrapper">
                      <button
                        type="button"
                        className="calendar-button"
                        onClick={() =>
                          openDatePicker(calendarInputRef)
                        }
                        aria-label="Choose a date"
                        title="Choose any date"
                      >
                        📅
                      </button>

                      <input
                        ref={calendarInputRef}
                        className="hidden-date-input"
                        type="date"
                        value={selectedWeekStart}
                        onChange={selectDateWeek}
                        aria-label="Choose a date to open its week"
                      />
                    </div>

                    <button
                      type="button"
                      className="print-button"
                      onClick={openPrintPreview}
                      title="Preview, print, or save this week as PDF"
                    >
                      Print / PDF
                    </button>
                  </div>
                </div>
              </div>

              <div className="print-header">
                <h1>Bakery Weekly Schedule</h1>
                <p>{formatWeekRange(selectedWeekStart)}</p>
              </div>

              {scheduleView === "grid" ? (
                <div className="schedule-grid-wrapper">
                  <div className="schedule-grid">
                    <div className="grid-corner">Employee</div>

                    {DAYS.map((day, dayIndex) => (
                      <div className="grid-day-header" key={day}>
                        <strong>{day.slice(0, 3)}</strong>
                        <span>
                          {formatDayDate(
                            selectedWeekStart,
                            dayIndex,
                          )}
                        </span>
                      </div>
                    ))}

                    {employees.map((employee) => (
                      <Fragment key={employee.id}>
                        <div className="grid-employee">
                          <div className="avatar">
                            {employee.name[0].toUpperCase()}
                          </div>
                          <div>
                            <strong>{employee.name}</strong>
                            <span>
                              {employeeHours[employee.id] || 0}h
                            </span>
                          </div>
                        </div>

                        {DAYS.map((day) => {
                          const cellShifts = visibleWeekShifts
                            .filter(
                              (shift) =>
                                shift.day === day &&
                                Number(shift.employeeId) ===
                                Number(employee.id),
                            )
                            .sort(
                              (firstShift, secondShift) =>
                                timeToMinutes(firstShift.start) -
                                timeToMinutes(secondShift.start),
                            );

                          return (
                            <div
                              className="grid-shift-cell"
                              key={`${employee.id}-${day}`}
                            >
                              <button
                                type="button"
                                className="grid-add-button"
                                onClick={() =>
                                  startAddingFromGrid(
                                    employee.id,
                                    day,
                                  )
                                }
                              >
                                + Add
                              </button>

                              {cellShifts.length === 0 ? (
                                <span className="grid-empty">—</span>
                              ) : (
                                cellShifts.map((shift) => {
                                  const department = getDepartment(
                                    shift.departmentId,
                                  );

                                  return (
                                    <article
                                      className={`grid-shift-card ${shift.type !== "shift"
                                          ? `grid-${shift.type}-card`
                                          : ""
                                        }`}
                                      key={shift.id}
                                      style={
                                        shift.type === "shift"
                                          ? {
                                            backgroundColor:
                                              department?.color ||
                                              "#4F6D7A",
                                            color: getContrastText(
                                              department?.color,
                                            ),
                                          }
                                          : undefined
                                      }
                                    >
                                      <div className="grid-shift-card-top">
                                        <strong>
                                          {shift.start}–{shift.end}
                                        </strong>
                                        <span>
                                          {calculateShiftHours(
                                            shift.start,
                                            shift.end,
                                          )}
                                          h
                                        </span>
                                      </div>

                                      <b>
                                        {shift.type === "shift"
                                          ? department?.name || "Unknown"
                                          : shift.type === "vacation"
                                            ? "Vacation"
                                            : "Unavailable"}
                                      </b>

                                      {shift.type === "shift" && (
                                        <div className="grid-task-list">
                                          {shift.taskAssignments.map(
                                            (assignment) => (
                                              <span
                                                key={`${assignment.departmentId}-${assignment.task}`}
                                              >
                                                {assignment.task}
                                              </span>
                                            ),
                                          )}
                                        </div>
                                      )}

                                      {shift.type === "vacation" && (
                                        <div className="grid-status-text">
                                          Full day
                                        </div>
                                      )}

                                      <div className="grid-card-actions">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            startEditingShift(shift)
                                          }
                                        >
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            deleteShift(shift.id)
                                          }
                                        >
                                          ×
                                        </button>
                                      </div>
                                    </article>
                                  );
                                })
                              )}
                            </div>
                          );
                        })}
                      </Fragment>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="week">
                  {DAYS.map((day, dayIndex) => {
                    const dayEntries = visibleWeekShifts
                      .filter((entry) => entry.day === day)
                      .sort(
                        (firstEntry, secondEntry) =>
                          timeToMinutes(firstEntry.start) -
                          timeToMinutes(secondEntry.start),
                      );

                    const employeeGroups = employees
                      .map((employee) => ({
                        employee,
                        entries: dayEntries.filter(
                          (entry) =>
                            Number(entry.employeeId) ===
                            Number(employee.id),
                        ),
                      }))
                      .filter((group) => group.entries.length > 0);

                    return (
                      <section className="day" key={day}>
                        <div className="day-title">
                          <div>
                            <strong>{day}</strong>
                            <small>
                              {formatDayDate(
                                selectedWeekStart,
                                dayIndex,
                              )}
                            </small>
                          </div>
                          <span>
                            {dayEntries.length}{" "}
                            {dayEntries.length === 1
                              ? "entry"
                              : "entries"}
                          </span>
                        </div>

                        {employeeGroups.length === 0 ? (
                          <div className="empty">
                            No schedule entries yet
                          </div>
                        ) : (
                          <div className="list-employee-groups">
                            {employeeGroups.map(
                              ({ employee, entries }) => (
                                <article
                                  className="list-employee-group"
                                  key={employee.id}
                                >
                                  <div className="list-employee-header">
                                    <div className="avatar">
                                      {employee.name[0].toUpperCase()}
                                    </div>

                                    <div>
                                      <strong>{employee.name}</strong>
                                      <span>
                                        {entries.length}{" "}
                                        {entries.length === 1
                                          ? "entry"
                                          : "entries"}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="list-entry-stack">
                                    {entries.map((entry) => {
                                      const department =
                                        entry.type === "shift"
                                          ? getDepartment(
                                            entry.departmentId,
                                          )
                                          : null;

                                      const entryTitle =
                                        entry.type === "vacation"
                                          ? "Vacation"
                                          : entry.type ===
                                            "unavailability"
                                            ? "Unavailable"
                                            : department?.name ||
                                            "Unknown department";

                                      const entryColor =
                                        entry.type === "vacation"
                                          ? "#2F7D5B"
                                          : entry.type ===
                                            "unavailability"
                                            ? "#D9A441"
                                            : department?.color ||
                                            "#4F6D7A";

                                      return (
                                        <div
                                          className="list-entry-card"
                                          key={entry.id}
                                          style={{
                                            borderLeftColor:
                                              entryColor,
                                          }}
                                        >
                                          <div className="list-entry-time">
                                            <strong>
                                              {entry.type ===
                                                "vacation"
                                                ? "Full day"
                                                : `${entry.start}–${entry.end}`}
                                            </strong>

                                            {entry.type !==
                                              "vacation" && (
                                                <span>
                                                  {calculateShiftHours(
                                                    entry.start,
                                                    entry.end,
                                                  )}
                                                  h
                                                </span>
                                              )}
                                          </div>

                                          <div className="list-entry-main">
                                            {entry.type === "shift" ? (
                                              <>
                                                <div className="list-shift-heading">
                                                  <span
                                                    className="list-entry-badge"
                                                    style={{
                                                      backgroundColor:
                                                        entryColor,
                                                      color:
                                                        getContrastText(
                                                          entryColor,
                                                        ),
                                                    }}
                                                  >
                                                    {entryTitle}
                                                  </span>
                                                </div>

                                                <div className="list-shift-tasks">
                                                  {entry.taskAssignments.map(
                                                    (assignment) => (
                                                      <span
                                                        key={`${assignment.departmentId}-${assignment.task}`}
                                                      >
                                                        <b>
                                                          {getDepartment(
                                                            assignment.departmentId,
                                                          )?.name ||
                                                            "Unknown"}
                                                          :
                                                        </b>{" "}
                                                        {assignment.task}
                                                      </span>
                                                    ),
                                                  )}
                                                </div>
                                              </>
                                            ) : (
                                              <>
                                                <span
                                                  className="list-entry-badge"
                                                  style={{
                                                    backgroundColor:
                                                      entryColor,
                                                    color:
                                                      getContrastText(
                                                        entryColor,
                                                      ),
                                                  }}
                                                >
                                                  {entryTitle}
                                                </span>

                                                {entry.type ===
                                                  "unavailability" && (
                                                    <p className="list-status-note">
                                                      Employee is not
                                                      available during this
                                                      time.
                                                    </p>
                                                  )}

                                                {entry.type ===
                                                  "vacation" && (
                                                    <p className="list-status-note">
                                                      Employee is on
                                                      vacation for the full
                                                      day.
                                                    </p>
                                                  )}
                                              </>
                                            )}
                                          </div>

                                          <div className="row-actions">
                                            <button
                                              className="edit-button"
                                              onClick={() =>
                                                startEditingShift(
                                                  entry,
                                                )
                                              }
                                            >
                                              Edit
                                            </button>

                                            <button
                                              className="delete"
                                              onClick={() =>
                                                deleteShift(entry.id)
                                              }
                                            >
                                              ×
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </article>
                              ),
                            )}
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              )}
            </section>

            <aside
              ref={shiftFormRef}
              className={`panel sticky-panel shift-form-panel ${highlightShiftForm ? "form-highlight" : ""
                }`}
            >
              <div className="panel-title shift-form-title">
                <div>
                  <h2>
                    {editingShiftId
                      ? "Edit Schedule Entry"
                      : "Add Schedule Entry"}
                  </h2>
                  <p>
                    {formatWeekRange(selectedWeekStart)}
                  </p>
                </div>
              </div>

              <div className="shift-form-week-controls">
                <button
                  type="button"
                  onClick={() => changeWeek(-1)}
                  aria-label="Previous week"
                  title="Previous week"
                >
                  ←
                </button>

                <button
                  type="button"
                  className="shift-current-week-button"
                  onClick={goToCurrentWeek}
                >
                  Current week
                </button>

                <button
                  type="button"
                  onClick={() => changeWeek(1)}
                  aria-label="Next week"
                  title="Next week"
                >
                  →
                </button>

                <div className="calendar-picker-wrapper">
                  <button
                    type="button"
                    className="calendar-button"
                    onClick={() =>
                      openDatePicker(shiftCalendarInputRef)
                    }
                    aria-label="Choose a date"
                    title="Choose any date"
                  >
                    📅
                  </button>

                  <input
                    ref={shiftCalendarInputRef}
                    className="hidden-date-input"
                    type="date"
                    value={selectedWeekStart}
                    onChange={selectDateWeek}
                    aria-label="Choose a date to open its week"
                  />
                </div>
              </div>

              {employees.length === 0 ? (
                <div className="notice">
                  Add employees first from the Employees page.
                </div>
              ) : (
                <form className="form" onSubmit={addShift}>
                  <label>
                    Entry type
                    <select
                      value={shiftForm.type}
                      onChange={(event) => {
                        const type = event.target.value;

                        setShiftForm({
                          ...shiftForm,
                          type,
                          end:
                            type === "shift"
                              ? calculateDefaultShiftEnd(
                                shiftForm.start,
                              )
                              : shiftForm.end,
                          taskAssignments:
                            type === "shift"
                              ? shiftForm.taskAssignments
                              : [],
                        });
                      }}
                    >
                      <option value="shift">Shift</option>
                      <option value="unavailability">
                        Unavailability
                      </option>
                      <option value="vacation">Vacation</option>
                    </select>
                  </label>

                  <label>
                    Day
                    <select
                      value={shiftForm.day}
                      onChange={(event) =>
                        setShiftForm({
                          ...shiftForm,
                          day: event.target.value,
                        })
                      }
                    >
                      {DAYS.map((day) => (
                        <option key={day}>{day}</option>
                      ))}
                    </select>
                  </label>

                  {shiftForm.type !== "vacation" && (
                    <>
                      <div className="form-row">
                        <label>
                          Start
                          <input
                            type="time"
                            step="900"
                            value={shiftForm.start}
                            onChange={(event) => {
                              const start = event.target.value;

                              setShiftForm({
                                ...shiftForm,
                                start,
                                end:
                                  shiftForm.type === "shift"
                                    ? calculateDefaultShiftEnd(start)
                                    : shiftForm.end,
                              });
                            }}
                            onBlur={(event) => {
                              const start = snapTimeToQuarterHour(
                                event.target.value,
                              );

                              setShiftForm((current) => ({
                                ...current,
                                start,
                                end:
                                  current.type === "shift"
                                    ? calculateDefaultShiftEnd(start)
                                    : current.end,
                              }));
                            }}
                          />
                        </label>

                        <label>
                          End
                          <input
                            type="time"
                            step="900"
                            value={shiftForm.end}
                            onChange={(event) =>
                              setShiftForm({
                                ...shiftForm,
                                end: event.target.value,
                              })
                            }
                            onBlur={(event) =>
                              setShiftForm((current) => ({
                                ...current,
                                end: snapTimeToQuarterHour(
                                  event.target.value,
                                ),
                              }))
                            }
                          />
                        </label>
                      </div>

                      {shiftForm.type === "shift" && (
                        <p className="auto-time-note">
                          Type the time with your keyboard or choose it
                          with the mouse. Minutes are kept at 00, 15, 30,
                          or 45. Changing the start automatically sets an
                          8h 30m shift, but you can still edit the end.
                        </p>
                      )}

                      <div className="duration-preview">
                        <span>
                          {shiftForm.type === "shift"
                            ? "Shift duration"
                            : "Unavailable duration"}
                        </span>
                        <strong>
                          {liveShiftDuration} hours
                        </strong>
                      </div>
                    </>
                  )}

                  {shiftForm.type === "vacation" && (
                    <div className="vacation-notice">
                      Vacation will cover the full selected day.
                    </div>
                  )}

                  {shiftForm.type === "shift" && (
                    <>
                      <label>
                        Primary department
                        <select
                          value={shiftForm.departmentId}
                          onChange={(event) => {
                            const departmentId =
                              event.target.value;

                            setShiftForm({
                              ...shiftForm,
                              departmentId,
                              employeeId: "",
                            });

                            setTaskDepartmentId(departmentId);
                          }}
                        >
                          {departments.map((department) => (
                            <option
                              key={department.id}
                              value={department.id}
                            >
                              {department.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        Employee
                        <select
                          value={shiftForm.employeeId}
                          onChange={(event) =>
                            setShiftForm({
                              ...shiftForm,
                              employeeId: event.target.value,
                            })
                          }
                        >
                          <option value="">Choose employee</option>
                          {employeesForSelectedDepartment.map(
                            (employee) => (
                              <option
                                key={employee.id}
                                value={employee.id}
                              >
                                {employee.name} —{" "}
                                {employeeHours[employee.id] || 0}h
                              </option>
                            ),
                          )}
                        </select>
                      </label>

                      {employeesForSelectedDepartment.length === 0 && (
                        <div className="notice">
                          No employees are assigned to this department.
                        </div>
                      )}

                      <fieldset>
                        <legend>
                          Tasks — choose from any department
                        </legend>

                        <label className="task-department-label">
                          Task department
                          <select
                            value={taskDepartmentId}
                            onChange={(event) =>
                              setTaskDepartmentId(
                                event.target.value,
                              )
                            }
                          >
                            {departments.map((department) => (
                              <option
                                key={department.id}
                                value={department.id}
                              >
                                {department.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        {selectedTaskDepartment?.tasks.length ? (
                          <div className="task-selector">
                            {selectedTaskDepartment.tasks.map(
                              (task) => {
                                const selected =
                                  shiftForm.taskAssignments.some(
                                    (assignment) =>
                                      assignment.departmentId ===
                                      selectedTaskDepartment.id &&
                                      assignment.task === task,
                                  );

                                return (
                                  <button
                                    type="button"
                                    key={task}
                                    className={
                                      selected ? "selected" : ""
                                    }
                                    onClick={() =>
                                      toggleShiftTask(
                                        selectedTaskDepartment.id,
                                        task,
                                      )
                                    }
                                  >
                                    {task}
                                  </button>
                                );
                              },
                            )}
                          </div>
                        ) : (
                          <div className="notice">
                            This department has no tasks yet.
                          </div>
                        )}

                        {shiftForm.taskAssignments.length > 0 && (
                          <div className="selected-task-summary">
                            <strong>Selected tasks</strong>
                            <div>
                              {shiftForm.taskAssignments.map(
                                (assignment) => (
                                  <button
                                    type="button"
                                    key={`${assignment.departmentId}-${assignment.task}`}
                                    onClick={() =>
                                      toggleShiftTask(
                                        assignment.departmentId,
                                        assignment.task,
                                      )
                                    }
                                  >
                                    {getDepartment(
                                      assignment.departmentId,
                                    )?.name || "Unknown"}
                                    : {assignment.task} ×
                                  </button>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                      </fieldset>
                    </>
                  )}

                  {shiftForm.type !== "shift" && (
                    <label>
                      Employee
                      <select
                        value={shiftForm.employeeId}
                        onChange={(event) =>
                          setShiftForm({
                            ...shiftForm,
                            employeeId: event.target.value,
                          })
                        }
                      >
                        <option value="">Choose employee</option>
                        {employees.map((employee) => (
                          <option
                            key={employee.id}
                            value={employee.id}
                          >
                            {employee.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <div className="form-actions">
                    <button className="primary" type="submit">
                      {editingShiftId
                        ? "Save changes"
                        : shiftForm.type === "shift"
                          ? "Add shift"
                          : shiftForm.type === "vacation"
                            ? "Add vacation"
                            : "Add unavailability"}
                    </button>
                    {editingShiftId && (
                      <button
                        className="secondary"
                        type="button"
                        onClick={cancelEditingShift}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              )}
            </aside>
          </div>
        )}

        {activePage === "employees" && (
          <div className="two-panel-layout">
            <section className="panel">
              <div className="panel-title">
                <div>
                  <h2>Employees</h2>
                  <p>The list starts empty.</p>
                </div>
              </div>

              {employees.length === 0 ? (
                <div className="big-empty">
                  <div>👥</div>
                  <strong>No employees yet</strong>
                  <p>Add the first employee using the form.</p>
                </div>
              ) : (
                <div className="employee-list">
                  {employees.map((employee) => (
                    <article
                      className="employee"
                      key={employee.id}
                    >
                      <div className="avatar">
                        {employee.name[0].toUpperCase()}
                      </div>

                      <div className="employee-info">
                        <strong>{employee.name}</strong>
                        <span>
                          {employeeHours[employee.id] || 0} scheduled
                          hours
                        </span>

                        <div className="department-tags">
                          {employee.departmentIds.map((id) => (
                            <span key={id}>
                              {getDepartment(id)?.name || id}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="row-actions">
                        <button
                          className="edit-button"
                          onClick={() => startEditingEmployee(employee)}
                        >
                          Edit
                        </button>

                        <button
                          className="delete"
                          onClick={() =>
                            deleteEmployee(employee.id)
                          }
                        >
                          ×
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <aside
              ref={employeeFormRef}
              className={`panel sticky-panel ${highlightEmployeeForm ? "form-highlight" : ""
                }`}
            >
              <div className="panel-title">
                <div>
                  <h2>
                    {editingEmployeeId ? "Edit Employee" : "Add Employee"}
                  </h2>
                  <p>Choose all departments they can work in.</p>
                </div>
              </div>

              <form className="form" onSubmit={addEmployee}>
                <label>
                  Employee name
                  <input
                    value={employeeForm.name}
                    onChange={(event) =>
                      setEmployeeForm({
                        ...employeeForm,
                        name: event.target.value,
                      })
                    }
                    placeholder="Full name"
                  />
                </label>

                <fieldset>
                  <legend>Departments</legend>
                  <div className="task-selector">
                    {departments.map((department) => (
                      <button
                        type="button"
                        key={department.id}
                        className={
                          employeeForm.departmentIds.includes(
                            department.id,
                          )
                            ? "selected"
                            : ""
                        }
                        onClick={() =>
                          toggleEmployeeDepartment(department.id)
                        }
                      >
                        {department.name}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="form-actions">
                  <button className="primary" type="submit">
                    {editingEmployeeId ? "Save changes" : "Add employee"}
                  </button>

                  {editingEmployeeId && (
                    <button
                      className="secondary"
                      type="button"
                      onClick={cancelEditingEmployee}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </aside>
          </div>
        )}

        {activePage === "departments" && (
          <div className="departments-layout">
            <section className="panel">
              <div className="panel-title">
                <div>
                  <h2>Departments & Tasks</h2>
                  <p>Add departments and tasks at any time.</p>
                </div>
              </div>

              <div className="department-grid">
                {departments.map((department) => (
                  <article
                    className="department-card"
                    key={department.id}
                  >
                    <div className="department-card-title">
                      {editingDepartmentId === department.id ? (
                        <div className="edit-inline">
                          <input
                            value={editingDepartmentName}
                            onChange={(event) =>
                              setEditingDepartmentName(event.target.value)
                            }
                          />
                          <button
                            className="small-save"
                            onClick={() =>
                              saveDepartmentName(department.id)
                            }
                          >
                            Save
                          </button>
                          <button
                            className="small-cancel"
                            onClick={cancelEditingDepartment}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <h3>{department.name}</h3>
                          <div className="row-actions">
                            <button
                              className="edit-button"
                              onClick={() =>
                                startEditingDepartment(department)
                              }
                            >
                              Edit
                            </button>
                            <button
                              className="delete"
                              onClick={() =>
                                deleteDepartment(department.id)
                              }
                            >
                              ×
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    <label className="department-color-control">
                      <span>Department color</span>
                      <div>
                        <input
                          type="color"
                          value={department.color || "#4F6D7A"}
                          onChange={(event) =>
                            updateDepartmentColor(
                              department.id,
                              event.target.value,
                            )
                          }
                        />
                        <code>
                          {department.color || "#4F6D7A"}
                        </code>
                      </div>
                    </label>

                    <div className="task-management-list">
                      {department.tasks.length === 0 ? (
                        <p>No tasks yet.</p>
                      ) : (
                        department.tasks.map((task) => (
                          <div key={task}>
                            {editingTask?.departmentId === department.id &&
                              editingTask?.oldName === task ? (
                              <div className="edit-inline task-edit">
                                <input
                                  value={editingTaskName}
                                  onChange={(event) =>
                                    setEditingTaskName(event.target.value)
                                  }
                                />
                                <button
                                  className="small-save"
                                  onClick={saveTaskName}
                                >
                                  Save
                                </button>
                                <button
                                  className="small-cancel"
                                  onClick={cancelEditingTask}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <>
                                <span>{task}</span>
                                <div className="row-actions">
                                  <button
                                    className="text-edit"
                                    onClick={() =>
                                      startEditingTask(
                                        department.id,
                                        task,
                                      )
                                    }
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() =>
                                      deleteTask(department.id, task)
                                    }
                                  >
                                    ×
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    <div className="inline-form">
                      <input
                        value={newTaskNames[department.id] || ""}
                        onChange={(event) =>
                          setNewTaskNames({
                            ...newTaskNames,
                            [department.id]: event.target.value,
                          })
                        }
                        placeholder="New task"
                      />
                      <button
                        onClick={() =>
                          addTaskToDepartment(department.id)
                        }
                      >
                        Add
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <aside className="panel add-department">
              <div className="panel-title">
                <div>
                  <h2>Add Department</h2>
                  <p>Create another bakery team.</p>
                </div>
              </div>

              <form className="form" onSubmit={addDepartment}>
                <label>
                  Department name
                  <input
                    value={newDepartmentName}
                    onChange={(event) =>
                      setNewDepartmentName(event.target.value)
                    }
                    placeholder="Example: Warehouse"
                  />
                </label>

                <button className="primary" type="submit">
                  Add department
                </button>
              </form>
            </aside>
          </div>
        )}

        {activePage === "backup" && (
          <section className="panel backup-panel">
            <div className="panel-title">
              <div>
                <h2>Backup & Restore</h2>
                <p>Move all bakery data between computers, phones, or browsers.</p>
              </div>
            </div>

            <div className="backup-grid">
              <article className="backup-card">
                <div className="backup-card-icon">↓</div>
                <div>
                  <h3>Export all data</h3>
                  <p>
                    Download one JSON file containing employees,
                    departments, tasks, shifts, vacations, and unavailability.
                  </p>
                </div>
                <button type="button" className="primary" onClick={exportAllData}>
                  Export backup
                </button>
              </article>

              <article className="backup-card">
                <div className="backup-card-icon">↻</div>
                <div>
                  <h3>Replace current data</h3>
                  <p>
                    Delete the current app data and restore the selected backup
                    exactly as it was exported.
                  </p>
                </div>
                <button
                  type="button"
                  className="danger-import-button"
                  onClick={() => openImportFilePicker("replace")}
                >
                  Import and replace
                </button>
              </article>

              <article className="backup-card">
                <div className="backup-card-icon">＋</div>
                <div>
                  <h3>Merge with current data</h3>
                  <p>
                    Keep current data, add missing records, combine employee
                    departments, and avoid duplicate shifts.
                  </p>
                </div>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => openImportFilePicker("merge")}
                >
                  Import and merge
                </button>
              </article>
            </div>

            <div className="backup-note">
              <strong>Recommended:</strong> Export a backup before replacing
              data. Import only JSON files created by this shift planner.
            </div>
          </section>
        )}

        {activePage === "warnings" && (
          <section className="panel">
            <div className="panel-title">
              <div>
                <h2>Warnings</h2>
                <p>Review conflicts before using the schedule.</p>
              </div>
            </div>

            {warnings.length === 0 ? (
              <div className="big-empty success">
                <div>✓</div>
                <strong>No warnings</strong>
                <p>No detected conflicts in the current schedule.</p>
              </div>
            ) : (
              <div className="warnings-list">
                {warnings.map((warning) => (
                  <article key={warning.id}>
                    <strong>!</strong>
                    <span>{warning.text}</span>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {showPrintPreview && (
        <div className="print-preview-overlay">
          <div className="print-preview-modal">
            <div className="print-preview-toolbar">
              <div>
                <strong>Print Preview</strong>
                <span>{formatWeekRange(selectedWeekStart)}</span>
              </div>

              <div>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setShowPrintPreview(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={printSchedule}
                >
                  Print / Save PDF
                </button>
              </div>
            </div>

            <div className="print-preview-page">
              <div className="preview-title">
                <h1>Bakery Weekly Schedule</h1>
                <p>{formatWeekRange(selectedWeekStart)}</p>
              </div>

              <div className="preview-grid">
                <div className="preview-corner">Employee</div>

                {DAYS.map((day, dayIndex) => (
                  <div className="preview-day" key={day}>
                    <strong>{day.slice(0, 3)}</strong>
                    <span>
                      {formatDayDate(
                        selectedWeekStart,
                        dayIndex,
                      )}
                    </span>
                  </div>
                ))}

                {employees.map((employee) => (
                  <Fragment key={employee.id}>
                    <div className="preview-employee">
                      <strong>{employee.name}</strong>
                    </div>

                    {DAYS.map((day) => {
                      const shiftsForCell = visibleWeekShifts
                        .filter(
                          (shift) =>
                            shift.day === day &&
                            Number(shift.employeeId) ===
                            Number(employee.id),
                        )
                        .sort(
                          (firstShift, secondShift) =>
                            timeToMinutes(firstShift.start) -
                            timeToMinutes(secondShift.start),
                        );

                      return (
                        <div
                          className="preview-cell"
                          key={`${employee.id}-${day}`}
                        >
                          {shiftsForCell.map((shift) => (
                            <div
                              className="preview-shift"
                              key={shift.id}
                              style={
                                shift.type === "shift"
                                  ? {
                                    backgroundColor:
                                      getDepartment(
                                        shift.departmentId,
                                      )?.color || "#4F6D7A",
                                    color: getContrastText(
                                      getDepartment(
                                        shift.departmentId,
                                      )?.color,
                                    ),
                                  }
                                  : shift.type === "vacation"
                                    ? {
                                      backgroundColor: "#2F7D5B",
                                      color: "#FFFFFF",
                                    }
                                    : {
                                      backgroundColor: "#D9A441",
                                      color: "#241F1B",
                                    }
                              }
                            >
                              <strong>
                                {shift.start}–{shift.end}
                              </strong>
                              <span>
                                {shift.type === "shift"
                                  ? getDepartment(
                                    shift.departmentId,
                                  )?.name || "Unknown"
                                  : shift.type === "vacation"
                                    ? "Vacation"
                                    : "Unavailable"}
                              </span>
                              {shift.type === "shift" && (
                                <small className="preview-task-text">
                                  {shift.taskAssignments
                                    .map(
                                      (assignment) =>
                                        assignment.task,
                                    )
                                    .join(", ")}
                                </small>
                              )}

                              {shift.type === "vacation" && (
                                <small>Full day</small>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
