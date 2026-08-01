import { Children, useEffect, useMemo, useRef, useState } from "react";
import { BellRing, CheckCircle2, Clock, Copy, MessageCircle, Phone, Send, Timer, Webhook } from "lucide-react";

const DEFAULT_TEMPLATES = {
  created: "Hi {{name}}, your WaitQR ticket {{ticket}} has been created for {{service}}.",
  turnNear: "Hi {{name}}, your turn is near. Ticket {{ticket}} is #{{position}} in line with about {{wait_time}} remaining.",
  called: "Hi {{name}}, your ticket {{ticket}} is now called at {{counter}}.",
  recalled: "Hi {{name}}, your ticket {{ticket}} has been recalled. Please return to {{counter}}.",
  completed: "Hi {{name}}, your visit for ticket {{ticket}} is complete. Thank you.",
};

const MESSAGE_EVENTS = [
  {
    key: "created",
    icon: BellRing,
    label: "Ticket Created",
    hint: "Send confirmation when a guest joins the queue",
  },
  {
    key: "turnNear",
    icon: Timer,
    label: "Turn Near",
    hint: "Notify guests before their ticket is called by position or estimated time",
  },
  {
    key: "called",
    icon: Phone,
    label: "Ticket Called",
    hint: "Notify guests when a counter calls their ticket",
  },
  {
    key: "recalled",
    icon: Send,
    label: "Ticket Recalled",
    hint: "Send a return request when an absent guest is recalled",
  },
  {
    key: "completed",
    icon: CheckCircle2,
    label: "Ticket Completed",
    hint: "Send a closing message after service is finished",
  },
];

const DYNAMIC_CODES = [
  { code: "{{name}}", label: "Name" },
  { code: "{{ticket}}", label: "Ticket" },
  { code: "{{position}}", label: "Position" },
  { code: "{{service}}", label: "Service" },
  { code: "{{counter}}", label: "Counter" },
  { code: "{{status}}", label: "Status" },
  { code: "{{wait_time}}", label: "Wait Time" },
];

const TURN_NEAR_MODES = [
  { value: "position", label: "Position" },
  { value: "time", label: "Time" },
  { value: "both", label: "Both" },
];

function withAlpha(hex, alphaHex) {
  if (!hex || hex.length !== 7) return hex;
  return `${hex}${alphaHex}`;
}

function focusHandlers(accent, restoreBorderColor) {
  return {
    onFocus: (event) => {
      event.target.style.borderColor = accent;
      event.target.style.boxShadow = `0 0 0 3px ${withAlpha(accent, "33")}`;
    },
    onBlur: (event) => {
      event.target.style.borderColor = restoreBorderColor || "";
      event.target.style.boxShadow = "";
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

function TextInput({ value, onChange, placeholder, accent, fontColor, borderColor, radius, type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      {...focusHandlers(accent, borderColor)}
      className="w-full border px-3 py-2 text-sm outline-none transition-colors placeholder:text-current placeholder:opacity-40"
      style={{ color: fontColor, borderColor, borderRadius: radius, backgroundColor: "var(--field-bg)" }}
    />
  );
}

function NumberInput({ value, onChange, min = 1, accent, fontColor, borderColor, radius }) {
  return (
    <input
      type="number"
      min={min}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      {...focusHandlers(accent, borderColor)}
      className="w-full border px-3 py-2 text-sm outline-none transition-colors"
      style={{ color: fontColor, borderColor, borderRadius: radius, backgroundColor: "var(--field-bg)" }}
    />
  );
}

function Select({ value, onChange, options, accent, fontColor, borderColor, radius }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      {...focusHandlers(accent, borderColor)}
      className="w-full border px-3 py-2 text-sm outline-none transition-colors"
      style={{ color: fontColor, borderColor, borderRadius: radius, backgroundColor: "var(--field-bg)" }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function TextArea({ value, onChange, placeholder, accent, fontColor, borderColor, radius, rows = 4, textareaRef }) {
  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={rows}
      {...focusHandlers(accent, borderColor)}
      className="w-full resize-none border px-3 py-2 text-sm outline-none transition-colors placeholder:text-current placeholder:opacity-40"
      style={{ color: fontColor, borderColor, borderRadius: radius, backgroundColor: "var(--field-bg)" }}
    />
  );
}

function DynamicCodeChips({ onInsert, theme }) {
  const { accentColor, fontColor, borderColor, radius } = theme;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {DYNAMIC_CODES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => onInsert(code)}
          className="inline-flex min-h-7 items-center gap-1.5 border px-2.5 text-xs font-medium transition-colors hover:bg-white/5"
          style={{
            color: accentColor,
            borderColor,
            borderRadius: Math.max(8, radius),
            backgroundColor: withAlpha(accentColor, "10"),
          }}
          title={`Insert ${code}`}
        >
          <span style={{ color: withAlpha(fontColor, "99") }}>{label}</span>
          <span className="font-mono">{code}</span>
        </button>
      ))}
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
        {hint ? (
          <p className="mt-0.5 text-xs" style={{ color: withAlpha(fontColor, "80") }}>
            {hint}
          </p>
        ) : null}
      </div>
      <div style={{ width: stacked ? "100%" : inline ? "auto" : "16rem", flexShrink: 0 }}>{children}</div>
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
        {items.map((child, index) => (
          <div key={index} style={index > 0 ? { borderTop: `1px solid ${borderColor}` } : undefined}>
            {child}
          </div>
        ))}
      </div>
    </section>
  );
}

