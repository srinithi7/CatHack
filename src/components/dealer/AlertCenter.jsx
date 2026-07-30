import { ShieldAlert, ShieldCheck, Cpu } from "lucide-react";
import { Card } from "../ui";

const SEVERITY_CONFIG = {
  CRITICAL: { color: "#FF4444", textColor: "#FF4444", label: "🔴 Critical", pulse: true },
  HIGH: { color: "#FF8800", textColor: "#CC6D00", label: "🟠 High", pulse: false },
  MEDIUM: { color: "#FFCD11", textColor: "#8A6A00", label: "🟡 Medium", pulse: false },
};

const ML_COLOR = "#2196F3";

function formatReason(r) {
  const dir = r.direction === "high" ? "unusually high" : "unusually low";
  return `${r.feature.replace(/_/g, " ")} is ${dir} (${r.value} vs fleet avg ${r.fleetMean})`;
}

export default function AlertCenter({ anomalies, mlAnomalies = [], mlStatus = "offline" }) {
  const deadManAlerts = anomalies.filter((a) => a.type === "Dead Man Alert");
  const groups = ["CRITICAL", "HIGH", "MEDIUM"].map((sev) => ({
    sev,
    items: anomalies.filter((a) => a.severity === sev),
  }));

  return (
    <Card className="p-5 sm:p-6 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">⚠️</span>
        <h2 className="text-lg font-bold text-[#1A1A1A]">Alert Center</h2>
        <span className="ml-auto text-xs font-bold rounded-full px-2.5 py-1 bg-[#FF444418] text-[#E23B3B]">
          {anomalies.length} active
        </span>
      </div>

      <div
        className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5 mb-4 mt-3"
        style={{
          borderColor: deadManAlerts.length ? "#FF444455" : "#00C85155",
          background: deadManAlerts.length ? "rgba(255,68,68,0.06)" : "rgba(0,200,81,0.06)",
        }}
      >
        {deadManAlerts.length ? (
          <ShieldAlert size={18} className="text-[#FF4444] shrink-0" />
        ) : (
          <ShieldCheck size={18} className="text-[#00C851] shrink-0" />
        )}
        <p className="text-xs leading-snug">
          <span className="font-bold" style={{ color: deadManAlerts.length ? "#E23B3B" : "#00954A" }}>
            Dead Man Switch Monitor:
          </span>{" "}
          <span className="text-[#4A473F]">
            {deadManAlerts.length
              ? `${deadManAlerts.length} machine(s) running with no operator logged in.`
              : "Active — no unattended running engines detected."}
          </span>
        </p>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto pr-1 max-h-[560px]">
        {groups.map(({ sev, items }) => {
          if (!items.length) return null;
          const cfg = SEVERITY_CONFIG[sev];
          return (
            <div key={sev}>
              <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: cfg.textColor }}>
                {cfg.label} ({items.length})
              </p>
              <div className="flex flex-col gap-2">
                {items.map((a) => (
                  <div
                    key={a.key}
                    className="rounded-lg px-3.5 py-3 border-l-4"
                    style={{ background: "#F9F8F4", borderLeftColor: cfg.color }}
                  >
                    <div className="flex items-center gap-2">
                      {cfg.pulse && <span className="w-2 h-2 rounded-full animate-pulse-dot" style={{ background: cfg.color }} />}
                      <p className="text-sm font-bold text-[#1A1A1A]">{a.type}</p>
                      <span className="ml-auto text-xs font-semibold text-[#8A6A00]">{a.equipmentId}</span>
                    </div>
                    <p className="text-xs text-[#6E6B62] mt-1 leading-snug">{a.description}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {mlStatus === "live" && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: ML_COLOR }}>
              <Cpu size={12} /> AI Anomaly Signals — Isolation Forest ({mlAnomalies.length})
            </p>
            <div className="flex flex-col gap-2">
              {mlAnomalies.length === 0 && (
                <p className="text-xs text-[#8A867A] italic px-1 py-1">No statistical outliers flagged by the ML model.</p>
              )}
              {mlAnomalies.map(({ eq, anomaly }) => (
                <div
                  key={eq.id}
                  className="rounded-lg px-3.5 py-3 border-l-4"
                  style={{ background: "#F5F9FE", borderLeftColor: ML_COLOR }}
                >
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-[#1A1A1A]">Flagged because: {anomaly.reasons[0] ? anomaly.reasons[0].feature.replace(/_/g, " ") : "model score"}</p>
                    <span className="ml-auto text-xs font-semibold text-[#8A6A00]">{eq.id}</span>
                  </div>
                  <p className="text-xs text-[#6E6B62] mt-1 leading-snug">
                    {anomaly.reasons.length
                      ? anomaly.reasons.map(formatReason).join("; ")
                      : `Isolation Forest score ${anomaly.anomalyScore} — statistically unusual overall profile.`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {anomalies.length === 0 && mlStatus !== "live" && (
          <p className="text-sm text-[#6E6B62] italic text-center py-8">No active alerts — fleet is healthy.</p>
        )}
      </div>
    </Card>
  );
}
