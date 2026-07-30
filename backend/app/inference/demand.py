"""demand_model — weekly rental-count regressor per (Site_ID, Type).

The model needs Lag_1/Lag_2/Lag_3/Rolling_Avg_4, which only exist relative to
a known history. weekly_demand_history.pkl supplies that history (through
2025-12-29); forecasting is done recursively from the last known week for
each (site, type) pair — each predicted week's count becomes next week's
Lag_1, and so on.

`summary()` forecasts all 30 (site, type) combos at once. Naively that's
horizon_weeks * 30 individual single-row .predict() calls, which is slow
because RandomForestRegressor's per-call overhead dominates at that row
count. Instead it batches all 30 combos into one DataFrame per week-step —
each combo is independent within a step (only the recursion across steps is
sequential) — cutting a 6-week summary from ~180 predict() calls to 6.
"""
from datetime import timedelta
from functools import lru_cache

import pandas as pd

from app.model_registry import registry

FEATURE_ORDER = [
    "Site_ID_enc", "Type_enc", "Season_enc", "Month", "Week_of_Year",
    "Lag_1", "Lag_2", "Lag_3", "Rolling_Avg_4",
]

# Empirically confirmed from weekly_demand_history.pkl's Month -> Season mapping.
WINTER_MONTHS = {1, 2, 10, 11, 12}
SUMMER_MONTHS = {3, 4, 5}
MONSOON_MONTHS = {6, 7, 8, 9}


def season_for_month(month: int) -> str:
    if month in WINTER_MONTHS:
        return "Winter"
    if month in SUMMER_MONTHS:
        return "Summer"
    return "Monsoon"


def known_sites() -> list[str]:
    return sorted(registry.demand_encoders["Site_ID"].classes_.tolist())


def known_types() -> list[str]:
    return sorted(registry.demand_encoders["Type"].classes_.tolist())


def _history_for(site_id: str, equipment_type: str) -> pd.DataFrame:
    wdh = registry.weekly_demand_history
    hist = wdh[(wdh["Site_ID"] == site_id) & (wdh["Type"] == equipment_type)]
    if hist.empty:
        raise ValueError(f"No demand history for site={site_id!r}, type={equipment_type!r}")
    return hist.sort_values("Week_Start")


@lru_cache(maxsize=512)
def forecast_series(site_id: str, equipment_type: str, horizon_weeks: int) -> list[dict]:
    encoders = registry.demand_encoders
    site_enc = int(encoders["Site_ID"].transform([site_id])[0])
    type_enc = int(encoders["Type"].transform([equipment_type])[0])

    hist = _history_for(site_id, equipment_type)
    last = hist.iloc[-1]

    lag1, lag2, lag3 = float(last["Rentals_Count"]), float(last["Lag_1"]), float(last["Lag_2"])
    recent = hist["Rentals_Count"].tolist()[-4:]
    cursor = last["Week_Start"]

    points = []
    for step in range(1, horizon_weeks + 1):
        cursor = cursor + timedelta(days=7)
        season_enc = int(encoders["Season"].transform([season_for_month(cursor.month)])[0])
        rolling_avg4 = sum(recent[-4:]) / len(recent[-4:])

        row = {
            "Site_ID_enc": site_enc,
            "Type_enc": type_enc,
            "Season_enc": season_enc,
            "Month": cursor.month,
            "Week_of_Year": int(cursor.isocalendar().week),
            "Lag_1": lag1, "Lag_2": lag2, "Lag_3": lag3, "Rolling_Avg_4": rolling_avg4,
        }
        X = pd.DataFrame([row], columns=FEATURE_ORDER)
        pred = max(0.0, float(registry.demand_model.predict(X)[0]))
        pred_units = round(pred)

        points.append({
            "weekStart": cursor.date().isoformat(),
            "weeksOut": step,
            "daysOut": step * 7,
            "predictedUnits": pred_units,
        })

        lag3, lag2, lag1 = lag2, lag1, float(pred_units)
        recent.append(pred_units)
        recent = recent[-4:]

    return points


@lru_cache(maxsize=16)
def summary(horizon_weeks: int) -> dict:
    encoders = registry.demand_encoders
    sites, types = known_sites(), known_types()
    combos = [(s, t) for s in sites for t in types]

    # Per-combo running state, seeded from each pair's most recent history row.
    state = []
    for site_id, eq_type in combos:
        hist = _history_for(site_id, eq_type)
        last = hist.iloc[-1]
        state.append({
            "siteId": site_id,
            "type": eq_type,
            "siteEnc": int(encoders["Site_ID"].transform([site_id])[0]),
            "typeEnc": int(encoders["Type"].transform([eq_type])[0]),
            "lag1": float(last["Rentals_Count"]),
            "lag2": float(last["Lag_1"]),
            "lag3": float(last["Lag_2"]),
            "recent": hist["Rentals_Count"].tolist()[-4:],
            "cursor": last["Week_Start"],
            "points": [],
        })

    for step in range(1, horizon_weeks + 1):
        rows = []
        for s in state:
            s["cursor"] = s["cursor"] + timedelta(days=7)
            season_enc = int(encoders["Season"].transform([season_for_month(s["cursor"].month)])[0])
            rolling_avg4 = sum(s["recent"][-4:]) / len(s["recent"][-4:])
            rows.append({
                "Site_ID_enc": s["siteEnc"], "Type_enc": s["typeEnc"], "Season_enc": season_enc,
                "Month": s["cursor"].month, "Week_of_Year": int(s["cursor"].isocalendar().week),
                "Lag_1": s["lag1"], "Lag_2": s["lag2"], "Lag_3": s["lag3"], "Rolling_Avg_4": rolling_avg4,
            })

        X = pd.DataFrame(rows, columns=FEATURE_ORDER)
        preds = registry.demand_model.predict(X)

        for s, raw_pred in zip(state, preds):
            pred_units = round(max(0.0, float(raw_pred)))
            s["points"].append({
                "weekStart": s["cursor"].date().isoformat(),
                "weeksOut": step,
                "daysOut": step * 7,
                "predictedUnits": pred_units,
            })
            s["lag3"], s["lag2"], s["lag1"] = s["lag2"], s["lag1"], float(pred_units)
            s["recent"].append(pred_units)
            s["recent"] = s["recent"][-4:]

    site_totals = {s: 0 for s in sites}
    type_totals = {t: 0 for t in types}
    detail = []
    for s in state:
        total = sum(p["predictedUnits"] for p in s["points"])
        site_totals[s["siteId"]] += total
        type_totals[s["type"]] += total
        detail.append({"siteId": s["siteId"], "type": s["type"], "forecast": s["points"]})

    return {
        "horizonWeeks": horizon_weeks,
        "bySite": [{"siteId": s, "totalUnits": site_totals[s]} for s in sites],
        "byType": [{"type": t, "totalUnits": type_totals[t]} for t in types],
        "detail": detail,
    }
