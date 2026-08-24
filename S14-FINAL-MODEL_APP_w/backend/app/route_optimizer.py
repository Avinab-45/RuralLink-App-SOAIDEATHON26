"""
route_optimizer.py
---------------------------------
Takes the depot location + a list of orders (each already carrying
priority_score, eta_minutes, delay_risk from the Random Forest models) and
produces an optimized delivery route per vehicle using Google OR-Tools.

Priority handling
------------------
A single global distance-minimizing VRP objective, on its own, will happily
send a vehicle past an urgent stop to grab a closer, less-urgent one first --
that's the opposite of what "give preference to high-priority orders" means.

To guarantee priority actually wins, this module uses a two-level design:

  1. TIERING: every order gets an urgency score
         urgency = 0.7 * priority_score/100 + 0.3 * delay_risk
     and is bucketed into a tier (Emergency > High > Normal > Low).

  2. ORDERING: for each vehicle, its assigned stops are grouped by tier, and
     each tier's stops are visited *before* any lower tier's stops. This is
     a hard guarantee, not a soft bias -- an Emergency order 20km away will
     always be scheduled before a Low-priority order 2km away.

  3. OR-TOOLS OPTIMIZATION: within each tier (where priority is equal),
     Google OR-Tools solves a genuine TSP to minimize travel distance for
     that batch of stops, continuing from wherever the previous tier ended.

Multiple vehicles are load-balanced tier-by-tier (round robin, nearest-first)
so every vehicle gets a fair share of the urgent work rather than one
vehicle getting all the emergencies and another getting none.
"""

import math
from typing import List, Tuple

from ortools.constraint_solver import pywrapcp, routing_enums_pb2
from app.routing_service import road_matrix

TIER_NAMES = ["Emergency", "High", "Normal", "Low"]
TIER_THRESHOLDS = [0.75, 0.55, 0.30]  # urgency >= threshold -> that tier (else Low)


