import { useMemo, useState } from "react";
import { Gauge, Bell, LogOut } from "lucide-react";
import { Clock, ToastStack, useToasts } from "../ui";
import { equipmentData } from "../../data/equipment";
import { calcHealthScore, calcMaintenance, fleetSummary } from "../../data/algorithms";
import SummaryCards from "./SummaryCards";
import PredictiveMaintenancePanel from "./PredictiveMaintenancePanel";
import EquipmentTable from "./EquipmentTable";
import AlertCenter from "./AlertCenter";
import ChatbotWidget from "./Chatbot";
import ChartsRow from "./ChartsRow";
import BottomStats from "./BottomStats";

export default function DealerDashboard({ onLogout }) {
  const [now] = useState(() => new Date());
  const [checkedIn, setCheckedIn] = useState({});
  const { toasts, pushToast } = useToasts();

  const summary = useMemo(() => fleetSummary(now), [now]);

  const rows = useMemo(
    () =>
      equipmentData.map((eq) => ({
        eq,
        health: calcHealthScore(eq),
        maintenance: calcMaintenance(eq),
      })),
    []
  );

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
            <p className="font-extrabold text-[#1A1A1A] leading-tight">[SYSTEM_NAME]</p>
            <p className="text-[11px] text-[#8A867A] leading-tight">Dealer Dashboard</p>
          </div>
        </div>

        <div className="flex-1 flex justify-center">
          <Clock />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button className="relative p-2 rounded-lg hover:bg-black/5 transition-colors" aria-label="Notifications">
            <Bell size={20} className="text-[#6E6B62]" />
            {summary.anomalies.length > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF4444] text-white text-[10px] font-bold flex items-center justify-center animate-pulse-dot"
              >
                {summary.anomalies.length}
              </span>
            )}
          </button>
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
        <SummaryCards summary={summary} />

        <PredictiveMaintenancePanel maintenance={summary.maintenance} />

        <EquipmentTable rows={rows} checkedIn={checkedIn} onToggleCheck={handleToggleCheck} />

        <AlertCenter anomalies={summary.anomalies} />

        <ChartsRow
          rows={rows}
          healthyCount={summary.healthyCount}
          atRiskCount={summary.atRiskCount}
          criticalCount={summary.criticalCount}
        />

        <BottomStats rows={rows} totalIdleHours={summary.totalIdleHours} revenueLoss={summary.revenueLoss} />
      </main>

      <ChatbotWidget />
    </div>
  );
}
