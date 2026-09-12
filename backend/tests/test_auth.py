"""Kisaan Mitr — Auth Tests (8 tests)"""

import pytest


class TestRegister:
    def test_register_farmer_success(self, client, farmer_data):
        resp = client.post("/api/v1/auth/register", json=farmer_data)
        assert resp.status_code == 201
        body = resp.json()
        assert "access_token" in body
        assert "refresh_token" in body
        assert body["user"]["email"] == farmer_data["email"]
        assert body["user"]["role"] == "farmer"

    def test_register_duplicate_email_fails(self, client, farmer_data):
        client.post("/api/v1/auth/register", json=farmer_data)
        resp = client.post("/api/v1/auth/register", json=farmer_data)
        assert resp.status_code == 400
        assert "already registered" in resp.json()["detail"].lower()

    def test_register_invalid_email_fails(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "name": "Bad",
            "email": "notanemail",
            "password": "TestPass123!",
            "phone": "9876543210",
            "role": "farmer",
        })
        assert resp.status_code == 422


class TestLogin:
    def test_login_correct_credentials(self, client, farmer_data):
        client.post("/api/v1/auth/register", json=farmer_data)
        resp = client.post("/api/v1/auth/login", json={
            "email": farmer_data["email"],
            "password": farmer_data["password"],
        })
        assert resp.status_code == 200
        body = resp.json()
        assert "access_token" in body
        assert "refresh_token" in body

    def test_login_wrong_password_fails(self, client, farmer_data):
        client.post("/api/v1/auth/register", json=farmer_data)
        resp = client.post("/api/v1/auth/login", json={
            "email": farmer_data["email"],
            "password": "WrongPassword999!",
        })
        assert resp.status_code == 401

    def test_login_nonexistent_email_fails(self, client):
        resp = client.post("/api/v1/auth/login", json={
            "email": "nobody@test.com",
            "password": "TestPass123!",
        })
        assert resp.status_code == 401


class TestMe:
    def test_get_current_user_valid_token(self, client, farmer_data, farmer_token):
        resp = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {farmer_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["email"] == farmer_data["email"]

    def test_get_current_user_no_token_fails(self, client):
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401
