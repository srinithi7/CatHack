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
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-2 gap-4">
      {cards.map((c, i) => (
        <Card
          key={c.label}
          className="p-5 flex flex-col items-center text-center gap-2"
          delay={i * 80}
          style={{ borderColor: `${c.color}40` }}
        >
          <IconCircle icon={c.icon} color={c.color} size={30} boxSize={60} />
          <p
            className={`text-2xl font-extrabold text-[#1A1A1A] leading-tight ${c.pulse ? "animate-pulse-dot" : ""}`}
            style={c.pulse ? { color: c.color } : undefined}
          >
            {c.value}
          </p>
          <div>
            <p className="text-sm font-semibold text-[#1A1A1A]">{c.label}</p>
            <p className="text-xs text-[#8A867A] mt-0.5">{c.subtext}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
