import { Truck, Activity, AlertTriangle, TrendingDown } from "lucide-react";
import { Card, IconCircle } from "../ui";

export default function SummaryCards({ summary }) {
  const cards = [
    {
      icon: Truck,
      color: "#C99A00",
      value: summary.totalFleet,
      label: "Total Equipment",
      subtext: "Across all sites",
    },
    {
      icon: Activity,
      color: "#00C851",
      value: summary.activeRentals,
      label: "Active Rentals",
      subtext: "Currently deployed",
    },
    {
      icon: AlertTriangle,
      color: "#FF4444",
      value: summary.anomalies.length,
      label: "Anomalies Detected",
      subtext: "Requires attention",
      pulse: true,
    },
    {
      icon: TrendingDown,
      color: "#2196F3",
      value: `₹${summary.revenueLoss.toLocaleString("en-IN")}`,
      label: "Est. Revenue Loss",
      subtext: "From idle equipment today",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((c, i) => (
        <Card
          key={c.label}
          className="p-5 flex items-start justify-between gap-4"
          delay={i * 80}
          style={{ borderColor: `${c.color}40` }}
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#6E6B62] mb-1">{c.label}</p>
            <p
              className={`text-2xl sm:text-3xl font-extrabold text-[#1A1A1A] leading-tight ${c.pulse ? "animate-pulse-dot" : ""}`}
              style={c.pulse ? { color: c.color } : undefined}
            >
              {c.value}
            </p>
            <p className="text-xs text-[#8A867A] mt-0.5">{c.subtext}</p>
          </div>
          <IconCircle icon={c.icon} color={c.color} />
        </Card>
      ))}
    </div>
  );
}