def _haversine_km(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    lat1, lon1 = p1
    lat2, lon2 = p2
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(min(1.0, math.sqrt(a)))


def _resolve_coords(depot, orders):
    """(lat, lon) for [depot] + orders. Orders missing lat/lon are placed at a
    bearing derived from their village name + predicted distance_km from the
    depot -- a stand-in until a real geocoder is wired in for production."""
    coords = [depot]
    for o in orders:
        lat, lon = o.get("latitude"), o.get("longitude")
        if lat is not None and lon is not None:
            coords.append((lat, lon))
        else:
            bearing = math.radians(hash(o.get("village", "")) % 360)
            d_km = o.get("distance_km", 5.0)
            dlat = (d_km / 111.0) * math.cos(bearing)
            dlon = (d_km / (111.0 * math.cos(math.radians(depot[0])) + 1e-6)) * math.sin(bearing)
            coords.append((depot[0] + dlat, depot[1] + dlon))
    return coords


def _urgency(order: dict) -> float:
    return max(0.0, min(1.0, 0.7 * (order.get("priority_score", 0) / 100.0) + 0.3 * order.get("delay_risk", 0.0)))


def _tier_index(urgency: float) -> int:
    for i, thresh in enumerate(TIER_THRESHOLDS):
        if urgency >= thresh:
            return i
    return len(TIER_THRESHOLDS)  # last tier = "Low"


def _solve_tsp_order(start_coord: Tuple[float, float], stop_coords: List[Tuple[float, float]]) -> Tuple[List[int], float]:
    """Given a start point and a list of stop coordinates, use OR-Tools to find
    a short visiting order (closed-tour approximation: solves start->stops->start,
    then the visiting sequence is reported without the return leg).
    Returns (order_of_indices_into_stop_coords, distance_of_outbound_path_km)."""
    if not stop_coords:
        return [], 0.0
    if len(stop_coords) == 1:
        return [0], _haversine_km(start_coord, stop_coords[0])

    all_coords = [start_coord] + stop_coords
    n = len(all_coords)
    # OR-Tools optimizes against real India road travel times when configured.
    # Its fallback stays local and keeps development/test environments working.
    durations = road_matrix(all_coords)
    dist = [[_haversine_km(all_coords[i], all_coords[j]) for j in range(n)] for i in range(n)]
    costs = durations or [[d / 30.0 * 3600.0 for d in row] for row in dist]

    manager = pywrapcp.RoutingIndexManager(n, 1, 0)
    routing = pywrapcp.RoutingModel(manager)

    def dist_callback(from_index, to_index):
        i, j = manager.IndexToNode(from_index), manager.IndexToNode(to_index)
        return int(round(costs[i][j]))

    transit_idx = routing.RegisterTransitCallback(dist_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_idx)

    params = pywrapcp.DefaultRoutingSearchParameters()
    params.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    params.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    params.time_limit.FromSeconds(2)

    solution = routing.SolveWithParameters(params)
    if solution is None:
        order = list(range(len(stop_coords)))
        return order, sum(dist[0][k + 1] for k in order)

    order = []
    index = routing.Start(0)
    outbound_km = 0.0
    prev_node = 0
    while not routing.IsEnd(index):
        index = solution.Value(routing.NextVar(index))
        node = manager.IndexToNode(index)
        if node != 0:
            order.append(node - 1)
            outbound_km += dist[prev_node][node]
            prev_node = node
    return order, outbound_km


def _assign_orders_to_vehicles(order_indices_by_tier: List[List[int]], num_vehicles: int) -> List[List[int]]:
    """Round-robin assignment, tier by tier, so urgent work is spread fairly
    across vehicles instead of piling onto one."""
    vehicle_orders: List[List[int]] = [[] for _ in range(num_vehicles)]
    v = 0
    for tier_indices in order_indices_by_tier:
        for idx in tier_indices:
            vehicle_orders[v % num_vehicles].append(idx)
            v += 1
    return vehicle_orders


def optimize_routes(depot: Tuple[float, float], orders: List[dict], num_vehicles: int = 1,
                     vehicle_speed_kmph: float = 30.0) -> dict:
    """
    orders: list of dicts merging StructuredOrder fields + ML predictions, e.g.
            {"order_id", "village", "distance_km", "latitude", "longitude",
             "priority_score", "eta_minutes", "delay_risk", ...}
    Returns: {"vehicle_routes": [[stop_dict, ...], ...], "total_distance_km": float}
    """
    if not orders:
        return {"vehicle_routes": [[] for _ in range(num_vehicles)], "total_distance_km": 0.0}

    coords = _resolve_coords(depot, orders)[1:]

    tiers: List[List[int]] = [[] for _ in TIER_NAMES]
    for idx, o in enumerate(orders):
        tiers[_tier_index(_urgency(o))].append(idx)

    for tier_indices in tiers:
        tier_indices.sort(key=lambda idx: _haversine_km(depot, coords[idx]))

    vehicle_order_indices = _assign_orders_to_vehicles(tiers, num_vehicles)

    vehicle_routes = []
    total_distance_km = 0.0

    for v in range(num_vehicles):
        assigned = vehicle_order_indices[v]
        assigned_by_tier = [[i for i in assigned if _tier_index(_urgency(orders[i])) == t] for t in range(len(TIER_NAMES))]

        route_stops = []
        seq = 0
        current_pos = depot
        cumulative_minutes = 0.0

        for tier_indices in assigned_by_tier:
            if not tier_indices:
                continue
            stop_coords = [coords[i] for i in tier_indices]
            visit_order, _ = _solve_tsp_order(current_pos, stop_coords)

            for rank in visit_order:
                order_idx = tier_indices[rank]
                o = orders[order_idx]
                leg_km = _haversine_km(current_pos, coords[order_idx])
                cumulative_minutes += (leg_km / vehicle_speed_kmph) * 60.0
                total_distance_km += leg_km
                current_pos = coords[order_idx]
                seq += 1
                route_stops.append({
                    "order_id": o.get("order_id"),
                    "village": o.get("village"),
                    "priority_score": o.get("priority_score"),
                    "eta_minutes": o.get("eta_minutes"),
                    "delay_risk": o.get("delay_risk"),
                    "arrival_sequence": seq,
                    "estimated_arrival_minutes": round(cumulative_minutes, 1),
                })

        vehicle_routes.append(route_stops)

    return {"vehicle_routes": vehicle_routes, "total_distance_km": round(total_distance_km, 2)}
