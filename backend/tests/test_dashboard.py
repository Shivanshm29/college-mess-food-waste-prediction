import pytest
from fastapi import status


def test_dashboard_empty_state(client, auth_headers):
    response = client.get("/api/dashboard/summary", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["has_history"] is False
    assert data["total_predictions"] == 0
    assert data["avg_expected_students"] == 0.0
    assert data["avg_expected_food_kg"] == 0.0
    assert data["avg_expected_wastage_kg"] == 0.0
    assert len(data["recent_predictions"]) == 0
    assert len(data["meal_wise_summary"]) == 0


def test_analytics_empty_state(client, auth_headers):
    response = client.get("/api/analytics/summary", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["has_history"] is False
    assert data["total_records"] == 0
    assert data["total_expected_food_kg"] == 0.0
    assert data["total_expected_wastage_kg"] == 0.0
    assert len(data["timeline"]) == 0


def test_dashboard_and_analytics_with_history(client, auth_headers):
    # Add 2 predictions
    p1 = {
        "date": "2026-10-20",
        "meal_type": "Lunch",
        "main_menu_items": "Mix Veg, Dal Fry, Jeera Rice, Chapati, Fried Papad, Bundi Raita",
        "special_meal": "No",
        "mess_capacity_students": 556,
        "is_holiday": False,
        "exam_on_day": False,
        "college_event": False,
        "weather_condition": "Clear",
    }
    p2 = {
        "date": "2026-10-20",
        "meal_type": "Dinner",
        "main_menu_items": "Matar Mushroom, Chana Dal, Rice, Chapati",
        "special_meal": "No",
        "mess_capacity_students": 556,
        "is_holiday": False,
        "exam_on_day": False,
        "college_event": False,
        "weather_condition": "Clear",
    }

    client.post("/api/predictions", headers=auth_headers, json=p1)
    client.post("/api/predictions", headers=auth_headers, json=p2)

    # Dashboard check
    dash = client.get("/api/dashboard/summary", headers=auth_headers)
    assert dash.status_code == status.HTTP_200_OK
    d_data = dash.json()
    assert d_data["has_history"] is True
    assert d_data["total_predictions"] == 2
    assert d_data["avg_expected_students"] > 0
    assert d_data["avg_expected_food_kg"] > 0
    assert len(d_data["recent_predictions"]) == 2
    assert len(d_data["meal_wise_summary"]) == 2

    # Analytics check
    analytics = client.get("/api/analytics/summary", headers=auth_headers)
    assert analytics.status_code == status.HTTP_200_OK
    a_data = analytics.json()
    assert a_data["has_history"] is True
    assert a_data["total_records"] == 2
    assert a_data["total_expected_food_kg"] > 0
    assert len(a_data["timeline"]) == 2
