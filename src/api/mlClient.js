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

// Maps our frontend equipment record onto the subset of trained-model
// features we actually have. Everything else (Oil_Health_Score,
// Hours_Since_Last_Service, etc.) is left out on purpose — the backend
// fills those from feature_defaults.pkl / anomaly_defaults.pkl.
export function equipmentToFeatures(eq) {
  return {
    equipmentId: eq.id,
    type: eq.type,
    siteId: eq.site ?? "NULL",
    operatorId: eq.operator ?? "NULL",
    engineHoursPerDay: eq.engineHours,
    idleHoursPerDay: eq.idleHours,
    rentalDays: eq.rentalDays,
    avgOperatingTempC: eq.temperature,
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
