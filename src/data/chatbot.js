import { equipmentData, DEMAND_FORECAST, overdueDays } from "./equipment";
import { detectAnomalies, fleetHealthScores, fleetMaintenancePredictions, fleetSummary } from "./algorithms";
import { predictFleet, predictDemandSummary } from "../api/mlClient";

const DAY_LABELS = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"];
const EQUIPMENT_ID_RE = /\b(EQX\d+)\b/i;

function fmtMoney(n) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function listOrNone(items) {
  return items.length ? items.join("\n") : "None right now — fleet is clear on this front.";
}

const HELP_MENU = `I can help with:
• "anomalies" / "alerts" — full anomaly list
• "critical" — equipment in critical health
• "overdue" — overdue returns
• "idle" / "sleeping" — sleeping giant equipment
• "ghost" / "unassigned" — untracked equipment
• "fuel" — low fuel equipment
• "temperature" / "hot" — overheating equipment
• "maintenance" / "predict" — maintenance forecast (live ML if backend is running)
• "predict EQX1001" — ML maintenance + anomaly prediction for one machine
• "cost" / "loss" / "revenue" — revenue loss analysis
• "health" / "score" — all health scores
• "forecast" / "demand" — demand forecast (live ML if backend is running)
• "best" / "good" — healthiest equipment
• "worst" — most critical equipment

Try asking me one of these!`;

async function singleEquipmentPrediction(equipmentId) {
  const eq = equipmentData.find((e) => e.id.toLowerCase() === equipmentId.toLowerCase());
  if (!eq) return `I don't recognize ${equipmentId} — try one of: ${equipmentData.map((e) => e.id).join(", ")}.`;

  try {
    const [result] = await predictFleet([eq]);
    const { maintenance: m, anomaly: a } = result;
    const lines = [
      `ML prediction for ${eq.id} (${eq.type}):`,
      `• Maintenance due: ${m.maintenanceDue ? "Yes" : "No"} (${Math.round(m.confidence * 100)}% confidence)`,
      `• Tier: ${m.tier} — next service in ~${m.daysUntilService} day(s)`,
      `• Anomaly: ${a.isAnomaly ? "Flagged" : "Normal"}${a.reasons.length ? ` — ${a.reasons[0].feature.replace(/_/g, " ")} is ${a.reasons[0].direction} (${a.reasons[0].value} vs fleet avg ${a.reasons[0].fleetMean})` : ""}`,
    ];
    return lines.join("\n");
  } catch {
    return `I couldn't reach the ML backend to score ${eq.id}. Make sure the FastAPI service in backend/ is running on port 8000.`;
  }
}

async function liveMaintenanceForecast() {
  try {
    const results = await predictFleet(equipmentData);
    const critical = results.filter((r) => r.maintenance.tier === "PM1");
    const warning = results.filter((r) => r.maintenance.tier === "PM2");
    const normal = results.length - critical.length - warning.length;
    return `Predictive Maintenance Forecast (live ML model):\n🔴 PM1 — Critical: ${listOrNone(
      critical.map((r) => `${r.equipmentId} — due in ~${r.maintenance.daysUntilService}d`)
    )}\n🟠 PM2 — Warning: ${listOrNone(
      warning.map((r) => `${r.equipmentId} — due in ~${r.maintenance.daysUntilService}d`)
    )}\n🟢 On schedule: ${normal} machine(s).`;
  } catch {
    return null;
  }
}

async function liveDemandForecast() {
  try {
    const summary = await predictDemandSummary(4);
    const topSites = [...summary.bySite].sort((a, b) => b.totalUnits - a.totalUnits).slice(0, 3);
    const topTypes = [...summary.byType].sort((a, b) => b.totalUnits - a.totalUnits).slice(0, 3);
    return `Demand forecast (live ML model, next ${summary.horizonWeeks} weeks):\nBy site: ${topSites
      .map((s) => `${s.siteId}: ${s.totalUnits} units`)
      .join(", ")}\nBy equipment type: ${topTypes.map((t) => `${t.type}: ${t.totalUnits} units`).join(", ")}\nAsk me "predict EQX1001" for a single-machine breakdown, or use the Demand Forecast Planner on the dashboard for the full per-site/type view.`;
  } catch {
    return null;
  }
}

