"""
ml_service.py
---------------------------------
Loads the trained Random Forest artifacts (priority, ETA, delay-risk) and
exposes a single predict() function that FastAPI endpoints call.
"""

from functools import lru_cache

import joblib
import pandas as pd

from app.config import MODEL_ARTIFACT_PATH


@lru_cache(maxsize=1)
def _load_artifacts():
    return joblib.load(MODEL_ARTIFACT_PATH)


def _row_from_order(order) -> pd.DataFrame:
    """order: app.schemas.StructuredOrder (or any object/dict with the same fields)."""
    if hasattr(order, "model_dump"):
        order = order.model_dump()
    elif hasattr(order, "dict"):
        order = order.dict()
    row = {
        "category": order["category"],
        "urgency": order["urgency"],
        "road_type": order.get("road_type", "mixed"),
        "weather": order.get("weather", "clear"),
        "time_of_day": order.get("time_of_day", "afternoon"),
        "distance_km": order["distance_km"],
        "is_remote": order.get("is_remote", 0),
        "traffic_level": order.get("traffic_level", 3),
        "order_weight_kg": order.get("order_weight_kg", 2.0),
        "past_delay_count": order.get("past_delay_count", 0),
        "vehicle_capacity_load_pct": order.get("vehicle_capacity_load_pct", 50),
        "customer_priority_flag": order.get("customer_priority_flag", 0),
    }
    return pd.DataFrame([row])


def predict_order(order) -> dict:
    """Returns {priority_score, eta_minutes, delay_risk} for a single structured order."""
    artifacts = _load_artifacts()
    df_row = _row_from_order(order)

    encoded = df_row.copy()
    for col in artifacts["categorical_cols"]:
        le = artifacts["encoders"][col]
        encoded[col] = encoded[col].astype(str).map(
            lambda v, le=le: v if v in le.classes_ else le.classes_[0]
        )
        encoded[col] = le.transform(encoded[col])
    X = encoded[artifacts["feature_cols"]]

    priority = float(artifacts["priority_model"].predict(X)[0])
    eta = float(artifacts["eta_model"].predict(X)[0])
    delay_prob = float(artifacts["delay_model"].predict_proba(X)[0][1])

    priority = max(0.0, min(100.0, round(priority, 1)))
    eta = max(1.0, round(eta, 1))
    delay_prob = round(max(0.0, min(1.0, delay_prob)), 3)

    return {"priority_score": priority, "eta_minutes": eta, "delay_risk": delay_prob}


def predict_batch(orders: list) -> list:
    return [predict_order(o) for o in orders]
