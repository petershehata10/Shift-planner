// Choose the higher-contrast text color for user-selected department colors.
// Keep this separate from the legacy print color calculation.
export function badgeColors(color) {
  const backgroundColor = /^#[0-9a-f]{6}$/i.test(color || "") ? color : "#4F6D7A";
  const channels = backgroundColor.slice(1).match(/../g).map((pair) => {
    const channel = parseInt(pair, 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  const blackContrast = (luminance + 0.05) / 0.05;
  const whiteContrast = 1.05 / (luminance + 0.05);
  return { backgroundColor, color: blackContrast >= whiteContrast ? "#000000" : "#FFFFFF" };
}
