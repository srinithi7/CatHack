import { useMemo, useState } from "react";
import { CalendarClock, Check, X } from "lucide-react";
import { Card } from "../ui";
import { equipmentData } from "../../data/equipment";
import { useExtensionRequests, useEquipmentList, approveExtensionRequest, rejectExtensionRequest } from "../../firebase/hooks";

function typeFor(equipmentId, liveEquipment) {
  const local = equipmentData.find((eq) => eq.id === equipmentId);
  if (local) return local.type;
  return liveEquipment.status === "live" ? liveEquipment.data?.[equipmentId]?.type : undefined;
}

export default function ExtensionRequests({ pushToast }) {
  const requestsFeed = useExtensionRequests();
  const liveEquipment = useEquipmentList();
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busyId, setBusyId] = useState(null);

  const pending = useMemo(() => {
    if (requestsFeed.status !== "live" || !requestsFeed.data) return [];
    return Object.entries(requestsFeed.data)
      .map(([id, r]) => ({ id, ...r }))
      .filter((r) => r.status === "pending")
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }, [requestsFeed.status, requestsFeed.data]);

  const accept = async (r) => {
    setBusyId(r.id);
    try {
      await approveExtensionRequest(r.id, r.equipmentId, r.requestedNewDate);
      pushToast(`✅ Extension approved and communicated to ${r.companyName}`);
    } catch {
      pushToast("⚠️ Couldn't approve the extension — check your Firebase connection.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmReject = async () => {
    if (!rejectingId || !rejectReason.trim()) return;
    setBusyId(rejectingId);
    try {
      await rejectExtensionRequest(rejectingId, rejectReason.trim());
      pushToast("❌ Extension rejected");
      setRejectingId(null);
      setRejectReason("");
    } catch {
      pushToast("⚠️ Couldn't reject the extension — check your Firebase connection.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <CalendarClock size={18} className="text-[#8A6A00]" />
        <h2 className="text-lg font-bold text-[#1A1A1A]">Pending Extension Requests</h2>
        <span className="ml-auto text-xs font-bold rounded-full px-2.5 py-1" style={{ background: "#FFCD1122", color: "#8A6A00" }}>
          {pending.length} pending
        </span>
      </div>
      <p className="text-xs text-[#6E6B62] mb-4">Companies asking to push out a return date, awaiting your decision.</p>

      <div className="flex flex-col gap-3">
        {pending.map((r) => (
          <div key={r.id} className="rounded-xl border p-4" style={{ borderColor: "#E4E1D8", background: "#FAFAF8" }}>
            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
              <div>
                <p className="text-sm font-bold text-[#1A1A1A]">{r.companyName}</p>
                <p className="text-xs text-[#8A867A]">
                  <span className="font-semibold text-[#8A6A00]">{r.equipmentId}</span> — {typeFor(r.equipmentId, liveEquipment) ?? "Unknown type"}
                </p>
              </div>
              <span className="text-sm font-bold text-[#1A1A1A]">₹{r.estimatedCost?.toLocaleString("en-IN")}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-[#6E6B62] mb-2">
              <p>Current return: <span className="text-[#1A1A1A] font-medium">{r.currentCheckout}</span></p>
              <p>Requested extension: <span className="text-[#1A1A1A] font-medium">+{r.extensionDays} day{r.extensionDays === 1 ? "" : "s"}</span></p>
              <p className="col-span-2">New return date: <span className="text-[#1A1A1A] font-medium">{r.requestedNewDate}</span></p>
            </div>
            <p className="text-xs text-[#6E6B62] mb-3">Reason: <span className="text-[#1A1A1A]">{r.reason}</span></p>

            {rejectingId === r.id ? (
              <div className="flex flex-col gap-2">
                <input
                  autoFocus
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Reason for rejection…"
                  className="w-full rounded-lg border px-3 py-2 text-sm text-[#1A1A1A] placeholder:text-[#9A968D] outline-none focus:border-[#FF4444]"
                  style={{ background: "#FFFFFF", borderColor: "#E4E1D8" }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setRejectingId(null); setRejectReason(""); }}
                    className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold border text-[#6E6B62]"
                    style={{ borderColor: "#E4E1D8" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmReject}
                    disabled={!rejectReason.trim() || busyId === r.id}
                    className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                    style={{ background: "#FF4444" }}
                  >
                    Confirm Reject
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => accept(r)}
                  disabled={busyId === r.id}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  style={{ background: "#00C851" }}
                >
                  <Check size={14} /> Accept
                </button>
                <button
                  onClick={() => setRejectingId(r.id)}
                  disabled={busyId === r.id}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  style={{ background: "#FF4444" }}
                >
                  <X size={14} /> Reject
                </button>
              </div>
            )}
          </div>
        ))}
        {pending.length === 0 && (
          <p className="text-sm text-[#8A867A] italic text-center py-6">No pending extension requests.</p>
        )}
      </div>
    </Card>
  );
}
