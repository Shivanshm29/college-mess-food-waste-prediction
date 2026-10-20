import pytest
from fastapi import status


def test_register_user_success(client):
    response = client.post(
        "/api/auth/register",
        json={
            "username": "newmanager",
            "email": "newmanager@college.edu",
            "password": "SecurePassword123!",
            "full_name": "New Manager",
        },
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "newmanager"
    assert data["user"]["email"] == "newmanager@college.edu"
    assert "password" not in data["user"]
    assert "hashed_password" not in data["user"]


def test_register_duplicate_username(client, test_user):
    response = client.post(
        "/api/auth/register",
        json={
            "username": test_user.username,
            "email": "unique@college.edu",
            "password": "Password123!",
        },
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "already exists" in response.json()["detail"].lower()


def test_register_duplicate_email(client, test_user):
    response = client.post(
        "/api/auth/register",
        json={
            "username": "uniqueuser",
            "email": test_user.email,
            "password": "Password123!",
        },
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "already exists" in response.json()["detail"].lower()


def test_login_success_with_username(client, test_user):
    response = client.post(
        "/api/auth/login",
        json={
            "username_or_email": test_user.username,
            "password": "ValidPass123!",
        },
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["user"]["id"] == test_user.id


def test_login_success_with_email(client, test_user):
    response = client.post(
        "/api/auth/login",
        json={
            "username_or_email": test_user.email,
            "password": "ValidPass123!",
        },
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data


def test_login_invalid_password(client, test_user):
    response = client.post(
        "/api/auth/login",
        json={
            "username_or_email": test_user.username,
            "password": "WrongPassword999",
        },
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "invalid credentials" in response.json()["detail"].lower()


def test_login_nonexistent_user(client):
    response = client.post(
        "/api/auth/login",
        json={
            "username_or_email": "nonexistent_person",
            "password": "SomePassword123!",
        },
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_me_authenticated(client, auth_headers, test_user):
    response = client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == test_user.id
    assert data["username"] == test_user.username
    assert data["email"] == test_user.email


def test_get_me_unauthenticated(client):
    response = client.get("/api/auth/me")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_logout(client, auth_headers):
    response = client.post("/api/auth/logout", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    assert "logged out" in response.json()["message"].lower()
