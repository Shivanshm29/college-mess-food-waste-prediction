"""
Automated Test Suite for Student Meal Intentions, Persistence, and Manager Monitoring.

Covers all 15 requirements:
1. Student submitting an intention successfully.
2. Student updating an existing intention without creating a duplicate (upsert).
3. Student withdrawing an intention before cutoff deadline.
4. Rejection of submissions after cutoff deadline.
5. Rejection of invalid intention statuses and unsupported meal types.
6. Cross-student tenant isolation (student cannot delete/access another student's intentions).
7. Non-manager access prevention (student receives HTTP 403 on manager intention endpoints).
8. Correct aggregate counts for breakfast, lunch, and dinner.
9. Correct distinct calculation of unique students versus total meal intentions.
10. Correct no-response counts for configured capacity (556).
11. Persistence of intention records in the database.
12. Manager dashboard updates dynamically after intentions change.
13. Graceful handling of empty results for dates without submissions.
14. Intentions are clearly distinguished from actual recorded attendance.
15. No automated model retraining occurs upon intention submissions.
"""

from datetime import date, datetime, timedelta
import pytest
from fastapi import status
from backend.app.config import settings
from backend.app.ml_service import ml_service
from backend.app.models import MealIntention, MealIntentionAudit


def test_student_submit_intention_success(client, student_auth_headers):
    """1. A student submits an intention successfully."""
    future_date = (date.today() + timedelta(days=2)).isoformat()
    payload = {
        "date": future_date,
        "meal_type": "Lunch",
        "status": "likely",
        "notes": "Attending with hostel friends",
    }
    resp = client.post("/api/student/intentions", headers=student_auth_headers, json=payload)
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    assert data["date"] == future_date
    assert data["meal_type"] == "Lunch"
    assert data["status"] == "likely"
    assert data["notes"] == "Attending with hostel friends"
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data


def test_student_update_intention_without_duplicate(client, student_auth_headers, db_session, student_user):
    """2. A student updating an existing intention updates the record without creating a duplicate."""
    future_date = (date.today() + timedelta(days=3)).isoformat()
    payload = {
        "date": future_date,
        "meal_type": "Dinner",
        "status": "likely",
    }
    # Initial creation
    resp1 = client.post("/api/student/intentions", headers=student_auth_headers, json=payload)
    assert resp1.status_code == status.HTTP_200_OK
    int_id = resp1.json()["id"]

    # Update to 'unlikely'
    payload["status"] = "unlikely"
    resp2 = client.post("/api/student/intentions", headers=student_auth_headers, json=payload)
    assert resp2.status_code == status.HTTP_200_OK
    data2 = resp2.json()
    assert data2["id"] == int_id
    assert data2["status"] == "unlikely"

    # Verify only ONE record exists in the database for this student+date+meal
    count = (
        db_session.query(MealIntention)
        .filter(
            MealIntention.user_id == student_user.id,
            MealIntention.date == future_date,
            MealIntention.meal_type == "Dinner",
        )
        .count()
    )
    assert count == 1


def test_student_withdraw_intention_before_deadline(client, student_auth_headers):
    """3. A student withdrawing an intention before the deadline."""
    future_date = (date.today() + timedelta(days=2)).isoformat()
    payload = {"date": future_date, "meal_type": "Breakfast", "status": "likely"}
    resp = client.post("/api/student/intentions", headers=student_auth_headers, json=payload)
    int_id = resp.json()["id"]

    # Withdraw
    del_resp = client.delete(f"/api/student/intentions/{int_id}", headers=student_auth_headers)
    assert del_resp.status_code == status.HTTP_200_OK
    assert "withdrawn successfully" in del_resp.json()["message"]


def test_rejection_of_submissions_after_deadline(client, student_auth_headers):
    """4. Rejection of submissions after the deadline."""
    past_date = (date.today() - timedelta(days=1)).isoformat()
    payload = {"date": past_date, "meal_type": "Lunch", "status": "likely"}
    resp = client.post("/api/student/intentions", headers=student_auth_headers, json=payload)
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert "deadline has passed" in resp.json()["detail"].lower()


