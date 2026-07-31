"""rf_model (due yes/no) + tier_model (PM tier) + days_model (days-until-service).

All three were trained on the same 17-column frame, so we build that frame
once and run it through all three estimators.
"""
import pandas as pd

from app.model_registry import registry

FEATURE_ORDER = [
    "Type", "Site_ID", "Operator_ID", "Machine_Age_Years", "Engine_Hours_Per_Day",
    "Idle_Hours_Per_Day", "Idle_Ratio", "Rental_Days", "Cumulative_Engine_Hours",
    "Hours_Since_Last_Service", "Num_Services_Completed", "Oil_Health_Score",
    "Hydraulic_Contamination_Index", "Fuel_Consumption_Lph", "Site_Dust_Level",
    "Avg_Operating_Temp_C", "Anomaly_Flag",
]

CATEGORICAL_COLS = ["Type", "Site_ID", "Operator_ID", "Site_Dust_Level"]

# tier_model's PM-tier classes double as a health-status severity mapping —
# it's already a 3-level failure-risk classifier, just relabeled to match the
# Healthy / At Risk / Critical vocabulary used across the rest of the app.
TIER_TO_HEALTH_STATUS = {"None": "Healthy", "PM2": "At Risk", "PM1": "Critical"}

# camelCase request field -> training column name
FIELD_MAP = {
    "type": "Type",
    "siteId": "Site_ID",
    "operatorId": "Operator_ID",
    "machineAgeYears": "Machine_Age_Years",
    "engineHoursPerDay": "Engine_Hours_Per_Day",
    "idleHoursPerDay": "Idle_Hours_Per_Day",
    "idleRatio": "Idle_Ratio",
    "rentalDays": "Rental_Days",
    "cumulativeEngineHours": "Cumulative_Engine_Hours",
    "hoursSinceLastService": "Hours_Since_Last_Service",
    "numServicesCompleted": "Num_Services_Completed",
    "oilHealthScore": "Oil_Health_Score",
    "hydraulicContaminationIndex": "Hydraulic_Contamination_Index",
    "fuelConsumptionLph": "Fuel_Consumption_Lph",
    "siteDustLevel": "Site_Dust_Level",
    "avgOperatingTempC": "Avg_Operating_Temp_C",
    "anomalyFlag": "Anomaly_Flag",
}


def _safe_encode(column: str, value):
    encoder = registry.label_encoders[column]
    known = set(encoder.classes_)
    if value not in known:
        value = registry.feature_defaults[column]
    return int(encoder.transform([value])[0])


def build_feature_row(payload: dict) -> tuple[pd.DataFrame, list[str], list[str]]:
    """payload keys are the camelCase request fields (None = not provided)."""
    raw = {FIELD_MAP[k]: v for k, v in payload.items() if k in FIELD_MAP and v is not None}

    if "Idle_Ratio" not in raw and "Engine_Hours_Per_Day" in raw and "Idle_Hours_Per_Day" in raw:
        e, i = raw["Engine_Hours_Per_Day"], raw["Idle_Hours_Per_Day"]
        raw["Idle_Ratio"] = i / (i + e) if (i + e) > 0 else registry.feature_defaults["Idle_Ratio"]

    used_fields, defaulted_fields = [], []
    row = {}
    for col in FEATURE_ORDER:
        if col in raw:
            row[col] = raw[col]
            used_fields.append(col)
        else:
            row[col] = registry.feature_defaults[col]
            defaulted_fields.append(col)

    for col in CATEGORICAL_COLS:
        row[col] = _safe_encode(col, row[col])

    frame = pd.DataFrame([row], columns=FEATURE_ORDER)
    return frame, used_fields, defaulted_fields


def predict_maintenance(payload: dict) -> dict:
    """Random Forest Classifier (rf_model) scores failure/service-due risk;
    Random Forest Regressor (days_model) scores time-to-failure. tier_model is
    a second RF classifier used here purely for the Healthy/At Risk/Critical
    health-status label. All three are joblib-serialized scikit-learn models."""
    X, used_fields, defaulted_fields = build_feature_row(payload)

    due_pred = registry.rf_model.predict(X)[0]
    due_proba = registry.rf_model.predict_proba(X)[0]
    classes = list(registry.rf_model.classes_)
    confidence = float(due_proba[classes.index(due_pred)])
    failure_probability = float(due_proba[classes.index(1)])

    tier_pred = str(registry.tier_model.predict(X)[0])
    days_pred = max(0.0, float(registry.days_model.predict(X)[0]))

    return {
        "maintenanceDue": bool(due_pred),
        "confidence": round(confidence, 3),
        "tier": tier_pred,
        "healthStatus": TIER_TO_HEALTH_STATUS.get(tier_pred, "Healthy"),
        "daysUntilService": round(days_pred, 1),
        "hoursToFailure": round(days_pred * 24, 1),
        "failureProbability": round(failure_probability * 100, 1),
        "usedFields": used_fields,
        "defaultedFields": defaulted_fields,
    }
