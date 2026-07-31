import { Zap, MapPin } from "lucide-react";
import { Card, ProgressBar } from "../ui";
import { SITES, equipmentBySite } from "../../data/equipment";

export default function BottomStats({ rows, totalIdleHours, revenueLoss, pushToast }) {
  const maxSiteCount = Math.max(1, ...SITES.map((s) => equipmentBySite(s.id).length));

  const optimizeNow = () => {
    const topOffenders = [...rows]
      .sort((a, b) => b.eq.idleHours - a.eq.idleHours)
      .slice(0, 3)
      .map((r) => `${r.eq.id} (${r.eq.idleHours}h idle)`)
      .join(", ");
    pushToast?.(
      `🎯 Optimization plan generated\nTop idle offenders: ${topOffenders}\nRecommend redeploying to active sites to recover ₹${revenueLoss.toLocaleString("en-IN")}.`
    );
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <Card className="p-5 sm:p-6">
        <h3 className="text-sm font-bold text-[#1A1A1A] mb-4">Revenue Loss Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-[#6E6B62] border-b" style={{ borderColor: "#E4E1D8" }}>
                <th className="py-2 font-semibold">Equipment ID</th>
                <th className="py-2 font-semibold">Idle Hours</th>
                <th className="py-2 font-semibold text-right">Loss (₹)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ eq }) => (
                <tr key={eq.id} className="border-b hover:bg-black/[0.02] transition-colors" style={{ borderColor: "#EFEDE5" }}>
                  <td className="py-2 font-semibold text-[#8A6A00]">{eq.id}</td>
                  <td className="py-2 text-[#1A1A1A]">{eq.idleHours}h</td>
                  <td className="py-2 text-right text-[#1A1A1A]">₹{(eq.idleHours * 500).toLocaleString("en-IN")}</td>
                </tr>
              ))}
              <tr>
                <td className="py-3 font-bold text-[#1A1A1A]">Total</td>
                <td className="py-3 font-bold text-[#1A1A1A]">{totalIdleHours}h</td>
                <td className="py-3 text-right font-bold text-[#1A1A1A]">₹{revenueLoss.toLocaleString("en-IN")}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <button
          onClick={optimizeNow}
          className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold text-sm bg-[#FFCD11] text-[#1A1A1A] hover:brightness-95 transition hover:-translate-y-0.5"
        >
          <Zap size={16} />
          Optimize now to recover ₹{revenueLoss.toLocaleString("en-IN")}
        </button>
      </Card>

      <Card className="p-5 sm:p-6">
        <h3 className="text-sm font-bold text-[#1A1A1A] mb-4">Site Utilization</h3>
        <div className="flex flex-col gap-3.5">
          {SITES.map((site) => {
            const count = equipmentBySite(site.id).length;
            const empty = count === 0;
            return (
              <div key={site.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5 text-sm text-[#1A1A1A]">
                    <MapPin size={14} className={empty ? "text-[#FF4444]" : "text-[#8A867A]"} />
                    {site.id} — {site.name}
                  </span>
                  <span className={`text-xs font-semibold ${empty ? "text-[#FF4444]" : "text-[#6E6B62]"}`}>
                    {empty ? "No equipment" : `${count} unit${count > 1 ? "s" : ""}`}
                  </span>
                </div>
                {empty ? (
                  <div
                    className="w-full rounded-full overflow-hidden flex items-center px-2"
                    style={{ height: 8, background: "#FF444414", border: "1px solid #FF444455" }}
                  >
                    <div className="w-full h-[2px] rounded-full" style={{ background: "repeating-linear-gradient(90deg, #FF4444 0 6px, transparent 6px 12px)" }} />
                  </div>
                ) : (
                  <ProgressBar value={count} max={maxSiteCount} color="#FFCD11" />
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
