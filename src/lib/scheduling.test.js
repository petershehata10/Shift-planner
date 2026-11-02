import test from "node:test";
import assert from "node:assert/strict";
import {
  shiftsOverlap, calculateShiftHours, calculateEmployeeHours, getScheduleWarnings,
  getMonday, parseLocalDate, toLocalISODate, addDays, formatWeekRange,
  timeToMinutes, minutesToTime, snapTimeToQuarterHour, calculateDefaultShiftEnd,
} from "./scheduling.js";

const employee = { id: 1, name: "Demo Avery", departmentIds: ["baking"] };
function shift(overrides = {}) {
  return { id: 1, employeeId: 1, weekStart: "2026-11-02", day: "Monday",
    start: "22:00", end: "06:00", type: "shift", departmentId: "baking", ...overrides };
}

const cases = [
  ["same-day overlap", shift({ start: "08:00", end: "12:00" }), shift({ start: "11:00", end: "14:00" }), true],
  ["same-day separation", shift({ start: "08:00", end: "12:00" }), shift({ start: "13:00", end: "14:00" }), false],
  ["Monday overnight into Tuesday", shift(), shift({ day: "Tuesday", start: "05:00", end: "07:00" }), true],
  ["Sunday overnight into next week", shift({ day: "Sunday" }), shift({ weekStart: "2026-11-09", start: "05:00", end: "07:00" }), true],
  ["overnight separation", shift(), shift({ day: "Tuesday", start: "07:00", end: "09:00" }), false],
  ["different employees", shift(), shift({ employeeId: 2 }), false],
  ["same-day touching", shift({ start: "08:00", end: "12:00" }), shift({ start: "12:00", end: "14:00" }), false],
  ["overnight touching", shift(), shift({ day: "Tuesday", start: "06:00", end: "07:00" }), false],
  ["24-hour interval overlaps next morning", shift({ start: "08:00", end: "08:00" }), shift({ day: "Tuesday", start: "07:00", end: "09:00" }), true],
  ["24-hour endpoint touching", shift({ start: "08:00", end: "08:00" }), shift({ day: "Tuesday", start: "08:00", end: "09:00" }), false],
  ["cross-year adjacent weeks", shift({ weekStart: "2026-12-28", day: "Sunday" }), shift({ weekStart: "2027-01-04", start: "05:00", end: "07:00" }), true],
  ["December to January", shift({ weekStart: "2026-12-28", day: "Thursday" }), shift({ weekStart: "2026-12-28", day: "Friday", start: "05:00", end: "07:00" }), true],
  ["numeric employee IDs remain compatible", shift(), shift({ employeeId: "1" }), true],
  ["vacation retains time interval", shift({ type: "vacation", start: "00:00", end: "23:59" }), shift(), true],
  ["vacation's existing last-minute gap", shift({ type: "vacation", start: "00:00", end: "23:59" }), shift({ start: "23:59", end: "00:00" }), false],
  ["overnight unavailability", shift({ type: "unavailability" }), shift({ day: "Tuesday", start: "05:00", end: "07:00" }), true],
  ["DST calendar boundary", shift({ weekStart: "2026-10-19", day: "Sunday" }), shift({ weekStart: "2026-10-26", start: "05:00", end: "07:00" }), true],
];
for (const [name, first, second, expected] of cases) {
  test(name, () => {
    assert.equal(shiftsOverlap(first, second), expected);
    assert.equal(shiftsOverlap(second, first), expected);
  });
}

test("duration and existing time helpers retain their behavior", () => {
  assert.equal(calculateShiftHours("22:00", "06:00"), 8);
  assert.equal(calculateShiftHours("08:00", "08:00"), 24);
  assert.equal(calculateShiftHours("00:00", "23:59"), 23.98);
  assert.equal(timeToMinutes("22:15"), 1335);
  assert.equal(minutesToTime(1455), "00:15");
  assert.equal(snapTimeToQuarterHour("23:59"), "00:00");
  assert.equal(calculateDefaultShiftEnd("22:00"), "06:30");
});

test("totals include full shifts but exclude vacation and unavailability", () => {
  const records = [shift(), shift({ start: "08:00", end: "08:00" }),
    shift({ type: "vacation" }), shift({ type: "unavailability" }),
    shift({ employeeId: 2, start: "08:00", end: "16:30" })];
  assert.deepEqual(calculateEmployeeHours([employee, { id: 2 }, { id: 3 }], records),
    { 1: 32, 2: 8.5, 3: 0 });
});

test("cross-week warnings appear once in either selected week, in either record order", () => {
  const first = shift({ day: "Sunday" });
  const second = shift({ id: 2, weekStart: "2026-11-09", start: "05:00", end: "07:00" });
  for (const records of [[first, second], [second, first]]) {
    for (const week of [first.weekStart, second.weekStart]) {
      const warnings = getScheduleWarnings(records, [employee], week);
      assert.equal(warnings.length, 1);
      assert.match(warnings[0].text, /Sunday.*2026-11-02|Monday.*2026-11-09/);
    }
    assert.deepEqual(getScheduleWarnings(records, [employee], "2026-11-16"), []);
  }
});

test("same-week warning pairs are unique and department warnings stay week-scoped", () => {
  const records = [shift(), shift({ id: 2 }), shift({ id: 3, departmentId: "drivers" })];
  const warnings = getScheduleWarnings(records, [employee], "2026-11-02");
  assert.equal(warnings.filter((warning) => warning.id.startsWith("overlap")).length, 3);
  assert.equal(warnings.filter((warning) => warning.id.startsWith("department")).length, 1);
  assert.equal(new Set(warnings.map((warning) => warning.id)).size, 4);
  assert.deepEqual(getScheduleWarnings(records, [employee], "2026-11-09"), []);
});

test("week helpers preserve local calendar and year boundaries", () => {
  assert.equal(toLocalISODate(getMonday(parseLocalDate("2027-01-01"))), "2026-12-28");
  assert.equal(toLocalISODate(addDays(parseLocalDate("2026-12-28"), 7)), "2027-01-04");
  assert.match(formatWeekRange("2026-12-28"), /2026.*2027/);
});
