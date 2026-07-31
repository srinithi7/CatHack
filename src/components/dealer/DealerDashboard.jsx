import { useEffect, useMemo, useRef, useState } from "react";
import { Gauge, Bell, LogOut } from "lucide-react";
import { Clock, ToastStack, useToasts } from "../ui";
import { equipmentData } from "../../data/equipment";
import { calcHealthScore, calcMaintenance, fleetSummary, MAINTENANCE_COLORS } from "../../data/algorithms";
import { useFleetPredictions } from "../../hooks/useFleetPredictions";
import SummaryCards from "./SummaryCards";
import PredictiveMaintenancePanel from "./PredictiveMaintenancePanel";
import EquipmentTable from "./EquipmentTable";
import AlertCenter from "./AlertCenter";
import ChatbotWidget from "./Chatbot";
import ChartsRow from "./ChartsRow";
import BottomStats from "./BottomStats";
import DemandPlanner from "./DemandPlanner";
import RentalCompanies from "./RentalCompanies";
import RedeploymentRequests from "./RedeploymentRequests";
import ExtensionRequests from "./ExtensionRequests";
import { useEquipmentList, useAllSensorData, useAllMlPredictions } from "../../firebase/hooks";
import FleetMap from "../FleetMap";

function mlMaintenanceToPanelShape(mlResult) {
  const { tier, hoursToFailure, failureProbability, maintenanceDue, healthStatus } = mlResult;
  let level = "normal";
  let label = "Next 15 Days";
  if (tier === "PM1") {
    level = "critical";
    label = "PM1 · Critical";
  } else if (tier === "PM2" || failureProbability >= 30) {
    // tier_model rarely lands on PM2 for this fleet's feature ranges — a
    // "None" tier with a meaningfully elevated failure probability still
    // deserves a Warning bucket rather than being lumped in with Healthy.
    level = "warning";
    label = tier === "PM2" ? "PM2 · Warning" : "Elevated Risk · Warning";
  }
  const hoursText = hoursToFailure <= 24 ? "within 24 hours" : `in ~${Math.round(hoursToFailure)} hrs`;
  const reason = maintenanceDue
    ? `Random Forest Regressor predicts service due ${hoursText} — ${failureProbability}% failure probability. Status: ${healthStatus}.`
    : `No service due — ~${Math.round(hoursToFailure)} hrs to failure, ${failureProbability}% failure probability. Status: ${healthStatus}.`;
  return { level, label, color: MAINTENANCE_COLORS[level], reasons: [reason] };
}

