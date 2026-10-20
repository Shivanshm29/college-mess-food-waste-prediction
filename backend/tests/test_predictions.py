import pytest
from fastapi import status


SAMPLE_PREDICTION_PAYLOAD = {
    "date": "2026-10-19",  # A Monday
    "meal_type": "Lunch",
    "main_menu_items": "Aloo Bhaji, Dal Fry, Rice, Puri + Palak Puri, Fried Papad, Dahi",
    "special_meal": "No",
    "mess_capacity_students": 556,
    "is_holiday": False,
    "exam_on_day": False,
    "college_event": False,
    "weather_condition": "Clear",
    "notes": "Regular working Monday lunch",
}


def test_create_prediction_success_and_bounds(client, auth_headers):
    response = client.post(
        "/api/predictions",
        headers=auth_headers,
        json=SAMPLE_PREDICTION_PAYLOAD,
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()

    # Verify input auto-derivation
    assert data["date"] == "2026-10-19"
    assert data["day_of_week"] == "Monday"
    assert data["is_weekend"] is False
    assert data["meal_type"] == "Lunch"
    assert data["mess_capacity_students"] == 556

    # Verify required prediction bounds
    students = data["expected_students"]
    food = data["expected_food_required_kg"]
    waste = data["expected_food_wastage_kg"]

    # 1. Expected students must be between 0 and capacity
    assert 0 <= students <= 556
    # 2. Food quantity must be nonnegative
    assert food >= 0
    # 3. Wastage must not exceed estimated food quantity and must be nonnegative
    assert 0 <= waste <= food

    # Check calculated convenience fields
    assert "waste_percentage" in data
    assert "food_per_student_kg" in data
    assert data["waste_percentage"] >= 0


def test_weekend_auto_derivation(client, auth_headers):
    # 2026-10-18 is Sunday
    payload = dict(SAMPLE_PREDICTION_PAYLOAD)
    payload["date"] = "2026-10-18"
    response = client.post("/api/predictions", headers=auth_headers, json=payload)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["day_of_week"] == "Sunday"
    assert data["is_weekend"] is True


def test_create_prediction_special_meal_menu(client, auth_headers):
    payload = dict(SAMPLE_PREDICTION_PAYLOAD)
    payload["special_meal"] = "Yes"
    payload["main_menu_items"] = "Special"
    response = client.post("/api/predictions", headers=auth_headers, json=payload)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["special_meal"] == "Yes"
    assert data["main_menu_items"] == "Special"



def test_create_prediction_invalid_date(client, auth_headers):
    payload = dict(SAMPLE_PREDICTION_PAYLOAD)
    payload["date"] = "not-a-date"
    response = client.post("/api/predictions", headers=auth_headers, json=payload)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_create_prediction_invalid_meal_type(client, auth_headers):
    payload = dict(SAMPLE_PREDICTION_PAYLOAD)
    payload["meal_type"] = "MidnightBrunch"
    response = client.post("/api/predictions", headers=auth_headers, json=payload)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_create_prediction_blank_menu(client, auth_headers):
    payload = dict(SAMPLE_PREDICTION_PAYLOAD)
    payload["main_menu_items"] = "   "
    payload["special_meal"] = "No"
    response = client.post("/api/predictions", headers=auth_headers, json=payload)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_history_ownership_and_forbidden_access(client, auth_headers, other_auth_headers):
    # User 1 creates a prediction
    res1 = client.post("/api/predictions", headers=auth_headers, json=SAMPLE_PREDICTION_PAYLOAD)
    assert res1.status_code == status.HTTP_201_CREATED
    pred_id = res1.json()["id"]

    # User 1 can view their own prediction
    res_own = client.get(f"/api/predictions/{pred_id}", headers=auth_headers)
    assert res_own.status_code == status.HTTP_200_OK
    assert res_own.json()["id"] == pred_id

    # User 2 CANNOT view User 1's prediction (Resource ownership test)
    res_forbidden = client.get(f"/api/predictions/{pred_id}", headers=other_auth_headers)
    assert res_forbidden.status_code == status.HTTP_403_FORBIDDEN
    assert "permission" in res_forbidden.json()["detail"].lower()

    # User 2 CANNOT delete User 1's prediction
    res_del_forbidden = client.delete(f"/api/predictions/{pred_id}", headers=other_auth_headers)
    assert res_del_forbidden.status_code == status.HTTP_403_FORBIDDEN

    # User 2's history does NOT include User 1's prediction
    res_other_hist = client.get("/api/predictions", headers=other_auth_headers)
    assert res_other_hist.status_code == status.HTTP_200_OK
    assert res_other_hist.json()["total"] == 0

    # User 1 can delete their own prediction
    res_del = client.delete(f"/api/predictions/{pred_id}", headers=auth_headers)
    assert res_del.status_code == status.HTTP_200_OK


def test_paginated_history_filters(client, auth_headers):
    # Create lunch prediction
    lunch_payload = dict(SAMPLE_PREDICTION_PAYLOAD)
    lunch_payload["meal_type"] = "Lunch"
    lunch_payload["date"] = "2026-10-20"
    client.post("/api/predictions", headers=auth_headers, json=lunch_payload)

    # Create dinner prediction
    dinner_payload = dict(SAMPLE_PREDICTION_PAYLOAD)
    dinner_payload["meal_type"] = "Dinner"
    dinner_payload["date"] = "2026-10-21"
    dinner_payload["main_menu_items"] = "Special"
    dinner_payload["special_meal"] = "Yes"
    client.post("/api/predictions", headers=auth_headers, json=dinner_payload)

    # Filter by meal_type=Dinner
    resp = client.get("/api/predictions?meal_type=Dinner", headers=auth_headers)
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["meal_type"] == "Dinner"

    # Search by keyword
    resp_search = client.get("/api/predictions?search=Special", headers=auth_headers)
    assert resp_search.status_code == status.HTTP_200_OK
    assert resp_search.json()["total"] == 1


def test_create_prediction_returns_recommendations(client, auth_headers):
    # Predict for a scenario that has lower attendance or alternative menus
    payload = dict(SAMPLE_PREDICTION_PAYLOAD)
    payload["date"] = "2026-10-25"
    payload["meal_type"] = "Breakfast"
    payload["main_menu_items"] = "Bread/Butter/Jam, Tea/Coffee, Bournvita, Cornflakes/Fruit, Chana Tari, Sprouts, Poha"

    resp = client.post("/api/predictions", headers=auth_headers, json=payload)
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()

    assert "is_low_turnout" in data
    assert "turnout_percentage" in data
    assert "menu_recommendations" in data
    assert isinstance(data["menu_recommendations"], list)

    if data["menu_recommendations"]:
        first_rec = data["menu_recommendations"][0]
        assert "menu_items" in first_rec
        assert "short_label" in first_rec
        assert "projected_students" in first_rec
        assert "student_delta" in first_rec
        assert "strategy_badge" in first_rec
        assert "reasoning" in first_rec


def test_post_menu_recommendations_endpoint(client, auth_headers):
    rec_payload = {
        "date": "2026-10-22",
        "meal_type": "Lunch",
        "main_menu_items": "Loki Kofta, Dal, Rice, Chapati, Dahi, Lasun Chutney, Fryums",
        "special_meal": "No",
        "mess_capacity_students": 556,
        "weather_condition": "Clear",
    }
    resp = client.post("/api/predictions/recommendations", headers=auth_headers, json=rec_payload)
    assert resp.status_code == status.HTTP_200_OK
    recs = resp.json()
    assert isinstance(recs, list)
    assert len(recs) > 0

    top_rec = recs[0]
    assert top_rec["meal_type"] == "Lunch"
    assert top_rec["menu_items"] != rec_payload["main_menu_items"]
    assert "student_delta" in top_rec
    assert "strategy_badge" in top_rec


def test_get_prediction_recommendations_by_id(client, auth_headers):
    # Create prediction first
    create_resp = client.post("/api/predictions", headers=auth_headers, json=SAMPLE_PREDICTION_PAYLOAD)
    assert create_resp.status_code == status.HTTP_201_CREATED
    pred_id = create_resp.json()["id"]

    # Fetch recommendations for this saved prediction
    rec_resp = client.get(f"/api/predictions/{pred_id}/recommendations", headers=auth_headers)
    assert rec_resp.status_code == status.HTTP_200_OK
    recs = rec_resp.json()
    assert isinstance(recs, list)

