import pytest
from fastapi import status
from backend.app.ml_service import ml_service


def test_api_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] in ("healthy", "degraded")
    assert data["database_connected"] is True
    assert "model_loaded" in data


def test_model_info_endpoint(client):
    response = client.get("/api/model/info")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "model_version" in data
    assert "algorithm" in data
    assert "features" in data
    assert "targets" in data
    assert "expected_students" in data["targets"]
    assert "expected_food_required_kg" in data["targets"]
    assert "expected_food_wastage_kg" in data["targets"]
    assert "metrics" in data


    # Check metrics existence
    metrics = data["metrics"]
    for target in ["expected_students", "expected_food_required_kg", "expected_food_wastage_kg"]:
        assert target in metrics
        assert "MAE" in metrics[target]
        assert "RMSE" in metrics[target]
        assert "R2" in metrics[target]

    # Verify operational context statement exists
    disclaimer = data["limitations_disclaimer"]
    assert len(disclaimer) > 10
    assert "operational" in disclaimer.lower() or "model" in disclaimer.lower()


def test_direct_ml_service_inference():
    input_data = {
        "day_of_week": "Friday",
        "is_weekend": False,
        "is_holiday": False,
        "exam_on_day": False,
        "college_event": False,
        "weather_condition": "Clear",
        "meal_type": "Lunch",
        "main_menu_items": "Rajma Masala, Chana Dal, Pulaw Rice, Chapati, Fryums, Dahi",
        "mess_capacity_students": 556,
        "special_meal": "No",
    }
    pred = ml_service.predict(input_data)
    assert 0 <= pred["expected_students"] <= 556
    assert pred["expected_food_required_kg"] >= 0
    assert 0 <= pred["expected_food_wastage_kg"] <= pred["expected_food_required_kg"]


def test_model_preview_endpoint(client, auth_headers):
    payload = {
        "date": "2026-10-19",
        "meal_type": "Dinner",
        "main_menu_items": "Paneer Butter Masala, Roti, Rice, Dal",
        "special_meal": "No",
        "mess_capacity_students": 556,
        "is_holiday": False,
        "exam_on_day": False,
        "college_event": False,
        "weather_condition": "Clear",
    }
    response = client.post("/api/model/preview", headers=auth_headers, json=payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "expected_students" in data
    assert "expected_food_required_kg" in data
    assert "expected_food_wastage_kg" in data
    assert "raw_expected_students" in data
    assert "waste_percentage" in data
    assert "safeguards_triggered" in data
    assert 0 <= data["expected_students"] <= 556