export default function DealerDashboard({ onLogout }) {
  const [now] = useState(() => new Date());
  const [checkedIn, setCheckedIn] = useState({});
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);
  const { toasts, pushToast } = useToasts();
  const ml = useFleetPredictions();

  const summary = useMemo(() => fleetSummary(now), [now]);

  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen]);

  const rows = useMemo(
    () =>
      equipmentData.map((eq) => ({
        eq,
        health: calcHealthScore(eq),
        maintenance: calcMaintenance(eq),
      })),
    []
  );

  const maintenanceRows = useMemo(
    () =>
      rows.map(({ eq, maintenance }) => {
        const mlResult = ml.status === "live" ? ml.byId[eq.id]?.maintenance : null;
        return { equipment: eq, ...(mlResult ? mlMaintenanceToPanelShape(mlResult) : maintenance) };
      }),
    [rows, ml]
  );

  // This dealer's scope map — single-dealer network today, so "this dealer's
  // equipment" is the full live equipment collection; filters by dealer once
  // more than one dealer is onboarded.
  const liveEquipment = useEquipmentList();
  const liveSensors = useAllSensorData();
  const liveMlPredictions = useAllMlPredictions();
  const mapPoints = useMemo(() => {
    if (liveEquipment.status !== "live" || !liveEquipment.data) return [];
    const sensors = liveSensors.status === "live" ? liveSensors.data ?? {} : {};
    const predictions = liveMlPredictions.status === "live" ? liveMlPredictions.data ?? {} : {};
    return Object.entries(liveEquipment.data).map(([id, eq]) => ({
      id,
      ...eq,
      healthClass: predictions[id]?.healthClass,
      fuelLevel: sensors[id]?.latest?.fuelLevel,
      rfidStatus: sensors[id]?.latest?.rfidStatus,
    }));
  }, [liveEquipment.status, liveEquipment.data, liveSensors.status, liveSensors.data, liveMlPredictions.status, liveMlPredictions.data]);

  const mlAnomalies = useMemo(() => {
    if (ml.status !== "live") return [];
    return rows
      .map(({ eq }) => ({ eq, anomaly: ml.byId[eq.id]?.anomaly }))
      .filter((r) => r.anomaly?.isAnomaly);
  }, [rows, ml]);

  // RC522 says nobody's authenticated on a machine the dataset says is
  // actively running — that's a live safety signal, not the rule-based
  // (operator===null) Dead Man Alert already in `summary.anomalies`.
  const rfidDeadManAlerts = useMemo(() => {
    if (liveSensors.status !== "live" || !liveSensors.data) return [];
    return rows
      .map(({ eq }) => eq)
      .filter((eq) => eq.engineHours > 0 && liveSensors.data[eq.id]?.latest?.rfidStatus === "none");
  }, [rows, liveSensors.status, liveSensors.data]);

  const handleToggleCheck = (id, isCheckedIn) => {
    setCheckedIn((prev) => ({ ...prev, [id]: !isCheckedIn }));
    const time = new Date().toLocaleTimeString("en-IN", { hour12: true });
    pushToast(
      isCheckedIn
        ? `✅ ${id} checked out successfully\nTime: ${time}`
        : `✅ ${id} checked in successfully\nTime: ${time}`
    );
  };

  return (
    <div className="min-h-screen bg-[#F3F3EF]">
      <ToastStack toasts={toasts} />

      <header
        className="sticky top-0 z-40 flex items-center gap-4 border-b px-5 py-3"
        style={{ background: "#FFFFFF", borderColor: "#E4E1D8" }}
      >
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#FFCD11", color: "#1A1A1A" }}>
            <Gauge size={20} />
          </div>
          <div>
            <p className="font-extrabold text-[#1A1A1A] leading-tight">CatArenT</p>
            <p className="text-[11px] text-[#8A867A] leading-tight">Dealer Dashboard</p>
          </div>
        </div>

        <div className="flex-1 flex justify-center">
          <Clock />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen((o) => !o)}
              className="relative p-2 rounded-lg hover:bg-black/5 transition-colors"
              aria-label="Notifications"
              aria-expanded={notifOpen}
            >
              <Bell size={20} className="text-[#6E6B62]" />
              {summary.anomalies.length > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF4444] text-white text-[10px] font-bold flex items-center justify-center animate-pulse-dot"
                >
                  {summary.anomalies.length}
                </span>
              )}
            </button>
            {notifOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border z-[1100] animate-fade-in-up"
                style={{ background: "#FFFFFF", borderColor: "#E4E1D8", boxShadow: "0 12px 32px rgba(26,26,26,0.16)" }}
              >
                <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "#EFEDE5" }}>
                  <p className="text-sm font-bold text-[#1A1A1A]">Notifications</p>
                  <span className="text-xs font-semibold text-[#FF4444]">{summary.anomalies.length} active</span>
                </div>
                {summary.anomalies.length === 0 ? (
                  <p className="text-sm text-[#8A867A] text-center py-8">No anomalies — fleet is healthy.</p>
                ) : (
                  <div className="flex flex-col">
                    {summary.anomalies.map((a) => (
                      <div key={a.key} className="px-4 py-3 border-b last:border-b-0" style={{ borderColor: "#F5F4EF" }}>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[#1A1A1A]">{a.type}</p>
                          <span className="ml-auto text-xs font-semibold text-[#8A6A00]">{a.equipmentId}</span>
                        </div>
                        <p className="text-xs text-[#6E6B62] mt-0.5 leading-snug">{a.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold text-[#6E6B62] hover:text-[#1A1A1A] hover:border-[#FFCD11] transition-colors"
            style={{ borderColor: "#E4E1D8" }}
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4 items-stretch">
          <SummaryCards summary={summary} />
          <FleetMap
            title="Your Fleet — Live Locations"
            height={400}
            center={[11.018, 76.956]}
            zoom={13}
            equipment={mapPoints}
            emptyHint={liveEquipment.status === "live" ? "No equipment with GPS coordinates yet." : "Connect Firebase to plot live equipment locations."}
            renderPopup={(eq) => (
              <div className="text-xs leading-relaxed">
                <p className="font-bold text-sm mb-1">{eq.id}</p>
                <p><b>Type:</b> {eq.type ?? "—"}</p>
                <p><b>Company rented to:</b> {eq.renter ?? "Unassigned"}</p>
                <p><b>Fuel Level:</b> {eq.fuelLevel != null ? `${eq.fuelLevel}%` : "—"}</p>
                <p><b>RFID Status:</b> {eq.rfidStatus ?? "—"}</p>
              </div>
            )}
          />
        </div>

        <PredictiveMaintenancePanel maintenance={maintenanceRows} mlStatus={ml.status} />

        <EquipmentTable rows={rows} checkedIn={checkedIn} onToggleCheck={handleToggleCheck} />

        <RentalCompanies rows={rows} />

        <AlertCenter anomalies={summary.anomalies} mlAnomalies={mlAnomalies} mlStatus={ml.status} rfidDeadManAlerts={rfidDeadManAlerts} />

        <RedeploymentRequests />

        <ExtensionRequests pushToast={pushToast} />

        <ChartsRow
          rows={rows}
          healthyCount={summary.healthyCount}
          atRiskCount={summary.atRiskCount}
          criticalCount={summary.criticalCount}
        />

        <DemandPlanner />

        <BottomStats rows={rows} totalIdleHours={summary.totalIdleHours} revenueLoss={summary.revenueLoss} pushToast={pushToast} />
      </main>

      <ChatbotWidget />
    </div>
  );
}
