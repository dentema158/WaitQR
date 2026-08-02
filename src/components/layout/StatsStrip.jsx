import { Clock, TrendingUp, UserCheck, UserX } from "lucide-react";
import { C } from "../../lib/theme";

function withAlpha(hex, alphaHex) {
  if (!hex || hex.length !== 7) return hex;
  return `${hex}${alphaHex}`;
}

export function StatsStrip({ joinedToday, totalServed, fourthStatValue, fourthStatLabel, waitingNow, theme, onCounterFilterSelect, selectedCounterFilter }) {
  const palette = theme || {
    accentColor: C.amber,
    fontColor: C.textLight,
    borderColor: C.hair,
    radius: 16,
  };
  const stats = [
    { label: "Total Joined", value: joinedToday, icon: TrendingUp, color: palette.accentColor, counterFilter: "all" },
    { label: "Waiting Now", value: waitingNow, icon: Clock, color: C.amber, counterFilter: "waiting" },
    { label: totalServed === 1 ? "Served Ticket" : "Served Tickets", value: totalServed, icon: UserCheck, color: C.teal, counterFilter: "served" },
    { label: fourthStatLabel, value: fourthStatValue, icon: UserX, color: C.coral, counterFilter: "absent" },
  ];

  return (
    <div className="px-2.5 py-2.5 sm:px-6 sm:py-6 md:pl-10 md:pr-6">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((s) => {
          const interactive = Boolean(s.counterFilter && onCounterFilterSelect);
          const selected = interactive && selectedCounterFilter === s.counterFilter;
          const CardTag = interactive ? "button" : "div";

          return (
          <CardTag
            key={s.label}
            type={interactive ? "button" : undefined}
            onClick={interactive ? () => onCounterFilterSelect(s.counterFilter) : undefined}
            className={`flex min-w-0 items-center gap-3 border p-4 text-left ${interactive ? "qp-focusable transition-opacity hover:opacity-85" : ""}`}
            style={{
              borderColor: palette.borderColor,
              background: selected ? withAlpha(s.color, "16") : "var(--surface-bg, transparent)",
              borderRadius: palette.radius * 1.2,
            }}
            title={interactive ? `Show ${s.label.toLowerCase()} on all counters` : undefined}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: withAlpha(s.color, "1f") }}>
              <s.icon size={16} style={{ color: s.color }} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[10px] uppercase tracking-wider" style={{ color: withAlpha(palette.fontColor, "80") }}>
                {s.label}
              </div>
              <div className="qp-mono text-xl font-semibold" style={{ color: palette.fontColor }}>
                {s.value}
              </div>
            </div>
          </CardTag>
          );
        })}
      </div>
    </div>
  );
}
