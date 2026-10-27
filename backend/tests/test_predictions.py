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


def test_student_forbidden_from_manager_endpoints(client, student_auth_headers, auth_headers):
    """
    Shneiderman Golden Rule 5 (Prevent Errors) & Access Control:
    Students must NEVER be permitted to access manager operations.
    Backend must return HTTP 403 Forbidden.
    """
    # 1. Student cannot generate or save predictions
    resp_create = client.post("/api/predictions", headers=student_auth_headers, json=SAMPLE_PREDICTION_PAYLOAD)
    assert resp_create.status_code == status.HTTP_403_FORBIDDEN

    # Manager creates a prediction
    res_mgr = client.post("/api/predictions", headers=auth_headers, json=SAMPLE_PREDICTION_PAYLOAD)
    assert res_mgr.status_code == status.HTTP_201_CREATED
    pred_id = res_mgr.json()["id"]

    # 2. Student cannot delete predictions
    resp_del = client.delete(f"/api/predictions/{pred_id}", headers=student_auth_headers)
    assert resp_del.status_code == status.HTTP_403_FORBIDDEN

    # 3. Student cannot record actual outcomes
    actuals_payload = {
        "actual_attendance": 340,
        "actual_food_prepared_kg": 135.0,
        "actual_food_wasted_kg": 6.5,
    }
    resp_actuals = client.post(f"/api/predictions/{pred_id}/actuals", headers=student_auth_headers, json=actuals_payload)
    assert resp_actuals.status_code == status.HTTP_403_FORBIDDEN

    # 4. Student cannot view manager dashboard stats or analytics
    assert client.get("/api/dashboard/summary", headers=student_auth_headers).status_code == status.HTTP_403_FORBIDDEN
    assert client.get("/api/analytics/summary", headers=student_auth_headers).status_code == status.HTTP_403_FORBIDDEN


def test_capacity_validation_bounds(client, auth_headers):
    """Capacity must not exceed 556 or be negative."""
    # Capacity over 556
    over_payload = dict(SAMPLE_PREDICTION_PAYLOAD)
    over_payload["mess_capacity_students"] = 600
    res_over = client.post("/api/predictions", headers=auth_headers, json=over_payload)
    assert res_over.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Negative capacity
    neg_payload = dict(SAMPLE_PREDICTION_PAYLOAD)
    neg_payload["mess_capacity_students"] = -10
    res_neg = client.post("/api/predictions", headers=auth_headers, json=neg_payload)
    assert res_neg.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_special_meal_rule_overlay(client, auth_headers):
    """
    Special-meal rule:
    - Expected attendance target should be at least 94% of capacity, rounded up (523 for 556).
    - Response clearly distinguishes rule target from ML expected students.
    """
    special_payload = dict(SAMPLE_PREDICTION_PAYLOAD)
    special_payload["date"] = "2026-10-24"
    special_payload["special_meal"] = "Yes"
    special_payload["main_menu_items"] = "Special"

    res = client.post("/api/predictions", headers=auth_headers, json=special_payload)
    assert res.status_code == status.HTTP_201_CREATED
    data = res.json()

    assert data["special_meal"] == "Yes"
    assert data["special_meal_target"] == 523
    assert data["rule_target_students"] == 523
    assert "94% of mess capacity" in data["rule_explanation"]


def test_actual_outcome_recording_and_variances(client, auth_headers):
    """
    Golden Rule 1 & 7:
    Manager can record actual post-meal metrics (attendance, food prepared, food wasted)
    and inspect exact differences between actual results and model forecast.
    """
    # 1. Create prediction
    res_create = client.post("/api/predictions", headers=auth_headers, json=SAMPLE_PREDICTION_PAYLOAD)
    assert res_create.status_code == status.HTTP_201_CREATED
    pred = res_create.json()
    pred_id = pred["id"]
    exp_students = pred["expected_students"]
    exp_food = pred["expected_food_required_kg"]
    exp_waste = pred["expected_food_wastage_kg"]

    # Initial state: actuals are None
    assert pred["actual_attendance"] is None
    assert pred["attendance_difference"] is None

    # 2. Record actuals
    actuals_payload = {
        "actual_attendance": 350,
        "actual_food_prepared_kg": 135.5,
        "actual_food_wasted_kg": 7.2,
    }
    res_act = client.post(f"/api/predictions/{pred_id}/actuals", headers=auth_headers, json=actuals_payload)
    assert res_act.status_code == status.HTTP_200_OK
    act_data = res_act.json()

    assert act_data["actual_attendance"] == 350
    assert act_data["actual_food_prepared_kg"] == 135.5
    assert act_data["actual_food_wasted_kg"] == 7.2
    assert act_data["recorded_at"] is not None

    # Verify differences: actual - expected
    assert act_data["attendance_difference"] == round(350 - exp_students, 2)
    assert act_data["food_difference_kg"] == round(135.5 - exp_food, 2)
    assert act_data["waste_difference_kg"] == round(7.2 - exp_waste, 2)


def test_actual_outcome_validation_rejects_invalid(client, auth_headers):
    """Actual outcome inputs must reject negative values and attendance over 556 without clamping."""
    res_create = client.post("/api/predictions", headers=auth_headers, json=SAMPLE_PREDICTION_PAYLOAD)
    assert res_create.status_code == status.HTTP_201_CREATED
    pred_id = res_create.json()["id"]

    # Negative attendance
    res_neg = client.post(
        f"/api/predictions/{pred_id}/actuals",
        headers=auth_headers,
        json={"actual_attendance": -5, "actual_food_prepared_kg": 100.0, "actual_food_wasted_kg": 5.0},
    )
    assert res_neg.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Attendance > 556
    res_over = client.post(
        f"/api/predictions/{pred_id}/actuals",
        headers=auth_headers,
        json={"actual_attendance": 600, "actual_food_prepared_kg": 100.0, "actual_food_wasted_kg": 5.0},
    )
    assert res_over.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Negative food prepared
    res_neg_food = client.post(
        f"/api/predictions/{pred_id}/actuals",
        headers=auth_headers,
        json={"actual_attendance": 300, "actual_food_prepared_kg": -20.0, "actual_food_wasted_kg": 5.0},
    )
    assert res_neg_food.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_actual_outcome_ownership_enforcement(client, auth_headers, other_auth_headers):
    """A manager cannot record actuals on another manager's prediction."""
    res_create = client.post("/api/predictions", headers=auth_headers, json=SAMPLE_PREDICTION_PAYLOAD)
    pred_id = res_create.json()["id"]

    actuals_payload = {"actual_attendance": 320, "actual_food_prepared_kg": 120.0, "actual_food_wasted_kg": 4.0}
    res_other = client.post(f"/api/predictions/{pred_id}/actuals", headers=other_auth_headers, json=actuals_payload)
    assert res_other.status_code == status.HTTP_403_FORBIDDEN


def test_next_available_meal_shortcut(client, auth_headers):
    """
    Shneiderman Rule 7 (Shortcuts):
    Manager can retrieve pre-filled features for the next available upcoming meal slot.
    """
    res = client.get("/api/predictions/next-meal", headers=auth_headers)
    assert res.status_code == status.HTTP_200_OK
    data = res.json()

    assert "date" in data
    assert "meal_type" in data
    assert data["meal_type"] in ("Breakfast", "Lunch", "Snacks", "Dinner")
    assert "main_menu_items" in data
    assert len(data["main_menu_items"]) > 0
    assert data["mess_capacity_students"] == 556
    assert data["weather_condition"] in ("Clear", "Cloudy", "Hot", "Humid", "Rainy")
    assert "label" in data
    assert "time_window" in data


