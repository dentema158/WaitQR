// Color tokens for the WaitQR dashboard. Keeping this as a plain object (rather than CSS
// variables) lets components pass colors directly into inline styles and SVG props, which is
// used heavily throughout (e.g. <FillBorder color={C.amber} />). If this grows, it's a natural
// seam to convert into CSS custom properties or a Tailwind theme extension.
export const C = {
  ink900: "#12151B",
  ink800: "#1B2028",
  ink700: "#262C36",
  ink600: "#333B47",
  hair: "#333B47",
  paper: "#EFEAD9",
  paperLine: "#D9D2BC",
  inkText: "#1B2028",
  blue: "#2563EB",
  blueSoft: "rgba(37,99,235,0.14)",
  amber: "#E8A33D",
  amberSoft: "rgba(232,163,61,0.14)",
  teal: "#4FB286",
  tealSoft: "rgba(79,178,134,0.14)",
  coral: "#E2614F",
  coralSoft: "rgba(226,97,79,0.14)",
  textLight: "#F2EFE7",
  textMuted: "#8B919C",
  textFaint: "#5B6270",
};

function hexToRgb(hex) {
  if (typeof hex !== "string" || !/^#?[0-9a-f]{6}$/i.test(hex)) return null;
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
}

function mixHex(from, to, amount) {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  if (!a || !b) return from;
  return rgbToHex({
    r: a.r + (b.r - a.r) * amount,
    g: a.g + (b.g - a.g) * amount,
    b: a.b + (b.b - a.b) * amount,
  });
}

function isLightHex(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000 > 180;
}

export function pageBackground(theme) {
  return isLightHex(theme?.bgColor)
    ? mixHex(mixHex(theme.bgColor, theme.accentColor || theme.bgColor, 0.035), "#94a3b8", 0.08)
    : mixHex(theme?.bgColor, "#000000", 0.45);
}
