import { useEffect, useMemo, useState } from "react";
import {
  Gauge, LogOut, Globe2, TrendingUp, Wrench, Building2, IndianRupee,
  Cpu, CircleDashed, ShieldCheck,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { equipmentData } from "../../data/equipment";
import { fleetSummary, STATUS_COLORS } from "../../data/algorithms";
import { useFleetPredictions } from "../../hooks/useFleetPredictions";
import { predictDemandSummary } from "../../api/mlClient";
import { useEquipmentList, useAllMlPredictions, useAllSensorData } from "../../firebase/hooks";
import FleetMap from "../FleetMap";

// Reference values only — no purchase-price field exists in the dataset, so
// fleet value is estimated from typical CAT list prices per equipment class.
const ASSET_VALUE_BY_TYPE = {
  Excavator: 8500000,
  Bulldozer: 9500000,
  Crane: 12000000,
  Grader: 7000000,
  Loader: 6000000,
};

// Tier-based reference repair cost — not an ML output, just a cost band per
// PM tier so the risk board can show a rupee figure alongside the model's
// hours-to-failure prediction.
const REPAIR_COST_BY_TIER = { PM1: 250000, PM2: 90000, None: 15000 };

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border px-3 py-2 text-xs shadow-lg" style={{ background: "#FFFFFF", borderColor: "#E4E1D8" }}>
      {label && <p className="font-semibold text-[#1A1A1A] mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color || p.fill }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function CaterpillarDashboard({ onLogout }) {
  const [now] = useState(() => new Date());
  const summary = useMemo(() => fleetSummary(now), [now]);
  const ml = useFleetPredictions();

  const [demandStatus, setDemandStatus] = useState("loading");
  const [demand, setDemand] = useState(null);

  useEffect(() => {
    let cancelled = false;
    predictDemandSummary(4)
      .then((data) => {
        if (cancelled) return;
        setDemand(data);
        setDemandStatus("live");
      })
      .catch(() => {
        if (cancelled) return;
        setDemandStatus("offline");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const topTypes = useMemo(() => [...(demand?.byType ?? [])].sort((a, b) => b.totalUnits - a.totalUnits).slice(0, 5), [demand]);
  const topSites = useMemo(() => [...(demand?.bySite ?? [])].sort((a, b) => b.totalUnits - a.totalUnits).slice(0, 5), [demand]);

  const riskBoard = useMemo(() => {
    if (ml.status !== "live") return [];
    return equipmentData
      .map((eq) => ({ eq, prediction: ml.byId[eq.id]?.maintenance }))
      .filter((r) => r.prediction)
      .sort((a, b) => a.prediction.hoursToFailure - b.prediction.hoursToFailure)
      .slice(0, 5);
  }, [ml]);

  const utilizationPct = Math.round((summary.activeRentals / summary.totalFleet) * 100);
  const estimatedRevenue = equipmentData.reduce((sum, eq) => sum + eq.rentalDays * 4500, 0);
  const estimatedFleetValue = equipmentData.reduce((sum, eq) => sum + (ASSET_VALUE_BY_TYPE[eq.type] ?? 6500000), 0);
  const redeploymentOpportunities = equipmentData.filter((eq) => eq.idleHours > 6 && eq.operator === null).length;

  const liveEquipment = useEquipmentList();
  const liveMlPredictions = useAllMlPredictions();
  const liveSensors = useAllSensorData();
  const mapPoints = useMemo(() => {
    if (liveEquipment.status !== "live" || !liveEquipment.data) return [];
    const predictions = liveMlPredictions.status === "live" ? liveMlPredictions.data ?? {} : {};
    const sensors = liveSensors.status === "live" ? liveSensors.data ?? {} : {};
    return Object.entries(liveEquipment.data).map(([id, eq]) => ({
      id,
      ...eq,
      healthClass: predictions[id]?.healthClass,
      hoursToMaintenance: predictions[id]?.hoursToMaintenance,
      rfidOperator: sensors[id]?.latest?.rfidOperator,
      rfidStatus: sensors[id]?.latest?.rfidStatus,
      rfidTimestamp: sensors[id]?.latest?.timestamp,
    }));
  }, [liveEquipment.status, liveEquipment.data, liveMlPredictions.status, liveMlPredictions.data, liveSensors.status, liveSensors.data]);

  return (
    <div className="min-h-screen bg-[#F3F3EF]">
      <header className="sticky top-0 z-40 flex items-center gap-4 border-b px-5 py-3" style={{ background: "#1A1A1A", borderColor: "#000" }}>
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#FFCD11", color: "#1A1A1A" }}>
            <Gauge size={20} />
          </div>
          <div>
            <p className="font-extrabold text-[#FFCD11] leading-tight">CatArenT</p>
            <p className="text-[11px] text-[#B8B5AC] leading-tight">Caterpillar Global Intelligence</p>
          </div>
        </div>
        <span className="ml-2 flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-2.5 py-1" style={{ background: "#FFCD1122", color: "#FFCD11" }}>
          <ShieldCheck size={12} /> Read-only — no operational controls
        </span>
        <button
          onClick={onLogout}
          className="ml-auto flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold text-[#B8B5AC] hover:text-white hover:border-[#FFCD11] transition-colors shrink-0"
          style={{ borderColor: "#3A3A3A" }}
        >
          <LogOut size={14} />
          Logout
        </button>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        <FleetMap
          title="Global Fleet Intelligence Map"
          height={460}
          center={[20.5937, 78.9629]}
          zoom={6}
          equipment={mapPoints}
          emptyHint={liveEquipment.status === "live" ? "No equipment with GPS coordinates yet." : "Connect Firebase to plot live equipment locations."}
          renderPopup={(eq) => (
            <div className="text-xs leading-relaxed">
              <p className="font-bold text-sm mb-1">{eq.id}</p>
              <p><b>Type:</b> {eq.type ?? "—"}</p>
              <p><b>Dealer:</b> {eq.dealer ?? "CatArenT Dealer #1"}</p>
              <p><b>Health:</b> {eq.healthClass ?? "No ML data yet"}</p>
              <p><b>Hours to Maintenance:</b> {eq.hoursToMaintenance ?? "—"}</p>
              {eq.rfidStatus === "authenticated" && (
                <p className="mt-1">
                  RFID: {eq.rfidOperator ?? "Operator"} Authenticated ✅<br />
                  Last scan: {eq.rfidTimestamp ?? "—"}
                </p>
              )}
              {eq.rfidStatus === "none" && (
                <p className="mt-1 text-[#E23B3B]">RFID: No operator authenticated ⚠️</p>
              )}
            </div>
          )}
        />

        {/* Fleet Health Overview */}
        <Section icon={Globe2} title="Fleet Health Overview" subtitle="Across all registered dealers in the network">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Stat label="Healthy" value={summary.healthyCount} color={STATUS_COLORS.Healthy} />
            <Stat label="At Risk" value={summary.atRiskCount} color={STATUS_COLORS["At Risk"]} />
            <Stat label="Critical" value={summary.criticalCount} color={STATUS_COLORS.Critical} />
          </div>
        </Section>

        {/* Demand Signals */}
        <Section
          icon={TrendingUp}
          title="Demand Signals"
          subtitle="Most requested equipment types & regions — 4-week ML forecast"
          badge={
            demandStatus === "live"
              ? { icon: Cpu, label: "Live ML model", color: "#00954A" }
              : { icon: CircleDashed, label: demandStatus === "loading" ? "Connecting…" : "ML backend offline", color: "#8A867A" }
          }
        >
          {demandStatus === "live" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-[#6E6B62] mb-2">Top equipment types (units needed)</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={topTypes.map((t) => ({ name: t.type, units: t.totalUnits }))} barCategoryGap="28%">
                    <CartesianGrid stroke="#EFEDE5" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#8A867A" }} axisLine={{ stroke: "#E4E1D8" }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#8A867A" }} axisLine={{ stroke: "#E4E1D8" }} tickLine={false} width={26} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,205,17,0.12)" }} />
                    <Bar dataKey="units" name="Units needed" fill="#FFCD11" radius={[4, 4, 0, 0]} maxBarSize={34} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#6E6B62] mb-2">Top regions/sites (units needed)</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={topSites.map((s) => ({ name: s.siteId, units: s.totalUnits }))} barCategoryGap="28%">
                    <CartesianGrid stroke="#EFEDE5" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#8A867A" }} axisLine={{ stroke: "#E4E1D8" }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#8A867A" }} axisLine={{ stroke: "#E4E1D8" }} tickLine={false} width={26} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(33,150,243,0.10)" }} />
                    <Bar dataKey="units" name="Units needed" fill="#2196F3" radius={[4, 4, 0, 0]} maxBarSize={34} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#8A867A] italic text-center py-6">
              {demandStatus === "loading" ? "Loading demand forecast…" : "Couldn't reach the ML backend — start FastAPI in backend/ to see live demand signals."}
            </p>
          )}
        </Section>

        {/* Maintenance Risk Board */}
        <Section
          icon={Wrench}
          title="Maintenance Risk Board"
          subtitle="Machines closest to failure, by Random Forest hours-to-failure prediction"
          badge={
            ml.status === "live"
              ? { icon: Cpu, label: "Live ML model", color: "#00954A" }
              : { icon: CircleDashed, label: "ML backend offline", color: "#8A867A" }
          }
        >
          {ml.status === "live" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-[#6E6B62] border-b" style={{ borderColor: "#E4E1D8" }}>
                    <th className="py-2 font-semibold">Equipment</th>
                    <th className="py-2 font-semibold">Tier</th>
                    <th className="py-2 font-semibold">Hours to Failure</th>
                    <th className="py-2 font-semibold">Failure Probability</th>
                    <th className="py-2 font-semibold text-right">Est. Repair Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {riskBoard.map(({ eq, prediction }) => (
                    <tr key={eq.id} className="border-b" style={{ borderColor: "#EFEDE5" }}>
                      <td className="py-2 font-semibold text-[#8A6A00]">{eq.id} <span className="text-[#8A867A] font-normal">({eq.type})</span></td>
                      <td className="py-2">
                        <span className="text-xs font-semibold rounded-full px-2 py-1" style={{ background: `${prediction.tier === "PM1" ? "#FF4444" : prediction.tier === "PM2" ? "#FF8800" : "#00C851"}18`, color: prediction.tier === "PM1" ? "#FF4444" : prediction.tier === "PM2" ? "#CC6D00" : "#00954A" }}>
                          {prediction.tier}
                        </span>
                      </td>
                      <td className="py-2 text-[#1A1A1A]">{prediction.hoursToFailure} hrs</td>
                      <td className="py-2 text-[#1A1A1A]">{prediction.failureProbability}%</td>
                      <td className="py-2 text-right font-semibold text-[#1A1A1A]">
                        ₹{(REPAIR_COST_BY_TIER[prediction.tier] ?? 15000).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-[#8A867A] italic text-center py-6">ML backend offline — start FastAPI in backend/ to see live risk scoring.</p>
          )}
        </Section>

        {/* Dealer Oversight */}
        <Section icon={Building2} title="Dealer Oversight" subtitle="Per-dealer fleet utilization, revenue, and idle cost">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-[#6E6B62] border-b" style={{ borderColor: "#E4E1D8" }}>
                  <th className="py-2 font-semibold">Dealer</th>
                  <th className="py-2 font-semibold">Fleet Size</th>
                  <th className="py-2 font-semibold">Utilization</th>
                  <th className="py-2 font-semibold">Est. Revenue</th>
                  <th className="py-2 font-semibold text-right">Idle Cost</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2 font-semibold text-[#1A1A1A]">CatArenT Dealer #1</td>
                  <td className="py-2 text-[#1A1A1A]">{summary.totalFleet} units</td>
                  <td className="py-2 text-[#1A1A1A]">{utilizationPct}%</td>
                  <td className="py-2 text-[#1A1A1A]">₹{estimatedRevenue.toLocaleString("en-IN")}</td>
                  <td className="py-2 text-right font-semibold text-[#FF4444]">₹{summary.revenueLoss.toLocaleString("en-IN")}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-[#8A867A] mt-3">1 dealer currently onboarded to the network — table scales as more dealers register.</p>
        </Section>

        {/* Global Revenue Intelligence */}
        <Section icon={IndianRupee} title="Global Revenue Intelligence" subtitle="Network-wide fleet value, idle cost, and redeployment opportunity">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Stat label="Est. Total Fleet Value" value={`₹${(estimatedFleetValue / 10000000).toFixed(2)} Cr`} color="#2196F3" sub="Reference value by equipment class" />
            <Stat label="Total Idle Cost" value={`₹${summary.revenueLoss.toLocaleString("en-IN")}`} color="#FF4444" sub="From idle equipment today" />
            <Stat label="Redeployment Opportunities" value={redeploymentOpportunities} color="#00C851" sub="Idle & unassigned machines" />
          </div>
        </Section>
      </main>
    </div>
  );
}

function Section({ icon: Icon, title, subtitle, badge, children }) {
  return (
    <div className="rounded-2xl border p-5 sm:p-6" style={{ background: "#FFFFFF", borderColor: "#E4E1D8", boxShadow: "0 1px 2px rgba(26,26,26,0.04)" }}>
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <Icon size={18} className="text-[#8A6A00]" />
        <h2 className="text-lg font-bold text-[#1A1A1A]">{title}</h2>
        {badge && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-2.5 py-1" style={{ background: `${badge.color}18`, color: badge.color }}>
            <badge.icon size={12} /> {badge.label}
          </span>
        )}
      </div>
      <p className="text-xs text-[#6E6B62] mb-4">{subtitle}</p>
      {children}
    </div>
  );
}

function Stat({ label, value, color, sub }) {
  return (
    <div className="rounded-xl border p-4" style={{ background: "#FAFAF8", borderColor: `${color}40` }}>
      <p className="text-2xl font-extrabold" style={{ color }}>{value}</p>
      <p className="text-sm font-semibold text-[#1A1A1A] mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-[#8A867A] mt-0.5">{sub}</p>}
    </div>
  );
}
