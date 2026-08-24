"""
train_models.py
---------------------------------
Trains three Random Forest models on data/historical_orders.csv:

  1. priority_model  -> RandomForestRegressor  -> priority_score (0-100)
  2. eta_model       -> RandomForestRegressor  -> eta_minutes
  3. delay_model     -> RandomForestClassifier -> delay probability (0-1)

Saves everything needed for inference (models + encoders + feature order)
into models/artifacts.joblib so app/ml_service.py can load it directly.

Usage:
    python models/train_models.py
(Run from the project root, or from Google Colab after uploading
 data/historical_orders.csv)
"""

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import mean_absolute_error, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

DATA_PATH = "data/historical_orders.csv"
ARTIFACT_PATH = "models/artifacts.joblib"

CATEGORICAL_COLS = ["category", "urgency", "road_type", "weather", "time_of_day"]
NUMERIC_COLS = [
    "distance_km",
    "is_remote",
    "traffic_level",
    "order_weight_kg",
    "past_delay_count",
    "vehicle_capacity_load_pct",
    "customer_priority_flag",
]
FEATURE_COLS = CATEGORICAL_COLS + NUMERIC_COLS


def build_features(df: pd.DataFrame, encoders: dict, fit: bool = False) -> pd.DataFrame:
    """Label-encode categoricals (fitting new encoders if fit=True), return the
    numeric feature matrix in a fixed column order."""
    out = df.copy()
    for col in CATEGORICAL_COLS:
        if fit:
            le = LabelEncoder()
            out[col] = le.fit_transform(out[col].astype(str))
            encoders[col] = le
        else:
            le = encoders[col]
            # handle unseen categories gracefully at inference time
            out[col] = out[col].astype(str).map(
                lambda v: v if v in le.classes_ else le.classes_[0]
            )
            out[col] = le.transform(out[col])
    return out[FEATURE_COLS]


def main():
    df = pd.read_csv(DATA_PATH)
    encoders: dict = {}

    X = build_features(df, encoders, fit=True)
    y_priority = df["priority_score"]
    y_eta = df["eta_minutes"]
    y_delay = df["delayed"]

    X_train, X_test, yp_train, yp_test, ye_train, ye_test, yd_train, yd_test = train_test_split(
        X, y_priority, y_eta, y_delay, test_size=0.2, random_state=42
    )

    # ---- 1. Priority Score model (regression, 0-100) ----
    priority_model = RandomForestRegressor(
        n_estimators=150, max_depth=10, min_samples_leaf=3, random_state=42, n_jobs=-1
    )
    priority_model.fit(X_train, yp_train)
    priority_mae = mean_absolute_error(yp_test, priority_model.predict(X_test))

    # ---- 2. ETA model (regression, minutes) ----
    eta_model = RandomForestRegressor(
        n_estimators=150, max_depth=10, min_samples_leaf=3, random_state=42, n_jobs=-1
    )
    eta_model.fit(X_train, ye_train)
    eta_mae = mean_absolute_error(ye_test, eta_model.predict(X_test))

    # ---- 3. Delay-risk model (classification, outputs probability) ----
    delay_model = RandomForestClassifier(
        n_estimators=150, max_depth=8, min_samples_leaf=3, random_state=42, n_jobs=-1, class_weight="balanced"
    )
    delay_model.fit(X_train, yd_train)
    delay_auc = roc_auc_score(yd_test, delay_model.predict_proba(X_test)[:, 1])

    print(f"Priority MAE : {priority_mae:.2f} (points, out of 100)")
    print(f"ETA MAE      : {eta_mae:.2f} minutes")
    print(f"Delay AUC    : {delay_auc:.3f}")

    artifacts = {
        "priority_model": priority_model,
        "eta_model": eta_model,
        "delay_model": delay_model,
        "encoders": encoders,
        "feature_cols": FEATURE_COLS,
        "categorical_cols": CATEGORICAL_COLS,
        "numeric_cols": NUMERIC_COLS,
    }
    joblib.dump(artifacts, ARTIFACT_PATH, compress=3)
    print(f"\nSaved trained models + encoders to {ARTIFACT_PATH}")


if __name__ == "__main__":
    main()
