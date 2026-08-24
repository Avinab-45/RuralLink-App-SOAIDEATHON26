"""OpenRouteService integration: road travel-time matrix and road geometry."""
from __future__ import annotations

import math
from typing import Iterable
import httpx

from app.config import ORS_API_KEY, ORS_BASE_URL


def road_matrix(points: list[tuple[float, float]]) -> list[list[float]] | None:
    """Return driving durations in seconds, in the same point order.

    ORS takes longitude/latitude whereas the rest of the application stores
    latitude/longitude.  Returning None deliberately makes fallback visible.
    """
    if not ORS_API_KEY or len(points) < 2:
        return None
    try:
        response = httpx.post(
            f"{ORS_BASE_URL}/v2/matrix/driving-car",
            headers={"Authorization": ORS_API_KEY},
            json={"locations": [[lon, lat] for lat, lon in points], "metrics": ["duration"]},
            timeout=20,
        )
        response.raise_for_status()
        return response.json()["durations"]
    except (httpx.HTTPError, KeyError, TypeError):
        return None


def road_route(points: Iterable[tuple[float, float]]) -> dict | None:
    """Get a navigable GeoJSON LineString and ORS distance/duration summary."""
    points = list(points)
    if not ORS_API_KEY or len(points) < 2:
        return None
    try:
        response = httpx.post(
            f"{ORS_BASE_URL}/v2/directions/driving-car/geojson",
            headers={"Authorization": ORS_API_KEY},
            json={"coordinates": [[lon, lat] for lat, lon in points]},
            timeout=30,
        )
        response.raise_for_status()
        feature = response.json()["features"][0]
        summary = feature["properties"]["summary"]
        return {
            "coordinates": [[lat, lon] for lon, lat in feature["geometry"]["coordinates"]],
            "distance_km": round(float(summary["distance"]) / 1000, 2),
            "duration_minutes": round(float(summary["duration"]) / 60, 1),
            "routing_mode": "openrouteservice driving-car",
        }
    except (httpx.HTTPError, KeyError, TypeError, ValueError):
        return None


def fallback_route(points: Iterable[tuple[float, float]], speed_kmph: float = 30.0) -> dict:
    """Honest development fallback. It is never labelled as a road route."""
    points = list(points)
    distance = sum(_haversine_km(a, b) for a, b in zip(points, points[1:]))
    return {
        "coordinates": [[lat, lon] for lat, lon in points], "distance_km": round(distance, 2),
        "duration_minutes": round(distance / speed_kmph * 60, 1),
        "routing_mode": "straight-line fallback (set ORS_API_KEY for road routing)",
    }


def _haversine_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lon1, lat2, lon2 = map(math.radians, (*a, *b))
    x = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(x))
