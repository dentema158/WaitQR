import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Monitor,
  Moon,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { ADMIN_NAV_ITEMS, ADMIN_PAGE_META } from "./adminNavigation";
import { getMemberProfilePath } from "../../lib/routing";
import { NotificationMenu } from "../shared/NotificationMenu";

const THEME_PRESETS = {
  Dark: { accentColor: "#2563eb", bgColor: "#060B17", fontColor: "#DBE3F0", borderColor: "#1C1E21", separatorColor: "#1C1E21" },
  Light: { accentColor: "#2563eb", bgColor: "#ECF2FB", fontColor: "#10192F", borderColor: "#D6D9E1", separatorColor: "#D6D9E1" },
};
const COMPACT_SIDEBAR_QUERY = "(max-width: 1180px)";

function withAlpha(hex, alphaHex) {
  if (!hex || hex.length !== 7) return hex;
  return `${hex}${alphaHex}`;
}

function hexToRgb(hex) {
  if (!hex || hex.length !== 7) return null;
  const clean = hex.slice(1);
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
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

function mutedPageBackground(bgColor, accentColor) {
  if (!isLightHex(bgColor)) return mixHex(bgColor, "#000000", 0.45);
  return mixHex(mixHex(bgColor, accentColor || bgColor, 0.035), "#94a3b8", 0.08);
}

function accentThemeColors(accentColor, mode) {
  const preset = THEME_PRESETS[mode] || THEME_PRESETS.Dark;
  const mix = mode === "Light"
    ? { bg: 0.055, font: 0.025, borderSaturation: 0.16, borderLightness: 0.86 }
    : { bg: 0.055, font: 0.035, borderSaturation: 0.08, borderLightness: 0.12 };
  const accentHsl = rgbToHsl(hexToRgb(accentColor) || hexToRgb(preset.accentColor));
  const borderColor = hslToHex({
    h: accentHsl.h,
    s: Math.min(accentHsl.s * 0.35, mix.borderSaturation),
    l: mix.borderLightness,
  });

  return {
    accentColor,
    bgColor: mixHex(preset.bgColor, accentColor, mix.bg),
    fontColor: mixHex(preset.fontColor, accentColor, mix.font),
    borderColor,
    separatorColor: borderColor,
  };
}

function resolveThemeMode(themeMode) {
  if (themeMode === "System") {
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "Dark" : "Light";
  }
  return themeMode === "Light" ? "Light" : "Dark";
}

function pickThemeColors(appearance) {
  const borderColor = appearance.borderColor;
  return {
    accentColor: appearance.accentColor,
    bgColor: appearance.bgColor,
    fontColor: appearance.fontColor,
    borderColor,
    separatorColor: borderColor,
  };
}

function initials(name) {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AD";
}

function displayRoleName(role, fallback = "Member") {
  const value = String(role || fallback).trim();
  return value === "Administrator" ? "Admin" : value;
}

function ThemeSwitch({ theme, onChange, accent, fontColor, borderColor, bgColor, radius }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const options = [
    { value: "Light", icon: Sun, label: "Light" },
    { value: "Dark", icon: Moon, label: "Dark" },
    { value: "System", icon: Monitor, label: "System" },
  ];
  const Current = options.find((option) => option.value === theme)?.icon || Monitor;

  return (
    <div className="relative z-[110]" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Change theme"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/5"
        style={{ color: withAlpha(fontColor, "99") }}
      >
        <Current size={18} />
      </button>
      {open && (
        <div
          className="fixed right-3 top-14 z-[120] mt-0 w-36 overflow-hidden border py-1 shadow-lg sm:absolute sm:right-0 sm:top-full sm:z-[120] sm:mt-2"
          style={{ backgroundColor: bgColor, borderColor, borderRadius: radius }}
        >
          {options.map(({ value, icon: Icon, label }) => {
            const active = theme === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  onChange(value);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-white/5"
                style={{ color: active ? accent : fontColor }}
              >
                <Icon size={15} />
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProfileMenu({ member, masterLoggedIn, accentColor, fontColor, borderColor, bgColor, radius, onProfile, onLogin, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const displayName = member?.name || (masterLoggedIn ? "Development Access" : "Account");
  const displayRole = member ? displayRoleName(member.role) : masterLoggedIn ? "Master login" : "Login required";
  const avatarText = initials(member?.name);

  useEffect(() => {
    const handleClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleAction = (action) => {
    action?.();
    setOpen(false);
  };

  return (
    <div className="relative z-[110]" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Open profile menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full transition-colors hover:bg-white/5"
        style={{ color: withAlpha(fontColor, "99") }}
      >
        <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-slate-700 text-sm font-semibold text-white">
          {member?.photo ? <img src={member.photo} alt={member.name} className="h-full w-full object-cover" /> : member ? avatarText : masterLoggedIn ? "DEV" : <UserRound size={17} />}
        </span>
        <span className="hidden text-left text-sm md:block">
          <span className="block font-medium" style={{ color: fontColor }}>
            {displayName}
          </span>
          <span className="block text-xs" style={{ color: withAlpha(fontColor, "80") }}>
            {displayRole}
          </span>
        </span>
      </button>
      {open && (
        <div
          className="fixed right-3 top-14 z-[120] mt-0 w-40 overflow-hidden border py-1 shadow-lg sm:absolute sm:right-0 sm:top-full sm:z-[120] sm:mt-2"
          style={{ backgroundColor: bgColor, borderColor, borderRadius: radius }}
        >
          {member || masterLoggedIn ? (
            <>
              {member ? (
                <button
                  type="button"
                  onClick={() => handleAction(onProfile)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-white/5"
                  style={{ color: fontColor }}
                >
                  <UserRound size={15} />
                  Profile
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => handleAction(onLogout)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-white/5"
                style={{ color: fontColor }}
              >
                <LogOut size={15} />
                Logout
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => handleAction(onLogin)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-white/5"
              style={{ color: accentColor }}
            >
              <UserRound size={15} />
              Login
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Sidebar({ variant, open, onClose, currentPage, onNavigate, theme, collapsed, onToggleCollapse, pageBgColor }) {
  const { accentColor, fontColor, bgColor, radius, logoUrl } = theme;
  const isCollapsed = variant === "desktop" && collapsed;
  const sidebarBgColor = pageBgColor || bgColor;

  const handleNavClick = (item) => {
    if (item.path) onNavigate(item.path);
    if (variant === "mobile") onClose?.();
  };

  const content = (
    <>
      <div className={`relative mb-6 flex h-8 items-center ${isCollapsed ? "justify-center px-0" : "justify-between px-3"}`}>
        <button
          type="button"
          onClick={() => onNavigate("/")}
          className="flex min-w-0 items-center gap-2 text-xl font-bold"
          style={{ color: fontColor }}
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden text-sm text-white"
            style={{ backgroundColor: logoUrl ? "transparent" : accentColor, borderRadius: radius }}
          >
            {logoUrl ? <img src={logoUrl} alt="WaitQR logo" className="h-full w-full object-cover" /> : "W"}
          </span>
          {!isCollapsed && <span className="truncate">WaitQR</span>}
        </button>

        {variant === "mobile" && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-white/5"
            style={{ color: withAlpha(fontColor, "99") }}
          >
            <X size={18} />
          </button>
        )}

        {variant === "desktop" && !isCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/5"
            style={{ color: withAlpha(fontColor, "80") }}
          >
            <ChevronLeft size={16} />
          </button>
        )}

        {variant === "desktop" && isCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Expand sidebar"
            aria-label="Expand sidebar"
            className="absolute right-0 top-1/2 flex h-7 w-6 -translate-y-1/2 items-center justify-center rounded-full transition-colors hover:bg-white/5"
            style={{ color: withAlpha(fontColor, "80") }}
          >
            <ChevronRight size={17} />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden">
        {ADMIN_NAV_ITEMS.map(({ label, icon: Icon, path, page }) => {
          const active = page && currentPage === page;
          return (
            <button
              key={label}
              type="button"
              onClick={() => handleNavClick({ path })}
              title={isCollapsed ? label : undefined}
              aria-label={label}
              className={`relative flex items-center gap-3 text-sm transition-colors hover:bg-white/5 ${
                isCollapsed ? "mx-auto h-9 w-9 justify-center p-0" : "w-full px-3 py-2"
              }`}
              style={{
                borderRadius: radius,
                cursor: path ? "pointer" : "default",
                ...(active
                  ? { backgroundColor: withAlpha(accentColor, "1f"), color: accentColor }
                  : { color: withAlpha(fontColor, path ? "99" : "55") }),
              }}
            >
              {active && !isCollapsed && (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full" style={{ backgroundColor: accentColor }} />
              )}
              <Icon size={17} className="shrink-0" />
              {!isCollapsed && <span className="truncate">{label}</span>}
            </button>
          );
        })}
      </nav>

      <button
        type="button"
        title={isCollapsed ? "Logout" : undefined}
        aria-label="Logout"
        className={`mt-4 flex items-center gap-3 text-sm hover:bg-white/5 ${isCollapsed ? "mx-auto h-9 w-9 justify-center p-0" : "px-3 py-2"}`}
        style={{ color: withAlpha(fontColor, "99"), borderRadius: radius }}
      >
        <LogOut size={17} className="shrink-0" />
        {!isCollapsed && "Logout"}
      </button>
    </>
  );

  if (variant === "mobile") {
    return (
      <div className={`fixed inset-0 z-40 md:hidden ${open ? "" : "pointer-events-none"}`}>
        <aside
          className="absolute inset-0 flex h-full w-full flex-col p-4 transition-transform duration-200"
          style={{
            backgroundColor: sidebarBgColor,
            transform: open ? "translateX(0)" : "translateX(-100%)",
          }}
        >
          {content}
        </aside>
      </div>
    );
  }

  return (
    <aside
      className="sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden px-3 pb-3 pt-5 transition-[width] duration-200 md:flex"
      style={{ backgroundColor: sidebarBgColor, width: isCollapsed ? 108 : 220 }}
    >
      {content}
    </aside>
  );
}

export function AdminShell({ currentPage, children, onNavigate, appearance, onAppearanceChange, onThemeChange, loggedInMember, masterLoggedIn = false, members = [], notifications = [], onClearNotifications, onMarkNotificationsRead, onLogoutMember }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => (
    typeof window !== "undefined" ? window.matchMedia?.(COMPACT_SIDEBAR_QUERY).matches : false
  ));
  const {
    accentColor = "#2563eb",
    bgColor = THEME_PRESETS.Dark.bgColor,
    fontColor = THEME_PRESETS.Dark.fontColor,
    borderColor = THEME_PRESETS.Dark.borderColor,
    separatorColor = THEME_PRESETS.Dark.separatorColor,
    radius = 12,
    logoUrl = null,
    themeMode = "Dark",
    currency = "USD",
    themeColors = THEME_PRESETS,
    systemName = "WaitQR",
  } = appearance || {};

  const updateAppearance = (patch) => onAppearanceChange?.({ ...(appearance || {}), ...patch });
  const currentMode = resolveThemeMode(themeMode);
  const updateCurrentThemeColors = (patch) => {
    const nextColors = {
      ...(themeColors[currentMode] || THEME_PRESETS[currentMode]),
      ...pickThemeColors({ accentColor, bgColor, fontColor, borderColor, separatorColor }),
      ...patch,
    };
    const sharedAccentColor = patch.accentColor || accentColor;
    const nextThemeColors = {
      ...themeColors,
      [currentMode]: nextColors,
    };

    if (patch.accentColor) {
      const darkColors = accentThemeColors(sharedAccentColor, "Dark");
      const lightColors = accentThemeColors(sharedAccentColor, "Light");
      const currentColorsForAccent = currentMode === "Light" ? lightColors : darkColors;

      nextThemeColors.Dark = {
        ...(nextThemeColors.Dark || THEME_PRESETS.Dark),
        ...darkColors,
      };
      nextThemeColors.Light = {
        ...(nextThemeColors.Light || THEME_PRESETS.Light),
        ...lightColors,
      };
      nextThemeColors[currentMode] = {
        ...nextColors,
        ...currentColorsForAccent,
      };
    }

    updateAppearance({
      ...patch,
      ...(patch.accentColor
        ? nextThemeColors[currentMode]
        : {}),
      themeColors: nextThemeColors,
    });
  };

  const handleThemeChange = (nextTheme) => {
    const currentColors = {
      ...(themeColors[currentMode] || THEME_PRESETS[currentMode]),
      ...pickThemeColors({ accentColor, bgColor, fontColor, borderColor, separatorColor }),
    };
    const nextMode = resolveThemeMode(nextTheme);
    const nextColors = themeColors[nextMode] || THEME_PRESETS[nextMode] || THEME_PRESETS.Dark;
    const nextColorsWithSharedAccent = { ...nextColors, accentColor };
    updateAppearance({
      themeMode: nextTheme,
      ...nextColorsWithSharedAccent,
      accentColor,
      themeColors: {
        ...themeColors,
        Dark: { ...(themeColors.Dark || THEME_PRESETS.Dark), accentColor },
        Light: { ...(themeColors.Light || THEME_PRESETS.Light), accentColor },
        [currentMode]: { ...currentColors, accentColor },
        [nextMode]: nextColorsWithSharedAccent,
      },
    });
  };

  const theme = {
    setAppearance: (value) => onAppearanceChange?.(value),
    systemName,
    setSystemName: (value) => updateAppearance({ systemName: value }),
    accentColor,
    setAccentColor: (value) => updateCurrentThemeColors({ accentColor: value }),
    bgColor,
    setBgColor: (value) => updateCurrentThemeColors({ bgColor: value }),
    fontColor,
    setFontColor: (value) => updateCurrentThemeColors({ fontColor: value }),
    borderColor,
    setBorderColor: (value) => updateCurrentThemeColors({ borderColor: value, separatorColor: value }),
    separatorColor,
    setSeparatorColor: (value) => updateCurrentThemeColors({ separatorColor: value, borderColor: value }),
    radius,
    setRadius: (value) => updateAppearance({ radius: value }),
    logoUrl,
    setLogoUrl: (value) => updateAppearance({ logoUrl: value }),
    setThemeColors: (value) => updateAppearance({ themeColors: value }),
    themeMode,
    currency,
    setCurrency: (value) => updateAppearance({ currency: value }),
    handleThemeChange,
  };
  const meta = ADMIN_PAGE_META[currentPage] || ADMIN_PAGE_META.dashboard;
  const PageIcon = meta.icon;
  const content = typeof children === "function" ? children(theme) : children;
  const pageBgColor = mutedPageBackground(bgColor, accentColor);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const media = window.matchMedia?.(COMPACT_SIDEBAR_QUERY);
    if (!media) return undefined;

    const handleChange = (event) => setSidebarCollapsed(event.matches);
    setSidebarCollapsed(media.matches);
    media.addEventListener?.("change", handleChange);

    return () => media.removeEventListener?.("change", handleChange);
  }, []);

  return (
    <div className="flex min-h-screen w-full" style={{ backgroundColor: pageBgColor, color: fontColor, "--surface-bg": bgColor, "--page-bg": pageBgColor }}>
      <Sidebar
        variant="desktop"
        currentPage={currentPage}
        onNavigate={onNavigate}
        theme={theme}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
        pageBgColor={pageBgColor}
      />
      <Sidebar
        variant="mobile"
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        currentPage={currentPage}
        onNavigate={onNavigate}
        theme={theme}
        pageBgColor={pageBgColor}
      />

      <main className="min-w-0 flex-1" style={{ backgroundColor: pageBgColor }}>
        <div
          className="sticky top-0 z-[100] flex items-center justify-between gap-3 px-2.5 py-2.5 sm:px-6 sm:py-5 md:pl-10 md:pr-6"
          style={{ backgroundColor: "var(--page-bg)" }}
        >
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen((value) => !value)}
              aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
              className="flex items-center gap-1.5 rounded-md md:pointer-events-none"
            >
              <PageIcon size={18} className="shrink-0 md:hidden" style={{ color: accentColor }} />
              <h1 className="truncate text-lg font-bold sm:text-xl" style={{ color: fontColor }}>
                {meta.title}
              </h1>
              <ChevronRight
                size={16}
                className="shrink-0 transition-transform md:hidden"
                style={{ color: withAlpha(fontColor, "80"), transform: mobileNavOpen ? "rotate(90deg)" : "none" }}
              />
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <ThemeSwitch
              theme={themeMode}
              onChange={onThemeChange || handleThemeChange}
              accent={accentColor}
              fontColor={fontColor}
              borderColor={borderColor}
              bgColor={bgColor}
              radius={radius}
            />
            <NotificationMenu notifications={notifications} theme={{ bgColor, fontColor, borderColor, radius }} onClear={onClearNotifications} onMarkRead={onMarkNotificationsRead} />
            <ProfileMenu
              member={loggedInMember}
              masterLoggedIn={masterLoggedIn}
              accentColor={accentColor}
              fontColor={fontColor}
              borderColor={borderColor}
              bgColor={bgColor}
              radius={radius}
              onProfile={() => onNavigate(loggedInMember ? getMemberProfilePath(loggedInMember, members) : "/login")}
              onLogin={() => onNavigate("/login")}
              onLogout={onLogoutMember}
            />
          </div>
        </div>

        {content}
      </main>
    </div>
  );
}