export async function getBotResponse(rawInput, now = new Date()) {
  const input = rawInput.trim();
  const test = (re) => re.test(input);

  const anomalies = detectAnomalies(now);
  const health = fleetHealthScores();
  const maintenance = fleetMaintenancePredictions();
  const summary = fleetSummary(now);

  const idMatch = input.match(EQUIPMENT_ID_RE);
  if (idMatch && test(/\b(predict|prediction|ml|forecast)\b/i)) {
    return singleEquipmentPrediction(idMatch[1]);
  }

  if (test(/\b(hi|hello|hey)\b/i)) {
    return `Hello! I'm tracking ${summary.totalFleet} machines fleet-wide: ${summary.healthyCount} Healthy, ${summary.atRiskCount} At Risk, ${summary.criticalCount} Critical. ${anomalies.length} anomalies are currently flagged. Ask me about "critical", "overdue", "maintenance" or "revenue" for specifics.`;
  }

  if (test(/\b(anomaly|anomalies|alert|alerts)\b/i)) {
    if (!anomalies.length) return "No anomalies detected — fleet is clean right now.";
    const byType = {};
    anomalies.forEach((a) => {
      byType[a.type] = byType[a.type] || [];
      byType[a.type].push(a.equipmentId);
    });
    const lines = Object.entries(byType).map(([type, ids]) => `• ${type}: ${ids.join(", ")}`);
    return `${anomalies.length} anomalies detected:\n${lines.join("\n")}`;
  }

  if (test(/\bcritical\b/i)) {
    const critical = health.filter((h) => h.status === "Critical");
    if (!critical.length) return "No equipment is currently in Critical health — good news!";
    return `Critical health equipment:\n${critical.map((h) => `• ${h.equipment.id} (${h.equipment.type}) — Score: ${h.score}`).join("\n")}`;
  }

  if (test(/\boverdue\b/i)) {
    const overdue = equipmentData.filter((eq) => new Date(`${eq.checkOut}T00:00:00`).getTime() < now.getTime());
    if (!overdue.length) return "No overdue equipment right now.";
    return `Overdue equipment:\n${overdue
      .map((eq) => `• ${eq.id} (${eq.type}) — due ${eq.checkOut}, ${overdueDays(eq, now)} day(s) overdue, renter: ${eq.renter}`)
      .join("\n")}`;
  }

  if (test(/\b(idle|sleeping)\b/i)) {
    const sleeping = equipmentData.filter((eq) => eq.engineHours === 0 && eq.idleHours > 8);
    return `Sleeping Giant equipment (0 engine hours, high idle):\n${listOrNone(
      sleeping.map((eq) => `• ${eq.id} (${eq.type}) — ${eq.idleHours} idle hrs, renter: ${eq.renter}`)
    )}`;
  }

  if (test(/\b(ghost|unassigned)\b/i)) {
    const ghosts = equipmentData.filter((eq) => eq.site === null && eq.operator === null);
    return `Ghost Equipment (no site, no operator):\n${listOrNone(
      ghosts.map((eq) => `• ${eq.id} (${eq.type}) — last known renter: ${eq.renter}`)
    )}`;
  }

  if (test(/\bfuel\b/i)) {
    const lowFuel = equipmentData.filter((eq) => eq.fuelLevel < 25);
    return `Low fuel equipment (<25%):\n${listOrNone(
      lowFuel.map((eq) => `• ${eq.id} (${eq.type}) — ${eq.fuelLevel}% fuel remaining`)
    )}`;
  }

  if (test(/\b(temperature|temp|hot)\b/i)) {
    const hot = equipmentData.filter((eq) => eq.temperature > 85);
    return `High temperature equipment (>85°C):\n${listOrNone(
      hot.map((eq) => `• ${eq.id} (${eq.type}) — running at ${eq.temperature}°C`)
    )}`;
  }

  if (test(/\b(maintenance|predict|prediction)\b/i)) {
    const live = await liveMaintenanceForecast();
    if (live) return live;
    const critical = maintenance.filter((m) => m.level === "critical");
    const warning = maintenance.filter((m) => m.level === "warning");
    return `Predictive Maintenance Forecast (rule-based — ML backend offline):\n🔴 Critical (24 hrs): ${listOrNone(critical.map((m) => `${m.equipment.id} — ${m.reasons[0]}`))}\n🟠 Warning (3 days): ${listOrNone(warning.map((m) => `${m.equipment.id} — ${m.reasons[0]}`))}\n🟢 Healthy: ${maintenance.length - critical.length - warning.length} machine(s) on schedule.`;
  }

  if (test(/\b(cost|loss|revenue)\b/i)) {
    const sorted = [...equipmentData].sort((a, b) => b.idleHours - a.idleHours);
    const top3 = sorted.slice(0, 3).map((eq) => `• ${eq.id}: ${eq.idleHours} idle hrs → ${fmtMoney(eq.idleHours * 500)}`);
    return `Total idle hours: ${summary.totalIdleHours} hrs → Estimated revenue loss: ${fmtMoney(summary.revenueLoss)}.\nTop contributors:\n${top3.join("\n")}`;
  }

  if (test(/\b(health|score)\b/i)) {
    const sorted = [...health].sort((a, b) => b.score - a.score);
    return `Fleet health scores:\n${sorted.map((h) => `• ${h.equipment.id}: ${h.score}/100 (${h.status})`).join("\n")}`;
  }

  if (test(/\b(forecast|demand)\b/i)) {
    const live = await liveDemandForecast();
    if (live) return live;
    return `7-day equipment demand forecast (sample data — ML backend offline):\n${DEMAND_FORECAST.map((v, i) => `• ${DAY_LABELS[i]}: ${v} units needed`).join("\n")}`;
  }

  if (test(/\b(best|good)\b/i)) {
    const healthy = health.filter((h) => h.status === "Healthy").sort((a, b) => b.score - a.score);
    return `Healthiest equipment:\n${listOrNone(healthy.map((h) => `• ${h.equipment.id} (${h.equipment.type}) — Score: ${h.score}`))}`;
  }

  if (test(/\bworst\b/i)) {
    const lowest = Math.min(...health.map((h) => h.score));
    const worst = health.filter((h) => h.score === lowest);
    return `Most critical equipment (lowest health score):\n${worst
      .map((h) => `• ${h.equipment.id} (${h.equipment.type}) — Score: ${h.score}/100, issues: ${h.deductions.join(", ")}`)
      .join("\n")}`;
  }

  return HELP_MENU;
}

export const BOT_WELCOME = `Hello! I am your AI fleet assistant. I can help you with:
• Equipment status and health scores
• Anomaly detection and alerts
• Predictive maintenance schedule (live ML model)
• Demand forecasting (live ML model)
• Revenue loss analysis

Ask me "predict EQX1001" for a single-machine ML prediction. Just ask me anything!`;
