import { useEffect, useMemo, useState } from "react";
import { Gauge, LogOut, Send, Truck, MapPin, Fuel as FuelIcon, Rocket, CheckCircle2, WifiOff } from "lucide-react";
import { useEquipmentList, useMainStorage, useUsers, createRedeploymentRequest, assignRedeploymentRequest } from "../../firebase/hooks";
import { isFirebaseConfigured } from "../../firebase/firebaseConfig";
import { SITES, MAIN_YARD, distanceKm, estimateEtaMinutes, formatEta } from "../../data/sites";
import { STATUS_COLORS } from "../../data/algorithms";
import { ToastStack, useToasts } from "../ui";

const EQUIPMENT_TYPES = ["Excavator", "Bulldozer", "Grader", "Crane", "Loader"];
const FALLBACK_CUSTOMER_NAME = "ABC Construction";

export default function CustomerPortal({ onLogout }) {
  const { toasts, pushToast } = useToasts();
  const equipmentFeed = useEquipmentList();
  const storageFeed = useMainStorage();
  const usersFeed = useUsers();

  const customerName = useMemo(() => {
    if (usersFeed.status === "live" && usersFeed.data) {
      const match = Object.values(usersFeed.data).find((u) => u.role === "customer");
      if (match?.name) return match.name;
    }
    return FALLBACK_CUSTOMER_NAME;
  }, [usersFeed.status, usersFeed.data]);

  const [form, setForm] = useState({ equipmentType: EQUIPMENT_TYPES[0], siteId: SITES[0].id });
  const [engine, setEngine] = useState({ phase: "idle" }); // idle | searching | found | none | deploying | deployed
  const [delivery, setDelivery] = useState(null); // { etaMinutes, elapsedMinutes, requestId, equipmentLabel }

  useEffect(() => {
    if (!delivery || delivery.elapsedMinutes >= delivery.etaMinutes) return;
    const t = setInterval(() => {
      setDelivery((d) => (d ? { ...d, elapsedMinutes: Math.min(d.etaMinutes, d.elapsedMinutes + 1) } : d));
    }, 1000); // 1 real second ≈ 1 simulated minute, so a ~1hr ETA plays out in ~1 minute
    return () => clearInterval(t);
  }, [delivery]);

  const findEquipment = async () => {
    if (!isFirebaseConfigured) return;
    setEngine({ phase: "searching" });
    setDelivery(null);

    const destination = SITES.find((s) => s.id === form.siteId);

    // Step 1 — idle equipment, unassigned to a customer, matching type, nearest by GPS.
    const liveEquipment = equipmentFeed.status === "live" && equipmentFeed.data ? equipmentFeed.data : {};
    const idleCandidates = Object.entries(liveEquipment)
      .map(([id, eq]) => ({ id, ...eq }))
      .filter((eq) => eq.status === "idle" && eq.customer == null && eq.type === form.equipmentType && eq.lat != null && eq.lng != null)
      .map((eq) => ({ ...eq, source: "fleet", distance: distanceKm(destination, { lat: eq.lat, lng: eq.lng }) }))
      .sort((a, b) => a.distance - b.distance);

    let candidate = idleCandidates[0] ?? null;

    // Step 2 — fall back to the main storage yard if nothing idle is nearby.
    if (!candidate) {
      const liveStorage = storageFeed.status === "live" && storageFeed.data ? storageFeed.data : {};
      const yardCandidates = Object.entries(liveStorage)
        .map(([id, eq]) => ({ id, ...eq }))
        .filter((eq) => eq.status === "ready" && eq.type === form.equipmentType && eq.lat != null && eq.lng != null)
        .map((eq) => ({ ...eq, source: "mainStorage", distance: distanceKm(destination, { lat: eq.lat, lng: eq.lng }) }))
        .sort((a, b) => a.distance - b.distance);
      candidate = yardCandidates[0] ?? null;
    }

    const requestId = await createRedeploymentRequest({
      requestedBy: customerName,
      equipmentType: form.equipmentType,
      requestedSite: form.siteId,
      requestLat: destination.lat,
      requestLng: destination.lng,
    });

    if (!candidate) {
      setEngine({ phase: "none", requestId });
      return;
    }

    const etaMinutes = estimateEtaMinutes(candidate.distance);
    setEngine({ phase: "found", requestId, candidate, etaMinutes });
  };

  const deploy = async () => {
    setEngine((s) => ({ ...s, phase: "deploying" }));
    try {
      await assignRedeploymentRequest(engine.requestId, engine.candidate.id);
      pushToast(`🚚 ${engine.candidate.id} dispatched to ${SITES.find((s) => s.id === form.siteId)?.name}\nETA: ${formatEta(engine.etaMinutes)}`);
      setEngine((s) => ({ ...s, phase: "deployed" }));
      setDelivery({ etaMinutes: engine.etaMinutes, elapsedMinutes: 0, requestId: engine.requestId, equipmentLabel: `${engine.candidate.id} (${engine.candidate.type})` });
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
            <p className="font-extrabold text-[#1A1A1A] leading-tight">[SYSTEM_NAME]</p>
            <p className="text-[11px] text-[#8A867A] leading-tight">Customer Portal</p>
          </div>
        </div>
        <div className="ml-2 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: "#F0EEE7", color: "#4A473F" }}>
          {customerName}
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

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {!isFirebaseConfigured && (
          <div className="rounded-2xl border p-4 flex items-center gap-3" style={{ background: "#FFF9E8", borderColor: "#FFCD1155" }}>
            <WifiOff size={18} className="text-[#8A6A00] shrink-0" />
            <p className="text-xs text-[#4A473F]">
              Firebase isn't connected yet, so the Intelligent Redeployment Engine can't see live equipment/mainStorage GPS data. Add real values to <code className="font-mono">.env</code> to enable equipment requests.
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
                value={form.equipmentType}
                onChange={(e) => setForm((f) => ({ ...f, equipmentType: e.target.value }))}
                className="rounded-lg border px-3 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-[#FFCD11]"
                style={{ background: "#FAFAF8", borderColor: "#E4E1D8" }}
              >
                {EQUIPMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#6E6B62]">Destination Site</span>
              <select
                value={form.siteId}
                onChange={(e) => setForm((f) => ({ ...f, siteId: e.target.value }))}
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
                style={{
                  background: `${STATUS_COLORS[engine.candidate.healthClass] ?? "#00C851"}18`,
                  color: STATUS_COLORS[engine.candidate.healthClass] ?? "#00C851",
                }}
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
            No idle {form.equipmentType.toLowerCase()} nearby and none ready in the storage yard right now.
          </div>
        )}

        {engine.phase === "deployed" && delivery && (
          <div className="rounded-2xl border p-5 sm:p-6 animate-fade-in-up text-center" style={{ background: "#FFFFFF", borderColor: "#E4E1D8", boxShadow: "0 1px 2px rgba(26,26,26,0.04)" }}>
            {delivered ? (
              <>
                <CheckCircle2 size={40} className="text-[#00954A] mx-auto animate-pop-in" />
                <p className="text-lg font-bold text-[#1A1A1A] mt-2">Delivered</p>
                <p className="text-sm text-[#6E6B62]">{delivery.equipmentLabel} has arrived at {SITES.find((s) => s.id === form.siteId)?.name}.</p>
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
