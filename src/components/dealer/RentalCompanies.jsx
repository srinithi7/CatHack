import { useMemo, useState } from "react";
import { Building2, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "../ui";
import { isOverdue, overdueDays } from "../../data/equipment";

export default function RentalCompanies({ rows }) {
  const [expanded, setExpanded] = useState(null);

  const companies = useMemo(() => {
    const byName = {};
    rows.forEach((r) => {
      const name = r.eq.renter;
      byName[name] = byName[name] || [];
      byName[name].push(r);
    });
    return Object.entries(byName).map(([name, companyRows]) => ({
      name,
      rows: companyRows,
      overdueCount: companyRows.filter((r) => isOverdue(r.eq)).length,
      totalEngineHours: companyRows.reduce((s, r) => s + r.eq.engineHours, 0),
      totalIdleHours: companyRows.reduce((s, r) => s + r.eq.idleHours, 0),
    }));
  }, [rows]);

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <Building2 size={18} className="text-[#8A6A00]" />
        <h2 className="text-lg font-bold text-[#1A1A1A]">Rental Companies</h2>
      </div>
      <p className="text-xs text-[#6E6B62] mb-4">Companies renting equipment from you, and what they currently hold.</p>

      <div className="flex flex-col gap-2">
        {companies.map((c) => {
          const isOpen = expanded === c.name;
          return (
            <div key={c.name} className="rounded-xl border overflow-hidden" style={{ borderColor: "#E4E1D8" }}>
              <button
                onClick={() => setExpanded(isOpen ? null : c.name)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-black/[0.02] transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#1A1A1A]">{c.name}</p>
                  <p className="text-xs text-[#8A867A]">{c.rows.length} machine{c.rows.length === 1 ? "" : "s"} rented</p>
                </div>
                {c.overdueCount > 0 && (
                  <span className="text-xs font-semibold rounded-full px-2 py-1" style={{ background: "#FF444418", color: "#E23B3B" }}>
                    {c.overdueCount} overdue
                  </span>
                )}
                {isOpen ? <ChevronUp size={16} className="text-[#8A867A]" /> : <ChevronDown size={16} className="text-[#8A867A]" />}
              </button>
              {isOpen && (
                <div className="border-t px-4 py-3" style={{ borderColor: "#EFEDE5", background: "#FAFAF8" }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-[#8A867A]">
                        <th className="py-1.5 font-semibold">Equipment</th>
                        <th className="py-1.5 font-semibold">Type</th>
                        <th className="py-1.5 font-semibold">Engine Hrs</th>
                        <th className="py-1.5 font-semibold">Return Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.rows.map(({ eq }) => {
                        const overdue = isOverdue(eq);
                        return (
                          <tr key={eq.id} className="border-t" style={{ borderColor: "#EFEDE5" }}>
                            <td className="py-1.5 font-semibold text-[#8A6A00]">{eq.id}</td>
                            <td className="py-1.5 text-[#1A1A1A]">{eq.type}</td>
                            <td className="py-1.5 text-[#1A1A1A]">{eq.engineHours}h</td>
                            <td className="py-1.5">
                              <span
                                className="text-xs font-semibold rounded-full px-2 py-0.5"
                                style={overdue ? { background: "#FF444418", color: "#E23B3B" } : { background: "#00C85118", color: "#00954A" }}
                              >
                                {overdue ? `${overdueDays(eq)}d overdue` : "On track"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
