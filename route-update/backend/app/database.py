"""Small SQLite persistence layer for the supplied operational CSV exports.

The original submission shipped database rows as CSV files and a Spring Boot
demo with an in-memory repository.  This module makes the data durable and
available to both the AI endpoints and the offline driver PWA.
"""

from __future__ import annotations

import csv
import sqlite3
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "database"
DB_PATH = ROOT / "data" / "s14.sqlite3"


def _connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database() -> None:
    """Create a local database once from the supplied CSV data."""
    with _connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS drivers (
                id INTEGER PRIMARY KEY, driver_code TEXT UNIQUE, name TEXT,
                phone TEXT, status TEXT
            );
            CREATE TABLE IF NOT EXISTS vehicles (
                id INTEGER PRIMARY KEY, vehicle_number TEXT, vehicle_type TEXT,
                capacity_kg REAL, status TEXT, has_cold_chain TEXT
            );
            CREATE TABLE IF NOT EXISTS locations (
                id INTEGER PRIMARY KEY, lgd_code TEXT, name TEXT,
                location_type TEXT, latitude REAL, longitude REAL
            );
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY, name TEXT, category TEXT
            );
            CREATE TABLE IF NOT EXISTS deliveries (
                delivery_id TEXT PRIMARY KEY, order_number TEXT, driver_id TEXT,
                pickup_point TEXT, dropoff_point TEXT, latitude REAL, longitude REAL,
                category TEXT, quantity_kg REAL, priority TEXT, status TEXT,
                predicted_priority REAL, predicted_eta_minutes REAL,
                predicted_delay_risk REAL, created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS driver_locations (
                driver_id TEXT PRIMARY KEY, latitude REAL NOT NULL, longitude REAL NOT NULL,
                recorded_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS customer_orders (
                order_id TEXT PRIMARY KEY, customer_name TEXT NOT NULL, phone TEXT,
                raw_message TEXT NOT NULL, village TEXT NOT NULL, latitude REAL,
                longitude REAL, category TEXT NOT NULL, urgency TEXT NOT NULL,
                notes TEXT, status TEXT NOT NULL DEFAULT 'RECEIVED',
                priority_score REAL, eta_minutes REAL, delay_risk REAL,
                route_sequence INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            """
        )
        if connection.execute("SELECT 1 FROM deliveries LIMIT 1").fetchone():
            return

        # The original archive sometimes omits the CSV export folder. A small
        # safe demo seed lets the driver app start while real customer orders
        # are persisted in customer_orders.
        if DATA_DIR.exists():
            _seed_reference_data(connection)
            _seed_deliveries(connection)
        else:
            connection.execute("""INSERT OR IGNORE INTO deliveries
                (delivery_id, order_number, driver_id, pickup_point, dropoff_point, latitude, longitude, category, quantity_kg, priority, status)
                VALUES ('DEL-DEMO-1', 'ORD-DEMO-1', 'D0001', 'Puri Central Depot', 'Puri', 19.8135, 85.8312, 'groceries', 2, 'MEDIUM', 'PENDING')""")


def create_customer_order(order: dict[str, Any]) -> dict[str, Any]:
    with _connection() as connection:
        connection.execute("""INSERT INTO customer_orders
            (order_id, customer_name, phone, raw_message, village, latitude, longitude, category, urgency, notes, priority_score, eta_minutes, delay_risk)
            VALUES (:order_id, :customer_name, :phone, :raw_message, :village, :latitude, :longitude, :category, :urgency, :notes, :priority_score, :eta_minutes, :delay_risk)""", order)
    return get_customer_order(order["order_id"])


def get_customer_order(order_id: str) -> dict[str, Any] | None:
    with _connection() as connection:
        row = connection.execute("SELECT * FROM customer_orders WHERE order_id = ?", (order_id,)).fetchone()
    return dict(row) if row else None


def list_customer_orders() -> list[dict[str, Any]]:
    with _connection() as connection:
        rows = connection.execute("SELECT * FROM customer_orders ORDER BY created_at DESC").fetchall()
    return [dict(row) for row in rows]


def update_customer_route(order_ids: list[str]) -> None:
    with _connection() as connection:
        for sequence, order_id in enumerate(order_ids, 1):
            connection.execute("UPDATE customer_orders SET route_sequence = ?, status = 'PLANNED' WHERE order_id = ?", (sequence, order_id))


def assign_planned_orders_to_drivers(
    orders: list[dict[str, Any]], vehicle_routes: list[list[dict[str, Any]]]
) -> dict[str, str]:
    """Create one driver-visible delivery for each newly planned customer order.

    Customer orders and driver deliveries are deliberately kept as separate
    records.  This bridge is called only after route optimisation, so an order
    is not shown to a driver until operations has planned it.  ``INSERT OR
    IGNORE`` makes re-planning safe: it never replaces an existing delivery or
    its in-progress/completed status.
    """
    orders_by_id = {order["order_id"]: order for order in orders}
    assignments: dict[str, str] = {}

    with _connection() as connection:
        driver_rows = connection.execute(
            "SELECT driver_code FROM drivers ORDER BY driver_code"
        ).fetchall()
        driver_ids = [row["driver_code"] for row in driver_rows] or ["D0001"]

        for vehicle_index, route in enumerate(vehicle_routes):
            driver_id = driver_ids[vehicle_index % len(driver_ids)]
            for stop in route:
                order = orders_by_id.get(stop.get("order_id"))
                if not order:
                    continue

                urgency = str(order.get("urgency") or "normal").lower()
                priority = "HIGH" if urgency in {"high", "emergency"} else "MEDIUM"
                delivery_id = f"DEL-{order['order_id']}"
                cursor = connection.execute(
                    """INSERT OR IGNORE INTO deliveries
                       (delivery_id, order_number, driver_id, pickup_point, dropoff_point,
                        latitude, longitude, category, quantity_kg, priority, status,
                        predicted_priority, predicted_eta_minutes, predicted_delay_risk)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        delivery_id,
                        order["order_id"],
                        driver_id,
                        "Puri Central Depot",
                        order["village"],
                        order["latitude"],
                        order["longitude"],
                        order["category"],
                        0,
                        priority,
                        "PENDING",
                        order.get("priority_score"),
                        order.get("eta_minutes"),
                        order.get("delay_risk"),
                    ),
                )
                if cursor.rowcount:
                    assignments[order["order_id"]] = driver_id
                    connection.execute(
                        "UPDATE customer_orders SET status = 'ASSIGNED' WHERE order_id = ?",
                        (order["order_id"],),
                    )

    return assignments


def _read_csv(name: str) -> list[dict[str, str]]:
    with (DATA_DIR / name).open(encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))


