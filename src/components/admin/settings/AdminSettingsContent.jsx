import { Children, useEffect, useRef, useState } from "react";
import {
  Bell,
  Check,
  ChevronDown,
  Clock,
  Minus,
  Monitor,
  Palette,
  Plus,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  Upload,
  Users,
  X,
} from "lucide-react";
import { readImageFile } from "../../../lib/imageUpload";

function withAlpha(hex, alphaHex) {
  if (!hex || hex.length !== 7) return hex;
  return `${hex}${alphaHex}`;
}

function normalizeHexColor(value) {
  const clean = String(value || "").trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(clean)) {
    return `#${clean.split("").map((char) => `${char}${char}`).join("").toUpperCase()}`;
  }
  if (/^[0-9a-f]{6}$/i.test(clean)) return `#${clean.toUpperCase()}`;
  return null;
}

function formatHexDraft(value) {
  const clean = String(value || "").replace(/[^0-9a-f]/gi, "").slice(0, 6);
  return `#${clean.toUpperCase()}`;
}

function isLightHex(hex) {
  if (typeof hex !== "string" || !/^#[0-9a-f]{6}$/i.test(hex)) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}

function hexToRgb(hex) {
  const color = normalizeHexColor(hex);
  if (!color) return null;
  return {
    r: parseInt(color.slice(1, 3), 16),
    g: parseInt(color.slice(3, 5), 16),
    b: parseInt(color.slice(5, 7), 16),
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function mixHex(from, to, amount) {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  if (!a || !b) return normalizeHexColor(from) || normalizeHexColor(to) || "#2563EB";
  return rgbToHex({
    r: a.r + (b.r - a.r) * amount,
    g: a.g + (b.g - a.g) * amount,
    b: a.b + (b.b - a.b) * amount,
  });
}

function rgbToHsl({ r, g, b }) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const lightness = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l: lightness };

  const delta = max - min;
  const saturation = lightness > 0.5
    ? delta / (2 - max - min)
    : delta / (max + min);
  let hue = 0;

  if (max === rn) hue = (gn - bn) / delta + (gn < bn ? 6 : 0);
  else if (max === gn) hue = (bn - rn) / delta + 2;
  else hue = (rn - gn) / delta + 4;

  return { h: hue / 6, s: saturation, l: lightness };
}

function hslToHex({ h, s, l }) {
  if (s === 0) {
    const value = l * 255;
    return rgbToHex({ r: value, g: value, b: value });
  }

  const hueToRgb = (p, q, t) => {
    let nextT = t;
    if (nextT < 0) nextT += 1;
    if (nextT > 1) nextT -= 1;
    if (nextT < 1 / 6) return p + (q - p) * 6 * nextT;
    if (nextT < 1 / 2) return q;
    if (nextT < 2 / 3) return p + (q - p) * (2 / 3 - nextT) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return rgbToHex({
    r: hueToRgb(p, q, h + 1 / 3) * 255,
    g: hueToRgb(p, q, h) * 255,
    b: hueToRgb(p, q, h - 1 / 3) * 255,
  });
}

function shiftHue(hex, degrees, saturationScale = 1, lightnessShift = 0) {
  const hsl = rgbToHsl(hexToRgb(hex));
  return hslToHex({
    h: (hsl.h + degrees / 360 + 1) % 1,
    s: Math.max(0, Math.min(1, hsl.s * saturationScale)),
    l: Math.max(0, Math.min(1, hsl.l + lightnessShift)),
  });
}

function contrastColorForBackground(bgColor, accentColor, mode) {
  const bg = normalizeHexColor(bgColor) || (mode === "Light" ? "#ECF2FB" : "#060B17");
  const accent = normalizeHexColor(accentColor) || "#2563EB";
  const lightBg = isLightHex(bg);
  const base = lightBg ? "#0F172A" : "#F8FAFC";
  const secondary = lightBg ? "#1F2937" : "#DBE3F0";
  const bgHsl = rgbToHsl(hexToRgb(bg));
  const accentHsl = rgbToHsl(hexToRgb(accent));

  return [
    mixHex(base, accent, lightBg ? 0.055 : 0.045),
    mixHex(secondary, accent, lightBg ? 0.09 : 0.065),
    mixHex(lightBg ? "#334155" : "#CBD5E1", accent, lightBg ? 0.12 : 0.08),
    lightBg ? "#111827" : "#F2EFE7",
    hslToHex({ h: accentHsl.h, s: Math.min(accentHsl.s * 0.28, lightBg ? 0.18 : 0.12), l: lightBg ? 0.16 : 0.88 }),
    hslToHex({ h: bgHsl.h, s: Math.min(Math.max(bgHsl.s * 0.7, 0.08), lightBg ? 0.2 : 0.14), l: lightBg ? 0.2 : 0.84 }),
    mixHex(lightBg ? "#020617" : "#FFFFFF", accent, lightBg ? 0.09 : 0.05),
    mixHex(lightBg ? "#374151" : "#E2E8F0", accent, lightBg ? 0.14 : 0.1),
    shiftHue(mixHex(base, accent, lightBg ? 0.08 : 0.06), 12, 1.05, 0),
    shiftHue(mixHex(base, accent, lightBg ? 0.08 : 0.06), -12, 1.05, 0),
    hslToHex({ h: accentHsl.h, s: Math.min(accentHsl.s * 0.18, lightBg ? 0.14 : 0.1), l: lightBg ? 0.28 : 0.76 }),
  ];
}

function borderColorsForBackground(bgColor, accentColor, mode) {
  const bg = normalizeHexColor(bgColor) || (mode === "Light" ? "#ECF2FB" : "#060B17");
  const accent = normalizeHexColor(accentColor) || "#2563EB";
  const bgHsl = rgbToHsl(hexToRgb(bg));
  const accentHsl = rgbToHsl(hexToRgb(accent));
  const lightBg = isLightHex(bg);
  const lightnessSteps = lightBg
    ? [Math.max(0.72, bgHsl.l - 0.12), Math.max(0.66, bgHsl.l - 0.18), 0.86, 0.78]
    : [Math.min(0.24, bgHsl.l + 0.08), Math.min(0.3, bgHsl.l + 0.13), 0.12, 0.2];

  return [
    hslToHex({ h: accentHsl.h, s: Math.min(accentHsl.s * 0.34, lightBg ? 0.18 : 0.1), l: lightnessSteps[0] }),
    hslToHex({ h: bgHsl.h, s: Math.min(Math.max(bgHsl.s, 0.08), lightBg ? 0.2 : 0.14), l: lightnessSteps[1] }),
    mixHex(lightBg ? "#CBD5E1" : "#334155", accent, lightBg ? 0.2 : 0.18),
    hslToHex({ h: accentHsl.h, s: Math.min(accentHsl.s * 0.24, lightBg ? 0.14 : 0.08), l: lightnessSteps[3] }),
    mixHex(lightBg ? "#E2E8F0" : "#1E293B", bg, lightBg ? 0.28 : 0.2),
    mixHex(lightBg ? "#D1D5DB" : "#475569", accent, lightBg ? 0.16 : 0.14),
    hslToHex({ h: bgHsl.h, s: Math.min(Math.max(bgHsl.s * 0.7, 0.06), lightBg ? 0.16 : 0.12), l: lightBg ? 0.82 : 0.18 }),
    hslToHex({ h: accentHsl.h, s: Math.min(accentHsl.s * 0.2, lightBg ? 0.12 : 0.08), l: lightBg ? 0.9 : 0.26 }),
    mixHex(lightBg ? "#F1F5F9" : "#0F172A", accent, lightBg ? 0.22 : 0.22),
    hslToHex({ h: (accentHsl.h + 0.04) % 1, s: Math.min(accentHsl.s * 0.22, lightBg ? 0.14 : 0.08), l: lightBg ? 0.84 : 0.22 }),
    hslToHex({ h: (accentHsl.h + 0.96) % 1, s: Math.min(accentHsl.s * 0.22, lightBg ? 0.14 : 0.08), l: lightBg ? 0.8 : 0.16 }),
  ];
}

function derivedPalettes({ accentColor, bgColor, mode }) {
  const accent = normalizeHexColor(accentColor) || "#2563EB";
  const accentHsl = rgbToHsl(hexToRgb(accent));
  const lightMode = mode === "Light";
  const bgBase = lightMode ? "#ECF2FB" : "#060B17";
  const backgroundColors = lightMode
    ? [
      mixHex(bgBase, accent, 0.055),
      mixHex("#FFFFFF", accent, 0.075),
      mixHex("#F8FAFC", accent, 0.11),
      hslToHex({ h: accentHsl.h, s: Math.min(accentHsl.s * 0.18, 0.14), l: 0.95 }),
      mixHex("#F1F5F9", accent, 0.14),
      shiftHue(mixHex("#FFFFFF", accent, 0.1), -10, 1.05, -0.015),
      shiftHue(mixHex("#F8FAFC", accent, 0.14), 10, 1.05, -0.01),
      hslToHex({ h: accentHsl.h, s: Math.min(accentHsl.s * 0.24, 0.18), l: 0.9 }),
      mixHex("#E2E8F0", accent, 0.18),
      mixHex("#FDFDFD", shiftHue(accent, 30, 0.8, 0.02), 0.1),
      mixHex("#FDFDFD", shiftHue(accent, -30, 0.8, 0.02), 0.1),
    ]
    : [
      mixHex(bgBase, accent, 0.055),
      mixHex("#020617", accent, 0.09),
      mixHex("#0F172A", accent, 0.14),
      hslToHex({ h: accentHsl.h, s: Math.min(accentHsl.s * 0.28, 0.18), l: 0.1 }),
      mixHex("#111827", accent, 0.18),
      shiftHue(mixHex("#020617", accent, 0.12), -10, 1.05, 0.01),
      shiftHue(mixHex("#0B1120", accent, 0.16), 10, 1.05, 0.01),
      hslToHex({ h: accentHsl.h, s: Math.min(accentHsl.s * 0.34, 0.2), l: 0.14 }),
      mixHex("#1E293B", accent, 0.16),
      mixHex("#030712", shiftHue(accent, 30, 0.8, 0), 0.14),
      mixHex("#030712", shiftHue(accent, -30, 0.8, 0), 0.14),
    ];

  return {
    bgColor: backgroundColors,
    fontColor: contrastColorForBackground(bgColor || backgroundColors[0], accent, mode),
    borderColor: borderColorsForBackground(bgColor || backgroundColors[0], accent, mode),
  };
}

function focusHandlers(accent, restoreBorderColor) {
  return {
    onFocus: (e) => {
      e.target.style.borderColor = accent;
      e.target.style.boxShadow = `0 0 0 3px ${withAlpha(accent, "33")}`;
    },
    onBlur: (e) => {
      e.target.style.borderColor = restoreBorderColor || "";
      e.target.style.boxShadow = "";
    },
  };
}

function useIsNarrow(breakpoint = 640) {
  const [isNarrow, setIsNarrow] = useState(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );

  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);

  return isNarrow;
}

function Toggle({ checked, onChange, accent }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200"
      style={{ backgroundColor: checked ? accent : "rgba(148, 163, 184, 0.35)" }}
      aria-pressed={checked}
    >
      <span
        className="absolute h-5 w-5 rounded-full bg-white transition-transform duration-200 ease-out"
        style={{
          transform: checked ? "translateX(22px)" : "translateX(2px)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
        }}
      />
    </button>
  );
}

function Select({ value, onChange, options, accent, fontColor, borderColor, radius }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...focusHandlers(accent, borderColor)}
        style={{ color: fontColor, borderColor, borderRadius: radius, backgroundColor: "var(--field-bg)" }}
        className="w-full appearance-none border px-3 py-2 text-sm outline-none transition-colors"
      >
        {options.map((option) => {
          const opt = typeof option === "string" ? { value: option, label: option } : option;
          return (
          <option key={opt.value} value={opt.value} style={{ color: "#0f172a" }}>
            {opt.label}
          </option>
          );
        })}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
        style={{ color: withAlpha(fontColor, "80") }}
      />
    </div>
  );
}

