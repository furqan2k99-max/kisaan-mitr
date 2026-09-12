"""
Kisaan Mitr — Test Fixtures
Uses SQLite in-memory for tests (no Docker/PostgreSQL needed).
Patches GeoAlchemy2 Geography->Text, create_engine for SQLite, and Index kwargs.
"""

import os
import uuid
from datetime import datetime
from unittest.mock import patch as _patch

import pytest
from sqlalchemy import types as sqla_types

# ── Set env BEFORE any app imports ──────────────────────────────────────────
os.environ["SECRET_KEY"] = "test-secret-key-for-unit-tests-minimum-32-chars-ok"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["DEBUG"] = "false"
os.environ["BHASHINI_API_KEY"] = ""
os.environ["GOOGLE_MAPS_API_KEY"] = ""
os.environ["RAZORPAY_KEY_ID"] = ""
os.environ["RAZORPAY_KEY_SECRET"] = ""
os.environ["RAZORPAY_WEBHOOK_SECRET"] = ""
os.environ["AGMARKNET_API_KEY"] = ""
os.environ["AGMARKNET_BASE_URL"] = "https://api.data.gov.in/resource"

# ── Patch create_engine BEFORE any app import (SQLite doesn't support pool_size/max_overflow)
import sqlalchemy.engine.create
_original_create_engine = sqlalchemy.engine.create.create_engine

def _sqlite_create_engine(*args, **kwargs):
    kwargs.pop("pool_size", None)
    kwargs.pop("max_overflow", None)
    kwargs.pop("pool_pre_ping", None)
    kwargs.pop("echo", None)
    return _original_create_engine(*args, **kwargs)

sqlalchemy.engine.create.create_engine = _sqlite_create_engine
import sqlalchemy as _sa
_sa.create_engine = _sqlite_create_engine

# ── Patch GeoAlchemy2 Geography -> Text for SQLite ──────────────────────────
import geoalchemy2
import geoalchemy2.elements


class _SqliteGeography(sqla_types.TypeDecorator):
    impl = sqla_types.Text
    cache_ok = True

    def __init__(self, *args, **kwargs):
        kwargs.pop("srid", None)
        kwargs.pop("dimension", None)
        super().__init__()


geoalchemy2.Geography = _SqliteGeography


class _SqliteWKTElement:
    """Drop-in replacement for WKTElement that stores as plain string on SQLite."""
    def __new__(cls, wkt="", srid=None):
        return str(wkt)


geoalchemy2.elements.WKTElement = _SqliteWKTElement

# ── Patch PostgreSQL UUID -> String(36) for SQLite ──────────────────────────
import sqlalchemy.dialects.postgresql as _pg_dialect

class _SqliteUUID(sqla_types.TypeDecorator):
    impl = sqla_types.String(36)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, uuid.UUID):
            return str(value)
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return str(value)

_pg_dialect.UUID = _SqliteUUID

# ── Patch Index to drop postgresql_using kwarg ──────────────────────────────
try:
    import sqlalchemy.schema as _sa_schema
    _OrigIndex = _sa_schema.Index

    class _PatchIndex(_OrigIndex):
        def __init__(self, *args, **kwargs):
            kwargs.pop("postgresql_using", None)
            super().__init__(*args, **kwargs)

    _sa_schema.Index = _PatchIndex
except Exception:
    pass

# ── Patch geoalchemy2.shape.to_shape ────────────────────────────────────────
try:
    import geoalchemy2.shape as _ga_shape

    def _sqlite_to_shape(geom):
        if isinstance(geom, str) and geom:
            from shapely import wkt as _wkt
            return _wkt.loads(geom)
        return _ga_shape._original_to_shape(geom)

    _ga_shape._original_to_shape = _ga_shape.to_shape
    _ga_shape.to_shape = _sqlite_to_shape
except Exception:
    pass

# ── NOW import app modules (triggers patched create_engine, Geography, etc.) ──
# Import models first to register them on Base, then patch engine/session
import app.models.models as _models_mod
import app.models.database as _db_mod

# Patch Index in models module
_models_mod.Index = _PatchIndex

# Patch WKTElement in models module
_models_mod.WKTElement = _SqliteWKTElement

# ── Override the module-level engine with our test engine ────────────────────
from fastapi.testclient import TestClient
from sqlalchemy import create_engine as _safe_create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings  # noqa: E402
from app.models.database import Base, get_db  # noqa: E402

TEST_DATABASE_URL = "sqlite:///:memory:"
_test_engine = _safe_create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_test_engine)

    # Patch the database module so ALL references to SessionLocal use our test engine
_db_mod.engine = _test_engine
_db_mod.SessionLocal = TestingSessionLocal

# Disable slowapi rate limiting on the auth router's limiter instance
import app.routers.auth as _auth_mod
_auth_mod.limiter.enabled = False


# ── Fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture(scope="function", autouse=True)
def _setup_db():
    """Create/drop tables for every test."""
    Base.metadata.create_all(bind=_test_engine)
    yield
    Base.metadata.drop_all(bind=_test_engine)


@pytest.fixture(scope="function")
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="function")
def client(db, _setup_db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    from app.main import app
    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c

    app.dependency_overrides.clear()


# ── User fixtures ───────────────────────────────────────────────────────────

@pytest.fixture
def farmer_data():
    return {
        "name": "Test Farmer",
        "email": "farmer@test.com",
        "password": "TestPass123!",
        "phone": "9876543210",
        "role": "farmer",
    }


@pytest.fixture
def driver_data():
    return {
        "name": "Test Driver",
        "email": "driver@test.com",
        "password": "TestPass123!",
        "phone": "9876543211",
        "role": "driver",
    }


@pytest.fixture
def admin_data():
    return {
        "name": "Test Admin",
        "email": "admin@test.com",
        "password": "TestPass123!",
        "phone": "9876543212",
        "role": "admin",
    }


@pytest.fixture
def farmer_token(client, farmer_data):
    resp = client.post("/api/v1/auth/register", json=farmer_data)
    assert resp.status_code == 201, f"Register failed: {resp.text}"
    return resp.json()["access_token"]


@pytest.fixture
def driver_token(client, driver_data):
    resp = client.post("/api/v1/auth/register", json=driver_data)
    assert resp.status_code == 201, f"Register failed: {resp.text}"
    return resp.json()["access_token"]


@pytest.fixture
def admin_token(client, admin_data):
    resp = client.post("/api/v1/auth/register", json=admin_data)
    assert resp.status_code == 201, f"Register failed: {resp.text}"
    return resp.json()["access_token"]


@pytest.fixture
def auth_headers(farmer_token):
    return {"Authorization": f"Bearer {farmer_token}"}


@pytest.fixture
def driver_headers(driver_token):
    return {"Authorization": f"Bearer {driver_token}"}


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def sample_load_request():
    return {
        "weight_kg": 200,
        "crop_type": "tomato",
        "crop_variety": "hybrid",
        "origin": {"lat": 12.9716, "lon": 77.5946},
        "origin_address": "123 Farm Road, Bangalore Rural, Karnataka, India",
        "destination_mandi": "Yeshwanthpur APMC",
        "destination": {"lat": 13.0358, "lon": 77.5970},
        "pickup_date": "2026-09-20",
        "pickup_time_window_start": "06:00",
        "pickup_time_window_end": "10:00",
    }