def _seed_reference_data(connection: sqlite3.Connection) -> None:
    for row in _read_csv("drivers_rows.csv"):
        connection.execute(
            "INSERT OR IGNORE INTO drivers VALUES (?, ?, ?, ?, ?)",
            (row["id"], row["driver_code"], row["name"], row["phone"], row["status"]),
        )
    for row in _read_csv("vehicles_rows.csv"):
        connection.execute(
            "INSERT OR IGNORE INTO vehicles VALUES (?, ?, ?, ?, ?, ?)",
            (row["id"], row["vehicle_number"], row["vehicle_type"], row["capacity_kg"], row["status"], row["has_cold_chain"]),
        )
    for row in _read_csv("locations_rows.csv"):
        connection.execute(
            "INSERT OR IGNORE INTO locations VALUES (?, ?, ?, ?, ?, ?)",
            (row["id"], row["lgd_code"], row["name"], row["location_type"], row["latitude"], row["longitude"]),
        )
    for row in _read_csv("products_rows.csv"):
        connection.execute(
            "INSERT OR IGNORE INTO products VALUES (?, ?, ?)",
            (row["id"], row["name"], row["category"]),
        )


def _seed_deliveries(connection: sqlite3.Connection) -> None:
    locations = {row["id"]: row for row in _read_csv("locations_rows.csv")}
    products = {row["id"]: row for row in _read_csv("products_rows.csv")}
    drivers = [row["driver_code"] for row in _read_csv("drivers_rows.csv")] or ["D0001"]
    for index, order in enumerate(_read_csv("orders_rows.csv")):
        destination = locations.get(order["delivery_location_id"], {})
        pickup = locations.get(order["pickup_location_id"], {})
        product = products.get(order["product_id"], {})
        connection.execute(
            """INSERT OR IGNORE INTO deliveries
               (delivery_id, order_number, driver_id, pickup_point, dropoff_point, latitude, longitude,
                category, quantity_kg, priority, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                f"DEL-{order['id']}", order["order_number"], drivers[index % len(drivers)],
                pickup.get("name", "Puri Central Depot"), destination.get("name", "Unknown location"),
                destination.get("latitude", 19.8135), destination.get("longitude", 85.8312),
                product.get("category", "groceries"), order["quantity_kg"], order["priority"], order["status"],
            ),
        )


def list_driver_deliveries(driver_id: str) -> list[dict[str, Any]]:
    with _connection() as connection:
        rows = connection.execute(
            "SELECT * FROM deliveries WHERE driver_id = ? ORDER BY CASE priority WHEN 'HIGH' THEN 0 WHEN 'MEDIUM' THEN 1 ELSE 2 END, delivery_id",
            (driver_id,),
        ).fetchall()
    return [_delivery_response(dict(row)) for row in rows]


def update_delivery_status(delivery_id: str, status: str) -> dict[str, Any] | None:
    with _connection() as connection:
        connection.execute("UPDATE deliveries SET status = ? WHERE delivery_id = ?", (status.upper().replace(" ", "_"), delivery_id))
        row = connection.execute("SELECT * FROM deliveries WHERE delivery_id = ?", (delivery_id,)).fetchone()
    return _delivery_response(dict(row)) if row else None


def save_driver_location(driver_id: str, latitude: float, longitude: float) -> None:
    with _connection() as connection:
        connection.execute(
            """INSERT INTO driver_locations(driver_id, latitude, longitude, recorded_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
               ON CONFLICT(driver_id) DO UPDATE SET latitude=excluded.latitude, longitude=excluded.longitude, recorded_at=CURRENT_TIMESTAMP""",
            (driver_id, latitude, longitude),
        )


def _delivery_response(row: dict[str, Any]) -> dict[str, Any]:
    ui_status = {
        "PENDING": "ASSIGNED",
        "PICKED_UP": "Picked Up",
        "IN_TRANSIT": "In Transit",
        "DELIVERED": "Delivered",
        "FAILED": "Failed",
    }.get(row["status"], row["status"])
    return {
        "deliveryId": row["delivery_id"], "orderNumber": row["order_number"], "pickupPoint": row["pickup_point"],
        "dropoffPoint": row["dropoff_point"], "latitude": row["latitude"], "longitude": row["longitude"],
        "category": row["category"], "quantityKg": row["quantity_kg"], "priority": row["priority"],
        "status": ui_status, "predictedPriority": row["predicted_priority"],
        "predictedEtaMinutes": row["predicted_eta_minutes"], "predictedDelayRisk": row["predicted_delay_risk"],
    }
