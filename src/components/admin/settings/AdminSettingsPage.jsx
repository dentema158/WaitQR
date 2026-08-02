import { useState } from "react";
import { AdminSettingsContent } from "./AdminSettingsContent";

const DEFAULT_SETTINGS = {
  systemName: "WaitQR",
  timezone: "(GMT+05:30) Asia/Kolkata",
  dateFormat: "DD MMM YYYY (12 Jul 2025)",
  timeFormat: "12 Hour (03:45 PM)",
  currency: "USD",
  language: "English",
  autoTicket: true,
  ticketPrefix: "WQ",
  resetTime: "12:00 AM",
  showWait: true,
  showBranding: true,
  sessionTimeout: "30 Minutes",
  twoFA: false,
};

function getBrowserTimezone() {
  if (typeof Intl === "undefined") return DEFAULT_SETTINGS.timezone;

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!timeZone) return DEFAULT_SETTINGS.timezone;

  try {
    const offsetName = new Intl.DateTimeFormat("en", {
      timeZone,
      timeZoneName: "longOffset",
    }).formatToParts(new Date()).find((part) => part.type === "timeZoneName")?.value;
    const offset = offsetName?.replace("GMT", "") || "+00:00";
    return `(GMT${offset}) ${timeZone}`;
  } catch {
    return timeZone;
  }
}

export function AdminSettingsPage({ theme, defaultAppearance, onSaveSettings, onResetQueue }) {
  const [settings, setSettings] = useState(() => ({
    ...DEFAULT_SETTINGS,
    timezone: getBrowserTimezone(),
  }));
  const [savedAt, setSavedAt] = useState(null);
  const set = (key) => (value) => setSettings((current) => ({ ...current, [key]: value }));

  const handleReset = () => {
    setSettings({ ...DEFAULT_SETTINGS, timezone: getBrowserTimezone() });
    theme.setAppearance(defaultAppearance);
    setSavedAt(null);
  };

  const handleSave = async () => {
    const ok = await onSaveSettings?.();
    if (ok !== false) setSavedAt(new Date().toLocaleTimeString());
  };

  return (
    <div style={{ "--field-bg": "var(--surface-bg)" }}>
      <AdminSettingsContent
        s={{
          ...settings,
          systemName: theme.systemName || settings.systemName,
          setSystemName: theme.setSystemName || set("systemName"),
          currency: theme.currency || settings.currency,
          setCurrency: theme.setCurrency || set("currency"),
          setLanguage: set("language"),
          setAutoTicket: set("autoTicket"),
          setTicketPrefix: set("ticketPrefix"),
          setResetTime: set("resetTime"),
          setShowWait: set("showWait"),
          setShowBranding: set("showBranding"),
          setSessionTimeout: set("sessionTimeout"),
          setTwoFA: set("twoFA"),
          savedAt,
          handleSave,
          handleReset,
          handleResetQueue: onResetQueue,
        }}
        theme={theme}
        defaultAppearance={defaultAppearance}
      />
    </div>
  );
}
