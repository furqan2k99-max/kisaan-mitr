"""Kisaan Mitr — Pooling Engine Tests (5 tests)

Tests pure calculation functions directly — no PostGIS/spatial queries.
"""

import pytest
from types import SimpleNamespace


class TestCalculateFare:
    def test_basic_fare_calculation(self, db):
        from app.services.pooling_engine import CapacityPoolingEngine
        engine = CapacityPoolingEngine(db)

        result = engine.calculate_fare(
            distance_km=10.0,
            total_weight=400,
            load_weight=200,
            is_dedicated=False,
        )

        assert result["base_fare"] == 120.0  # 10 * 12
        assert result["weight_share"] == 60.0  # (200/400) * 120
        assert result["commission"] == 7.2     # 60 * 0.12
        assert result["total_payment"] == 67.2  # 60 + 7.2

    def test_dedicated_trip_premium(self, db):
        from app.services.pooling_engine import CapacityPoolingEngine
        engine = CapacityPoolingEngine(db)

        result_shared = engine.calculate_fare(10.0, 200, 200, is_dedicated=False)
        result_dedicated = engine.calculate_fare(10.0, 200, 200, is_dedicated=True)

        # Dedicated adds 20% premium to weight_share
        assert result_dedicated["total_payment"] > result_shared["total_payment"]
        assert result_dedicated["weight_share"] == 144.0  # 120 * 1.2


class TestCalculateSavings:
    def test_savings_positive(self, db):
        from app.services.pooling_engine import CapacityPoolingEngine
        engine = CapacityPoolingEngine(db)

        # Simulate a trip: 50 km distance, ₹600 base fare for 2 pooled farmers
        mock_trip = SimpleNamespace(total_distance_km=50.0, total_fare=480.0)

        savings = engine.calculate_savings(mock_trip)

        # Dedicated would be 50 * 12 * 1.2 = 720. Pooled fare = 480.
        # Savings = (720 - 480) / 720 * 100 = 33.33%
        assert savings > 0
        assert savings == pytest.approx(33.33, abs=0.01)

    def test_savings_zero_distance(self, db):
        from app.services.pooling_engine import CapacityPoolingEngine
        engine = CapacityPoolingEngine(db)

        mock_trip = SimpleNamespace(total_distance_km=0.0, total_fare=0.0)
        savings = engine.calculate_savings(mock_trip)
        assert savings == 0.0


class TestHaversine:
    def test_known_distance(self):
        from app.services.pooling_engine import CapacityPoolingEngine

        # Bangalore to Mysore ~143 km
        dist = CapacityPoolingEngine._haversine(12.9716, 77.5946, 12.2958, 76.6394)
        assert 120 < dist < 150  # straight-line ~128 km
