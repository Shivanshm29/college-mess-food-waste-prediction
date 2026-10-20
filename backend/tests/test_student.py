from datetime import date, timedelta
import pytest
from fastapi import status


def test_student_dashboard(client, auth_headers):
    resp = client.get("/api/student/dashboard", headers=auth_headers)
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    assert "today_meals" in data
    assert len(data["today_meals"]) == 3
    assert data["today_meals"][0]["meal_type"] == "Breakfast"
    assert data["today_meals"][1]["meal_type"] == "Lunch"
    assert data["today_meals"][2]["meal_type"] == "Dinner"
    assert "upcoming_meals" in data
    assert "announcements" in data


def test_student_schedule(client, auth_headers):
    resp = client.get("/api/student/schedule?days=7", headers=auth_headers)
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    assert "days" in data
    assert len(data["days"]) == 7
    first_day = data["days"][0]
    assert "meals" in first_day
    assert len(first_day["meals"]) == 3


def test_save_and_update_meal_intention(client, auth_headers):
    # Use a future date to ensure window is open
    future_date = (date.today() + timedelta(days=2)).isoformat()
    payload = {
        "date": future_date,
        "meal_type": "Lunch",
        "status": "likely",
        "notes": "Will attend with hostel mates",
    }
    # 1. Create intention
    resp = client.post("/api/student/intentions", headers=auth_headers, json=payload)
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    assert data["status"] == "likely"
    assert data["meal_type"] == "Lunch"
    assert data["date"] == future_date
    intention_id = data["id"]

    # 2. Update intention (change to unlikely)
    payload["status"] = "unlikely"
    resp_update = client.post("/api/student/intentions", headers=auth_headers, json=payload)
    assert resp_update.status_code == status.HTTP_200_OK
    data_update = resp_update.json()
    assert data_update["id"] == intention_id
    assert data_update["status"] == "unlikely"

    # 3. Retrieve intentions list
    resp_list = client.get("/api/student/intentions", headers=auth_headers)
    assert resp_list.status_code == status.HTTP_200_OK
    items = resp_list.json()
    assert len(items) >= 1
    assert any(i["id"] == intention_id for i in items)

    # 4. Withdraw intention
    resp_del = client.delete(f"/api/student/intentions/{intention_id}", headers=auth_headers)
    assert resp_del.status_code == status.HTTP_200_OK


def test_student_feedback(client, auth_headers):
    today_str = date.today().isoformat()
    feedback_payload = {
        "date": today_str,
        "meal_type": "Lunch",
        "satisfaction_rating": 4,
        "taste_rating": 5,
        "portion_size_rating": "Just right",
        "comments": "Great dal and paneer today!",
        "is_anonymous": False,
    }
    resp = client.post("/api/student/feedback", headers=auth_headers, json=feedback_payload)
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()
    assert data["satisfaction_rating"] == 4
    assert data["portion_size_rating"] == "Just right"

    # Get feedback list
    resp_list = client.get("/api/student/feedback", headers=auth_headers)
    assert resp_list.status_code == status.HTTP_200_OK
    assert len(resp_list.json()) >= 1


def test_student_notifications(client, auth_headers):
    resp = client.get("/api/student/notifications", headers=auth_headers)
    assert resp.status_code == status.HTTP_200_OK
    notifs = resp.json()
    assert len(notifs) >= 1

    first_id = notifs[0]["id"]
    resp_read = client.put(f"/api/student/notifications/{first_id}/read", headers=auth_headers)
    assert resp_read.status_code == status.HTTP_200_OK


def test_student_profile_update(client, auth_headers):
    update_payload = {
        "full_name": "Aarav Sharma",
        "hostel_block": "Hostel Block B",
        "room_number": "312",
        "dietary_preference": "Vegetarian",
        "reminder_cutoff_hours": 2,
    }
    resp = client.put("/api/student/profile", headers=auth_headers, json=update_payload)
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    assert data["full_name"] == "Aarav Sharma"
    assert data["hostel_block"] == "Hostel Block B"
    assert data["room_number"] == "312"
