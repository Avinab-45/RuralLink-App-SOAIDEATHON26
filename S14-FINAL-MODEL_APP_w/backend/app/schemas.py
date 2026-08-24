"""Pydantic models shared across the FastAPI app."""

from typing import List, Optional
from pydantic import BaseModel, Field


class FarmerMessage(BaseModel):
    message: str = Field(..., example="Rampur health centre needs medicine urgently.")


class StructuredOrder(BaseModel):
    """Output of the Gemini parsing step / direct structured input."""
    order_id: Optional[str] = None
    village: str
    category: str          # medicine, groceries, electronics, clothing, agricultural_supplies, documents
    urgency: str            # low, normal, high, emergency
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    distance_km: float
    is_remote: int = 0
    road_type: str = "mixed"          # paved, unpaved, mixed
    weather: str = "clear"            # clear, rain, storm, fog
    traffic_level: int = 3            # 1-5
    time_of_day: str = "afternoon"    # morning, afternoon, evening, night
    order_weight_kg: float = 2.0
    past_delay_count: int = 0
    vehicle_capacity_load_pct: int = 50
    customer_priority_flag: int = 0


class PredictionResult(BaseModel):
    order_id: Optional[str]
    village: str
    priority_score: float
    eta_minutes: float
    delay_risk: float   # 0-1 probability


class RouteStop(BaseModel):
    order_id: Optional[str]
    village: str
    priority_score: float
    eta_minutes: float
    delay_risk: float
    arrival_sequence: int
    estimated_arrival_minutes: float


class RouteOptimizationRequest(BaseModel):
    depot_latitude: float
    depot_longitude: float
    orders: List[StructuredOrder]
    num_vehicles: int = 1
    vehicle_speed_kmph: float = 30.0


class RouteOptimizationResponse(BaseModel):
    vehicle_routes: List[List[RouteStop]]
    total_distance_km: float
    notes: str


class FullPipelineRequest(BaseModel):
    depot_latitude: float
    depot_longitude: float
    messages: List[FarmerMessage]
    num_vehicles: int = 1


class CustomerOrderRequest(BaseModel):
    customer_name: str = Field(..., min_length=1)
    phone: str = ""
    message: str = Field(..., min_length=3)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    weight_kg: float = 2.0


class PlanSavedOrdersRequest(BaseModel):
    depot_latitude: float = 19.8135
    depot_longitude: float = 85.8312
    num_vehicles: int = 1
