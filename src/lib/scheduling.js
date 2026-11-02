export const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export function toLocalISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getMonday(date = new Date()) {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);

  const day = result.getDay();
  const distanceFromMonday = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + distanceFromMonday);

  return result;
}

export function addDays(date, amount) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

export function parseLocalDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function formatWeekRange(weekStart) {
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

export function formatDayDate(weekStart, dayIndex) {
  const date = addDays(parseLocalDate(weekStart), dayIndex);

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export function minutesToTime(totalMinutes) {
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

export function snapTimeToQuarterHour(time) {
  if (!time) return "00:00";

  const totalMinutes = timeToMinutes(time);
  const roundedMinutes = Math.round(totalMinutes / 15) * 15;

  return minutesToTime(roundedMinutes);
}

export function calculateDefaultShiftEnd(start) {
  return minutesToTime(timeToMinutes(start) + 8 * 60 + 30);
}

export function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function calculateShiftHours(start, end) {
  const startMinutes = timeToMinutes(start);
  let endMinutes = timeToMinutes(end);

  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }

  const hours = (endMinutes - startMinutes) / 60;
  return Number.isInteger(hours) ? hours : Number(hours.toFixed(2));
}

function shiftInterval(shift) {
  const [year, month, day] = shift.weekStart.split("-").map(Number);
  // UTC is only a calendar-day counter, not the shift's timezone. Keep local
  // schedule days at 1440 minutes, matching existing duration math across DST.
  const dateMinutes = Date.UTC(year, month - 1, day) / 60000
    + DAYS.indexOf(shift.day) * 1440;
  const start = timeToMinutes(shift.start);
  let end = timeToMinutes(shift.end);
  if (end <= start) end += 1440;
  return { start: dateMinutes + start, end: dateMinutes + end };
}

export function shiftsOverlap(first, second) {
  if (Number(first.employeeId) !== Number(second.employeeId)) return false;
  const a = shiftInterval(first);
  const b = shiftInterval(second);
  return a.start < b.end && b.start < a.end;
}

export function calculateEmployeeHours(employees, weekShifts) {
  const totals = {};
  employees.forEach((employee) => { totals[employee.id] = 0; });
  weekShifts.filter((shift) => shift.type === "shift").forEach((shift) => {
    totals[shift.employeeId] = (totals[shift.employeeId] || 0)
      + calculateShiftHours(shift.start, shift.end);
  });
  return totals;
}

export function getScheduleWarnings(shifts, employees, selectedWeekStart) {
  const result = [];
  shifts.forEach((shift, index) => {
    const employee = employees.find((item) => item.id === Number(shift.employeeId));
    if (shift.weekStart === selectedWeekStart && shift.type === "shift"
      && employee && !employee.departmentIds.includes(shift.departmentId)) {
      result.push({
        id: `department-${shift.id}`,
        text: `${employee.name} is not assigned to this department.`,
      });
    }
    // Each pair is visited once, including either side of a cross-week conflict.
    shifts.slice(index + 1).forEach((otherShift) => {
      if (shift.weekStart !== selectedWeekStart
        && otherShift.weekStart !== selectedWeekStart) return;
      if (!shiftsOverlap(shift, otherShift)) return;
      const sameDay = shift.weekStart === otherShift.weekStart && shift.day === otherShift.day;
      const when = sameDay ? shift.day
        : `${shift.day} (${shift.weekStart}) and ${otherShift.day} (${otherShift.weekStart})`;
      result.push({
        id: `overlap-${shift.id}-${otherShift.id}`,
        text: `${employee?.name || "Employee"} has overlapping shifts on ${when}.`,
      });
    });
  });
  return result;
}