def test_rejection_of_invalid_status_and_meal_type(client, student_auth_headers):
    """5. Rejection of invalid intention statuses and meal types."""
    future_date = (date.today() + timedelta(days=2)).isoformat()

    # Invalid status
    resp_status = client.post(
        "/api/student/intentions",
        headers=student_auth_headers,
        json={"date": future_date, "meal_type": "Lunch", "status": "definitely_coming"},
    )
    assert resp_status.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Unsupported meal type
    resp_meal = client.post(
        "/api/student/intentions",
        headers=student_auth_headers,
        json={"date": future_date, "meal_type": "MidnightSnack", "status": "likely"},
    )
    assert resp_meal.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_prevention_of_cross_student_access(client, student_auth_headers, second_student_auth_headers):
    """6. Prevention of one student accessing or modifying another student's records."""
    future_date = (date.today() + timedelta(days=2)).isoformat()
    # Student 1 creates intention
    res1 = client.post(
        "/api/student/intentions",
        headers=student_auth_headers,
        json={"date": future_date, "meal_type": "Lunch", "status": "likely"},
    )
    int1_id = res1.json()["id"]

    # Student 2 attempts to delete Student 1's intention -> must return 404 (not owned)
    del_res = client.delete(f"/api/student/intentions/{int1_id}", headers=second_student_auth_headers)
    assert del_res.status_code == status.HTTP_404_NOT_FOUND

    # Student 2's intentions list must not contain Student 1's record
    list_res = client.get("/api/student/intentions", headers=second_student_auth_headers)
    assert list_res.status_code == status.HTTP_200_OK
    assert not any(i["id"] == int1_id for i in list_res.json())


def test_student_forbidden_from_manager_intention_endpoints(client, student_auth_headers):
    """7. Prevention of non-manager users accessing manager intention endpoints (HTTP 403)."""
    # Manager summary
    res1 = client.get("/api/intentions/summary", headers=student_auth_headers)
    assert res1.status_code == status.HTTP_403_FORBIDDEN

    # Manager paginated list
    res2 = client.get("/api/intentions", headers=student_auth_headers)
    assert res2.status_code == status.HTTP_403_FORBIDDEN

    # Manager dataset export
    res3 = client.get("/api/intentions/export", headers=student_auth_headers)
    assert res3.status_code == status.HTTP_403_FORBIDDEN


def test_aggregate_counts_and_distinct_unique_students(
    client, student_auth_headers, second_student_auth_headers, auth_headers
):
    """
    8. Correct aggregate counts for breakfast, lunch, and dinner.
    9. Correct calculation of unique students versus total meal intentions.
    10. Correct no-response counts for configured student population (556).
    """
    target_date = (date.today() + timedelta(days=4)).isoformat()

    # Student 1 submits for Breakfast, Lunch, Dinner (3 meal intentions, 1 unique student)
    client.post(
        "/api/student/intentions",
        headers=student_auth_headers,
        json={"date": target_date, "meal_type": "Breakfast", "status": "likely"},
    )
    client.post(
        "/api/student/intentions",
        headers=student_auth_headers,
        json={"date": target_date, "meal_type": "Lunch", "status": "likely"},
    )
    client.post(
        "/api/student/intentions",
        headers=student_auth_headers,
        json={"date": target_date, "meal_type": "Dinner", "status": "unlikely"},
    )

    # Student 2 submits for Lunch only (1 meal intention, adds to unique students)
    client.post(
        "/api/student/intentions",
        headers=second_student_auth_headers,
        json={"date": target_date, "meal_type": "Lunch", "status": "likely"},
    )

    # Manager queries aggregate summary for target_date
    summary_res = client.get(f"/api/intentions/summary?date={target_date}", headers=auth_headers)
    assert summary_res.status_code == status.HTTP_200_OK
    summary = summary_res.json()

    # Verification of unique students vs total intentions
    # Student 1 (3 meals) + Student 2 (1 meal) = 4 total submitted intentions
    assert summary["total_submitted_intentions"] == 4
    # But only 2 distinct unique students! (Student 1 is NOT counted 3 times)
    assert summary["total_unique_students"] == 2
    assert summary["configured_capacity"] == settings.DEFAULT_MESS_CAPACITY

    # Verify per-meal breakdowns
    meals_dict = {m["meal_type"]: m for m in summary["meals"]}

    # Breakfast: 1 likely, 0 unlikely
    bf = meals_dict["Breakfast"]
    assert bf["likely_count"] == 1
    assert bf["unlikely_count"] == 0
    assert bf["total_submitted"] == 1
    assert bf["no_response_count"] == 556 - 1

    # Lunch: 2 likely, 0 unlikely
    lu = meals_dict["Lunch"]
    assert lu["likely_count"] == 2
    assert lu["unlikely_count"] == 0
    assert lu["total_submitted"] == 2
    assert lu["no_response_count"] == 556 - 2

    # Dinner: 0 likely, 1 unlikely
    dn = meals_dict["Dinner"]
    assert dn["likely_count"] == 0
    assert dn["unlikely_count"] == 1
    assert dn["total_submitted"] == 1
    assert dn["no_response_count"] == 556 - 1


