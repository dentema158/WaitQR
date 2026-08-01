import { Children, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BellRing, CheckCheck, CheckCircle2, ChevronDown, Clock, Copy, MessageCircle, MoreVertical, Phone, Plus, Send, SendHorizontal, Signal, Timer, Trash2, Webhook } from "lucide-react";

const DEFAULT_TEMPLATES = {
  created: "Hi *{{name}}*,\n\nYour WaitQR ticket *{{ticket}}* has been created for *{{service}}*.\n\n*Track it here:*\n*{{ticket_link}}*",
  turnNear: "Hi *{{name}}*,\n\nYour turn is near.\nTicket *{{ticket}}* is #*{{position}}* in line with about *{{wait_time}}* remaining.\n\n*{{ticket_link}}*",
  called: "Hi *{{name}}*,\n\nYour ticket *{{ticket}}* is now called at *{{counter}}*.\n\n*{{ticket_link}}*",
  absent: "Hi *{{name}}*,\n\nYour ticket *{{ticket}}* was marked absent at *{{counter}}*.\nReply if you need help.",
  recalled: "Hi *{{name}}*,\n\nYour ticket *{{ticket}}* has been recalled.\nPlease return to *{{counter}}*.",
  completed: "Hi *{{name}}*,\n\nYour visit for ticket *{{ticket}}* is complete.\nThank you.",
};

const TURN_NEAR_DEFAULT_TEMPLATES = [
  "Hi *{{name}}*,\n\nYou are next.\nTicket *{{ticket}}* is almost ready at *{{counter}}*.\n\n*{{ticket_link}}*",
  "Hi *{{name}}*,\n\nAlmost there.\nTicket *{{ticket}}* is #*{{position}}* in line with about *{{wait_time}}* remaining.\n\n*{{ticket_link}}*",
];

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
    key: "absent",
    icon: BellRing,
    label: "Ticket Absent",
    hint: "Notify guests when their missed ticket is marked absent",
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
  { code: "{{ticket_link}}", label: "Ticket Link" },
  { code: "{{position}}", label: "Position" },
  { code: "{{service}}", label: "Service" },
  { code: "{{counter}}", label: "Counter" },
  { code: "{{status}}", label: "Status" },
  { code: "{{wait_time}}", label: "Wait Time" },
];

const FORMAT_CODES = [
  { label: "Bold", prefix: "*", suffix: "*", sample: "text" },
  { label: "Italic", prefix: "_", suffix: "_", sample: "text" },
  { label: "Strike", prefix: "~", suffix: "~", sample: "text" },
  { label: "Mono", prefix: "```", suffix: "```", sample: "text" },
];

const TURN_NEAR_MODES = [
  { value: "position", label: "Position" },
  { value: "time", label: "Time" },
  { value: "both", label: "Both" },
];

