import { equipmentData, isOverdue, overdueDays } from "./equipment";

export const STATUS_COLORS = {
  Healthy: "#00C851",
  "At Risk": "#FF8800",
  Critical: "#FF4444",
};

export const MAINTENANCE_COLORS = {
  critical: "#FF4444",
  warning: "#FF8800",
  normal: "#00C851",
};

// ── Health Score ─────────────────────────────────────────────────────────
export function calcHealthScore(eq) {
  let score = 100;
  const deductions = [];

  if (eq.idleHours > 8) { score -= 20; deductions.push("High idle time"); }
  if (eq.operator === null) { score -= 30; deductions.push("No operator assigned"); }
  if (eq.site === null) { score -= 20; deductions.push("No site assigned"); }
  if (eq.engineHours < 1) { score -= 15; deductions.push("Minimal engine usage"); }
  if (eq.fuelLevel < 25) { score -= 10; deductions.push("Low fuel"); }
  if (eq.temperature > 85) { score -= 15; deductions.push("Overheating"); }
  if (eq.vibration === "high") { score -= 10; deductions.push("High vibration"); }

  score = Math.max(0, score);

  let status = "Critical";
  if (score >= 80) status = "Healthy";
  else if (score >= 50) status = "At Risk";

  return { score, status, color: STATUS_COLORS[status], deductions };
}

export function fleetHealthScores() {
  return equipmentData.map((eq) => ({ equipment: eq, ...calcHealthScore(eq) }));
}

// ── Predictive Maintenance ──────────────────────────────────────────────
export function calcMaintenance(eq) {
  const criticalReasons = [];
  const warningReasons = [];

  if (eq.temperature > 85) criticalReasons.push(`Engine overheating at ${eq.temperature}°C`);
  if (eq.vibration === "high") criticalReasons.push("Abnormal high vibration detected");
  if (eq.batteryVoltage < 11.6) criticalReasons.push(`Battery critically low at ${eq.batteryVoltage}V`);

  if (eq.temperature > 78) warningReasons.push(`Elevated temperature at ${eq.temperature}°C`);
  if (eq.fuelLevel < 25) warningReasons.push(`Fuel running low at ${eq.fuelLevel}%`);
  if (eq.engineHours > 7) warningReasons.push(`High engine load: ${eq.engineHours} hrs`);

  if (criticalReasons.length > 0) {
    return {
      level: "critical",
      label: "Within 24 Hours",
      reasons: criticalReasons,
      color: MAINTENANCE_COLORS.critical,
    };
  }
  if (warningReasons.length > 0) {
    return {
      level: "warning",
      label: "Within 3 Days",
      reasons: warningReasons,
      color: MAINTENANCE_COLORS.warning,
    };
  }
  return {
    level: "normal",
    label: "Next 15 Days",
    reasons: ["Operating within normal parameters"],
    color: MAINTENANCE_COLORS.normal,
  };
}

export function fleetMaintenancePredictions() {
  return equipmentData.map((eq) => ({ equipment: eq, ...calcMaintenance(eq) }));
}

// ── Anomaly Detection ────────────────────────────────────────────────────
export const ANOMALY_SEVERITY = {
  "High Temperature": "CRITICAL",
  "High Vibration": "CRITICAL",
  "Dead Man Alert": "CRITICAL",
  "Ghost Equipment": "HIGH",
  "Sleeping Giant": "HIGH",
  Overdue: "HIGH",
  "Low Fuel": "MEDIUM",
};

export function detectAnomalies(now = new Date()) {
  const anomalies = [];
  let seq = 0;

  const push = (type, eq, description) => {
    seq += 1;
    anomalies.push({
      key: `${type}-${eq.id}-${seq}`,
      type,
      severity: ANOMALY_SEVERITY[type],
      equipmentId: eq.id,
      equipmentType: eq.type,
      description,
    });
  };

  equipmentData.forEach((eq) => {
    if (eq.site === null && eq.operator === null) {
      push("Ghost Equipment", eq, `${eq.id} has no site and no operator assigned — asset is untracked.`);
    }
    if (eq.engineHours === 0 && eq.idleHours > 8) {
      push("Sleeping Giant", eq, `${eq.id} logged 0 engine hours but ${eq.idleHours} idle hours — fully idle asset.`);
    }
    if (isOverdue(eq, now)) {
      push("Overdue", eq, `${eq.id} checkout was due on ${eq.checkOut} — ${overdueDays(eq, now)} day(s) overdue.`);
    }
    if (eq.fuelLevel < 25) {
      push("Low Fuel", eq, `${eq.id} fuel level at ${eq.fuelLevel}% — refuel required.`);
    }
    if (eq.temperature > 85) {
      push("High Temperature", eq, `${eq.id} running at ${eq.temperature}°C — exceeds safe threshold.`);
    }
    if (eq.engineHours > 0 && eq.operator === null) {
      push("Dead Man Alert", eq, `${eq.id} engine active with no operator logged in — safety risk.`);
    }
    if (eq.vibration === "high") {
      push("High Vibration", eq, `${eq.id} reporting high vibration — mechanical inspection advised.`);
    }
  });

  return anomalies;
}

// ── Fleet Summary ─────────────────────────────────────────────────────────
export function fleetSummary(now = new Date()) {
  const anomalies = detectAnomalies(now);
  const totalFleet = equipmentData.length;
  const activeRentals = equipmentData.filter((eq) => eq.operator !== null).length;
  const totalIdleHours = equipmentData.reduce((sum, eq) => sum + eq.idleHours, 0);
  const revenueLoss = totalIdleHours * 500;
  const healthScores = fleetHealthScores();
  const maintenance = fleetMaintenancePredictions();

  const healthyCount = healthScores.filter((h) => h.status === "Healthy").length;
  const atRiskCount = healthScores.filter((h) => h.status === "At Risk").length;
  const criticalCount = healthScores.filter((h) => h.status === "Critical").length;

  return {
    anomalies,
    totalFleet,
    activeRentals,
    totalIdleHours,
    revenueLoss,
    healthScores,
    maintenance,
    healthyCount,
    atRiskCount,
    criticalCount,
  };
}
