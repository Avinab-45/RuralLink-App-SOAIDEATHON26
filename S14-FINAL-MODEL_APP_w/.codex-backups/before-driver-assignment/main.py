"""
main.py -- FastAPI backend
---------------------------------
Endpoints
    POST /parse-message      Gemini: free text -> structured JSON
    POST /predict             Random Forest: structured order -> priority/ETA/delay-risk
    POST /optimize-route      OR-Tools: orders (+ predictions) -> best route
    POST /process-order       message -> Gemini -> structured -> RF predictions (single order)
    POST /plan-deliveries     FULL PIPELINE: messages -> Gemini -> RF -> OR-Tools -> route
    GET  /health

Run locally:
    uvicorn app.main:app --reload --port 8000

Then test with Postman/curl against http://127.0.0.1:8000/docs (Swagger UI
is generated automatically).
"""

from contextlib import asynccontextmanager
import math
from uuid import uuid4
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app import gemini_service, ml_service
from app.config import DEFAULT_COORDS, KNOWN_VILLAGE_COORDS
from app.database import (
    create_customer_order,
    get_customer_order,
    initialize_database,
    list_customer_orders,
    list_driver_deliveries,
    save_driver_location,
    update_delivery_status,
    update_customer_route,
)
from app.route_optimizer import optimize_routes
from app.routing_service import fallback_route, road_route
from app.schemas import (
    FarmerMessage,
    FullPipelineRequest,
    PredictionResult,
    RouteOptimizationRequest,
    RouteOptimizationResponse,
    StructuredOrder,
    CustomerOrderRequest,
    PlanSavedOrdersRequest,
)

@asynccontextmanager
async def lifespan(_app: FastAPI):
    initialize_database()
    yield


app = FastAPI(
    title="AI-Powered Delivery Prioritization & Route Optimization System",
    description="Order -> AI/ML (priority, ETA, delay-risk) -> OR-Tools -> Best Route",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# The supplied driver PWA uses root-relative /api URLs. Serving its built
# assets from FastAPI keeps the PWA and its offline-sync API on one origin.
DRIVER_PWA_DIR = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if DRIVER_PWA_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(DRIVER_PWA_DIR / "assets")), name="driver-assets")
    app.mount("/driver", StaticFiles(directory=str(DRIVER_PWA_DIR), html=True), name="driver-pwa")


@app.get("/health")
def health():
    return {"status": "ok", "services": ["gemini-parser", "ml-predictor", "or-tools-router", "sqlite", "driver-pwa-api"]}


@app.post("/parse-message")
def parse_message(payload: FarmerMessage):
    """Farmer/user free-text message -> Gemini -> structured JSON."""
    structured = gemini_service.parse_farmer_message(payload.message)
    return structured


def _fill_defaults_from_village(order: StructuredOrder) -> StructuredOrder:
    """If distance/coords aren't supplied, approximate them from a village
    coordinate lookup so the demo pipeline runs end-to-end without a real
    geocoding integration."""
    if order.latitude is None or order.longitude is None:
        lat, lon = KNOWN_VILLAGE_COORDS.get(order.village.lower(), DEFAULT_COORDS)
        order.latitude, order.longitude = lat, lon
    return order


@app.post("/predict", response_model=PredictionResult)
def predict(order: StructuredOrder):
    """Structured order -> Random Forest predictions (priority, ETA, delay-risk)."""
    try:
        result = ml_service.predict_order(order)
    except FileNotFoundError:
        raise HTTPException(
            status_code=503,
            detail="Model artifacts not found. Run `python models/train_models.py` first.",
        )
    return PredictionResult(order_id=order.order_id, village=order.village, **result)


@app.post("/optimize-route", response_model=RouteOptimizationResponse)
def optimize_route(payload: RouteOptimizationRequest):
    """Orders (with ML predictions already attached, or computed here on the
    fly if missing) -> OR-Tools best route."""
    enriched_orders = []
    for order in payload.orders:
        order = _fill_defaults_from_village(order)
        prediction = ml_service.predict_order(order)
        merged = {**order.model_dump(), **prediction}
        enriched_orders.append(merged)

    result = optimize_routes(
        depot=(payload.depot_latitude, payload.depot_longitude),
        orders=enriched_orders,
        num_vehicles=payload.num_vehicles,
        vehicle_speed_kmph=payload.vehicle_speed_kmph,
    )
    return RouteOptimizationResponse(
        vehicle_routes=result["vehicle_routes"],
        total_distance_km=result["total_distance_km"],
        notes=(
            "Route sequencing is biased toward higher priority_score / delay_risk "
            "orders (see ALPHA in app/route_optimizer.py), not just shortest distance."
        ),
    )


