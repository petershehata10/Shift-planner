import test from "node:test";
import assert from "node:assert/strict";
import { AVATAR_PALETTE, getAvatarColor, getAvatarInitials } from "./avatars.js";

test("avatar initials handle names, extra whitespace and empty names", () => {
  assert.equal(getAvatarInitials("Avery Morgan"), "AM");
  assert.equal(getAvatarInitials("  avery   demo   morgan  "), "AM");
  assert.equal(getAvatarInitials("Avery"), "A");
  assert.equal(getAvatarInitials(""), "?");
  assert.equal(getAvatarInitials("   "), "?");
  assert.equal(getAvatarInitials("Éloise Novák"), "ÉN");
});

test("avatar colors are stable and always come from the controlled palette", () => {
  assert.deepEqual(getAvatarColor("Avery"), getAvatarColor(" avery "));
  for (const name of ["Avery", "Morgan", "Taylor", "Éloise", "", "   "]) {
    assert.ok(AVATAR_PALETTE.includes(getAvatarColor(name)));
  }
});

function luminance(hex) {
  const [r, g, b] = hex.slice(1).match(/../g).map((pair) => {
    const value = parseInt(pair, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

test("every avatar text/background pair meets 4.5:1 contrast", () => {
  for (const { bg, text } of AVATAR_PALETTE) {
    const light = Math.max(luminance(bg), luminance(text));
    const dark = Math.min(luminance(bg), luminance(text));
    assert.ok((light + 0.05) / (dark + 0.05) >= 4.5, `${bg} / ${text}`);
  }
});