function createTurnNearRule(overrides = {}) {
  return {
    id: `turn-near-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    mode: "both",
    position: 1,
    minutes: 10,
    template: TURN_NEAR_DEFAULT_TEMPLATES[0],
    ...overrides,
  };
}

function turnNearTemplateForIndex(index) {
  return TURN_NEAR_DEFAULT_TEMPLATES[index] || DEFAULT_TEMPLATES.turnNear;
}

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

function rangeFromTextarea(textarea) {
  if (!textarea) return null;
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? start;
  return start !== end ? { start, end } : null;
}

function rangeHasFormat(text, range, { prefix, suffix }) {
  if (!range) return false;
  const selectedText = text.slice(range.start, range.end);
  const selectedHasMarkers = selectedText.startsWith(prefix)
    && selectedText.endsWith(suffix)
    && selectedText.length > prefix.length + suffix.length;
  const surroundingHasMarkers = range.start >= prefix.length
    && text.slice(range.start - prefix.length, range.start) === prefix
    && text.slice(range.end, range.end + suffix.length) === suffix;

  return selectedHasMarkers || surroundingHasMarkers;
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
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...focusHandlers(accent, borderColor)}
        className="w-full appearance-none border px-3 py-2 pr-9 text-sm outline-none transition-colors"
        style={{ color: fontColor, borderColor, borderRadius: radius, backgroundColor: "var(--field-bg)" }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} style={{ color: "#0f172a" }}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
        style={{ color: withAlpha(fontColor, "80") }}
      />
    </div>
  );
}

function TextArea({ value, onChange, onBlur, onSelect, placeholder, accent, fontColor, borderColor, radius, rows = 4, minHeight = 190, textareaRef, variant = "default" }) {
  const soft = variant === "soft";
  const textareaBorderColor = borderColor;
  const textareaBg = soft ? withAlpha(fontColor, "0d") : "var(--field-bg)";

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onSelect={onSelect}
      onKeyUp={onSelect}
      onMouseUp={onSelect}
      onBlur={onBlur}
      placeholder={placeholder}
      rows={rows}
      {...focusHandlers(accent, textareaBorderColor)}
      className="w-full resize-none border px-3 py-2 text-sm outline-none transition-colors placeholder:text-current placeholder:opacity-40"
      style={{
        color: fontColor,
        borderColor: textareaBorderColor,
        borderRadius: radius,
        backgroundColor: textareaBg,
        minHeight,
      }}
    />
  );
}

function DynamicCodeChips({ onInsert, theme }) {
  const { accentColor, fontColor, radius } = theme;

  return (
    <div className="flex flex-wrap gap-1.5">
      {DYNAMIC_CODES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => onInsert(code)}
          className="inline-flex min-h-6 items-center gap-1.5 px-2 text-[11px] font-medium transition-opacity hover:opacity-85"
          style={{
            color: accentColor,
            borderRadius: Math.max(8, radius),
            backgroundColor: withAlpha(fontColor, "0d"),
          }}
          title={`Insert ${code}`}
        >
          <span style={{ color: withAlpha(fontColor, "99") }}>{label}</span>
            <span className="font-mono font-medium">{code}</span>
        </button>
      ))}
    </div>
  );
}

function FormattingChips({ activeFormats = new Set(), onFormat, theme }) {
  const { accentColor, fontColor, radius } = theme;

  return (
    <div className="flex flex-wrap gap-1.5">
      {FORMAT_CODES.map((format) => {
        const active = activeFormats.has(format.label);
        return (
          <button
            key={format.label}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onFormat(format)}
            className="inline-flex min-h-6 items-center gap-1.5 px-2 text-[11px] font-medium transition-opacity hover:opacity-85"
            style={{
              color: active ? "#ef4444" : fontColor,
              borderRadius: Math.max(8, radius),
              backgroundColor: active ? "rgba(239, 68, 68, 0.14)" : withAlpha(fontColor, "0d"),
            }}
            title={active ? `Remove ${format.label}` : `${format.prefix}${format.sample}${format.suffix}`}
          >
            <span>{format.label}</span>
            <span className="font-mono font-medium" style={{ color: active ? "#ef4444" : withAlpha(fontColor, "99") }}>
              {format.prefix}{format.sample}{format.suffix}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function renderSampleMessage(template, overrides = {}) {
  const samples = {
    "{{name}}": "John Doe",
    "{{ticket}}": "A042",
    "{{ticket_link}}": "https://waitqr.com/t/A042",
    "{{position}}": "3",
    "{{service}}": "General Service",
    "{{counter}}": "Counter 2",
    "{{status}}": "called",
    "{{wait_time}}": "10 min",
    ...overrides,
  };

  return Object.entries(samples).reduce(
    (message, [code, value]) => message.split(code).join(value),
    template || "No message template yet."
  );
}

function renderWhatsAppFormattedText(text) {
  const pattern = /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|```[\s\S]+?```)/g;
  const segments = String(text || "").split(pattern).filter(Boolean);
  const renderLinks = (value, keyPrefix) => String(value).split(/(https?:\/\/[^\s]+)/g).filter(Boolean).map((part, index) => (
    /^https?:\/\//.test(part)
      ? <span key={`${keyPrefix}-${index}`} style={{ color: "#53bdeb" }}>{part}</span>
      : <span key={`${keyPrefix}-${index}`}>{part}</span>
  ));

  return segments.map((segment, index) => {
    if (segment.startsWith("```") && segment.endsWith("```")) {
      return <code key={index}>{renderLinks(segment.slice(3, -3), `code-${index}`)}</code>;
    }
    if (segment.startsWith("*") && segment.endsWith("*")) {
      return <strong key={index}>{renderLinks(segment.slice(1, -1), `strong-${index}`)}</strong>;
    }
    if (segment.startsWith("_") && segment.endsWith("_")) {
      return <em key={index}>{renderLinks(segment.slice(1, -1), `em-${index}`)}</em>;
    }
    if (segment.startsWith("~") && segment.endsWith("~")) {
      return <del key={index}>{renderLinks(segment.slice(1, -1), `del-${index}`)}</del>;
    }
    return <span key={index}>{renderLinks(segment, `text-${index}`)}</span>;
  });
}

function PreviewBubble({ message, time = "12:45" }) {
  return (
    <div className="flex justify-end">
      <div
        className="relative max-w-[88%] rounded-bl-xl rounded-br-md rounded-tl-xl rounded-tr-xl px-3.5 py-2.5 text-[13px]"
        style={{
          backgroundColor: "#005c4b",
          color: "#e9edef",
          lineHeight: 1.48,
          overflowWrap: "anywhere",
          whiteSpace: "pre-wrap",
        }}
      >
        <span className="relative z-[1]">{renderWhatsAppFormattedText(message)}</span>
        <div className="relative z-[1] mt-1.5 flex items-center justify-end gap-1 pl-8 text-[10px] leading-none" style={{ color: "rgba(233,237,239,0.7)" }}>
          <span>{time}</span>
          <CheckCheck size={12} />
        </div>
      </div>
    </div>
  );
}

function WhatsAppPreview({ event, template, theme, turnNearRules = [] }) {
  const { borderColor, radius } = theme;
  const messages = event.key === "turnNear"
    ? turnNearRules.map((rule) => renderSampleMessage(rule.template || template, {
      "{{position}}": String(rule.position || 3),
      "{{wait_time}}": `${rule.minutes || 10} min`,
    }))
    : [renderSampleMessage(template)];

  return (
    <div
      className="mx-auto overflow-hidden border p-1.5"
      style={{
        width: "min(100%, 18rem)",
        height: "clamp(32.5rem, 72vh, 42rem)",
        minHeight: 520,
        maxHeight: "100%",
        borderColor,
        borderRadius: Math.max(22, radius * 2),
        background: "linear-gradient(145deg, #1f2933, #05070a)",
      }}
    >
      <div
        className="flex overflow-hidden"
        style={{
          height: "100%",
          flexDirection: "column",
          borderRadius: Math.max(18, radius * 1.6),
          backgroundColor: "#111b21",
        }}
      >
        <div className="flex h-5 items-center justify-between px-4 text-[9px] font-semibold" style={{ color: "#e9edef", backgroundColor: "#202c33" }}>
          <span>12:45</span>
          <span className="flex items-center gap-1">
            <Signal size={10} />
            <span className="h-1.5 w-3.5 rounded-sm border border-current">
              <span className="block h-full w-2.5 rounded-[1px] bg-current" />
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2" style={{ backgroundColor: "#202c33", color: "#ffffff" }}>
          <ArrowLeft size={15} style={{ color: "rgba(255,255,255,0.82)" }} />
          <span className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold" style={{ backgroundColor: "#25D366" }}>
            W
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">WhatsApp preview</p>
            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.72)" }}>
              Uses sample ticket data
            </p>
          </div>
          <MoreVertical size={15} style={{ color: "rgba(255,255,255,0.78)" }} />
        </div>
        <div
          className="relative min-h-0 flex-1 py-3 pl-3 pr-3"
          style={{
            backgroundColor: "#0b141a",
            backgroundImage: "radial-gradient(circle at 16px 16px, rgba(255,255,255,0.035) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
            overflowX: "hidden",
            overflowY: "auto",
          }}
        >
          <div className="mx-auto mb-3 w-max rounded-full px-2.5 py-1 text-[10px]" style={{ color: "#8696a0", backgroundColor: "rgba(34,46,53,0.92)" }}>
            Today
          </div>
          <div className="space-y-2">
            {messages.map((message, index) => (
              <PreviewBubble key={`${message}-${index}`} message={message} time={`12:${45 + index}`} />
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 px-2 py-2" style={{ backgroundColor: "#0b141a" }}>
          <div className="flex h-8 min-w-0 flex-1 items-center px-3 text-[10px]" style={{ color: "#8696a0", backgroundColor: "#202c33", borderRadius: 999 }}>
            Message
          </div>
          <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ color: "#0b141a", backgroundColor: "#00a884" }}>
            <SendHorizontal size={14} fill="currentColor" strokeWidth={1.5} />
          </span>
        </div>
        <div className="flex shrink-0 justify-center pb-2" style={{ backgroundColor: "#0b141a" }}>
          <span className="h-1 w-20 rounded-full" style={{ backgroundColor: "rgba(233,237,239,0.42)" }} />
        </div>
      </div>
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

function TurnNearRule({ rule, canRemove, onChange, onRemove, theme }) {
  const { accentColor, fontColor, borderColor, radius } = theme;
  const textareaRef = useRef(null);
  const formattingHostRef = useRef(null);
  const [hasTextSelection, setHasTextSelection] = useState(false);
  const [activeTextRange, setActiveTextRange] = useState(null);
  const showPosition = rule.mode === "position" || rule.mode === "both";
  const showMinutes = rule.mode === "time" || rule.mode === "both";
  const template = rule.template || "";

  const syncTextSelection = () => {
    const range = rangeFromTextarea(textareaRef.current);
    setActiveTextRange(range);
    setHasTextSelection(Boolean(range));
  };
  const hideFormatting = () => {
    setActiveTextRange(null);
    setHasTextSelection(false);
  };
  const activeFormats = new Set(FORMAT_CODES.filter((format) => rangeHasFormat(template, activeTextRange, format)).map((format) => format.label));

  useEffect(() => {
    if (!hasTextSelection) return undefined;

    const handlePointerDown = (event) => {
      if (formattingHostRef.current?.contains(event.target)) return;
      hideFormatting();
    };
    const handleSelectionChange = () => {
      if (document.activeElement !== textareaRef.current) {
        hideFormatting();
        return;
      }
      syncTextSelection();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [hasTextSelection, template]);

  const updateTemplate = (nextTemplate) => onChange({ ...rule, template: nextTemplate });
  const insertDynamicCode = (code) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? template.length;
    const end = textarea?.selectionEnd ?? template.length;
    const spacerBefore = start > 0 && !/\s$/.test(template.slice(0, start)) ? " " : "";
    const spacerAfter = end < template.length && !/^\s/.test(template.slice(end)) ? " " : "";
    const insertText = `${spacerBefore}${code}${spacerAfter}`;
    const nextTemplate = `${template.slice(0, start)}${insertText}${template.slice(end)}`;
    const nextCaret = start + insertText.length;

    updateTemplate(nextTemplate);
    window.requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(nextCaret, nextCaret);
    });
  };
  const applyFormatting = ({ prefix, suffix, sample }) => {
    const textarea = textareaRef.current;
    const selectedRange = textarea && textarea.selectionStart !== textarea.selectionEnd
      ? { start: textarea.selectionStart, end: textarea.selectionEnd }
      : activeTextRange;
    const start = selectedRange?.start ?? template.length;
    const end = selectedRange?.end ?? template.length;
    const selectedText = template.slice(start, end) || sample;
    const selectedHasMarkers = selectedText.startsWith(prefix) && selectedText.endsWith(suffix) && selectedText.length > prefix.length + suffix.length;
    const surroundingHasMarkers = rangeHasFormat(template, { start, end }, { prefix, suffix }) && !selectedHasMarkers;
    let nextTemplate;
    let selectionStart;
    let selectionEnd;

    if (selectedHasMarkers) {
      const unwrappedText = selectedText.slice(prefix.length, selectedText.length - suffix.length);
      nextTemplate = `${template.slice(0, start)}${unwrappedText}${template.slice(end)}`;
      selectionStart = start;
      selectionEnd = start + unwrappedText.length;
    } else if (surroundingHasMarkers) {
      nextTemplate = `${template.slice(0, start - prefix.length)}${selectedText}${template.slice(end + suffix.length)}`;
      selectionStart = start - prefix.length;
      selectionEnd = selectionStart + selectedText.length;
    } else {
      const replacement = `${prefix}${selectedText}${suffix}`;
      nextTemplate = `${template.slice(0, start)}${replacement}${template.slice(end)}`;
      selectionStart = start + prefix.length;
      selectionEnd = selectionStart + selectedText.length;
    }

    updateTemplate(nextTemplate);
    setActiveTextRange({ start: selectionStart, end: selectionEnd });
    setHasTextSelection(true);
    window.requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(selectionStart, selectionEnd);
    });
  };

  return (
    <div
      className="space-y-3 border p-3"
      style={{
        borderColor: withAlpha(borderColor, "99"),
        borderRadius: Math.max(10, radius),
        backgroundColor: withAlpha(fontColor, "08"),
      }}
    >
      <div className={`grid gap-3 ${rule.mode === "both" ? "sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto]" : "sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto]"}`}>
        <label className="min-w-0">
          <span className="mb-1.5 block text-xs font-medium" style={{ color: withAlpha(fontColor, "99") }}>
            Notify By
          </span>
          <Select
            value={rule.mode}
            onChange={(value) => onChange({ ...rule, mode: value })}
            options={TURN_NEAR_MODES}
            accent={accentColor}
            fontColor={fontColor}
            borderColor={borderColor}
            radius={radius}
          />
        </label>
        <div className="flex items-end justify-center pb-2 text-xs font-semibold" style={{ color: withAlpha(fontColor, "80") }}>
          if
        </div>
        {showPosition ? (
        <label className="min-w-0">
          <span className="mb-1.5 block text-xs font-medium" style={{ color: withAlpha(fontColor, "99") }}>
            Position
          </span>
          <NumberInput
            value={rule.position}
            onChange={(value) => onChange({ ...rule, position: value })}
            accent={accentColor}
            fontColor={fontColor}
            borderColor={borderColor}
            radius={radius}
          />
        </label>
        ) : null}
        {rule.mode === "both" ? (
          <div className="flex items-end justify-center pb-2 text-xs font-semibold" style={{ color: withAlpha(fontColor, "80") }}>
            and
          </div>
        ) : null}
        {showMinutes ? (
        <label className="min-w-0">
          <span className="mb-1.5 block text-xs font-medium" style={{ color: withAlpha(fontColor, "99") }}>
            Minutes
          </span>
          <NumberInput
            value={rule.minutes}
            onChange={(value) => onChange({ ...rule, minutes: value })}
            accent={accentColor}
            fontColor={fontColor}
            borderColor={borderColor}
            radius={radius}
          />
        </label>
        ) : null}
        <div className="flex items-end justify-end pb-0.5">
          <button
            type="button"
            onClick={onRemove}
            disabled={!canRemove}
            className="flex h-9 w-9 items-center justify-center transition-opacity hover:opacity-80 disabled:cursor-default disabled:opacity-30"
            style={{ color: "#ef4444", borderRadius: radius, backgroundColor: "rgba(239, 68, 68, 0.1)" }}
            aria-label="Remove turn near rule"
            title="Remove rule"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div ref={formattingHostRef} className="block min-w-0">
        <span className="mb-1.5 block text-xs font-medium" style={{ color: withAlpha(fontColor, "99") }}>
          Message template
        </span>
        <TextArea
          textareaRef={textareaRef}
          value={template}
          onChange={updateTemplate}
          onBlur={hideFormatting}
          onSelect={syncTextSelection}
          placeholder="Write the WhatsApp message for this rule"
          accent={accentColor}
          fontColor={fontColor}
          borderColor={borderColor}
          radius={radius}
          rows={7}
          variant="soft"
        />
        {hasTextSelection ? (
          <>
            <p className="mb-1.5 mt-2 text-xs font-medium" style={{ color: withAlpha(fontColor, "99") }}>
              WhatsApp formatting
            </p>
            <FormattingChips activeFormats={activeFormats} onFormat={applyFormatting} theme={theme} />
          </>
        ) : null}
        <p className="mb-1.5 mt-2 text-xs font-medium" style={{ color: withAlpha(fontColor, "99") }}>
          Dynamic values
        </p>
        <DynamicCodeChips onInsert={insertDynamicCode} theme={theme} />
      </div>
    </div>
  );
}

function TurnNearSetup({ rules, onChange, theme }) {
  const { accentColor, fontColor, radius } = theme;

  const updateRule = (nextRule) => onChange(rules.map((rule) => (rule.id === nextRule.id ? nextRule : rule)));
  const removeRule = (ruleId) => {
    if (rules.length <= 1) return;
    onChange(rules.filter((rule) => rule.id !== ruleId));
  };
  const addRule = () => {
    onChange([
      ...rules,
      createTurnNearRule({
        position: Number(rules.at(-1)?.position || 1) + 1,
        template: turnNearTemplateForIndex(rules.length),
      }),
    ]);
  };

  return (
    <div className="mb-3 space-y-3">
      {rules.map((rule) => (
        <TurnNearRule
          key={rule.id}
          rule={rule}
          canRemove={rules.length > 1}
          onChange={updateRule}
          onRemove={() => removeRule(rule.id)}
          theme={theme}
        />
      ))}
      <button
        type="button"
        onClick={addRule}
        className="inline-flex min-h-8 items-center gap-2 px-3 text-xs font-semibold transition-opacity hover:opacity-85"
        style={{ color: accentColor, borderRadius: Math.max(8, radius), backgroundColor: withAlpha(accentColor, "14") }}
      >
        <Plus size={14} />
        Add rule
      </button>
    </div>
  );
}

function MessageTriggerField({ event, checked, template, onToggle, onTemplateChange, theme, turnNearRules, onTurnNearRulesChange }) {
  const Icon = event.icon;
  const { accentColor, fontColor, borderColor, radius } = theme;
  const textareaRef = useRef(null);
  const formattingHostRef = useRef(null);
  const [hasTextSelection, setHasTextSelection] = useState(false);
  const [activeTextRange, setActiveTextRange] = useState(null);

  const syncTextSelection = () => {
    const range = rangeFromTextarea(textareaRef.current);
    setActiveTextRange(range);
    setHasTextSelection(Boolean(range));
  };
  const hideFormatting = () => {
    setActiveTextRange(null);
    setHasTextSelection(false);
  };
  const activeFormats = new Set(FORMAT_CODES.filter((format) => rangeHasFormat(template, activeTextRange, format)).map((format) => format.label));

  useEffect(() => {
    if (!hasTextSelection) return undefined;

    const handlePointerDown = (event) => {
      if (formattingHostRef.current?.contains(event.target)) return;
      hideFormatting();
    };
    const handleSelectionChange = () => {
      if (document.activeElement !== textareaRef.current) {
        hideFormatting();
        return;
      }
      syncTextSelection();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [hasTextSelection]);

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

  const applyFormatting = ({ prefix, suffix, sample }) => {
    const textarea = textareaRef.current;
    const selectedRange = textarea && textarea.selectionStart !== textarea.selectionEnd
      ? { start: textarea.selectionStart, end: textarea.selectionEnd }
      : activeTextRange;
    const start = selectedRange?.start ?? template.length;
    const end = selectedRange?.end ?? template.length;
    const selectedText = template.slice(start, end) || sample;
    const selectedHasMarkers = selectedText.startsWith(prefix) && selectedText.endsWith(suffix) && selectedText.length > prefix.length + suffix.length;
    const surroundingHasMarkers = rangeHasFormat(template, { start, end }, { prefix, suffix }) && !selectedHasMarkers;
    let nextTemplate;
    let selectionStart;
    let selectionEnd;

    if (selectedHasMarkers) {
      const unwrappedText = selectedText.slice(prefix.length, selectedText.length - suffix.length);
      nextTemplate = `${template.slice(0, start)}${unwrappedText}${template.slice(end)}`;
      selectionStart = start;
      selectionEnd = start + unwrappedText.length;
    } else if (surroundingHasMarkers) {
      nextTemplate = `${template.slice(0, start - prefix.length)}${selectedText}${template.slice(end + suffix.length)}`;
      selectionStart = start - prefix.length;
      selectionEnd = selectionStart + selectedText.length;
    } else {
      const replacement = `${prefix}${selectedText}${suffix}`;
      nextTemplate = `${template.slice(0, start)}${replacement}${template.slice(end)}`;
      selectionStart = start + prefix.length;
      selectionEnd = selectionStart + selectedText.length;
    }

    onTemplateChange(nextTemplate);
    setActiveTextRange({ start: selectionStart, end: selectionEnd });
    setHasTextSelection(true);
    window.requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(selectionStart, selectionEnd);
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
        <div className="mt-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(14rem,0.7fr)]">
            <div ref={formattingHostRef} className="min-w-0 sm:pl-11 xl:pl-0">
              {event.key === "turnNear" ? (
                <TurnNearSetup rules={turnNearRules} onChange={onTurnNearRulesChange} theme={theme} />
              ) : null}
              {event.key !== "turnNear" ? (
                <div
                  className="space-y-3 border p-3"
                  style={{
                    borderColor: withAlpha(borderColor, "99"),
                    borderRadius: Math.max(10, radius),
                    backgroundColor: withAlpha(fontColor, "08"),
                  }}
                >
                  <p className="mb-1.5 text-xs font-medium" style={{ color: withAlpha(fontColor, "99") }}>
                    Message template
                  </p>
                  <TextArea
                    textareaRef={textareaRef}
                    value={template}
                    onChange={onTemplateChange}
                    onBlur={hideFormatting}
                    onSelect={syncTextSelection}
                    placeholder="Write the WhatsApp message for this event"
                    accent={accentColor}
                    fontColor={fontColor}
                    borderColor={borderColor}
                    radius={radius}
                    rows={7}
                    variant="soft"
                  />
                  {hasTextSelection ? (
                    <>
                      <p className="mb-1.5 mt-2 text-xs font-medium" style={{ color: withAlpha(fontColor, "99") }}>
                        WhatsApp formatting
                      </p>
                      <FormattingChips activeFormats={activeFormats} onFormat={applyFormatting} theme={theme} />
                    </>
                  ) : null}
                  <p className="mb-1.5 mt-2 text-xs font-medium" style={{ color: withAlpha(fontColor, "99") }}>
                    Dynamic values
                  </p>
                  <DynamicCodeChips onInsert={insertDynamicCode} theme={theme} />
                </div>
              ) : null}
            </div>
            <div className="flex min-w-0 self-stretch justify-center xl:justify-end">
              <WhatsAppPreview event={event} template={template} theme={theme} turnNearRules={turnNearRules} />
            </div>
          </div>
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
    absent: false,
    recalled: false,
    completed: false,
  });
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [turnNearRules, setTurnNearRules] = useState(() => [createTurnNearRule()]);

  const webhookUrl = useMemo(() => {
    if (typeof window === "undefined") return "/api/integrations/twilio/whatsapp/webhook";
    return `${window.location.origin}/api/integrations/twilio/whatsapp/webhook`;
  }, []);
  const ready = enabled && accountSid.trim() && authToken.trim() && sender.trim();
  const previewEvent = MESSAGE_EVENTS.find((event) => events[event.key]) || MESSAGE_EVENTS[0];

  const updateEvent = (key) => (value) => setEvents((current) => ({ ...current, [key]: value }));
  const updateTemplate = (key) => (value) => setTemplates((current) => ({ ...current, [key]: value }));
  const turnNearSummary = turnNearRules.map((rule) => (
    rule.mode === "position"
      ? `if position ${rule.position}`
      : rule.mode === "time"
        ? `if ${rule.minutes} min`
        : `if position ${rule.position} and ${rule.minutes} min`
  )).join(" | ");

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
            turnNearRules={turnNearRules}
            onTurnNearRulesChange={setTurnNearRules}
          />
        ))}
      </SectionCard>
    </div>
  );
}
