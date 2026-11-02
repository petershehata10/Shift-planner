import test from "node:test";
import assert from "node:assert/strict";
import { badgeColors } from "./badgeColors.js";

test("department badges choose readable text for dark, light and saturated colors", () => {
  for (const color of ["#FFFFFF", "#FFFF00", "#E58A2B", "#00FF00"]) {
    assert.deepEqual(badgeColors(color), { backgroundColor: color, color: "#000000" });
  }
  for (const color of ["#000000", "#0000FF", "#8B5E3C"]) {
    assert.deepEqual(badgeColors(color), { backgroundColor: color, color: "#FFFFFF" });
  }
});

test("invalid or missing badge colors use the existing fallback", () => {
  for (const color of [undefined, "", "not-a-color"]) {
    assert.deepEqual(badgeColors(color), badgeColors("#4F6D7A"));
  }
});