@app.post("/process-order", response_model=PredictionResult)
def process_order(payload: FarmerMessage):
    """Single-order shortcut: message -> Gemini -> structured -> RF predictions."""
    structured = gemini_service.parse_farmer_message(payload.message)
    order = StructuredOrder(
        village=structured.get("village", "Unknown"),
        category=structured.get("category", "groceries"),
        urgency=structured.get("urgency", "normal"),
        distance_km=10.0,  # placeholder until real distance/geocoding is wired in
    )
    order = _fill_defaults_from_village(order)
    prediction = ml_service.predict_order(order)
    return PredictionResult(order_id=None, village=order.village, **prediction)


@app.post("/api/orders", status_code=201)
def create_order(payload: CustomerOrderRequest):
    """Customer entry point: text -> parser -> ML -> SQLite, in one request."""
    parsed = gemini_service.parse_farmer_message(payload.message)
    order_id = f"ORD-{uuid4().hex[:8].upper()}"
    order = StructuredOrder(
        order_id=order_id, village=parsed.get("village", "Unknown"),
        category=parsed.get("category", "groceries"), urgency=parsed.get("urgency", "normal"),
        latitude=payload.latitude, longitude=payload.longitude,
        distance_km=10.0, order_weight_kg=payload.weight_kg,
        customer_priority_flag=int(parsed.get("urgency") in {"high", "emergency"}),
    )
    order = _fill_defaults_from_village(order)
    prediction = ml_service.predict_order(order)
    return create_customer_order({
        "order_id": order_id, "customer_name": payload.customer_name, "phone": payload.phone,
        "raw_message": payload.message, "village": order.village, "latitude": order.latitude,
        "longitude": order.longitude, "category": order.category, "urgency": order.urgency,
        "notes": parsed.get("notes", ""), **prediction,
    })


@app.get("/api/orders")
def customer_orders():
    return list_customer_orders()


@app.post("/api/orders/plan")
def plan_saved_orders(payload: PlanSavedOrdersRequest):
    """Operations entry point: persisted orders -> OR-Tools -> road geometry."""
    rows = list_customer_orders()
    if not rows:
        return {"vehicle_routes": [[]], "total_distance_km": 0, "road_route": None, "notes": "No customer orders to plan."}
    orders = [{
        "order_id": row["order_id"], "village": row["village"], "latitude": row["latitude"], "longitude": row["longitude"],
        "priority_score": row["priority_score"], "eta_minutes": row["eta_minutes"], "delay_risk": row["delay_risk"],
    } for row in rows]
    result = optimize_routes((payload.depot_latitude, payload.depot_longitude), orders, payload.num_vehicles)
    ordered_ids = [stop["order_id"] for route in result["vehicle_routes"] for stop in route]
    update_customer_route(ordered_ids)
    first_route = result["vehicle_routes"][0] if result["vehicle_routes"] else []
    by_id = {o["order_id"]: o for o in orders}
    points = [(payload.depot_latitude, payload.depot_longitude)] + [(by_id[s["order_id"]]["latitude"], by_id[s["order_id"]]["longitude"]) for s in first_route]
    road = road_route(points) or fallback_route(points)
    return {**result, "road_route": road, "notes": "Saved orders: parser -> ML -> SQLite -> OR-Tools -> road route."}


@app.get("/api/orders/{order_id}")
def customer_order(order_id: str):
    order = get_customer_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@app.post("/plan-deliveries", response_model=RouteOptimizationResponse)
def plan_deliveries(payload: FullPipelineRequest):
    """
    FULL PIPELINE, exactly matching the requested architecture:
      Farmer/User Message -> Gemini -> FastAPI -> Random Forest -> OR-Tools -> Best Route
    """
    enriched_orders = []
    for i, msg in enumerate(payload.messages):
        structured = gemini_service.parse_farmer_message(msg.message)
        order = StructuredOrder(
            order_id=f"ORD-{i+1}",
            village=structured.get("village", "Unknown"),
            category=structured.get("category", "groceries"),
            urgency=structured.get("urgency", "normal"),
            distance_km=10.0,  # placeholder -- replace with a real distance/geocoding lookup
        )
        order = _fill_defaults_from_village(order)
        prediction = ml_service.predict_order(order)
        enriched_orders.append({**order.model_dump(), **prediction})

    result = optimize_routes(
        depot=(payload.depot_latitude, payload.depot_longitude),
        orders=enriched_orders,
        num_vehicles=payload.num_vehicles,
    )
    return RouteOptimizationResponse(
        vehicle_routes=result["vehicle_routes"],
        total_distance_km=result["total_distance_km"],
        notes="Full pipeline: Gemini NLP parsing -> Random Forest predictions -> OR-Tools routing.",
    )


