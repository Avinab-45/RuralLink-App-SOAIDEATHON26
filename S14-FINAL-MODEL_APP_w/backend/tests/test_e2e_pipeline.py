from fastapi.testclient import TestClient

from app.main import app


def test_message_to_prediction_to_route_pipeline():
    with TestClient(app) as client:
        prediction = client.post(
            "/process-order", json={"message": "Rampur health centre needs medicine urgently"}
        )
        assert prediction.status_code == 200
        assert 0 <= prediction.json()["delay_risk"] <= 1

        route = client.post(
            "/plan-deliveries",
            json={
                "depot_latitude": 20.2961,
                "depot_longitude": 85.8245,
                "num_vehicles": 1,
                "messages": [
                    {"message": "Rampur health centre needs medicine urgently"},
                    {"message": "Puri farm needs fertilizer soon"},
                ],
            },
        )
        assert route.status_code == 200
        assert len(route.json()["vehicle_routes"][0]) == 2
