import { Sparkles, AlertOctagon, AlertTriangle, ShieldCheck } from "lucide-react";
import { Card } from "../ui";

const COLUMN_CONFIG = {
  critical: {
    title: "Critical",
    subtitle: "Action needed within 24 hours",
    icon: AlertOctagon,
    color: "#FF4444",
  },
  warning: {
    title: "Warning",
    subtitle: "Action needed within 3 days",
    icon: AlertTriangle,
    color: "#FF8800",
  },
  normal: {
    title: "Healthy",
    subtitle: "Scheduled within next 15 days",
    icon: ShieldCheck,
    color: "#00C851",
  },
};

function Column({ level, items }) {
  const cfg = COLUMN_CONFIG[level];
  const Icon = cfg.icon;
  return (
    <div className="rounded-xl border border-t-[3px] p-4 flex flex-col gap-3" style={{ background: "#FFFFFF", borderColor: "#E4E1D8", borderTopColor: cfg.color }}>
      <div className="flex items-center gap-2">
        <Icon size={18} style={{ color: cfg.color }} />
        <div>
          <p className="text-sm font-bold" style={{ color: cfg.color }}>{cfg.title}</p>
          <p className="text-[11px] text-[#8A867A]">{cfg.subtitle}</p>
        </div>
        <span
          className="ml-auto text-xs font-bold rounded-full px-2 py-0.5"
          style={{ background: `${cfg.color}16`, color: cfg.color }}
        >
          {items.length}
        </span>
      </div>

      <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
        {items.length === 0 && (
          <p className="text-xs text-[#8A867A] italic py-4 text-center">No equipment in this category.</p>
        )}
        {items.map((m) => (
          <div
            key={m.equipment.id}
            className="rounded-lg border px-3 py-2.5"
            style={{ background: "#FAFAF8", borderColor: "#EFEDE5" }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-sm text-[#8A6A00]">{m.equipment.id}</span>
              <span className="text-[11px] text-[#6E6B62]">{m.equipment.type}</span>
            </div>
            <p className="text-xs text-[#1A1A1A] mt-1 leading-snug">{m.reasons[0]}</p>
            <p className="text-[11px] font-semibold mt-1.5" style={{ color: cfg.color }}>
              {m.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PredictiveMaintenancePanel({ maintenance }) {
  const grouped = {
    critical: maintenance.filter((m) => m.level === "critical"),
    warning: maintenance.filter((m) => m.level === "warning"),
    normal: maintenance.filter((m) => m.level === "normal"),
  };

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={18} className="text-[#8A6A00]" />
        <h2 className="text-lg font-bold text-[#1A1A1A]">Predictive Maintenance — Fleet Forecast</h2>
      </div>
      <p className="text-xs text-[#6E6B62] mb-4">
        Rule-based failure-risk scoring across the fleet dataset.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Column level="critical" items={grouped.critical} />
        <Column level="warning" items={grouped.warning} />
        <Column level="normal" items={grouped.normal} />
      </div>
    </Card>
  );
}