# Driver PWA API -------------------------------------------------------------
# These paths preserve the PWA contract while replacing the original Spring
# in-memory responses with the shared CSV-seeded SQLite database.

@app.post("/api/driver/login")
def driver_login(credentials: dict):
    driver_id = credentials.get("driverId", "D0001")
    deliveries = list_driver_deliveries(driver_id)
    if not deliveries:
        raise HTTPException(status_code=404, detail="Driver not found or has no assigned deliveries")
    return {
        "token": f"demo-token-{driver_id}", "driverId": driver_id,
        "name": driver_id, "assignedVehicleId": "V0001",
    }


@app.get("/api/driver/{driver_id}/deliveries")
def driver_deliveries(driver_id: str):
    return list_driver_deliveries(driver_id)


@app.get("/api/driver/{driver_id}/route")
def driver_route(driver_id: str):
    """Return the driver's assigned Indian GPS stops for the PWA map.

    This route is a priority-first geographic fallback.  Use /plan-deliveries
    when the client needs the full ML + OR-Tools route plan.
    """
    deliveries = list_driver_deliveries(driver_id)
    if not deliveries:
        raise HTTPException(status_code=404, detail="Driver not found or has no assigned deliveries")
    priority_rank = {"HIGH": 0, "MEDICINE": 0, "MEDIUM": 1, "NORMAL": 2, "LOW": 3}
    deliveries.sort(key=lambda item: (priority_rank.get(str(item["priority"]).upper(), 2), item["deliveryId"]))
    depot = (19.8135, 85.8312)  # Puri Central Depot from the supplied locations CSV.
    points = [depot] + [(float(d["latitude"]), float(d["longitude"])) for d in deliveries]
    route_data = road_route(points) or fallback_route(points)
    return {
        "distance": f"{route_data['distance_km']:.1f} km",
        "estimatedTime": f"{round(route_data['duration_minutes'])} min",
        "route": [delivery["dropoffPoint"] for delivery in deliveries],
        "coordinates": route_data["coordinates"],
        "routingMode": route_data["routing_mode"],
    }


@app.get("/api/driver/deliveries")
def driver_deliveries_legacy(driverId: str):
    return list_driver_deliveries(driverId)


@app.post("/api/driver/{driver_id}/location")
def driver_location(driver_id: str, payload: dict):
    try:
        latitude, longitude = float(payload["latitude"]), float(payload["longitude"])
    except (KeyError, TypeError, ValueError):
        raise HTTPException(status_code=422, detail="latitude and longitude are required numeric values")
    save_driver_location(driver_id, latitude, longitude)
    return {"driverId": driver_id, "latitude": latitude, "longitude": longitude, "status": "saved"}


@app.post("/api/driver/location")
def driver_location_legacy(payload: dict):
    return driver_location(payload.get("driverId", "D0001"), payload)


def _update_driver_delivery(delivery_id: str, payload: dict):
    status = str(payload.get("status", "IN_TRANSIT"))
    delivery = update_delivery_status(delivery_id, status)
    if delivery is None:
        raise HTTPException(status_code=404, detail="Delivery not found")
    return delivery


@app.patch("/api/driver/deliveries/{delivery_id}/status")
def driver_delivery_status(delivery_id: str, payload: dict):
    return _update_driver_delivery(delivery_id, payload)


@app.patch("/api/deliveries/{delivery_id}/status")
def delivery_status_legacy(delivery_id: str, payload: dict):
    return _update_driver_delivery(delivery_id, payload)


@app.post("/api/sync")
def sync_offline_updates(payload: dict):
    applied, missing = [], []
    for update in payload.get("updates", []):
        delivery_id = update.get("deliveryId")
        delivery = update_delivery_status(delivery_id, str(update.get("status", "IN_TRANSIT")))
        (applied if delivery else missing).append(delivery_id)
    return {"applied": applied, "missing": missing}


def _haversine_km(first: tuple[float, float], second: tuple[float, float]) -> float:
    radius_km = 6371.0
    lat1, lon1, lat2, lon2 = map(math.radians, (*first, *second))
    a = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 2 * radius_km * math.asin(math.sqrt(a))
