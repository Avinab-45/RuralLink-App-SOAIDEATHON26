from fastapi.testclient import TestClient

from app.main import app


def test_driver_api_uses_seeded_csv_database():
    with TestClient(app) as client:
        assert client.get("/health").json()["status"] == "ok"
        deliveries = client.get("/api/driver/D0001/deliveries")
        assert deliveries.status_code == 200
        assert deliveries.json()

        delivery_id = deliveries.json()[0]["deliveryId"]
        updated = client.patch(
            f"/api/driver/deliveries/{delivery_id}/status", json={"status": "IN_TRANSIT"}
        )
        assert updated.status_code == 200
        assert updated.json()["status"] == "In Transit"


def test_offline_parser_and_sync_contract():
    with TestClient(app) as client:
        parsed = client.post(
            "/parse-message", json={"message": "Rampur health centre needs medicine urgently"}
        )
        assert parsed.status_code == 200
        assert parsed.json()["category"] == "medicine"

        assert client.post("/api/sync", json={"updates": []}).json() == {"applied": [], "missing": []}
