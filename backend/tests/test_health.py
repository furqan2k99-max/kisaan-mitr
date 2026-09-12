"""Kisaan Mitr — Health & Root Endpoint Tests (3 tests)"""

import pytest


class TestHealthEndpoints:
    def test_root_returns_json(self, client):
        resp = client.get("/")
        assert resp.status_code == 200

    def test_health_returns_ok(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        body = resp.json()
        assert body.get("status") == "ok" or body.get("status") == "healthy"

    def test_docs_endpoint(self, client):
        resp = client.get("/docs")
        assert resp.status_code == 200
