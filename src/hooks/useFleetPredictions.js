import { useEffect, useState } from "react";
import { equipmentData } from "../data/equipment";
import { predictFleet } from "../api/mlClient";

// status: 'loading' | 'live' | 'offline'
// 'offline' means the ML backend couldn't be reached — callers should fall
// back to the rule-based engine in data/algorithms.js rather than break.
export function useFleetPredictions() {
  const [state, setState] = useState({ status: "loading", byId: {}, error: null });

  useEffect(() => {
    let cancelled = false;
    predictFleet(equipmentData)
      .then((results) => {
        if (cancelled) return;
        const byId = {};
        results.forEach((r) => {
          byId[r.equipmentId] = r;
        });
        setState({ status: "live", byId, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ status: "offline", byId: {}, error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
