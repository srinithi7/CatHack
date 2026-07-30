from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.inference import anomaly, demand, maintenance
from app.schemas import (
    AnomalyPredictionOut,
    DemandForecastOut,
    DemandForecastRequest,
    DemandSummaryOut,
    DemandSummaryRequest,
    EquipmentFeaturesIn,
    FleetPredictionOut,
    FleetPredictRequest,
    MaintenancePredictionOut,
)

app = FastAPI(title="[SYSTEM_NAME] ML Inference API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/predict/maintenance", response_model=MaintenancePredictionOut)
def predict_maintenance(payload: EquipmentFeaturesIn):
    result = maintenance.predict_maintenance(payload.model_dump())
    return {**result, "equipmentId": payload.equipmentId}


@app.post("/api/predict/anomaly", response_model=AnomalyPredictionOut)
def predict_anomaly(payload: EquipmentFeaturesIn):
    result = anomaly.predict_anomaly(payload.model_dump())
    return {**result, "equipmentId": payload.equipmentId}


@app.post("/api/predict/fleet", response_model=list[FleetPredictionOut])
def predict_fleet(payload: FleetPredictRequest):
    """Batch endpoint: runs anomaly detection first, then feeds its result into
    the maintenance model's Anomaly_Flag feature for a more informed prediction."""
    results = []
    for eq in payload.equipment:
        if not eq.equipmentId:
            raise HTTPException(400, "Every equipment entry needs an equipmentId")
        data = eq.model_dump()
        anomaly_result = anomaly.predict_anomaly(data)
        if data.get("anomalyFlag") is None:
            data["anomalyFlag"] = 1.0 if anomaly_result["isAnomaly"] else 0.0
        maintenance_result = maintenance.predict_maintenance(data)
        results.append({
            "equipmentId": eq.equipmentId,
            "maintenance": {**maintenance_result, "equipmentId": eq.equipmentId},
            "anomaly": {**anomaly_result, "equipmentId": eq.equipmentId},
        })
    return results


@app.get("/api/meta/demand-options")
def demand_options():
    return {"sites": demand.known_sites(), "types": demand.known_types()}


@app.post("/api/predict/demand", response_model=DemandForecastOut)
def predict_demand(payload: DemandForecastRequest):
    sites = [payload.siteId] if payload.siteId else demand.known_sites()
    types = [payload.type] if payload.type else demand.known_types()
    if payload.siteId and payload.siteId not in demand.known_sites():
        raise HTTPException(400, f"Unknown siteId {payload.siteId!r}. Known: {demand.known_sites()}")
    if payload.type and payload.type not in demand.known_types():
        raise HTTPException(400, f"Unknown type {payload.type!r}. Known: {demand.known_types()}")

    if payload.siteId and payload.type:
        forecast = demand.forecast_series(payload.siteId, payload.type, payload.horizonWeeks)
        return {"siteId": payload.siteId, "type": payload.type, "forecast": forecast}

    # No single site+type given: aggregate across the implied set into one series.
    # The full-fleet case (no filter at all) reuses summary()'s batched prediction
    # instead of looping forecast_series() per combo — ~30x fewer model calls.
    if not payload.siteId and not payload.type:
        fleet_summary = demand.summary(payload.horizonWeeks)
        combined: dict[str, int] = {}
        for entry in fleet_summary["detail"]:
            for point in entry["forecast"]:
                combined[point["weekStart"]] = combined.get(point["weekStart"], 0) + point["predictedUnits"]
    else:
        combined = {}
        for site_id in sites:
            for eq_type in types:
                for point in demand.forecast_series(site_id, eq_type, payload.horizonWeeks):
                    combined[point["weekStart"]] = combined.get(point["weekStart"], 0) + point["predictedUnits"]
    forecast = [
        {"weekStart": ws, "weeksOut": i + 1, "daysOut": (i + 1) * 7, "predictedUnits": units}
        for i, (ws, units) in enumerate(sorted(combined.items()))
    ]
    return {"siteId": payload.siteId or "ALL", "type": payload.type or "ALL", "forecast": forecast}


@app.post("/api/predict/demand/summary", response_model=DemandSummaryOut)
def predict_demand_summary(payload: DemandSummaryRequest):
    return demand.summary(payload.horizonWeeks)
