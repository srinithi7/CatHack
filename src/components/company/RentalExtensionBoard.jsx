import { useMemo, useState } from "react";
import { CalendarClock, Send, X, CheckCircle2, XCircle, Clock3 } from "lucide-react";
import { isOverdue, overdueDays, remainingDays, addDaysToDateStr, dailyRateFor } from "../../data/equipment";
import { useExtensionRequests, createExtensionRequest } from "../../firebase/hooks";
import { isFirebaseConfigured } from "../../firebase/firebaseConfig";

export default function RentalExtensionBoard({ companyName, myEquipment, pushToast }) {
  const [modalEq, setModalEq] = useState(null);
  const [form, setForm] = useState({ extensionDays: 7, reason: "" });
  const [submitting, setSubmitting] = useState(false);
  const requestsFeed = useExtensionRequests();

  const myRequests = useMemo(() => {
    if (requestsFeed.status !== "live" || !requestsFeed.data) return [];
    return Object.entries(requestsFeed.data)
      .map(([id, r]) => ({ id, ...r }))
      .filter((r) => r.companyName === companyName)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [requestsFeed.status, requestsFeed.data, companyName]);

  const openModal = (eq) => {
    setModalEq(eq);
    setForm({ extensionDays: 7, reason: "" });
  };
  const closeModal = () => setModalEq(null);

  const dailyRate = modalEq ? dailyRateFor(modalEq.type) : 0;
  const estimatedCost = form.extensionDays * dailyRate;
  const requestedNewDate = modalEq ? addDaysToDateStr(modalEq.checkOut, form.extensionDays) : null;

  const submit = async (e) => {
    e.preventDefault();
    if (!modalEq || !form.reason.trim() || !isFirebaseConfigured) return;
    setSubmitting(true);
    try {
      await createExtensionRequest({
        equipmentId: modalEq.id,
        companyName,
        currentCheckout: modalEq.checkOut,
        extensionDays: form.extensionDays,
        requestedNewDate,
        estimatedCost,
        reason: form.reason.trim(),
      });
      pushToast(
        `✅ Extension request submitted!\nYour dealer will review and respond within 2 hours. Estimated cost: ₹${estimatedCost.toLocaleString("en-IN")}\nFinal cost subject to dealer approval.`
      );
      closeModal();
    } catch {
      pushToast("⚠️ Couldn't submit the extension request — check your Firebase connection.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl border p-5 sm:p-6" style={{ background: "#FFFFFF", borderColor: "#E4E1D8", boxShadow: "0 1px 2px rgba(26,26,26,0.04)" }}>
        <div className="flex items-center gap-2 mb-1">
          <CalendarClock size={18} className="text-[#8A6A00]" />
          <h2 className="text-lg font-bold text-[#1A1A1A]">Request Rental Extension</h2>
        </div>
        <p className="text-xs text-[#8A867A] mb-4">Ask your dealer to push out a return date before it's due.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {myEquipment.map((eq) => {
            const overdue = isOverdue(eq);
            const dayCount = overdue ? overdueDays(eq) : remainingDays(eq);
            return (
              <div key={eq.id} className="rounded-xl border p-4 flex flex-col gap-3" style={{ borderColor: "#E4E1D8", background: "#FAFAF8" }}>
                <div>
                  <p className="text-lg font-extrabold text-[#1A1A1A]">{eq.id}</p>
                  <p className="text-xs text-[#6E6B62]">{eq.type}</p>
                </div>
                <p className="text-xs text-[#8A867A]">Checkout: <span className="text-[#1A1A1A] font-medium">{eq.checkOut}</span></p>
                <span
                  className="text-xs font-bold rounded-full px-2.5 py-1 self-start"
                  style={overdue ? { background: "#FF444418", color: "#E23B3B" } : { background: "#00C85118", color: "#00954A" }}
                >
                  {overdue ? `${dayCount} day${dayCount === 1 ? "" : "s"} OVERDUE` : `${dayCount} day${dayCount === 1 ? "" : "s"} remaining`}
                </span>
                <button
                  onClick={() => openModal(eq)}
                  disabled={!isFirebaseConfigured}
                  className="mt-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold bg-[#FFCD11] text-[#1A1A1A] hover:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Request Extension
                </button>
              </div>
            );
          })}
          {myEquipment.length === 0 && (
            <p className="text-sm text-[#8A867A] italic col-span-full text-center py-6">No rented equipment to extend.</p>
          )}
        </div>
        {!isFirebaseConfigured && (
          <p className="text-xs text-[#8A867A] mt-3">Connect Firebase to submit extension requests.</p>
        )}
      </div>

      <div className="rounded-2xl border p-5 sm:p-6" style={{ background: "#FFFFFF", borderColor: "#E4E1D8", boxShadow: "0 1px 2px rgba(26,26,26,0.04)" }}>
        <div className="flex items-center gap-2 mb-1">
          <Clock3 size={18} className="text-[#8A6A00]" />
          <h2 className="text-lg font-bold text-[#1A1A1A]">My Extension Requests</h2>
        </div>
        <p className="text-xs text-[#8A867A] mb-4">Track the status of extensions you've requested.</p>

        <div className="flex flex-col gap-3">
          {myRequests.map((r) => (
            <div key={r.id} className="rounded-xl border p-4" style={{ borderColor: "#E4E1D8", background: "#FAFAF8" }}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold text-[#8A6A00]">{r.equipmentId}</p>
                <span className="text-xs text-[#6E6B62]">+{r.extensionDays} day{r.extensionDays === 1 ? "" : "s"}</span>
                <span className="text-xs text-[#6E6B62]">₹{r.estimatedCost?.toLocaleString("en-IN")}</span>
                <StatusBadge status={r.status} />
              </div>

              {r.status === "approved" && (
                <p className="text-xs text-[#00954A] mt-2 leading-relaxed">
                  Your extension has been approved! New return date: <b>{r.requestedNewDate}</b>. Please confirm final payment with your dealer directly.
                </p>
              )}
              {r.status === "rejected" && (
                <p className="text-xs text-[#E23B3B] mt-2 leading-relaxed">
                  Extension request was not approved. Reason: {r.rejectionReason || "Not specified"}. Contact your dealer for alternatives.
                </p>
              )}
            </div>
          ))}
          {myRequests.length === 0 && (
            <p className="text-sm text-[#8A867A] italic text-center py-6">No extension requests yet.</p>
          )}
        </div>
      </div>

      {modalEq && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4" style={{ background: "rgba(26,26,26,0.55)" }}>
          <div className="w-full max-w-md rounded-2xl border animate-pop-in" style={{ background: "#FFFFFF", borderColor: "#E4E1D8", boxShadow: "0 20px 60px rgba(26,26,26,0.3)" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#EFEDE5" }}>
              <h3 className="text-base font-bold text-[#1A1A1A]">Request Extension</h3>
              <button onClick={closeModal} className="p-1.5 rounded-full hover:bg-black/5 text-[#6E6B62]" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submit} className="p-5 flex flex-col gap-4">
              <Field label="Equipment ID">
                <input disabled value={modalEq.id} className="w-full rounded-lg border px-3 py-2.5 text-sm text-[#6E6B62]" style={{ background: "#F3F3EF", borderColor: "#E4E1D8" }} />
              </Field>
              <Field label="Current Return Date">
                <input disabled value={modalEq.checkOut} className="w-full rounded-lg border px-3 py-2.5 text-sm text-[#6E6B62]" style={{ background: "#F3F3EF", borderColor: "#E4E1D8" }} />
              </Field>
              <Field label="Requested Extension (days)">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={form.extensionDays}
                  onChange={(e) => setForm((f) => ({ ...f, extensionDays: Math.min(30, Math.max(1, Number(e.target.value) || 1)) }))}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-[#FFCD11]"
                  style={{ background: "#FAFAF8", borderColor: "#E4E1D8" }}
                  required
                />
              </Field>
              <Field label="Reason for Extension">
                <input
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="e.g. Project delayed by two weeks"
                  className="w-full rounded-lg border px-3 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#9A968D] outline-none focus:border-[#FFCD11]"
                  style={{ background: "#FAFAF8", borderColor: "#E4E1D8" }}
                  required
                />
              </Field>

              <div className="rounded-lg px-3 py-3" style={{ background: "#FFF9E8" }}>
                <p className="text-sm font-bold text-[#8A6A00]">Estimated Cost: ₹{estimatedCost.toLocaleString("en-IN")}</p>
                <p className="text-[10px] text-[#8A867A] mt-1">
                  This is an estimated cost only. Actual cost will be confirmed by your dealer upon approval.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold border text-[#6E6B62] hover:text-[#1A1A1A] hover:border-[#FFCD11] transition-colors"
                  style={{ borderColor: "#E4E1D8" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-sm font-semibold bg-[#FFCD11] text-[#1A1A1A] hover:brightness-95 transition disabled:opacity-60"
                >
                  <Send size={15} />
                  {submitting ? "Submitting…" : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function StatusBadge({ status }) {
  if (status === "approved") {
    return (
      <span className="ml-auto inline-flex items-center gap-1 text-xs font-bold rounded-full px-2.5 py-1" style={{ background: "#00C85118", color: "#00954A" }}>
        <CheckCircle2 size={12} /> Approved
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="ml-auto inline-flex items-center gap-1 text-xs font-bold rounded-full px-2.5 py-1" style={{ background: "#FF444418", color: "#E23B3B" }}>
        <XCircle size={12} /> Rejected
      </span>
    );
  }
  return (
    <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-2.5 py-1" style={{ background: "#FFCD1122", color: "#8A6A00" }}>
      <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: "#FFCD11" }} />
      Pending
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-[#6E6B62]">{label}</span>
      {children}
    </label>
  );
}