function StatusPill({ ready, theme }) {
  const color = ready ? "#22a273" : "#e8a33d";
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold"
      style={{ color, backgroundColor: `${color}1f`, borderRadius: theme.radius }}
    >
      <CheckCircle2 size={14} />
      {ready ? "Ready" : "Prototype"}
    </span>
  );
}

function TurnNearSetup({ settings, onChange, theme }) {
  const { accentColor, fontColor, borderColor, radius } = theme;
  const showPosition = settings.mode === "position" || settings.mode === "both";
  const showMinutes = settings.mode === "time" || settings.mode === "both";

  return (
    <div className={`mt-3 grid gap-3 ${settings.mode === "both" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
      <label className="min-w-0">
        <span className="mb-1.5 block text-xs font-medium" style={{ color: withAlpha(fontColor, "99") }}>
          Notify By
        </span>
        <Select
          value={settings.mode}
          onChange={(value) => onChange({ ...settings, mode: value })}
          options={TURN_NEAR_MODES}
          accent={accentColor}
          fontColor={fontColor}
          borderColor={borderColor}
          radius={radius}
        />
      </label>
      {showPosition ? (
        <label className="min-w-0">
          <span className="mb-1.5 block text-xs font-medium" style={{ color: withAlpha(fontColor, "99") }}>
            Position
          </span>
          <NumberInput
            value={settings.position}
            onChange={(value) => onChange({ ...settings, position: value })}
            accent={accentColor}
            fontColor={fontColor}
            borderColor={borderColor}
            radius={radius}
          />
        </label>
      ) : null}
      {showMinutes ? (
        <label className="min-w-0">
          <span className="mb-1.5 block text-xs font-medium" style={{ color: withAlpha(fontColor, "99") }}>
            Minutes
          </span>
          <NumberInput
            value={settings.minutes}
            onChange={(value) => onChange({ ...settings, minutes: value })}
            accent={accentColor}
            fontColor={fontColor}
            borderColor={borderColor}
            radius={radius}
          />
        </label>
      ) : null}
    </div>
  );
}

function MessageTriggerField({ event, checked, template, onToggle, onTemplateChange, theme, turnNearSettings, onTurnNearSettingsChange }) {
  const Icon = event.icon;
  const { accentColor, fontColor, borderColor, radius } = theme;
  const textareaRef = useRef(null);

  const insertDynamicCode = (code) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? template.length;
    const end = textarea?.selectionEnd ?? template.length;
    const spacerBefore = start > 0 && !/\s$/.test(template.slice(0, start)) ? " " : "";
    const spacerAfter = end < template.length && !/^\s/.test(template.slice(end)) ? " " : "";
    const insertText = `${spacerBefore}${code}${spacerAfter}`;
    const nextTemplate = `${template.slice(0, start)}${insertText}${template.slice(end)}`;
    const nextCaret = start + insertText.length;

    onTemplateChange(nextTemplate);
    window.requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(nextCaret, nextCaret);
    });
  };

  return (
    <div className="py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center"
            style={{ color: accentColor, backgroundColor: withAlpha(accentColor, "1a"), borderRadius: radius }}
          >
            <Icon size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium" style={{ color: fontColor }}>
              {event.label}
            </p>
            <p className="mt-0.5 text-xs" style={{ color: withAlpha(fontColor, "80") }}>
              {event.hint}
            </p>
          </div>
        </div>
        <Toggle checked={checked} onChange={onToggle} accent={accentColor} />
      </div>

      {checked ? (
        <div className="mt-4 pl-0 sm:pl-11">
          <p className="mb-1.5 text-xs font-medium" style={{ color: withAlpha(fontColor, "99") }}>
            Message template
          </p>
          <TextArea
            textareaRef={textareaRef}
            value={template}
            onChange={onTemplateChange}
            placeholder="Write the WhatsApp message for this event"
            accent={accentColor}
            fontColor={fontColor}
            borderColor={borderColor}
            radius={radius}
            rows={3}
          />
          <DynamicCodeChips onInsert={insertDynamicCode} theme={theme} />
          {event.key === "turnNear" ? (
            <TurnNearSetup settings={turnNearSettings} onChange={onTurnNearSettingsChange} theme={theme} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function AdminIntegrationsPage({ theme }) {
  const { accentColor, fontColor, borderColor, radius } = theme;
  const cardProps = { fontColor, borderColor, radius };
  const [enabled, setEnabled] = useState(false);
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [sender, setSender] = useState("whatsapp:+14155238886");
  const [testPhone, setTestPhone] = useState("");
  const [events, setEvents] = useState({
    created: true,
    turnNear: true,
    called: true,
    recalled: false,
    completed: false,
  });
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [turnNearSettings, setTurnNearSettings] = useState({
    mode: "both",
    position: 3,
    minutes: 10,
  });

  const webhookUrl = useMemo(() => {
    if (typeof window === "undefined") return "/api/integrations/twilio/whatsapp/webhook";
    return `${window.location.origin}/api/integrations/twilio/whatsapp/webhook`;
  }, []);
  const ready = enabled && accountSid.trim() && authToken.trim() && sender.trim();
  const previewEvent = MESSAGE_EVENTS.find((event) => events[event.key]) || MESSAGE_EVENTS[0];

  const updateEvent = (key) => (value) => setEvents((current) => ({ ...current, [key]: value }));
  const updateTemplate = (key) => (value) => setTemplates((current) => ({ ...current, [key]: value }));
  const turnNearSummary = turnNearSettings.mode === "position"
    ? `Position ${turnNearSettings.position}`
    : turnNearSettings.mode === "time"
      ? `${turnNearSettings.minutes} min`
      : `Position ${turnNearSettings.position} or ${turnNearSettings.minutes} min`;

  return (
    <div className="space-y-4 px-2.5 py-2.5 sm:space-y-6 sm:px-6 sm:py-6 md:pl-10 md:pr-6" style={{ "--field-bg": "var(--surface-bg)" }}>
      <SectionCard icon={MessageCircle} iconBg="#25D366" title="Twilio WhatsApp API" {...cardProps}>
        <Field label="Connection Status" hint="Prototype fields for the first WhatsApp integration pass" inline fontColor={fontColor}>
          <StatusPill ready={ready} theme={theme} />
        </Field>
        <Field label="Enable WhatsApp Messaging" hint="Activates this channel after credentials are saved" inline fontColor={fontColor}>
          <div className="flex justify-end">
            <Toggle checked={enabled} onChange={setEnabled} accent={accentColor} />
          </div>
        </Field>
        <Field label="Account SID" hint="Twilio project account identifier" fontColor={fontColor}>
          <TextInput value={accountSid} onChange={setAccountSid} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" accent={accentColor} fontColor={fontColor} borderColor={borderColor} radius={radius} />
        </Field>
        <Field label="Auth Token" hint="Stored securely when backend saving is connected" fontColor={fontColor}>
          <TextInput value={authToken} onChange={setAuthToken} placeholder="********************************" type="password" accent={accentColor} fontColor={fontColor} borderColor={borderColor} radius={radius} />
        </Field>
        <Field label="WhatsApp Sender" hint="Twilio sender number in WhatsApp format" fontColor={fontColor}>
          <TextInput value={sender} onChange={setSender} placeholder="whatsapp:+14155238886" accent={accentColor} fontColor={fontColor} borderColor={borderColor} radius={radius} />
        </Field>
        <Field label="Webhook URL" hint="Configure this URL in Twilio inbound message settings" fontColor={fontColor}>
          <div className="flex min-w-0 gap-2">
            <div
              className="min-w-0 flex-1 truncate border px-3 py-2 text-xs leading-5"
              style={{ color: withAlpha(fontColor, "cc"), borderColor, borderRadius: radius, backgroundColor: "var(--field-bg)" }}
              title={webhookUrl}
            >
              {webhookUrl}
            </div>
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center border transition-colors hover:bg-white/5"
              style={{ color: fontColor, borderColor, borderRadius: radius, backgroundColor: "var(--field-bg)" }}
              onClick={() => navigator.clipboard?.writeText(webhookUrl)}
              aria-label="Copy webhook URL"
              title="Copy webhook URL"
            >
              <Copy size={15} />
            </button>
          </div>
        </Field>
        <Field label="Test Recipient" hint="Send a sandbox message to one WhatsApp number" fontColor={fontColor}>
          <TextInput value={testPhone} onChange={setTestPhone} placeholder="whatsapp:+15551234567" accent={accentColor} fontColor={fontColor} borderColor={borderColor} radius={radius} />
        </Field>
        <Field label="Preview Template" hint={`Currently previewing ${previewEvent.label}`} fontColor={fontColor}>
          <div>
            <div
              className="border px-3 py-2 text-sm leading-6"
              style={{ color: withAlpha(fontColor, "cc"), borderColor, borderRadius: radius, backgroundColor: "var(--field-bg)" }}
            >
              {templates[previewEvent.key] || "No template text yet."}
            </div>
            {previewEvent.key === "turnNear" ? (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs" style={{ color: withAlpha(fontColor, "80") }}>
                <Clock size={13} />
                {turnNearSummary}
              </p>
            ) : null}
          </div>
        </Field>
        <Field label="Send Test" hint="Disabled until the prototype has credentials and a recipient" inline fontColor={fontColor}>
          <button
            type="button"
            disabled={!ready || !testPhone.trim()}
            className="inline-flex h-10 items-center justify-center gap-2 px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: accentColor, borderRadius: radius }}
          >
            <Send size={15} />
            Send test
          </button>
        </Field>
      </SectionCard>

      <SectionCard icon={Webhook} iconBg={accentColor} title="Message Triggers" {...cardProps}>
        {MESSAGE_EVENTS.map((event) => (
          <MessageTriggerField
            key={event.key}
            event={event}
            checked={events[event.key]}
            template={templates[event.key]}
            onToggle={updateEvent(event.key)}
            onTemplateChange={updateTemplate(event.key)}
            theme={theme}
            turnNearSettings={turnNearSettings}
            onTurnNearSettingsChange={setTurnNearSettings}
          />
        ))}
      </SectionCard>
    </div>
  );
}
