// Thin client for the FastAPI ML inference service in backend/.
// Every call can fail (backend not running, model error) — callers are
// expected to catch and fall back to the rule-based JS engine in data/algorithms.js.

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function postJson(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${path} → ${res.status}: ${detail}`);
  }
  return res.json();
}

async function getJson(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}

// Maps our frontend equipment record onto the trained-model feature set.
// The dataset has no direct Oil_Health_Score / Hydraulic_Contamination_Index
// / Hours_Since_Last_Service / etc. fields, so leaving them out made every
// machine default to the training set's median (= "average healthy machine"),
// which meant the maintenance model never predicted anything but "None" —
// the risk board was always empty. These are derived from signals we DO have
// (vibration, temperature, fuel, idle hours) instead, so a hot/high-vibration
// machine actually reads as degraded rather than "median."
function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function equipmentToFeatures(eq) {
  const overheating = eq.temperature > 85;
  const highVibration = eq.vibration === "high";
  const lowFuel = eq.fuelLevel < 25;

  return {
    equipmentId: eq.id,
    type: eq.type,
    siteId: eq.site ?? "NULL",
    operatorId: eq.operator ?? "NULL",
    engineHoursPerDay: eq.engineHours,
    idleHoursPerDay: eq.idleHours,
    rentalDays: eq.rentalDays,
    avgOperatingTempC: eq.temperature,
    oilHealthScore: clamp(95 - (highVibration ? 35 : 0) - (overheating ? 20 : 0) - (lowFuel ? 10 : 0) - eq.idleHours * 1.5, 5, 95),
    hydraulicContaminationIndex: clamp(10 + (highVibration ? 35 : 0) + (overheating ? 20 : 0), 5, 60),
    hoursSinceLastService: eq.rentalDays * 7,
    cumulativeEngineHours: eq.engineHours * eq.rentalDays * 4,
    numServicesCompleted: clamp(Math.round(eq.rentalDays / 10), 1, 6),
    fuelConsumptionLph: clamp(eq.engineHours * 2 + (lowFuel ? 5 : 0), 5, 30),
  };
}

export function predictFleet(equipmentArray) {
  return postJson("/api/predict/fleet", { equipment: equipmentArray.map(equipmentToFeatures) });
}

export function predictMaintenance(eq) {
  return postJson("/api/predict/maintenance", equipmentToFeatures(eq));
}

export function predictAnomaly(eq) {
  return postJson("/api/predict/anomaly", equipmentToFeatures(eq));
}

export function predictDemand({ siteId = null, type = null, horizonWeeks = 6 } = {}) {
  return postJson("/api/predict/demand", { siteId, type, horizonWeeks });
}

export function predictDemandSummary(horizonWeeks = 6) {
  return postJson("/api/predict/demand/summary", { horizonWeeks });
}

export function getDemandOptions() {
  return getJson("/api/meta/demand-options");
}

export function checkMlHealth() {
  return getJson("/health");
}
