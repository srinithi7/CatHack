import { useEffect, useMemo, useState } from "react";
import {
  Gauge, LogOut, MapPin, Clock3, AlertCircle, QrCode as QrIcon, Send,
  Truck, Fuel as FuelIcon, Rocket, CheckCircle2, WifiOff,
} from "lucide-react";
import { ProgressBar, HealthBadge, ToastStack, useToasts } from "../ui";
import QrCode from "../QrCode";
import SensorValueBadge from "../SensorValueBadge";
import { useAllSensorData, useEquipmentList, useMainStorage, useUsers, createRedeploymentRequest, assignRedeploymentRequest } from "../../firebase/hooks";
import { useMergedEquipment } from "../../firebase/useMergedEquipment";
import { isFirebaseConfigured } from "../../firebase/firebaseConfig";
import { isOverdue, overdueDays, remainingDays } from "../../data/equipment";
import { calcHealthScore, calcMaintenance, STATUS_COLORS } from "../../data/algorithms";
import { SITES, MAIN_YARD, distanceKm, estimateEtaMinutes, formatEta } from "../../data/sites";
import RentalExtensionBoard from "./RentalExtensionBoard";

const EQUIPMENT_TYPES = ["Excavator", "Bulldozer", "Grader", "Crane", "Loader"];
const FALLBACK_COMPANY_NAME = "ABC Construction";

