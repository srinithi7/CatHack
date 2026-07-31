import { useMemo } from "react";
import { equipmentData } from "../data/equipment";
import { useEquipmentList } from "./hooks";

// Local dataset stays the base (guarantees the app works with zero Firebase
// config); any live equipment/{id} record overlays its fields on top —
// status, customer, lat/lng — without dropping fields Firebase doesn't send.
export function useMergedEquipment() {
  const live = useEquipmentList();

  const equipment = useMemo(() => {
    if (live.status !== "live" || !live.data) return equipmentData;
    return equipmentData.map((eq) => {
      const override = live.data[eq.id];
      return override ? { ...eq, ...override } : eq;
    });
  }, [live.status, live.data]);

  return { equipment, status: live.status };
}
