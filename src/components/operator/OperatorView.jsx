import { useEffect, useRef, useState } from "react";
import { Gauge, Fuel, Thermometer, Timer, BatteryFull, KeyRound, CheckSquare, Square, LogOut } from "lucide-react";
import { equipmentData } from "../../data/equipment";
import { calcHealthScore } from "../../data/algorithms";

const DEFAULT_OPERATOR = "OP101";
const eq = equipmentData.find((e) => e.id === "EQX1001");
const health = calcHealthScore(eq);

const CHECKLIST_ITEMS = [
  "Seatbelt fastened",
  "Area clear of personnel",
  "Fuel level checked",
  "All lights functional",
];

function pad(n) {
  return String(n).padStart(2, "0");
}

export default function OperatorView({ onLogout }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const [session, setSession] = useState({ phase: "idle", startedAt: null, elapsed: 0, endedSummary: null });
  const timerRef = useRef(null);

  const startScan = () => {
    setSession({ phase: "scanning", startedAt: null, elapsed: 0, endedSummary: null });
    setTimeout(() => {
      setSession({ phase: "active", startedAt: Date.now(), elapsed: 0, endedSummary: null });
    }, 2000);
  };

  useEffect(() => {
    if (session.phase !== "active") return;
    timerRef.current = setInterval(() => {
      setSession((s) => (s.phase === "active" ? { ...s, elapsed: Math.floor((Date.now() - s.startedAt) / 1000) } : s));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [session.phase, session.startedAt]);

  const endSession = () => {
    const durationSec = session.elapsed;
    const minutes = (durationSec / 60).toFixed(1);
    const engineHoursLogged = (durationSec / 3600).toFixed(2);
    setSession({ phase: "ended", startedAt: null, elapsed: 0, endedSummary: { minutes, engineHoursLogged } });
  };

  const [checklist, setChecklist] = useState(CHECKLIST_ITEMS.map(() => false));
  const [checklistSubmitted, setChecklistSubmitted] = useState(false);
  const allChecked = checklist.every(Boolean);

  const hh = Math.floor(session.elapsed / 3600);
  const mm = Math.floor((session.elapsed % 3600) / 60);
  const ss = session.elapsed % 60;

  return (
    <div className="min-h-screen bg-[#F3F3EF] pb-10">
      <header className="flex items-center gap-3 border-b px-4 py-3" style={{ background: "#FFFFFF", borderColor: "#E4E1D8" }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#FFCD11", color: "#1A1A1A" }}>
          <Gauge size={18} />
        </div>
        <div className="min-w-0">
          <p className="font-extrabold text-[#1A1A1A] text-sm leading-tight">[SYSTEM_NAME]</p>
          <p className="text-[11px] text-[#8A867A] leading-tight truncate">Welcome, Operator {DEFAULT_OPERATOR}</p>
        </div>
        <button
          onClick={onLogout}
          className="ml-auto flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold text-[#6E6B62] hover:text-[#1A1A1A] hover:border-[#FFCD11] transition-colors shrink-0"
          style={{ borderColor: "#E4E1D8" }}
        >
          <LogOut size={12} />
          Logout
        </button>
      </header>

      <div className="px-4 py-2 text-center text-xs text-[#8A867A]">
        {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} ·{" "}
        {now.toLocaleTimeString("en-IN", { hour12: true })}
      </div>

      <main className="max-w-md mx-auto px-4 flex flex-col gap-5 mt-2">
        {/* My Machine Card */}
        <div className="rounded-2xl border p-6 text-center animate-fade-in-up" style={{ background: "#FFFFFF", borderColor: "#E4E1D8", boxShadow: "0 1px 2px rgba(26,26,26,0.04)" }}>
          <p className="text-4xl font-extrabold text-[#1A1A1A] tracking-tight">{eq.id}</p>
          <p className="text-sm text-[#6E6B62] mt-1">{eq.type}</p>
          <p className="text-xs text-[#8A867A] mt-0.5">{eq.site} — {eq.location}</p>

          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00C851] animate-pulse-dot" />
            <span className="px-3 py-1 rounded-full text-sm font-extrabold" style={{ background: "#00C85116", color: "#00954A" }}>
              ACTIVE
            </span>
          </div>

          <div className="mt-5">
            <p className="text-5xl font-extrabold animate-pop-in" style={{ color: health.color }}>{health.score}</p>
            <p className="text-xs text-[#8A867A] mt-1">Health Score — {health.status}</p>
          </div>
        </div>

        {/* Sensor Readings */}
        <div className="grid grid-cols-2 gap-3">
          <SensorCard icon={Fuel} label="Fuel Level" value={`${eq.fuelLevel}%`} color={eq.fuelLevel < 25 ? "#FF4444" : "#2196F3"} />
          <SensorCard icon={Thermometer} label="Temperature" value={`${eq.temperature}°C`} color={eq.temperature > 85 ? "#FF4444" : "#00954A"} />
          <SensorCard icon={Timer} label="Engine Hours" value={`${eq.engineHours} hrs today`} color="#C99A00" />
          <SensorCard icon={BatteryFull} label="Battery" value={`${eq.batteryVoltage}V`} color={eq.batteryVoltage < 11.6 ? "#FF4444" : "#00954A"} />
        </div>

        {/* RFID Session Panel */}
        <div className="rounded-2xl border p-6 flex flex-col items-center gap-4" style={{ background: "#FFFFFF", borderColor: "#E4E1D8", boxShadow: "0 1px 2px rgba(26,26,26,0.04)" }}>
          {session.phase === "idle" && (
            <button
              onClick={startScan}
              className="w-full flex flex-col items-center justify-center gap-2 rounded-2xl py-8 text-lg font-extrabold bg-[#FFCD11] text-[#1A1A1A] hover:brightness-95 transition active:scale-[0.98]"
            >
              <KeyRound size={32} />
              🔑 SCAN RFID TO START SESSION
            </button>
          )}

          {session.phase === "scanning" && (
            <div className="w-full flex flex-col items-center justify-center gap-3 py-8">
              <div className="w-14 h-14 rounded-full border-4 border-[#E4E1D8] border-t-[#FFCD11] animate-spin-slow" />
              <p className="text-sm text-[#6E6B62]">Scanning RFID tag...</p>
            </div>
          )}

          {session.phase === "active" && (
            <>
              <div className="text-center animate-fade-in-up">
                <p className="text-[#00954A] font-bold text-lg">✅ Session Started</p>
                <p className="text-xs text-[#6E6B62] mt-1">Time: {new Date(session.startedAt).toLocaleTimeString("en-IN", { hour12: true })}</p>
                <p className="text-xs text-[#6E6B62]">Machine: {eq.id}</p>
              </div>
              <p className="font-mono text-4xl font-extrabold text-[#1A1A1A] tracking-widest">
                {pad(hh)}:{pad(mm)}:{pad(ss)}
              </p>
              <button
                onClick={endSession}
                className="w-full rounded-2xl py-4 text-base font-extrabold text-white transition active:scale-[0.98]"
                style={{ background: "#FF4444" }}
              >
                END SESSION
              </button>
            </>
          )}

          {session.phase === "ended" && (
            <div className="w-full flex flex-col items-center gap-3 animate-fade-in-up">
              <p className="text-[#1A1A1A] font-bold">Session ended</p>
              <p className="text-sm text-[#6E6B62]">Duration: {session.endedSummary.minutes} minutes</p>
              <p className="text-sm text-[#6E6B62]">Engine hours logged: {session.endedSummary.engineHoursLogged}</p>
              <button
                onClick={startScan}
                className="w-full rounded-2xl py-3 text-sm font-bold bg-[#FFCD11] text-[#1A1A1A] hover:brightness-95 transition"
              >
                Start New Session
              </button>
            </div>
          )}
        </div>

        {/* Safety Checklist */}
        <div className="rounded-2xl border p-6" style={{ background: "#FFFFFF", borderColor: "#E4E1D8", boxShadow: "0 1px 2px rgba(26,26,26,0.04)" }}>
          <h3 className="text-base font-bold text-[#1A1A1A] mb-4">Safety Checklist</h3>
          <div className="flex flex-col gap-3">
            {CHECKLIST_ITEMS.map((item, i) => (
              <button
                key={item}
                onClick={() => {
                  setChecklist((c) => c.map((v, idx) => (idx === i ? !v : v)));
                  setChecklistSubmitted(false);
                }}
                className="flex items-center gap-3 text-left rounded-lg border px-3 py-3 transition-colors"
                style={{ borderColor: checklist[i] ? "#00C85155" : "#E4E1D8", background: checklist[i] ? "#00C85110" : "#FAFAF8" }}
              >
                {checklist[i] ? <CheckSquare size={20} className="text-[#00954A] shrink-0" /> : <Square size={20} className="text-[#9A968D] shrink-0" />}
                <span className="text-sm text-[#1A1A1A]">{item}</span>
              </button>
            ))}
          </div>
          <button
            disabled={!allChecked}
            onClick={() => setChecklistSubmitted(true)}
            className="w-full mt-5 rounded-xl py-3 text-sm font-bold transition"
            style={
              allChecked
                ? { background: "#FFCD11", color: "#1A1A1A" }
                : { background: "#EFEDE5", color: "#AFACA2", cursor: "not-allowed" }
            }
          >
            Submit Checklist
          </button>
          {checklistSubmitted && (
            <p className="text-center text-xs text-[#00954A] font-semibold mt-3 animate-fade-in-up">
              ✅ Checklist submitted — cleared for operation.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

function SensorCard({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-2xl border p-4 flex flex-col items-center gap-1.5 text-center" style={{ background: "#FFFFFF", borderColor: "#E4E1D8", boxShadow: "0 1px 2px rgba(26,26,26,0.04)" }}>
      <Icon size={22} style={{ color }} />
      <p className="text-lg font-extrabold text-[#1A1A1A]">{value}</p>
      <p className="text-[11px] text-[#8A867A]">{label}</p>
    </div>
  );
}
