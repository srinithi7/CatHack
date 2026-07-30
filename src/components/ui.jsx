import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

export function ProgressBar({ value, max = 100, color = "#FFCD11", height = 8, trackColor = "#EFEDE5" }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      className="w-full rounded-full overflow-hidden"
      style={{ height, background: trackColor, border: "1px solid #E4E1D8" }}
    >
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

export function StatusBadge({ label, color, pulse = false }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: `${color}18`, color, border: `1px solid ${color}44` }}
    >
      {pulse && <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: color }} />}
      {label}
    </span>
  );
}

export function HealthBadge({ score, status, color, size = "md" }) {
  const sizes = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-2xl px-4 py-2",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold animate-pop-in ${sizes[size]}`}
      style={{ background: `${color}18`, color, border: `1px solid ${color}55` }}
    >
      {score}
      <span className="font-medium opacity-80" style={{ fontSize: "0.75em" }}>{status}</span>
    </span>
  );
}

export function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="hidden md:flex flex-col items-center leading-tight">
      <span className="font-mono text-lg font-semibold tracking-wider text-[#1A1A1A]">
        {now.toLocaleTimeString("en-IN", { hour12: true })}
      </span>
      <span className="text-[11px] text-[#8A867A]">
        {now.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </span>
    </div>
  );
}

let toastId = 0;
export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const pushToast = (message) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };
  return { toasts, pushToast };
}

export function ToastStack({ toasts }) {
  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 w-[min(92vw,380px)]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-slide-in-right flex items-start gap-3 rounded-xl border shadow-xl px-4 py-3"
          style={{ background: "#FFFFFF", borderColor: "#00C851", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
        >
          <CheckCircle2 size={20} className="text-[#00C851] shrink-0 mt-0.5" />
          <p className="text-sm whitespace-pre-line text-[#1A1A1A]">{t.message}</p>
        </div>
      ))}
    </div>
  );
}

export function Card({ children, className = "", style = {}, delay = 0 }) {
  return (
    <div
      className={`rounded-2xl border animate-fade-in-up ${className}`}
      style={{ background: "#FFFFFF", borderColor: "#E4E1D8", boxShadow: "0 1px 2px rgba(26,26,26,0.04)", animationDelay: `${delay}ms`, ...style }}
    >
      {children}
    </div>
  );
}

export function IconCircle({ icon: Icon, color, size = 20 }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg shrink-0"
      style={{ width: 40, height: 40, background: `${color}14`, color }}
    >
      <Icon size={size} />
    </div>
  );
}

export function CloseButton({ onClick, variant = "light" }) {
  return (
    <button
      onClick={onClick}
      className={
        variant === "dark"
          ? "p-1.5 rounded-full hover:bg-white/10 text-[#B8B5AC] hover:text-white transition-colors"
          : "p-1.5 rounded-full hover:bg-black/5 text-[#6E6B62] hover:text-[#1A1A1A] transition-colors"
      }
    >
      <X size={16} />
    </button>
  );
}