def test_persistence_of_records(client, student_auth_headers, db_session, student_user):
    """11. Persistence of records in database."""
    future_date = (date.today() + timedelta(days=5)).isoformat()
    client.post(
        "/api/student/intentions",
        headers=student_auth_headers,
        json={"date": future_date, "meal_type": "Lunch", "status": "likely"},
    )

    # Directly inspect database session to verify persistent commit
    record = (
        db_session.query(MealIntention)
        .filter(MealIntention.user_id == student_user.id, MealIntention.date == future_date)
        .first()
    )
    assert record is not None
    assert record.status == "likely"
    assert record.created_at is not None


def test_manager_dashboard_updates_after_intentions_change(client, student_auth_headers, auth_headers):
    """12. Correct manager dashboard updates after intentions are changed."""
    target_date = (date.today() + timedelta(days=6)).isoformat()

    # 1. Student submits likely for lunch
    res = client.post(
        "/api/student/intentions",
        headers=student_auth_headers,
        json={"date": target_date, "meal_type": "Lunch", "status": "likely"},
    )
    int_id = res.json()["id"]

    # Initial manager check
    s1 = client.get(f"/api/intentions/summary?date={target_date}", headers=auth_headers).json()
    lunch1 = next(m for m in s1["meals"] if m["meal_type"] == "Lunch")
    assert lunch1["likely_count"] == 1
    assert lunch1["unlikely_count"] == 0

    # 2. Student changes intention to unlikely
    client.post(
        "/api/student/intentions",
        headers=student_auth_headers,
        json={"date": target_date, "meal_type": "Lunch", "status": "unlikely"},
    )

    # Manager check updates immediately
    s2 = client.get(f"/api/intentions/summary?date={target_date}", headers=auth_headers).json()
    lunch2 = next(m for m in s2["meals"] if m["meal_type"] == "Lunch")
    assert lunch2["likely_count"] == 0
    assert lunch2["unlikely_count"] == 1

    # 3. Student withdraws
    client.delete(f"/api/student/intentions/{int_id}", headers=student_auth_headers)
    s3 = client.get(f"/api/intentions/summary?date={target_date}", headers=auth_headers).json()
    lunch3 = next(m for m in s3["meals"] if m["meal_type"] == "Lunch")
    assert lunch3["likely_count"] == 0
    assert lunch3["unlikely_count"] == 0
    assert lunch3["total_submitted"] == 0


def test_graceful_handling_of_empty_results(client, auth_headers):
    """13. Graceful handling of empty results for dates without submissions."""
    far_future = "2027-12-31"
    resp = client.get(f"/api/intentions/summary?date={far_future}", headers=auth_headers)
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    assert data["date"] == far_future
    assert data["total_submitted_intentions"] == 0
    assert data["total_unique_students"] == 0
    for m in data["meals"]:
        assert m["likely_count"] == 0
        assert m["total_submitted"] == 0
        assert m["no_response_count"] == settings.DEFAULT_MESS_CAPACITY


