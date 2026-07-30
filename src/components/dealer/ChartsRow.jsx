import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";
import { Card } from "../ui";
import { DEMAND_FORECAST } from "../../data/equipment";

const DAY_LABELS = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"];

const AXIS_STYLE = { fontSize: 11, fill: "#8A867A" };

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-lg"
      style={{ background: "#FFFFFF", borderColor: "#E4E1D8" }}
    >
      {label && <p className="font-semibold text-[#1A1A1A] mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color || p.fill }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function ChartsRow({ rows, healthyCount, atRiskCount, criticalCount }) {
  const forecastData = DEMAND_FORECAST.map((v, i) => ({ day: DAY_LABELS[i], units: v }));
  const engineIdleData = rows.map(({ eq }) => ({
    id: eq.id,
    "Engine Hours": eq.engineHours,
    "Idle Hours": eq.idleHours,
  }));
  const pieData = [
    { name: "Healthy", value: healthyCount, color: "#00C851" },
    { name: "At Risk", value: atRiskCount, color: "#FF8800" },
    { name: "Critical", value: criticalCount, color: "#FF4444" },
  ].filter((d) => d.value > 0);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <Card className="p-5" delay={0}>
        <h3 className="text-sm font-bold text-[#1A1A1A] mb-4">7-Day Demand Forecast</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={forecastData} barCategoryGap="28%">
            <CartesianGrid stroke="#EFEDE5" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" tick={AXIS_STYLE} axisLine={{ stroke: "#E4E1D8" }} tickLine={false} />
            <YAxis domain={[0, 8]} tick={AXIS_STYLE} axisLine={{ stroke: "#E4E1D8" }} tickLine={false} width={28} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,205,17,0.12)" }} />
            <Bar dataKey="units" name="Units needed" fill="#FFCD11" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive animationDuration={900} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-5" delay={80}>
        <h3 className="text-sm font-bold text-[#1A1A1A] mb-4">Engine vs Idle Hours</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={engineIdleData} barGap={2} barCategoryGap="24%">
            <CartesianGrid stroke="#EFEDE5" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="id" tick={{ fontSize: 10, fill: "#8A867A" }} axisLine={{ stroke: "#E4E1D8" }} tickLine={false} />
            <YAxis tick={AXIS_STYLE} axisLine={{ stroke: "#E4E1D8" }} tickLine={false} width={28} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(26,26,26,0.04)" }} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#6E6B62" }} />
            <Bar dataKey="Engine Hours" fill="#FFCD11" radius={[4, 4, 0, 0]} maxBarSize={16} isAnimationActive animationDuration={900} />
            <Bar dataKey="Idle Hours" fill="#FF4444" radius={[4, 4, 0, 0]} maxBarSize={16} isAnimationActive animationDuration={900} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-5" delay={160}>
        <h3 className="text-sm font-bold text-[#1A1A1A] mb-4">Fleet Health Distribution</h3>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              cornerRadius={4}
              isAnimationActive
              animationDuration={900}
            >
              {pieData.map((d) => (
                <Cell key={d.name} fill={d.color} stroke="#FFFFFF" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mt-1">
          {pieData.map((d) => (
            <span key={d.name} className="flex items-center gap-1.5 text-xs text-[#4A473F]">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
              {d.name} ({d.value})
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}
