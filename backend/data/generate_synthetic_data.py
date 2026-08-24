"""
generate_synthetic_data.py
---------------------------------
Generates a synthetic "historical deliveries" dataset that mimics what a
real rural/last-mile delivery operation would log over time.

Run this once (locally or in Colab) to produce data/historical_orders.csv,
which is then used by models/train_models.py to train the three Random
Forest models (priority, ETA, delay-risk).

Replace this script's output with your real historical data as soon as
you have it -- keep the same column names and train_models.py will work
unchanged.
"""

import numpy as np
import pandas as pd

np.random.seed(42)

N = 6000  # number of historical orders to simulate

CATEGORIES = ["medicine", "groceries", "electronics", "clothing", "agricultural_supplies", "documents"]
URGENCY_LEVELS = ["low", "normal", "high", "emergency"]
WEATHER = ["clear", "rain", "storm", "fog"]
ROAD_TYPES = ["paved", "unpaved", "mixed"]
TIME_OF_DAY = ["morning", "afternoon", "evening", "night"]

# base "criticality" weight per category -- medicine/agri supplies matter more
CATEGORY_WEIGHT = {
    "medicine": 40,
    "agricultural_supplies": 18,
    "documents": 12,
    "groceries": 8,
    "clothing": 4,
    "electronics": 6,
}
URGENCY_WEIGHT = {"low": 0, "normal": 15, "high": 30, "emergency": 45}


def generate_row():
    category = np.random.choice(CATEGORIES, p=[0.18, 0.30, 0.12, 0.12, 0.18, 0.10])
    urgency = np.random.choice(URGENCY_LEVELS, p=[0.25, 0.40, 0.25, 0.10])
    distance_km = float(np.round(np.random.exponential(scale=12) + 1, 2))
    distance_km = min(distance_km, 120)
    is_remote = np.random.choice([0, 1], p=[0.6, 0.4])
    road_type = np.random.choice(ROAD_TYPES, p=[0.35, 0.35, 0.30]) if is_remote else np.random.choice(ROAD_TYPES, p=[0.7, 0.1, 0.2])
    weather = np.random.choice(WEATHER, p=[0.6, 0.25, 0.05, 0.10])
    traffic_level = np.random.randint(1, 6)  # 1 (light) - 5 (heavy)
    time_of_day = np.random.choice(TIME_OF_DAY)
    order_weight_kg = float(np.round(np.random.gamma(2, 2), 2))
    past_delay_count = np.random.poisson(1.2)  # this recipient/route's history
    vehicle_capacity_load_pct = np.random.randint(20, 100)  # how full the vehicle already is
    customer_priority_flag = np.random.choice([0, 1], p=[0.85, 0.15])  # VIP / contracted SLA

    # ---- Priority score (0-100): rule-based ground truth + noise ----
    priority = (
        CATEGORY_WEIGHT[category]
        + URGENCY_WEIGHT[urgency]
        + 10 * is_remote
        + 8 * customer_priority_flag
        + np.random.normal(0, 5)
    )
    priority = float(np.clip(priority, 0, 100))

    # ---- ETA (minutes): distance + road/weather/traffic effects ----
    base_speed_kmph = 35
    road_penalty = {"paved": 1.0, "mixed": 1.3, "unpaved": 1.7}[road_type]
    weather_penalty = {"clear": 1.0, "rain": 1.25, "fog": 1.35, "storm": 1.8}[weather]
    traffic_penalty = 1 + 0.12 * traffic_level
    eta_minutes = (distance_km / base_speed_kmph) * 60 * road_penalty * weather_penalty * traffic_penalty
    eta_minutes += 5 if is_remote else 0
    eta_minutes += np.random.normal(0, 4)
    eta_minutes = float(max(5, np.round(eta_minutes, 1)))

    # ---- Delay risk (0/1 label, later trained as probability) ----
    delay_score = (
        0.35 * (road_type == "unpaved")
        + 0.30 * (weather in ("storm", "fog"))
        + 0.05 * traffic_level
        + 0.10 * is_remote
        + 0.15 * (past_delay_count > 2)
        + 0.10 * (vehicle_capacity_load_pct > 85)
        + np.random.normal(0, 0.12)
    )
    delayed = int(delay_score > 0.55)

    return {
        "category": category,
        "urgency": urgency,
        "distance_km": distance_km,
        "is_remote": is_remote,
        "road_type": road_type,
        "weather": weather,
        "traffic_level": traffic_level,
        "time_of_day": time_of_day,
        "order_weight_kg": order_weight_kg,
        "past_delay_count": past_delay_count,
        "vehicle_capacity_load_pct": vehicle_capacity_load_pct,
        "customer_priority_flag": customer_priority_flag,
        "priority_score": round(priority, 1),
        "eta_minutes": eta_minutes,
        "delayed": delayed,
    }


if __name__ == "__main__":
    rows = [generate_row() for _ in range(N)]
    df = pd.DataFrame(rows)
    out_path = "data/historical_orders.csv"
    df.to_csv(out_path, index=False)
    print(f"Wrote {len(df)} rows to {out_path}")
    print(df.head())
    print("\nDelay rate:", df["delayed"].mean().round(3))