def test_intentions_separated_from_actual_measurements(client, student_auth_headers, auth_headers):
    """14. Confirmation that student intentions are not represented as actual attendance."""
    target_date = (date.today() + timedelta(days=7)).isoformat()
    client.post(
        "/api/student/intentions",
        headers=student_auth_headers,
        json={"date": target_date, "meal_type": "Lunch", "status": "likely"},
    )

    # Manager creates a prediction for this date
    pred_res = client.post(
        "/api/predictions",
        headers=auth_headers,
        json={
            "date": target_date,
            "meal_type": "Lunch",
            "main_menu_items": "Paneer, Dal, Rice",
            "mess_capacity_students": 556,
        },
    )
    assert pred_res.status_code == status.HTTP_201_CREATED
    pred_data = pred_res.json()

    # Intentions context is provided as decision support
    assert pred_data["intentions_likely_count"] == 1
    assert pred_data["intentions_total_submitted"] == 1

    # Actual attendance is strictly null until physical measurements are observed
    assert pred_data["actual_attendance"] is None
    assert pred_data["actual_food_prepared_kg"] is None
    assert pred_data["has_actuals"] is False


def test_no_automatic_model_retraining(client, student_auth_headers):
    """15. Confirmation that no automatic model retraining occurs upon intention submissions."""
    initial_version = ml_service.model_version
    future_date = (date.today() + timedelta(days=2)).isoformat()

    # Student submits intention
    client.post(
        "/api/student/intentions",
        headers=student_auth_headers,
        json={"date": future_date, "meal_type": "Dinner", "status": "likely"},
    )

    # Model remains identical: no retraining or weights replacement
    assert ml_service.model_version == initial_version
    assert ml_service.is_loaded is True


def test_manager_can_view_student_names_roster_by_intention(
    client, student_auth_headers, auth_headers, student_user
):
    """Mess manager can view categorized list of student names (Yes, No, Maybe) who showed intentions."""
    target_date = (date.today() + timedelta(days=4)).isoformat()

    # 1. Non-manager receives 403 Forbidden
    roster_student_res = client.get(f"/api/intentions/roster?date={target_date}", headers=student_auth_headers)
    assert roster_student_res.status_code == status.HTTP_403_FORBIDDEN

    # 2. Student submits "likely" (Yes) for Lunch
    client.post(
        "/api/student/intentions",
        headers=student_auth_headers,
        json={"date": target_date, "meal_type": "Lunch", "status": "likely", "notes": "Vegetarian feast"},
    )

    # 3. Manager queries roster
    roster_res = client.get(f"/api/intentions/roster?date={target_date}&meal_type=Lunch", headers=auth_headers)
    assert roster_res.status_code == status.HTTP_200_OK
    roster = roster_res.json()

    assert roster["total_responded"] == 1
    assert roster["likely_count"] == 1
    assert roster["unlikely_count"] == 0
    assert roster["unsure_count"] == 0

    assert len(roster["students_likely"]) == 1
    student_entry = roster["students_likely"][0]
    assert student_entry["student_username"] == student_user.username
    assert student_entry["student_name"] == (student_user.full_name or student_user.username)
    assert student_entry["intention_status"] == "likely"
    assert student_entry["notes"] == "Vegetarian feast"


def test_student_sees_special_menu_notice_not_random_items(client, student_auth_headers, auth_headers):
    """When a meal is special, student gets a notification that it's special, not random menu items."""
    target_date = (date.today() + timedelta(days=3)).isoformat()

    # Manager registers a prediction marked as Special Feast
    client.post(
        "/api/predictions",
        headers=auth_headers,
        json={
            "date": target_date,
            "meal_type": "Dinner",
            "main_menu_items": "Special",
            "special_meal": "Yes",
            "mess_capacity_students": 556,
        },
    )

    # Student views schedule / dashboard
    res = client.get(f"/api/student/schedule?start_date={target_date}&days=1", headers=student_auth_headers)
    assert res.status_code == status.HTTP_200_OK
    meals = res.json()["days"][0]["meals"]
    dinner = next(m for m in meals if m["meal_type"] == "Dinner")

    assert dinner["is_special"] is True
    assert dinner["category"] == "Special Feast"
    assert "Special Menu" in dinner["menu_items"]
    assert dinner["special_notice"] is not None
    assert "Special Menu Notice" in dinner["special_notice"]
