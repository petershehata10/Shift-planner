export const AVATAR_PALETTE = [
  { bg: "#2D6A6A", text: "#E0F0F0" },
  { bg: "#3A5A7A", text: "#E0ECFA" },
  { bg: "#5A5A2D", text: "#F0F0E0" },
  { bg: "#6A3A5A", text: "#FAE0F0" },
  { bg: "#4A3A6A", text: "#ECE0FA" },
  { bg: "#6A4A2D", text: "#FAF0E0" },
];

export function getAvatarInitials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = Array.from(parts[0] || "")[0] || "";
  const last = parts.length > 1 ? Array.from(parts.at(-1))[0] : "";
  return (first + last).toUpperCase() || "?";
}

export function getAvatarColor(name) {
  const code = name.trim().toUpperCase().codePointAt(0) || 0;
  return AVATAR_PALETTE[code % AVATAR_PALETTE.length];
}
