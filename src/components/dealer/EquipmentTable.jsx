import { useMemo, useState } from "react";
import { Search, Shovel, Tractor, Construction, Forklift, LogIn, LogOut } from "lucide-react";
import { ProgressBar, HealthBadge } from "../ui";
import SensorValueBadge from "../SensorValueBadge";
import { useAllSensorData } from "../../firebase/hooks";

const TYPE_ICON = {
  Excavator: Shovel,
  Bulldozer: Tractor,
  Grader: Construction,
  Crane: Forklift,
};

const VIBRATION_STYLE = {
  normal: { color: "#00C851", label: "Normal" },
  high: { color: "#FF4444", label: "High" },
  none: { color: "#8A867A", label: "None" },
};

const ROW_BG = {
  Critical: "rgba(255,68,68,0.08)",
  "At Risk": "rgba(255,136,0,0.08)",
  Healthy: "rgba(0,200,81,0.05)",
};

const MAINT_LABEL = {
  critical: "Critical · 24h",
  warning: "Warning · 3d",
  normal: "Normal · 15d",
};

export default function EquipmentTable({ rows, checkedIn, onToggleCheck }) {
  const [search, setSearch] = useState("");
  const allSensors = useAllSensorData();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.eq.id.toLowerCase().includes(q) || r.eq.type.toLowerCase().includes(q)
    );
  }, [rows, search]);

  return (
    <div className="rounded-2xl border animate-fade-in-up" style={{ background: "#FFFFFF", borderColor: "#E4E1D8", boxShadow: "0 1px 2px rgba(26,26,26,0.04)" }}>
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-2">
        <h2 className="text-lg font-bold text-[#1A1A1A]">Fleet Overview</h2>
        <div
          className="flex items-center gap-2 rounded-lg border px-3 py-2 w-full sm:w-72"
          style={{ background: "#F6F5F1", borderColor: "#E4E1D8" }}
        >
          <Search size={16} className="text-[#8A867A]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by equipment ID or type..."
            className="bg-transparent outline-none text-sm text-[#1A1A1A] placeholder:text-[#9A968D] w-full"
          />
        </div>
      </div>
      <p className="px-5 pb-3 text-[11px] text-[#8A867A]">
        <span className="text-[#2196F3] font-semibold">● Fuel %</span> is read from the HC-SR04 ultrasonic sensor · everything else (Engine/Idle Hrs, Temp, Vibration) is from the trained ML dataset, not a physical sensor.
      </p>

      <div className="overflow-x-auto pb-2">
        <table className="w-full text-sm min-w-[1200px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[#6E6B62] border-y" style={{ borderColor: "#E4E1D8" }}>
              <th className="px-4 py-3 font-semibold">Equipment ID</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Site</th>
              <th className="px-4 py-3 font-semibold">Operator</th>
              <th className="px-4 py-3 font-semibold" title="From RC522 RFID sensor">RFID Status</th>
              <th className="px-4 py-3 font-semibold" title="From trained ML dataset">Engine Hrs</th>
              <th className="px-4 py-3 font-semibold" title="From trained ML dataset">Idle Hrs</th>
              <th className="px-4 py-3 font-semibold" title="From HC-SR04 ultrasonic sensor">Fuel %</th>
              <th className="px-4 py-3 font-semibold" title="From trained ML dataset">Temp °C</th>
              <th className="px-4 py-3 font-semibold" title="From trained ML dataset">Vibration</th>
              <th className="px-4 py-3 font-semibold">Health</th>
              <th className="px-4 py-3 font-semibold">Maintenance</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(({ eq, health, maintenance }) => {
              const Icon = TYPE_ICON[eq.type] ?? Shovel;
              const vib = VIBRATION_STYLE[eq.vibration];
              const isCheckedIn = checkedIn[eq.id] ?? eq.operator !== null;
              const liveFuel = allSensors.status === "live" ? allSensors.data?.[eq.id]?.latest : null;
              const fuelLevel = liveFuel ? liveFuel.fuelLevel : eq.fuelLevel;
              const fuelSource = liveFuel ? liveFuel.fuelDataSource : "model";
              const rfidStatus = liveFuel?.rfidStatus;
              const rfidSource = liveFuel?.rfidDataSource;
              return (
                <tr
                  key={eq.id}
                  className="border-b transition-colors hover:brightness-95"
                  style={{ borderColor: "#EFEDE5", background: ROW_BG[health.status] }}
                >
                  <td className="px-4 py-3 font-bold text-[#8A6A00] whitespace-nowrap">{eq.id}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 text-[#1A1A1A]">
                      <Icon size={15} className="text-[#8A867A]" />
                      {eq.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {eq.site ? (
                      <span className="text-[#1A1A1A]">{eq.site}</span>
                    ) : (
                      <span className="text-[#FF4444] font-semibold text-xs">UNASSIGNED</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {eq.operator ? (
                      <span className="text-[#1A1A1A]">{eq.operator}</span>
                    ) : (
                      <span className="text-[#FF4444] font-semibold text-xs">NONE</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {rfidStatus === "authenticated" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-2.5 py-1" style={{ background: "#00C85118", color: "#00954A" }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00C851] animate-pulse-dot" /> AUTHENTICATED
                      </span>
                    ) : rfidStatus === "none" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-2.5 py-1" style={{ background: "#FF444418", color: "#E23B3B" }}>
                        NO OPERATOR
                      </span>
                    ) : (
                      <span className="text-xs text-[#9A968D]">—</span>
                    )}
                    {rfidStatus && <SensorValueBadge dataSource={rfidSource} className="mt-1" />}
                  </td>
                  <td className="px-4 py-3 w-28">
                    <div className="flex items-center gap-2">
                      <div className="w-16"><ProgressBar value={eq.engineHours} max={10} color="#FFCD11" /></div>
                      <span className="text-xs text-[#6E6B62]">{eq.engineHours}h</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={eq.idleHours > 8 ? "text-[#FF4444] font-semibold" : "text-[#1A1A1A]"}>
                      {eq.idleHours}h
                    </span>
                  </td>
                  <td className="px-4 py-3 w-32">
                    <div className="flex items-center gap-2">
                      <div className="w-16">
                        <ProgressBar value={fuelLevel} color={fuelLevel < 25 ? "#FF4444" : "#2196F3"} />
                      </div>
                      <span className="text-xs text-[#6E6B62]">{fuelLevel}%</span>
                    </div>
                    <SensorValueBadge dataSource={fuelSource} className="mt-0.5" />
                  </td>
                  <td className="px-4 py-3">
                    <span className={eq.temperature > 85 ? "text-[#FF4444] font-semibold" : "text-[#1A1A1A]"}>
                      {eq.temperature}°C
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-semibold rounded-full px-2 py-1"
                      style={{ background: `${vib.color}18`, color: vib.color }}
                    >
                      {vib.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <HealthBadge score={health.score} status={health.status} color={health.color} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-semibold rounded-full px-2 py-1 whitespace-nowrap"
                      style={{ background: `${maintenance.color}18`, color: maintenance.color }}
                    >
                      {MAINT_LABEL[maintenance.level]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onToggleCheck(eq.id, isCheckedIn)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-transform hover:-translate-y-0.5 whitespace-nowrap"
                      style={
                        isCheckedIn
                          ? { background: "transparent", border: "1px solid #FF4444", color: "#FF4444" }
                          : { background: "#FFCD11", color: "#1A1A1A" }
                      }
                    >
                      {isCheckedIn ? <LogOut size={14} /> : <LogIn size={14} />}
                      {isCheckedIn ? "Check Out" : "Check In"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-[#6E6B62] text-sm">
                  No equipment matches "{search}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
