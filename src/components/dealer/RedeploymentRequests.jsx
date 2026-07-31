import { useMemo } from "react";
import { Rocket, Cpu, CircleDashed } from "lucide-react";
import { Card } from "../ui";
import { useFirebasePath } from "../../firebase/hooks";

const STATUS_STYLE = {
  pending: { color: "#FF8800", label: "Pending" },
  assigned: { color: "#00954A", label: "Assigned" },
};

export default function RedeploymentRequests() {
  const feed = useFirebasePath("redeploymentRequests");

  const requests = useMemo(() => {
    if (feed.status !== "live" || !feed.data) return [];
    return Object.entries(feed.data)
      .map(([id, r]) => ({ id, ...r }))
      .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
  }, [feed.status, feed.data]);

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <Rocket size={18} className="text-[#8A6A00]" />
        <h2 className="text-lg font-bold text-[#1A1A1A]">Redeployment Requests</h2>
        {feed.status === "live" ? (
          <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-2.5 py-1" style={{ background: "#00C85116", color: "#00954A" }}>
            <Cpu size={12} /> Live Firebase
          </span>
        ) : (
          <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-2.5 py-1" style={{ background: "#F0EEE7", color: "#8A867A" }}>
            <CircleDashed size={12} /> Firebase offline
          </span>
        )}
      </div>
      <p className="text-xs text-[#6E6B62] mb-4">Live equipment requests submitted by companies via the Intelligent Redeployment Engine.</p>

      {feed.status !== "live" && (
        <p className="text-sm text-[#8A867A] italic text-center py-6">No Firebase connection — connect to see live redeployment requests.</p>
      )}
      {feed.status === "live" && requests.length === 0 && (
        <p className="text-sm text-[#8A867A] italic text-center py-6">No redeployment requests yet.</p>
      )}
      {requests.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-[#6E6B62] border-b" style={{ borderColor: "#E4E1D8" }}>
                <th className="py-2 font-semibold">Requested By</th>
                <th className="py-2 font-semibold">Equipment Type</th>
                <th className="py-2 font-semibold">Site</th>
                <th className="py-2 font-semibold">Assigned</th>
                <th className="py-2 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => {
                const style = STATUS_STYLE[r.status] ?? STATUS_STYLE.pending;
                return (
                  <tr key={r.id} className="border-b" style={{ borderColor: "#EFEDE5" }}>
                    <td className="py-2 font-semibold text-[#1A1A1A]">{r.requestedBy}</td>
                    <td className="py-2 text-[#1A1A1A]">{r.equipmentType}</td>
                    <td className="py-2 text-[#1A1A1A]">{r.requestedSite}</td>
                    <td className="py-2 text-[#8A6A00] font-semibold">{r.assignedEquipment ?? "—"}</td>
                    <td className="py-2 text-right">
                      <span className="text-xs font-semibold rounded-full px-2 py-1" style={{ background: `${style.color}18`, color: style.color }}>
                        {style.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
