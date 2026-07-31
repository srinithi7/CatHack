import { useMemo, useState } from "react";
import { Gauge, LogOut, MapPin, Clock3, AlertCircle, QrCode as QrIcon, Send } from "lucide-react";
import { ProgressBar, HealthBadge, ToastStack, useToasts } from "../ui";
import QrCode from "../QrCode";
import SensorValueBadge from "../SensorValueBadge";
import { useAllSensorData } from "../../firebase/hooks";
import { useMergedEquipment } from "../../firebase/useMergedEquipment";
import { isOverdue, overdueDays, remainingDays } from "../../data/equipment";
import { calcHealthScore, calcMaintenance } from "../../data/algorithms";

const RENTER_NAME = "ABC Construction";

export default function RenterPortal({ onLogout }) {
  const { toasts, pushToast } = useToasts();
  const allSensors = useAllSensorData();
  const { equipment } = useMergedEquipment();
  const myEquipment = useMemo(() => equipment.filter((eq) => eq.renter === RENTER_NAME), [equipment]);
  const rows = useMemo(
    () => myEquipment.map((eq) => ({ eq, health: calcHealthScore(eq), maintenance: calcMaintenance(eq) })),
    [myEquipment]
  );

  const overdueCount = rows.filter((r) => isOverdue(r.eq)).length;
  const totalIdleCost = rows.reduce((sum, r) => sum + r.eq.idleHours * 500, 0);
  const totalIdleHours = rows.reduce((sum, r) => sum + r.eq.idleHours, 0);
  const totalEngineHours = rows.reduce((sum, r) => sum + r.eq.engineHours, 0);
  const avgFuelUsed = Math.round(rows.reduce((sum, r) => sum + (100 - r.eq.fuelLevel), 0) / rows.length);

  const [form, setForm] = useState({ equipmentId: myEquipment[0]?.id ?? "", operatorId: "", action: "CHECK_IN" });

  const submit = (e) => {
    e.preventDefault();
    if (!form.equipmentId || !form.operatorId.trim()) return;
    const time = new Date().toLocaleTimeString("en-IN", { hour12: true });
    const verb = form.action === "CHECK_IN" ? "checked in" : "checked out";
    pushToast(`✅ ${form.equipmentId} ${verb} successfully\nOperator: ${form.operatorId.trim()} | Time: ${time}`);
    setForm((f) => ({ ...f, operatorId: "" }));
  };

  const qrTimestamp = Date.now();

  return (
    <div className="min-h-screen bg-[#F3F3EF]">
      <ToastStack toasts={toasts} />

      <header
        className="sticky top-0 z-40 flex flex-wrap items-center gap-4 border-b px-5 py-3"
        style={{ background: "#FFFFFF", borderColor: "#E4E1D8" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#FFCD11", color: "#1A1A1A" }}>
            <Gauge size={20} />
          </div>
          <div>
            <p className="font-extrabold text-[#1A1A1A] leading-tight">[SYSTEM_NAME]</p>
            <p className="text-[11px] text-[#8A867A] leading-tight">Renter Portal</p>
          </div>
        </div>
        <div className="ml-2 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: "#F0EEE7", color: "#4A473F" }}>
          {RENTER_NAME} Co.
        </div>
        <button
          onClick={onLogout}
          className="ml-auto flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold text-[#6E6B62] hover:text-[#1A1A1A] hover:border-[#FFCD11] transition-colors"
          style={{ borderColor: "#E4E1D8" }}
        >
          <LogOut size={14} />
          Logout
        </button>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard label="My Equipment" value={myEquipment.length} sub="Currently rented" color="#C99A00" />
          <SummaryCard label="Overdue Returns" value={overdueCount} sub="Past checkout date" color={overdueCount ? "#FF4444" : "#00C851"} />
          <SummaryCard label="Total Idle Cost" value={`₹${totalIdleCost.toLocaleString("en-IN")}`} sub="From idle equipment" color="#FF8800" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {rows.map(({ eq, health, maintenance }, i) => {
            const overdue = isOverdue(eq);
            const dayCount = overdue ? overdueDays(eq) : remainingDays(eq);
            const liveFuel = allSensors.status === "live" ? allSensors.data?.[eq.id]?.latest : null;
            const fuelLevel = liveFuel ? liveFuel.fuelLevel : eq.fuelLevel;
            const fuelSource = liveFuel ? liveFuel.fuelDataSource : "model";
            return (
              <div
                key={eq.id}
                className="rounded-2xl border p-5 flex flex-col gap-4 animate-fade-in-up"
                style={{ background: "#FFFFFF", borderColor: "#E4E1D8", boxShadow: "0 1px 2px rgba(26,26,26,0.04)", animationDelay: `${i * 90}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-2xl font-extrabold text-[#1A1A1A]">{eq.id}</p>
                    <p className="text-sm text-[#6E6B62]">{eq.type}</p>
                  </div>
                  <HealthBadge score={health.score} status={health.status} color={health.color} size="sm" />
                </div>

                <p className="flex items-center gap-1.5 text-xs text-[#6E6B62]">
                  <MapPin size={13} /> {eq.location}
                </p>

                <div className="flex items-center justify-between text-xs text-[#6E6B62]">
                  <span>In: {eq.checkIn}</span>
                  <span>Out: {eq.checkOut}</span>
                </div>

                <div
                  className="rounded-lg px-3 py-2 text-center text-sm font-bold"
                  style={
                    overdue
                      ? { background: "#FF444414", color: "#E23B3B" }
                      : { background: "#00C85114", color: "#00954A" }
                  }
                >
                  {overdue ? `${dayCount} day${dayCount === 1 ? "" : "s"} OVERDUE` : `${dayCount} day${dayCount === 1 ? "" : "s"} remaining`}
                </div>

                <div className="text-xs text-[#6E6B62]">
                  Operator: <span className="text-[#1A1A1A] font-medium">{eq.operator ?? "None assigned"}</span>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-[#8A867A] mb-1">
                    <span>Engine Hours <span className="text-[#8A6A00]">· ML dataset</span></span>
                    <span>{eq.engineHours}h / 10h</span>
                  </div>
                  <ProgressBar value={eq.engineHours} max={10} color="#FFCD11" />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-[#8A867A] mb-1 items-center">
                    <span>Fuel Level</span>
                    <span className="flex items-center gap-1.5">
                      {fuelLevel}% <SensorValueBadge dataSource={fuelSource} />
                    </span>
                  </div>
                  <ProgressBar value={fuelLevel} color={fuelLevel < 25 ? "#FF4444" : "#2196F3"} />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8A867A]">Temperature <span className="text-[#8A6A00] text-[11px]">· ML dataset</span></span>
                  <span className={eq.temperature > 85 ? "text-[#FF4444] font-bold" : "text-[#1A1A1A] font-semibold"}>
                    {eq.temperature}°C
                  </span>
                </div>

                {maintenance.level !== "normal" && (
                  <div
                    className="flex items-start gap-2 rounded-lg px-3 py-2 text-xs"
                    style={{ background: `${maintenance.color}12`, color: maintenance.level === "critical" ? "#E23B3B" : "#CC6D00" }}
                  >
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{maintenance.reasons[0]} — action needed {maintenance.label.toLowerCase()}.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border p-5 sm:p-6" style={{ background: "#FFFFFF", borderColor: "#E4E1D8", boxShadow: "0 1px 2px rgba(26,26,26,0.04)" }}>
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-4">Operator Check-In / Check-Out System</h2>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
            <form onSubmit={submit} className="flex flex-col gap-4">
              <Field label="Equipment">
                <select
                  value={form.equipmentId}
                  onChange={(e) => setForm((f) => ({ ...f, equipmentId: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-[#FFCD11]"
                  style={{ background: "#FAFAF8", borderColor: "#E4E1D8" }}
                >
                  {myEquipment.map((eq) => (
                    <option key={eq.id} value={eq.id}>{eq.id} — {eq.type}</option>
                  ))}
                </select>
              </Field>

              <Field label="Operator ID">
                <input
                  value={form.operatorId}
                  onChange={(e) => setForm((f) => ({ ...f, operatorId: e.target.value }))}
                  placeholder="e.g. OP101"
                  className="w-full rounded-lg border px-3 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#9A968D] outline-none focus:border-[#FFCD11]"
                  style={{ background: "#FAFAF8", borderColor: "#E4E1D8" }}
                  required
                />
              </Field>

              <Field label="Action">
                <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: "#E4E1D8" }}>
                  {["CHECK_IN", "CHECK_OUT"].map((a) => (
                    <button
                      type="button"
                      key={a}
                      onClick={() => setForm((f) => ({ ...f, action: a }))}
                      className="flex-1 py-2.5 text-sm font-semibold transition-colors"
                      style={
                        form.action === a
                          ? { background: "#FFCD11", color: "#1A1A1A" }
                          : { background: "#FAFAF8", color: "#8A867A" }
                      }
                    >
                      {a === "CHECK_IN" ? "CHECK IN" : "CHECK OUT"}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Date & Time">
                <input
                  disabled
                  value={new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm text-[#6E6B62] outline-none"
                  style={{ background: "#F3F3EF", borderColor: "#E4E1D8" }}
                />
              </Field>

              <button
                type="submit"
                className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold text-sm bg-[#FFCD11] text-[#1A1A1A] hover:brightness-95 transition hover:-translate-y-0.5"
              >
                <Send size={16} />
                Submit
              </button>
            </form>

            <div className="flex flex-col items-center gap-3 justify-center rounded-xl border p-5 w-full lg:w-52" style={{ background: "#FAFAF8", borderColor: "#E4E1D8" }}>
              <div className="bg-white p-2 rounded-lg border" style={{ borderColor: "#E4E1D8" }}>
                <QrCode value={`${form.equipmentId}-${qrTimestamp}`} size={120} />
              </div>
              <p className="flex items-center gap-1.5 text-[11px] text-[#6E6B62] font-mono text-center break-all">
                <QrIcon size={12} className="shrink-0" />
                QR: {form.equipmentId}-{qrTimestamp}
              </p>
              <p className="text-[11px] text-[#8A867A] text-center">Scan on machine RFID terminal</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border p-5 sm:p-6" style={{ background: "#FFFFFF", borderColor: "#E4E1D8", boxShadow: "0 1px 2px rgba(26,26,26,0.04)" }}>
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
            <Clock3 size={18} className="text-[#8A6A00]" /> Usage Summary
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-[#6E6B62] border-b" style={{ borderColor: "#E4E1D8" }}>
                  <th className="py-2 font-semibold">Equipment</th>
                  <th className="py-2 font-semibold">Engine Hrs</th>
                  <th className="py-2 font-semibold">Idle Hrs</th>
                  <th className="py-2 font-semibold">Fuel Used</th>
                  <th className="py-2 font-semibold">Days Rented</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ eq, health }) => (
                  <tr key={eq.id} className="border-b hover:bg-black/[0.02] transition-colors" style={{ borderColor: "#EFEDE5" }}>
                    <td className="py-2 font-semibold text-[#8A6A00]">{eq.id}</td>
                    <td className="py-2 text-[#1A1A1A]">{eq.engineHours}h</td>
                    <td className="py-2 text-[#1A1A1A]">{eq.idleHours}h</td>
                    <td className="py-2 text-[#1A1A1A]">{100 - eq.fuelLevel}%</td>
                    <td className="py-2 text-[#1A1A1A]">{eq.rentalDays}</td>
                    <td className="py-2">
                      <span className="text-xs font-semibold rounded-full px-2 py-1" style={{ background: `${health.color}16`, color: health.color }}>
                        {health.status}
                      </span>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="py-3 font-bold text-[#1A1A1A]">Total</td>
                  <td className="py-3 font-bold text-[#1A1A1A]">{totalEngineHours}h</td>
                  <td className="py-3 font-bold text-[#1A1A1A]">{totalIdleHours}h</td>
                  <td className="py-3 font-bold text-[#1A1A1A]">{avgFuelUsed}% avg</td>
                  <td className="py-3 font-bold text-[#1A1A1A]">{rows.reduce((s, r) => s + r.eq.rentalDays, 0)}</td>
                  <td className="py-3" />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({ label, value, sub, color }) {
  return (
    <div className="rounded-2xl border p-5 animate-fade-in-up" style={{ background: "#FFFFFF", borderColor: `${color}40`, boxShadow: "0 1px 2px rgba(26,26,26,0.04)" }}>
      <p className="text-3xl font-extrabold" style={{ color }}>{value}</p>
      <p className="text-sm font-semibold text-[#1A1A1A] mt-1">{label}</p>
      <p className="text-xs text-[#8A867A]">{sub}</p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-[#6E6B62]">{label}</span>
      {children}
    </label>
  );
}
