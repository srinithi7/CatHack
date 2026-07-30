import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { CalendarRange, Cpu, CircleDashed, Search } from "lucide-react";
import { Card } from "../ui";
import { predictDemand, predictDemandSummary, getDemandOptions } from "../../api/mlClient";

const HORIZON_OPTIONS = [2, 4, 6, 8];

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

export default function DemandPlanner() {
  const [status, setStatus] = useState("loading"); // loading | live | offline
  const [horizonWeeks, setHorizonWeeks] = useState(4);
  const [summaryData, setSummaryData] = useState(null);
  const [options, setOptions] = useState({ sites: [], types: [] });

  const [siteId, setSiteId] = useState("");
  const [type, setType] = useState("");
  const [drilldown, setDrilldown] = useState(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getDemandOptions()
      .then((opts) => {
        if (cancelled) return;
        setOptions(opts);
        setSiteId(opts.sites[0] ?? "");
        setType(opts.types[0] ?? "");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatus((s) => (s === "live" ? "live" : "loading"));
    predictDemandSummary(horizonWeeks)
      .then((data) => {
        if (cancelled) return;
        setSummaryData(data);
        setStatus("live");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("offline");
      });
    return () => {
      cancelled = true;
    };
  }, [horizonWeeks]);

  const runDrilldown = () => {
    if (!siteId || !type) return;
    setDrilldownLoading(true);
    predictDemand({ siteId, type, horizonWeeks })
      .then((data) => setDrilldown(data))
      .catch(() => setDrilldown(null))
      .finally(() => setDrilldownLoading(false));
  };

  const bySiteChart = useMemo(
    () => (summaryData?.bySite ?? []).map((s) => ({ name: s.siteId, units: s.totalUnits })),
    [summaryData]
  );
  const byTypeChart = useMemo(
    () => (summaryData?.byType ?? []).map((t) => ({ name: t.type, units: t.totalUnits })),
    [summaryData]
  );
  const drilldownChart = useMemo(
    () => (drilldown?.forecast ?? []).map((p) => ({ name: `+${p.daysOut}d`, units: p.predictedUnits, week: p.weekStart })),
    [drilldown]
  );

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <CalendarRange size={18} className="text-[#8A6A00]" />
        <h2 className="text-lg font-bold text-[#1A1A1A]">Demand Forecast Planner</h2>
        {status === "live" ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-2.5 py-1" style={{ background: "#00C85116", color: "#00954A" }}>
            <Cpu size={12} /> Live ML model (demand_model)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-2.5 py-1" style={{ background: "#F0EEE7", color: "#8A867A" }}>
            <CircleDashed size={12} /> {status === "loading" ? "Connecting to ML model…" : "ML backend offline"}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1 rounded-lg border p-1" style={{ borderColor: "#E4E1D8" }}>
          {HORIZON_OPTIONS.map((w) => (
            <button
              key={w}
              onClick={() => setHorizonWeeks(w)}
              className="px-2.5 py-1 rounded-md text-xs font-semibold transition-colors"
              style={horizonWeeks === w ? { background: "#FFCD11", color: "#1A1A1A" } : { color: "#6E6B62" }}
            >
              {w}w
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-[#6E6B62] mb-4">
        Recursive weekly forecast per site/equipment, rolled forward from historical rental patterns.
      </p>

      {status === "offline" && (
        <p className="text-sm text-[#8A867A] italic py-6 text-center">
          Couldn't reach the ML backend at the configured API URL — start it with <code className="text-[#8A6A00]">uvicorn app.main:app</code> in <code className="text-[#8A6A00]">backend/</code>.
        </p>
      )}

      {status !== "offline" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-xs font-semibold text-[#6E6B62] mb-2">Units needed per site — next {horizonWeeks} week(s)</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={bySiteChart} barCategoryGap="28%">
                  <CartesianGrid stroke="#EFEDE5" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#8A867A" }} axisLine={{ stroke: "#E4E1D8" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#8A867A" }} axisLine={{ stroke: "#E4E1D8" }} tickLine={false} width={26} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,205,17,0.12)" }} />
                  <Bar dataKey="units" name="Units needed" fill="#FFCD11" radius={[4, 4, 0, 0]} maxBarSize={34} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#6E6B62] mb-2">Units needed per equipment type — next {horizonWeeks} week(s)</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={byTypeChart} barCategoryGap="28%">
                  <CartesianGrid stroke="#EFEDE5" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#8A867A" }} axisLine={{ stroke: "#E4E1D8" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#8A867A" }} axisLine={{ stroke: "#E4E1D8" }} tickLine={false} width={26} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(33,150,243,0.10)" }} />
                  <Bar dataKey="units" name="Units needed" fill="#2196F3" radius={[4, 4, 0, 0]} maxBarSize={34} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border p-4" style={{ borderColor: "#E4E1D8", background: "#FAFAF8" }}>
            <p className="text-xs font-semibold text-[#6E6B62] mb-3">Drill down: specific site + equipment type</p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-[#8A867A]">Site</span>
                <select
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  className="rounded-lg border px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#FFCD11]"
                  style={{ background: "#FFFFFF", borderColor: "#E4E1D8" }}
                >
                  {options.sites.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-[#8A867A]">Equipment type</span>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="rounded-lg border px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#FFCD11]"
                  style={{ background: "#FFFFFF", borderColor: "#E4E1D8" }}
                >
                  {options.types.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
              <button
                onClick={runDrilldown}
                disabled={!siteId || !type}
                className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold bg-[#FFCD11] text-[#1A1A1A] hover:brightness-95 transition disabled:opacity-50"
              >
                <Search size={14} /> Forecast
              </button>
            </div>

            {drilldownLoading && <p className="text-xs text-[#8A867A] mt-4">Running forecast…</p>}

            {!drilldownLoading && drilldown && (
              <div className="mt-4">
                <p className="text-sm text-[#1A1A1A] mb-2">
                  <span className="font-bold text-[#8A6A00]">{drilldown.siteId}</span> — {drilldown.type}:{" "}
                  {drilldown.forecast.reduce((s, p) => s + p.predictedUnits, 0)} unit-weeks needed over the next {horizonWeeks} week(s)
                </p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={drilldownChart} barCategoryGap="28%">
                    <CartesianGrid stroke="#EFEDE5" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#8A867A" }} axisLine={{ stroke: "#E4E1D8" }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#8A867A" }} axisLine={{ stroke: "#E4E1D8" }} tickLine={false} width={26} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,205,17,0.12)" }} />
                    <Bar dataKey="units" name="Units needed" fill="#FFCD11" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