function TextInput({ value, onChange, placeholder, accent, fontColor, borderColor, radius }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      {...focusHandlers(accent, borderColor)}
      style={{ color: fontColor, borderColor, borderRadius: radius, backgroundColor: "var(--field-bg)" }}
      className="w-full border px-3 py-2 text-sm outline-none transition-colors placeholder:text-current placeholder:opacity-40"
    />
  );
}

function Stepper({ value, onChange, min = 1, fontColor, borderColor, radius }) {
  return (
    <div
      className="flex items-center justify-between border px-3 py-1.5"
      style={{ borderColor, borderRadius: radius, backgroundColor: "var(--field-bg)" }}
    >
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} style={{ color: withAlpha(fontColor, "99") }}>
        <Minus size={14} />
      </button>
      <span className="text-sm" style={{ color: fontColor }}>
        {value}
      </span>
      <button type="button" onClick={() => onChange(value + 1)} style={{ color: withAlpha(fontColor, "99") }}>
        <Plus size={14} />
      </button>
    </div>
  );
}

function Field({ label, hint, children, fontColor, inline }) {
  const isNarrow = useIsNarrow();
  const stacked = isNarrow && !inline;

  return (
    <div
      className="flex gap-2 py-4"
      style={stacked ? { flexDirection: "column" } : { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium" style={{ color: fontColor }}>
          {label}
        </p>
        {hint && (
          <p className="mt-0.5 text-xs" style={{ color: withAlpha(fontColor, "80") }}>
            {hint}
          </p>
        )}
      </div>
      <div style={{ width: stacked ? "100%" : inline ? "auto" : "16rem", flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function ColorSwatchInput({ label, hint, value, defaultValue, presetColors = [], suggestedColors = [], onChange, fontColor, radius, borderColor }) {
  const isNarrow = useIsNarrow();
  const compactRadius = Math.max(10, Math.min(14, radius));
  const defaultColor = normalizeHexColor(defaultValue) || "#2563EB";
  const selectedColor = normalizeHexColor(value) || defaultColor;
  const [draft, setDraft] = useState(() => selectedColor);
  const [open, setOpen] = useState(false);
  const [pendingColor, setPendingColor] = useState(null);
  const pickerRef = useRef(null);
  const chromeRef = useRef(null);
  const visibleColor = pendingColor || selectedColor;
  const visibleNativeColor = visibleColor.toLowerCase();
  const normalizedDraft = normalizeHexColor(draft);
  const hasInvalidDraft = draft.length > 1 && !normalizedDraft;
  const panelMixColor = isLightHex(fontColor) ? "white" : "black";
  const panelBackground = `color-mix(in srgb, var(--surface-bg, var(--field-bg)) 88%, ${panelMixColor} 12%)`;
  const chrome = open && chromeRef.current
    ? chromeRef.current
    : { fontColor, borderColor, panelBackground };

  useEffect(() => {
    if (pendingColor && pendingColor !== selectedColor) return;
    setDraft(selectedColor);
    setPendingColor(null);
  }, [pendingColor, selectedColor]);

  useEffect(() => {
    if (!pendingColor) return undefined;
    const timeout = window.setTimeout(() => setPendingColor(null), 900);
    return () => window.clearTimeout(timeout);
  }, [pendingColor]);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        chromeRef.current = null;
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const handleTextChange = (nextValue) => {
    const nextDraft = formatHexDraft(nextValue);
    const nextColor = normalizeHexColor(nextDraft);
    setDraft(nextDraft);
    if (nextColor && nextColor !== selectedColor) applyColor(nextColor);
  };

  const applyColor = (nextColor) => {
    if (!nextColor || nextColor === selectedColor) return;
    setPendingColor(nextColor);
    setDraft(nextColor);
    onChange(nextColor);
  };

  const openPicker = () => {
    chromeRef.current = { fontColor, borderColor, panelBackground };
    setOpen(true);
  };

  const closePicker = () => {
    setOpen(false);
    chromeRef.current = null;
  };

  const togglePicker = () => {
    if (open) {
      closePicker();
      return;
    }
    openPicker();
  };

  const handleTextBlur = () => {
    const nextColor = normalizeHexColor(draft);
    if (nextColor) {
      setDraft(nextColor);
      applyColor(nextColor);
    } else {
      setDraft(selectedColor);
    }
  };
  const paletteColors = [
    defaultColor,
    ...presetColors.map(normalizeHexColor),
    ...suggestedColors.map(normalizeHexColor),
  ].filter((color, index, colors) => color && colors.indexOf(color) === index).slice(0, 12);

  return (
    <div
      className="flex gap-2 py-4"
      style={isNarrow ? { flexDirection: "column" } : { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: "1.5rem" }}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium" style={{ color: fontColor }}>
          {label}
        </p>
        {hint && (
          <p className="mt-0.5 text-xs" style={{ color: withAlpha(fontColor, "80") }}>
            {hint}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3" style={{ width: isNarrow ? "100%" : "16rem", flexShrink: 0 }}>
        <div ref={pickerRef} className="relative shrink-0">
          <button
            type="button"
            onClick={togglePicker}
            className="relative h-9 w-9 overflow-hidden border outline-none transition-transform active:scale-95"
            style={{
              borderRadius: compactRadius,
              borderColor: open ? visibleColor : borderColor,
              backgroundColor: visibleColor,
              boxShadow: open ? `0 0 0 3px ${withAlpha(visibleColor, "33")}` : "none",
            }}
            aria-label={`${label} picker`}
            aria-expanded={open}
          >
            <span aria-hidden="true" className="absolute inset-0" style={{ backgroundColor: visibleColor }} />
          </button>
          {open && (
            <div
              className="absolute left-0 top-11 z-[130] border p-3 shadow-2xl"
              style={{
                width: isNarrow ? "min(16rem, calc(100vw - 2rem))" : "16rem",
                color: chrome.fontColor,
                borderColor: chrome.borderColor,
                borderRadius: compactRadius,
                background: chrome.panelBackground,
              }}
            >
              <div className="flex items-start gap-3">
                <label
                  className="relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden border"
                  style={{ borderRadius: compactRadius, borderColor: chrome.borderColor, backgroundColor: visibleColor }}
                  title="Open system picker"
                >
                  <span aria-hidden="true" className="absolute inset-0" style={{ backgroundColor: visibleColor }} />
                  <input
                    type="color"
                    value={visibleNativeColor}
                    onChange={(e) => {
                      const nextColor = normalizeHexColor(e.target.value);
                      applyColor(nextColor);
                    }}
                    className="absolute inset-0 h-full w-full cursor-pointer border-none p-0 opacity-0"
                  />
                </label>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: withAlpha(chrome.fontColor, "99") }}>
                      Hex
                    </span>
                    <button
                      type="button"
                      onClick={closePicker}
                      className="flex h-6 w-6 items-center justify-center rounded-full transition-colors hover:bg-white/5"
                      style={{ color: withAlpha(chrome.fontColor, "99") }}
                      aria-label="Close picker"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <input
                    value={draft}
                    onChange={(e) => handleTextChange(e.target.value)}
                    onBlur={handleTextBlur}
                    inputMode="text"
                    spellCheck={false}
                    aria-invalid={hasInvalidDraft}
                    style={{
                      color: chrome.fontColor,
                      borderRadius: compactRadius,
                      borderColor: hasInvalidDraft ? "#f87171" : chrome.borderColor,
                      backgroundColor: "var(--field-bg)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                    className="h-10 w-full border px-3 py-2 text-sm font-semibold uppercase outline-none transition-colors"
                  />
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {paletteColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          setDraft(color);
                          applyColor(color);
                        }}
                        className="relative aspect-square w-full border-2 transition-transform hover:scale-105"
                        style={{
                          backgroundColor: color,
                          borderColor: "transparent",
                          borderRadius: 5,
                        }}
                        aria-label={color === defaultColor ? `Default ${color}` : color}
                        title={color === defaultColor ? `Default ${color}` : color}
                      >
                        {color === visibleColor ? (
                          <span
                            className="absolute inset-0 flex items-center justify-center"
                            style={{ color: isLightHex(color) ? "#111827" : "#FFFFFF" }}
                          >
                            {pendingColor === color && selectedColor !== color ? (
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : (
                              <Check size={16} strokeWidth={3} />
                            )}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <input
          value={draft}
          onChange={(e) => handleTextChange(e.target.value)}
          onBlur={handleTextBlur}
          onFocus={(e) => {
            e.target.style.borderColor = visibleColor;
            e.target.style.boxShadow = `0 0 0 3px ${withAlpha(visibleColor, "33")}`;
          }}
          inputMode="text"
          spellCheck={false}
          aria-invalid={hasInvalidDraft}
          style={{
            color: fontColor,
            borderRadius: compactRadius,
            borderColor: hasInvalidDraft ? "#f87171" : borderColor,
            backgroundColor: "var(--field-bg)",
            fontVariantNumeric: "tabular-nums",
          }}
          className="h-9 w-full border px-3 py-2 text-sm font-medium uppercase outline-none transition-colors"
        />
      </div>
    </div>
  );
}

function RadiusControl({ value, onChange, fontColor, borderColor }) {
  const clamp = (n) => Math.max(0, Math.min(48, n));
  const isNarrow = useIsNarrow();
  const compactRadius = Math.max(10, Math.min(14, value));

  return (
    <div
      className="flex gap-2 py-4"
      style={isNarrow ? { flexDirection: "column" } : { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: "1.5rem" }}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium" style={{ color: fontColor }}>
          Corner Radius
        </p>
        <p className="mt-0.5 text-xs" style={{ color: withAlpha(fontColor, "80") }}>
          Roundness applied to cards, inputs, and buttons
        </p>
      </div>
      <div className="flex items-center gap-3" style={{ width: isNarrow ? "100%" : "16rem", flexShrink: 0 }}>
        <div
          className="h-9 w-9 shrink-0"
          style={{
            borderTop: `1.5px solid ${borderColor}`,
            borderLeft: `1.5px solid ${borderColor}`,
            borderRight: `1.5px dotted ${borderColor}`,
            borderBottom: `1.5px dotted ${borderColor}`,
            borderTopLeftRadius: value,
            backgroundColor: "var(--field-bg)",
          }}
        />
        <div className="relative w-full">
          <input
            type="number"
            min={0}
            max={48}
            value={value}
            onChange={(e) => onChange(clamp(Number(e.target.value) || 0))}
            {...focusHandlers("#2563eb", borderColor)}
            style={{ color: fontColor, borderColor, borderRadius: compactRadius, backgroundColor: "var(--field-bg)" }}
            className="h-9 w-full border px-3 py-2 pr-8 text-sm outline-none transition-colors"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: withAlpha(fontColor, "80") }}>
            px
          </span>
        </div>
      </div>
    </div>
  );
}

function LogoUpload({ logoUrl, onUpload, onRemove, fontColor, radius, borderColor }) {
  const inputRef = useRef(null);
  const isNarrow = useIsNarrow();

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readImageFile(file).then(onUpload).catch((error) => {
      console.warn(error.message);
    });
  };

  return (
    <div
      className="flex gap-2 py-4"
      style={isNarrow ? { flexDirection: "column" } : { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: "1.5rem" }}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium" style={{ color: fontColor }}>
          Brand Logo
        </p>
        <p className="mt-0.5 text-xs" style={{ color: withAlpha(fontColor, "80") }}>
          Upload an image to replace the default logo mark
        </p>
      </div>
      <div className="flex items-center gap-3" style={{ width: isNarrow ? "100%" : "16rem", flexShrink: 0 }}>
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden border"
          style={{ borderRadius: radius, borderColor, backgroundColor: "var(--field-bg)" }}
        >
          {logoUrl ? (
            <img src={logoUrl} alt="Logo preview" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs font-bold" style={{ color: fontColor }}>
              W
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-2 border px-3 py-2 text-xs transition-colors hover:bg-white/5"
          style={{ color: fontColor, borderRadius: radius, borderColor, backgroundColor: "var(--field-bg)" }}
        >
          <Upload size={13} />
          Upload
        </button>
        {logoUrl && (
          <button
            type="button"
            onClick={onRemove}
            className="flex h-9 w-9 shrink-0 items-center justify-center border transition-colors hover:bg-white/5"
            style={{ color: withAlpha(fontColor, "99"), borderRadius: radius, borderColor, backgroundColor: "var(--field-bg)" }}
            title="Remove logo"
          >
            <X size={14} />
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </div>
    </div>
  );
}

function SectionCard({ icon: Icon, iconBg, title, children, fontColor, borderColor, radius }) {
  const items = Children.toArray(children);

  return (
    <section className="border p-4" style={{ borderColor, backgroundColor: "var(--surface-bg, transparent)", borderRadius: radius * 1.4 }}>
      <div className="mb-2 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center" style={{ backgroundColor: iconBg, borderRadius: radius }}>
          <Icon size={18} className="text-white" />
        </div>
        <h2 className="text-base font-semibold" style={{ color: fontColor }}>
          {title}
        </h2>
      </div>
      <div>
        {items.map((child, i) => (
          <div key={i} style={i > 0 ? { borderTop: `1px solid ${borderColor}` } : undefined}>
            {child}
          </div>
        ))}
      </div>
    </section>
  );
}

const ACCENT_PRESET_COLORS = [
  "#2563EB",
  "#0EA5E9",
  "#14B8A6",
  "#22C55E",
  "#84CC16",
  "#E8A33D",
  "#F97316",
  "#E2614F",
  "#EC4899",
  "#8B5CF6",
  "#6366F1",
  "#64748B",
];

export function AdminSettingsContent({ s, theme, defaultAppearance }) {
  const { accentColor, fontColor, borderColor, radius, logoUrl } = theme;
  const cardProps = { fontColor, borderColor, radius };
  const defaultMode = theme.themeMode === "Light" ? "Light" : "Dark";
  const defaultThemeColors = defaultAppearance?.themeColors?.[defaultMode] || defaultAppearance || {};
  const suggestedPalettes = derivedPalettes({ accentColor, bgColor: theme.bgColor, mode: defaultMode });

  return (
    <div className="space-y-4 px-2.5 py-2.5 sm:space-y-6 sm:px-6 sm:py-6 md:pl-10 md:pr-6">
      <SectionCard icon={Settings} iconBg={accentColor} title="General Settings" {...cardProps}>
        <Field label="System Timezone" hint="Set the default timezone for the system" fontColor={fontColor}>
          <Select
            value={s.timezone}
            onChange={s.setTimezone}
            accent={accentColor}
            fontColor={fontColor}
            borderColor={borderColor}
            radius={radius}
            options={["(GMT+05:30) Asia/Kolkata", "(GMT+00:00) UTC", "(GMT-05:00) America/New_York", "(GMT+01:00) Europe/Berlin"]}
          />
        </Field>
        <Field label="Date Format" hint="Set the default date format" fontColor={fontColor}>
          <Select
            value={s.dateFormat}
            onChange={s.setDateFormat}
            accent={accentColor}
            fontColor={fontColor}
            borderColor={borderColor}
            radius={radius}
            options={["DD MMM YYYY (12 Jul 2025)", "MM/DD/YYYY (07/12/2025)", "YYYY-MM-DD (2025-07-12)"]}
          />
        </Field>
        <Field label="Time Format" hint="Set the default time format" fontColor={fontColor}>
          <Select
            value={s.timeFormat}
            onChange={s.setTimeFormat}
            accent={accentColor}
            fontColor={fontColor}
            borderColor={borderColor}
            radius={radius}
            options={["12 Hour (03:45 PM)", "24 Hour (15:45)"]}
          />
        </Field>
        <Field label="Currency" hint="Used for service prices" fontColor={fontColor}>
          <Select
            value={s.currency}
            onChange={s.setCurrency}
            accent={accentColor}
            fontColor={fontColor}
            borderColor={borderColor}
            radius={radius}
            options={[
              { value: "USD", label: "Dollar ($)" },
              { value: "GBP", label: "Pound (£)" },
              { value: "INR", label: "INR (₹)" },
            ]}
          />
        </Field>
        <Field label="System Language" hint="Select default language" fontColor={fontColor}>
          <Select
            value={s.language}
            onChange={s.setLanguage}
            accent={accentColor}
            fontColor={fontColor}
            borderColor={borderColor}
            radius={radius}
            options={["English", "Hindi", "Bengali", "Spanish"]}
          />
        </Field>
      </SectionCard>

      <SectionCard icon={Palette} iconBg={accentColor} title="Appearance" {...cardProps}>
        <Field label="Display Theme" hint="Applies a matching color preset below (you can still fine-tune each color)" fontColor={fontColor}>
          <Select value={theme.themeMode} onChange={theme.handleThemeChange} accent={accentColor} fontColor={fontColor} borderColor={borderColor} radius={radius} options={["Dark", "Light", "System"]} />
        </Field>
        <Field label="Brand Name" hint="Name of your WaitQR system" fontColor={fontColor}>
          <TextInput value={s.systemName} onChange={s.setSystemName} accent={accentColor} fontColor={fontColor} borderColor={borderColor} radius={radius} />
        </Field>
        <LogoUpload
          logoUrl={logoUrl}
          onUpload={theme.setLogoUrl}
          onRemove={() => theme.setLogoUrl(null)}
          fontColor={fontColor}
          borderColor={borderColor}
          radius={radius}
        />
        <ColorSwatchInput label="Accent Color" hint="Used for active states, toggles, and the save button" value={accentColor} defaultValue={defaultAppearance?.accentColor} presetColors={ACCENT_PRESET_COLORS} onChange={theme.setAccentColor} fontColor={fontColor} borderColor={borderColor} radius={radius} />
        <ColorSwatchInput label="Background Color" hint="Base background color for the dashboard" value={theme.bgColor} defaultValue={defaultThemeColors.bgColor} suggestedColors={suggestedPalettes.bgColor} onChange={theme.setBgColor} fontColor={fontColor} borderColor={borderColor} radius={radius} />
        <ColorSwatchInput label="Font Color" hint="Text color used across labels, headings, and inputs" value={fontColor} defaultValue={defaultThemeColors.fontColor} suggestedColors={suggestedPalettes.fontColor} onChange={theme.setFontColor} fontColor={fontColor} borderColor={borderColor} radius={radius} />
        <ColorSwatchInput label="Border Color" hint="Applied to cards, inputs, and divider lines" value={borderColor} defaultValue={defaultThemeColors.borderColor} suggestedColors={suggestedPalettes.borderColor} onChange={theme.setBorderColor} fontColor={fontColor} borderColor={borderColor} radius={radius} />
        <RadiusControl value={radius} onChange={theme.setRadius} fontColor={fontColor} borderColor={borderColor} />
      </SectionCard>

      <SectionCard icon={Users} iconBg={accentColor} title="Queue Settings" {...cardProps}>
        <Field label="Default Estimated Time" hint="Default time (in minutes) for new services" fontColor={fontColor}>
          <Stepper value={s.estTime} onChange={s.setEstTime} min={1} fontColor={fontColor} borderColor={borderColor} radius={radius} />
        </Field>
        <Field label="Auto Generate Ticket Number" hint="Automatically generate ticket numbers" inline fontColor={fontColor}>
          <div className="flex justify-end">
            <Toggle checked={s.autoTicket} onChange={s.setAutoTicket} accent={accentColor} />
          </div>
        </Field>
        <Field label="Ticket Prefix" hint="Prefix for ticket numbers" fontColor={fontColor}>
          <TextInput value={s.ticketPrefix} onChange={s.setTicketPrefix} accent={accentColor} fontColor={fontColor} borderColor={borderColor} radius={radius} />
        </Field>
        <Field label="Daily Reset Time" hint="Time when daily stats will be reset" fontColor={fontColor}>
          <div className="relative">
            <input
              value={s.resetTime}
              onChange={(e) => s.setResetTime(e.target.value)}
              {...focusHandlers(accentColor, borderColor)}
              style={{ color: fontColor, borderColor, borderRadius: radius, backgroundColor: "var(--field-bg)" }}
              className="w-full border px-3 py-2 text-sm outline-none transition-colors"
            />
            <Clock size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: withAlpha(fontColor, "80") }} />
          </div>
        </Field>
      </SectionCard>

      <SectionCard icon={Bell} iconBg={accentColor} title="Notifications Settings" {...cardProps}>
        <Field label="Sound Alert" hint="Play sound when next ticket is called" inline fontColor={fontColor}>
          <div className="flex justify-end">
            <Toggle checked={s.soundAlert} onChange={s.setSoundAlert} accent={accentColor} />
          </div>
        </Field>
        <Field label="WhatsApp Notifications" hint="Send WhatsApp alerts to assigned members" inline fontColor={fontColor}>
          <div className="flex justify-end">
            <Toggle checked={s.whatsapp} onChange={s.setWhatsapp} accent={accentColor} />
          </div>
        </Field>
        <Field label="Email Notifications" hint="Send email notifications for important events" inline fontColor={fontColor}>
          <div className="flex justify-end">
            <Toggle checked={s.emailNotif} onChange={s.setEmailNotif} accent={accentColor} />
          </div>
        </Field>
      </SectionCard>

      <SectionCard icon={Monitor} iconBg={accentColor} title="Display Settings" {...cardProps}>
        <Field label="Show Wait Time on Display" hint="Show estimated wait time on public display" inline fontColor={fontColor}>
          <div className="flex justify-end">
            <Toggle checked={s.showWait} onChange={s.setShowWait} accent={accentColor} />
          </div>
        </Field>
        <Field label="Show Branding on Display" hint="Show system branding on display screen" inline fontColor={fontColor}>
          <div className="flex justify-end">
            <Toggle checked={s.showBranding} onChange={s.setShowBranding} accent={accentColor} />
          </div>
        </Field>
      </SectionCard>

      <SectionCard icon={ShieldCheck} iconBg={accentColor} title="Security Settings" {...cardProps}>
        <Field label="Session Timeout" hint="Automatically logout after inactivity" fontColor={fontColor}>
          <Select value={s.sessionTimeout} onChange={s.setSessionTimeout} accent={accentColor} fontColor={fontColor} borderColor={borderColor} radius={radius} options={["15 Minutes", "30 Minutes", "1 Hour", "Never"]} />
        </Field>
        <Field label="Two Factor Authentication" hint="Require 2FA for admin login" inline fontColor={fontColor}>
          <div className="flex justify-end">
            <Toggle checked={s.twoFA} onChange={s.setTwoFA} accent={accentColor} />
          </div>
        </Field>
        <Field label="Reset Queue" hint="Clear all ticket history and restart queue numbers" inline fontColor={fontColor}>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={s.handleResetQueue}
              className="flex items-center justify-center gap-2 border px-3 py-2 text-sm font-medium transition-colors hover:bg-red-500/10"
              style={{ color: "#f87171", borderColor: "rgba(248,113,113,0.55)", borderRadius: radius }}
            >
              <RotateCcw size={14} />
              Reset queue
            </button>
          </div>
        </Field>
      </SectionCard>

      <div className="flex flex-col gap-2 pb-4">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={s.handleReset}
            className="flex items-center gap-2 border px-4 py-2 text-sm transition-colors hover:bg-white/5"
            style={{ color: withAlpha(fontColor, "cc"), borderColor, borderRadius: radius }}
          >
            <RotateCcw size={15} />
            Reset to Default
          </button>
          <div className="flex items-center gap-3">
            {s.savedAt && <span className="hidden text-xs text-emerald-400 sm:inline">Saved at {s.savedAt}</span>}
            <button
              onClick={s.handleSave}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white shadow-lg transition-opacity hover:opacity-90"
              style={{ backgroundColor: accentColor, borderRadius: radius }}
            >
              <Save size={15} />
              Save Changes
            </button>
          </div>
        </div>
        {s.savedAt && <span className="text-right text-xs text-emerald-400 sm:hidden">Saved at {s.savedAt}</span>}
      </div>
    </div>
  );
}
