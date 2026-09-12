"""Kisaan Mitr — Load Requests Tests (7 tests)"""

import pytest


class TestCreateLoadRequest:
    def test_create_load_request_success(self, client, auth_headers, sample_load_request):
        resp = client.post("/api/v1/load-requests/", json=sample_load_request, headers=auth_headers)
        assert resp.status_code == 201
        body = resp.json()
        assert body["weight_kg"] == sample_load_request["weight_kg"]
        assert body["crop_type"] == sample_load_request["crop_type"]
        assert body["status"] == "pending"

    def test_create_load_request_unauthorized_fails(self, client, sample_load_request):
        resp = client.post("/api/v1/load-requests/", json=sample_load_request)
        assert resp.status_code == 401

    def test_create_load_request_farmer_only(self, client, driver_data, sample_load_request):
        resp = client.post("/api/v1/auth/register", json=driver_data)
        token = resp.json()["access_token"]
        resp = client.post(
            "/api/v1/load-requests/",
            json=sample_load_request,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 403


class TestListLoadRequests:
    def test_list_loads_empty(self, client, auth_headers):
        resp = client.get("/api/v1/load-requests/", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_loads_after_create(self, client, auth_headers, sample_load_request):
        client.post("/api/v1/load-requests/", json=sample_load_request, headers=auth_headers)
        resp = client.get("/api/v1/load-requests/", headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()) == 1


class TestGetLoadRequest:
    def test_get_load_not_found(self, client, auth_headers):
        resp = client.get("/api/v1/load-requests/00000000-0000-0000-0000-000000000000", headers=auth_headers)
        assert resp.status_code == 404

    def test_cancel_pending_load(self, client, auth_headers, sample_load_request):
        create_resp = client.post("/api/v1/load-requests/", json=sample_load_request, headers=auth_headers)
        load_id = create_resp.json()["id"]
        resp = client.delete(f"/api/v1/load-requests/{load_id}", headers=auth_headers)
        assert resp.status_code == 204