export default function CompanyPortal({ onLogout }) {
  const { toasts, pushToast } = useToasts();
  const allSensors = useAllSensorData();
  const { equipment } = useMergedEquipment();
  const equipmentFeed = useEquipmentList();
  const storageFeed = useMainStorage();
  const usersFeed = useUsers();

  const companyName = useMemo(() => {
    if (usersFeed.status === "live" && usersFeed.data) {
      const match = Object.values(usersFeed.data).find((u) => u.role === "customer");
      if (match?.name) return match.name;
    }
    return FALLBACK_COMPANY_NAME;
  }, [usersFeed.status, usersFeed.data]);

  const myEquipment = useMemo(() => equipment.filter((eq) => eq.customer === companyName), [equipment, companyName]);
  const rows = useMemo(
    () => myEquipment.map((eq) => ({ eq, health: calcHealthScore(eq), maintenance: calcMaintenance(eq) })),
    [myEquipment]
  );

  const overdueCount = rows.filter((r) => isOverdue(r.eq)).length;
  const totalIdleCost = rows.reduce((sum, r) => sum + r.eq.idleHours * 500, 0);
  const totalIdleHours = rows.reduce((sum, r) => sum + r.eq.idleHours, 0);
  const totalEngineHours = rows.reduce((sum, r) => sum + r.eq.engineHours, 0);
  const avgFuelUsed = rows.length ? Math.round(rows.reduce((sum, r) => sum + (100 - r.eq.fuelLevel), 0) / rows.length) : 0;

  const [checkForm, setCheckForm] = useState({ equipmentId: "", operatorId: "", action: "CHECK_IN" });
  useEffect(() => {
    if (!checkForm.equipmentId && myEquipment[0]) setCheckForm((f) => ({ ...f, equipmentId: myEquipment[0].id }));
  }, [myEquipment, checkForm.equipmentId]);

  const submitCheck = (e) => {
    e.preventDefault();
    if (!checkForm.equipmentId || !checkForm.operatorId.trim()) return;
    const time = new Date().toLocaleTimeString("en-IN", { hour12: true });
    const verb = checkForm.action === "CHECK_IN" ? "checked in" : "checked out";
    pushToast(`✅ ${checkForm.equipmentId} ${verb} successfully\nOperator: ${checkForm.operatorId.trim()} | Time: ${time}`);
    setCheckForm((f) => ({ ...f, operatorId: "" }));
  };
  const qrTimestamp = Date.now();

  // ── Request Equipment / Intelligent Redeployment Engine ──────────────────
  const [reqForm, setReqForm] = useState({ equipmentType: EQUIPMENT_TYPES[0], siteId: SITES[0].id });
  const [engine, setEngine] = useState({ phase: "idle" }); // idle | searching | found | none | deploying | deployed
  const [delivery, setDelivery] = useState(null);

  useEffect(() => {
    if (!delivery || delivery.elapsedMinutes >= delivery.etaMinutes) return;
    const t = setInterval(() => {
      setDelivery((d) => (d ? { ...d, elapsedMinutes: Math.min(d.etaMinutes, d.elapsedMinutes + 1) } : d));
    }, 1000);
    return () => clearInterval(t);
  }, [delivery]);

  const findEquipment = async () => {
    if (!isFirebaseConfigured) return;
    setEngine({ phase: "searching" });
    setDelivery(null);

    const destination = SITES.find((s) => s.id === reqForm.siteId);

    const liveEquipment = equipmentFeed.status === "live" && equipmentFeed.data ? equipmentFeed.data : {};
    const idleCandidates = Object.entries(liveEquipment)
      .map(([id, eq]) => ({ id, ...eq }))
      .filter((eq) => eq.status === "idle" && eq.customer == null && eq.type === reqForm.equipmentType && eq.lat != null && eq.lng != null)
      .map((eq) => ({ ...eq, source: "fleet", distance: distanceKm(destination, { lat: eq.lat, lng: eq.lng }) }))
      .sort((a, b) => a.distance - b.distance);

    let candidate = idleCandidates[0] ?? null;

    if (!candidate) {
      const liveStorage = storageFeed.status === "live" && storageFeed.data ? storageFeed.data : {};
      const yardCandidates = Object.entries(liveStorage)
        .map(([id, eq]) => ({ id, ...eq }))
        .filter((eq) => eq.status === "ready" && eq.type === reqForm.equipmentType && eq.lat != null && eq.lng != null)
        .map((eq) => ({ ...eq, source: "mainStorage", distance: distanceKm(destination, { lat: eq.lat, lng: eq.lng }) }))
        .sort((a, b) => a.distance - b.distance);
      candidate = yardCandidates[0] ?? null;
    }

    const requestId = await createRedeploymentRequest({
      requestedBy: companyName,
      equipmentType: reqForm.equipmentType,
      requestedSite: reqForm.siteId,
      requestLat: destination.lat,
      requestLng: destination.lng,
    });

    if (!candidate) {
      setEngine({ phase: "none", requestId });
      return;
    }
    setEngine({ phase: "found", requestId, candidate, etaMinutes: estimateEtaMinutes(candidate.distance) });
  };

  const deploy = async () => {
    setEngine((s) => ({ ...s, phase: "deploying" }));
    try {
      await assignRedeploymentRequest(engine.requestId, engine.candidate.id);
      pushToast(`🚚 ${engine.candidate.id} dispatched to ${SITES.find((s) => s.id === reqForm.siteId)?.name}\nETA: ${formatEta(engine.etaMinutes)}`);
      setEngine((s) => ({ ...s, phase: "deployed" }));
      setDelivery({ etaMinutes: engine.etaMinutes, elapsedMinutes: 0, equipmentLabel: `${engine.candidate.id} (${engine.candidate.type})` });
    } catch {
      pushToast(`⚠️ Could not confirm dispatch for ${engine.candidate.id} — try again.`);
      setEngine((s) => ({ ...s, phase: "found" }));
    }
  };

  const deliveryPct = delivery ? Math.round((delivery.elapsedMinutes / delivery.etaMinutes) * 100) : 0;
  const delivered = delivery && delivery.elapsedMinutes >= delivery.etaMinutes;

  return (
    <div className="min-h-screen bg-[#F3F3EF]">
      <ToastStack toasts={toasts} />

      <header className="sticky top-0 z-40 flex flex-wrap items-center gap-4 border-b px-5 py-3" style={{ background: "#FFFFFF", borderColor: "#E4E1D8" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#FFCD11", color: "#1A1A1A" }}>
            <Gauge size={20} />
          </div>
          <div>
            <p className="font-extrabold text-[#1A1A1A] leading-tight">CatArenT</p>
            <p className="text-[11px] text-[#8A867A] leading-tight">Company Portal</p>
          </div>
        </div>
        <div className="ml-2 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: "#F0EEE7", color: "#4A473F" }}>
          {companyName} Co.
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
        <SectionLabel>My Rented Equipment</SectionLabel>

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
                  style={overdue ? { background: "#FF444414", color: "#E23B3B" } : { background: "#00C85114", color: "#00954A" }}
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
                  <span className={eq.temperature > 85 ? "text-[#FF4444] font-bold" : "text-[#1A1A1A] font-semibold"}>{eq.temperature}°C</span>
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
          {rows.length === 0 && (
            <p className="text-sm text-[#8A867A] italic col-span-full text-center py-8">No equipment currently rented to {companyName}.</p>
          )}
        </div>

        <div className="rounded-2xl border p-5 sm:p-6" style={{ background: "#FFFFFF", borderColor: "#E4E1D8", boxShadow: "0 1px 2px rgba(26,26,26,0.04)" }}>
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-4">Operator Check-In / Check-Out System</h2>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
            <form onSubmit={submitCheck} className="flex flex-col gap-4">
              <Field label="Equipment">
                <select
                  value={checkForm.equipmentId}
                  onChange={(e) => setCheckForm((f) => ({ ...f, equipmentId: e.target.value }))}
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
                  value={checkForm.operatorId}
                  onChange={(e) => setCheckForm((f) => ({ ...f, operatorId: e.target.value }))}
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
                      onClick={() => setCheckForm((f) => ({ ...f, action: a }))}
                      className="flex-1 py-2.5 text-sm font-semibold transition-colors"
                      style={checkForm.action === a ? { background: "#FFCD11", color: "#1A1A1A" } : { background: "#FAFAF8", color: "#8A867A" }}
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
                <QrCode value={`${checkForm.equipmentId}-${qrTimestamp}`} size={120} />
              </div>
              <p className="flex items-center gap-1.5 text-[11px] text-[#6E6B62] font-mono text-center break-all">
                <QrIcon size={12} className="shrink-0" />
                QR: {checkForm.equipmentId}-{qrTimestamp}
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

        <SectionLabel>Rental Extension</SectionLabel>

        <RentalExtensionBoard companyName={companyName} myEquipment={myEquipment} pushToast={pushToast} />

        <SectionLabel>Request New Equipment</SectionLabel>

        {!isFirebaseConfigured && (
          <div className="rounded-2xl border p-4 flex items-center gap-3" style={{ background: "#FFF9E8", borderColor: "#FFCD1155" }}>
            <WifiOff size={18} className="text-[#8A6A00] shrink-0" />
            <p className="text-xs text-[#4A473F]">
              Firebase isn't connected, so the Intelligent Redeployment Engine can't see live equipment/mainStorage GPS data.
            </p>
          </div>
        )}

        <div className="rounded-2xl border p-5 sm:p-6" style={{ background: "#FFFFFF", borderColor: "#E4E1D8", boxShadow: "0 1px 2px rgba(26,26,26,0.04)" }}>
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-1">Request Equipment</h2>
          <p className="text-xs text-[#8A867A] mb-4">Intelligent Redeployment Engine — finds the nearest available machine by GPS.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#6E6B62]">Equipment Type</span>
              <select
                value={reqForm.equipmentType}
                onChange={(e) => setReqForm((f) => ({ ...f, equipmentType: e.target.value }))}
                className="rounded-lg border px-3 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-[#FFCD11]"
                style={{ background: "#FAFAF8", borderColor: "#E4E1D8" }}
              >
                {EQUIPMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#6E6B62]">Destination Site</span>
              <select
                value={reqForm.siteId}
                onChange={(e) => setReqForm((f) => ({ ...f, siteId: e.target.value }))}
                className="rounded-lg border px-3 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-[#FFCD11]"
                style={{ background: "#FAFAF8", borderColor: "#E4E1D8" }}
              >
                {SITES.map((s) => <option key={s.id} value={s.id}>{s.id} — {s.name}</option>)}
              </select>
            </label>
          </div>

          <button
            onClick={findEquipment}
            disabled={!isFirebaseConfigured || engine.phase === "searching"}
            className="w-full mt-5 flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold text-sm bg-[#FFCD11] text-[#1A1A1A] hover:brightness-95 transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            <Send size={16} />
            {engine.phase === "searching" ? "Searching fleet…" : "Find Nearest Machine"}
          </button>
        </div>

        {engine.phase === "found" && (
          <div className="rounded-2xl border p-5 sm:p-6 animate-fade-in-up" style={{ background: "#FFFFFF", borderColor: "#E4E1D8", boxShadow: "0 1px 2px rgba(26,26,26,0.04)" }}>
            <div className="flex items-center gap-2 mb-4">
              <Truck size={18} className="text-[#8A6A00]" />
              <h3 className="text-base font-bold text-[#1A1A1A]">
                {engine.candidate.source === "fleet" ? "Nearest Idle Machine" : "Sourced from Main Storage Yard"}
              </h3>
            </div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-2xl font-extrabold text-[#1A1A1A]">{engine.candidate.id}</p>
                <p className="text-sm text-[#6E6B62]">{engine.candidate.type} · {engine.candidate.location ?? engine.candidate.source}</p>
              </div>
              <span
                className="text-sm font-bold rounded-full px-3 py-1"
                style={{ background: `${STATUS_COLORS[engine.candidate.healthClass] ?? "#00C851"}18`, color: STATUS_COLORS[engine.candidate.healthClass] ?? "#00C851" }}
              >
                {engine.candidate.healthClass ?? "Healthy"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Stat icon={MapPin} label="Distance" value={`${engine.candidate.distance.toFixed(1)} km`} />
              <Stat icon={Rocket} label="ETA" value={formatEta(engine.etaMinutes)} />
              <Stat icon={FuelIcon} label="Fuel Level" value={`${engine.candidate.fuelLevel ?? "—"}%`} />
              <Stat icon={Truck} label="Source" value={engine.candidate.source === "fleet" ? "Active Fleet" : MAIN_YARD.name} />
            </div>
            <button
              onClick={deploy}
              disabled={engine.phase === "deploying"}
              className="w-full mt-5 flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold text-sm bg-[#1A1A1A] text-[#FFCD11] hover:brightness-125 transition hover:-translate-y-0.5"
            >
              <Rocket size={16} />
              {engine.phase === "deploying" ? "Dispatching…" : "Deploy"}
            </button>
          </div>
        )}

        {engine.phase === "none" && (
          <div className="rounded-2xl border p-5 text-center text-sm text-[#6E6B62] animate-fade-in-up" style={{ background: "#FFFFFF", borderColor: "#E4E1D8" }}>
            No idle {reqForm.equipmentType.toLowerCase()} nearby and none ready in the storage yard right now.
          </div>
        )}

        {engine.phase === "deployed" && delivery && (
          <div className="rounded-2xl border p-5 sm:p-6 animate-fade-in-up text-center" style={{ background: "#FFFFFF", borderColor: "#E4E1D8", boxShadow: "0 1px 2px rgba(26,26,26,0.04)" }}>
            {delivered ? (
              <>
                <CheckCircle2 size={40} className="text-[#00954A] mx-auto animate-pop-in" />
                <p className="text-lg font-bold text-[#1A1A1A] mt-2">Delivered</p>
                <p className="text-sm text-[#6E6B62]">{delivery.equipmentLabel} has arrived at {SITES.find((s) => s.id === reqForm.siteId)?.name}.</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-[#1A1A1A] mb-1">Tracking Delivery — {delivery.equipmentLabel}</p>
                <p className="text-xs text-[#8A867A] mb-3">{delivery.elapsedMinutes} / {delivery.etaMinutes} min elapsed</p>
                <div className="w-full rounded-full overflow-hidden" style={{ height: 10, background: "#EFEDE5" }}>
                  <div className="h-full rounded-full transition-all duration-1000 ease-linear" style={{ width: `${deliveryPct}%`, background: "#FFCD11" }} />
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3 -mb-2">
      <h2 className="text-xs font-bold text-[#6E6B62] uppercase tracking-wide whitespace-nowrap">{children}</h2>
      <div className="h-px flex-1" style={{ background: "#E4E1D8" }} />
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

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border p-3 flex items-center gap-2.5" style={{ background: "#FAFAF8", borderColor: "#EFEDE5" }}>
      <Icon size={16} className="text-[#8A6A00] shrink-0" />
      <div>
        <p className="text-[10px] text-[#8A867A] uppercase tracking-wide">{label}</p>
        <p className="text-sm font-bold text-[#1A1A1A]">{value}</p>
      </div>
    </div>
  );
}
