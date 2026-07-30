"""Loads every model/artifact from backend/models once at process start.

All 11 pickles are joblib-dumped scikit-learn objects, dicts, or a pandas
DataFrame (weekly_demand_history). Loading is eager and synchronous because
the artifacts are small enough (~100MB total) that startup cost is trivial
next to the cost of reloading per-request.
"""
from pathlib import Path
import warnings

import joblib

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"

# The pickles were produced with an older scikit-learn than what's installed
# here; sklearn warns on every unpickle but the estimators still load and
# predict correctly for the tree-based models used in this project.
warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")


def _load(name: str):
    return joblib.load(MODELS_DIR / name)


class ModelRegistry:
    def __init__(self):
        # Predictive maintenance
        self.rf_model = _load("rf_model.pkl")
        self.tier_model = _load("tier_model.pkl")
        self.days_model = _load("days_model.pkl")
        self.label_encoders = _load("label_encoders.pkl")
        self.feature_defaults = _load("feature_defaults.pkl")

        # Anomaly detection
        self.isolation_forest = _load("isolation_forest_model.pkl")
        self.anomaly_defaults = _load("anomaly_defaults.pkl")
        self.feature_stats = _load("feature_stats.pkl")

        # Demand forecasting
        self.demand_model = _load("demand_model.pkl")
        self.demand_encoders = _load("demand_encoders.pkl")
        self.weekly_demand_history = _load("weekly_demand_history.pkl")


registry = ModelRegistry()
