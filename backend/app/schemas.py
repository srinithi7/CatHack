"""Request/response models. All feature fields are Optional so a caller can
send a full record (every training column) or a partial one (just what the
frontend actually has) — missing fields are filled in from feature_defaults.pkl
/ anomaly_defaults.pkl at inference time.
"""
from typing import Optional

from pydantic import BaseModel


class EquipmentFeaturesIn(BaseModel):
    equipmentId: Optional[str] = None

    # Categorical (label-encoded server-side before hitting the models)
    type: Optional[str] = None
    siteId: Optional[str] = None
    operatorId: Optional[str] = None
    siteDustLevel: Optional[str] = None

    # Numeric — shared by maintenance + anomaly models where applicable
    machineAgeYears: Optional[float] = None
    engineHoursPerDay: Optional[float] = None
    idleHoursPerDay: Optional[float] = None
    idleRatio: Optional[float] = None
    rentalDays: Optional[float] = None
    cumulativeEngineHours: Optional[float] = None
    hoursSinceLastService: Optional[float] = None
    numServicesCompleted: Optional[float] = None
    oilHealthScore: Optional[float] = None
    hydraulicContaminationIndex: Optional[float] = None
    fuelConsumptionLph: Optional[float] = None
    avgOperatingTempC: Optional[float] = None
    anomalyFlag: Optional[float] = None


class MaintenancePredictionOut(BaseModel):
    equipmentId: Optional[str] = None
    maintenanceDue: bool
    confidence: float
    tier: str
    daysUntilService: float
    usedFields: list[str]
    defaultedFields: list[str]


class AnomalyReasonOut(BaseModel):
    feature: str
    value: float
    fleetMean: float
    zScore: float
    direction: str


class AnomalyPredictionOut(BaseModel):
    equipmentId: Optional[str] = None
    isAnomaly: bool
    anomalyScore: float
    reasons: list[AnomalyReasonOut]
    usedFields: list[str]
    defaultedFields: list[str]


class FleetPredictionOut(BaseModel):
    equipmentId: str
    maintenance: MaintenancePredictionOut
    anomaly: AnomalyPredictionOut


class FleetPredictRequest(BaseModel):
    equipment: list[EquipmentFeaturesIn]


class DemandPoint(BaseModel):
    weekStart: str
    weeksOut: int
    daysOut: int
    predictedUnits: int


class DemandForecastOut(BaseModel):
    siteId: str
    type: str
    forecast: list[DemandPoint]


class DemandForecastRequest(BaseModel):
    siteId: Optional[str] = None
    type: Optional[str] = None
    horizonWeeks: int = 4


class DemandSummaryRequest(BaseModel):
    horizonWeeks: int = 4


class DemandSiteTotal(BaseModel):
    siteId: str
    totalUnits: int


class DemandTypeTotal(BaseModel):
    type: str
    totalUnits: int


class DemandSummaryOut(BaseModel):
    horizonWeeks: int
    bySite: list[DemandSiteTotal]
    byType: list[DemandTypeTotal]
    detail: list[DemandForecastOut]
