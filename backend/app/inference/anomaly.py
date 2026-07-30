"""isolation_forest_model — 8 numeric features, no encoding needed.

feature_stats.pkl (fleet-wide mean/std per feature) drives the human-readable
"flagged because X is unusually high/low" reasons: any feature whose z-score
against the fleet distribution exceeds the threshold is surfaced, ranked by
how extreme it is.
"""
import pandas as pd

from app.model_registry import registry

FEATURE_ORDER = [
    "Engine_Hours_Per_Day", "Idle_Hours_Per_Day", "Idle_Ratio", "Rental_Days",
    "Oil_Health_Score", "Hydraulic_Contamination_Index", "Fuel_Consumption_Lph",
    "Hours_Since_Last_Service",
]

FIELD_MAP = {
    "engineHoursPerDay": "Engine_Hours_Per_Day",
    "idleHoursPerDay": "Idle_Hours_Per_Day",
    "idleRatio": "Idle_Ratio",
    "rentalDays": "Rental_Days",
    "oilHealthScore": "Oil_Health_Score",
    "hydraulicContaminationIndex": "Hydraulic_Contamination_Index",
    "fuelConsumptionLph": "Fuel_Consumption_Lph",
    "hoursSinceLastService": "Hours_Since_Last_Service",
}

Z_SCORE_THRESHOLD = 1.5
MAX_REASONS = 3


def build_feature_row(payload: dict) -> tuple[pd.DataFrame, dict, list[str], list[str]]:
    raw = {FIELD_MAP[k]: v for k, v in payload.items() if k in FIELD_MAP and v is not None}

    if "Idle_Ratio" not in raw and "Engine_Hours_Per_Day" in raw and "Idle_Hours_Per_Day" in raw:
        e, i = raw["Engine_Hours_Per_Day"], raw["Idle_Hours_Per_Day"]
        raw["Idle_Ratio"] = i / (i + e) if (i + e) > 0 else registry.anomaly_defaults["Idle_Ratio"]

    used_fields, defaulted_fields = [], []
    row = {}
    for col in FEATURE_ORDER:
        if col in raw:
            row[col] = raw[col]
            used_fields.append(col)
        else:
            row[col] = registry.anomaly_defaults[col]
            defaulted_fields.append(col)

    frame = pd.DataFrame([row], columns=FEATURE_ORDER)
    return frame, row, used_fields, defaulted_fields


def predict_anomaly(payload: dict) -> dict:
    X, row, used_fields, defaulted_fields = build_feature_row(payload)

    raw_pred = registry.isolation_forest.predict(X)[0]
    score = float(registry.isolation_forest.decision_function(X)[0])
    is_anomaly = bool(raw_pred == -1)

    reasons = []
    for col in FEATURE_ORDER:
        stats = registry.feature_stats[col]
        mean, std = stats["mean"], stats["std"]
        if std == 0:
            continue
        z = (row[col] - mean) / std
        if abs(z) >= Z_SCORE_THRESHOLD:
            reasons.append({
                "feature": col,
                "value": round(float(row[col]), 2),
                "fleetMean": round(float(mean), 2),
                "zScore": round(float(z), 2),
                "direction": "high" if z > 0 else "low",
            })
    reasons.sort(key=lambda r: abs(r["zScore"]), reverse=True)

    return {
        "isAnomaly": is_anomaly,
        "anomalyScore": round(score, 4),
        "reasons": reasons[:MAX_REASONS],
        "usedFields": used_fields,
        "defaultedFields": defaulted_fields,
    }
