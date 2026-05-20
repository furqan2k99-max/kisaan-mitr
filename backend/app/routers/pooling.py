"""
Kisaan Mitr — Pooling Router
Endpoints for manual pooling triggers and nearby-farmer discovery.
Uses PostGIS ST_Distance for accurate distance calculations.
"""

import logging
from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from geoalchemy2.shape import to_shape
from geoalchemy2.elements import WKTElement

from app.models.database import get_db
from app.models.models import LoadRequest, LoadStatus, User, UserRole
from app.schemas.schemas import (
    PoolingResult,
    NearbyFarmer,
    TripResponse,
    PoolAnalysisResponse,
    FarmerInPool,
)
from app.core.security import get_current_active_user, require_role
from app.services.pooling_engine import CapacityPoolingEngine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pooling", tags=["Pooling"])

# Crop emoji mapping
CROP_EMOJI_MAP = {
    "tomato": "🍅",
    "potato": "🥔",
    "onion": "🧅",
    "rice": "🍚",
    "wheat": "🌾",
    "sugarcane": "🎋",
    "coffee": "☕",
    "cotton": "🌱",
    "groundnut": "🥜",
    "maize": "🌽",
    "paddy": "🌾",
    "ragi": "🌾",
    "soybean": "🫘",
}


def get_crop_emoji(crop_type: str) -> str:
    return CROP_EMOJI_MAP.get(crop_type.lower(), "🌱")


@router.get("/analyze/{load_id}", response_model=PoolAnalysisResponse)
async def analyze_pool(
    load_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Analyze pooling options for a load — returns pool data for frontend visualization.
    """
    load = db.query(LoadRequest).filter(LoadRequest.id == load_id).first()

    if not load:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Load request not found",
        )

    if load.farmer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to analyze this load",
        )

    pooling_engine = CapacityPoolingEngine(db)

    origin_shape = to_shape(load.origin_geometry)
    origin_lat = origin_shape.y
    origin_lon = origin_shape.x

    # Get nearby candidates
    candidates_5km = pooling_engine.find_nearby_pending_loads(
        origin_lat=origin_lat,
        origin_lon=origin_lon,
        destination_mandi=load.destination_mandi,
        radius_km=5.0,
        pickup_date=load.pickup_date,
        exclude_load_id=load.id,
    )

    # Expand to 10km if no matches
    if not candidates_5km:
        candidates_5km = pooling_engine.find_nearby_pending_loads(
            origin_lat=origin_lat,
            origin_lon=origin_lon,
            destination_mandi=load.destination_mandi,
            radius_km=10.0,
            pickup_date=load.pickup_date,
            exclude_load_id=load.id,
        )

    all_candidates = [load] + candidates_5km

    # Run Knapsack optimization
    selected_loads, total_weight = pooling_engine.knapsack_optimize(all_candidates)

    if not selected_loads:
        selected_loads = [load]
        total_weight = load.weight_kg

    # Calculate route sequence
    route_sequence = pooling_engine.calculate_route_sequence(selected_loads)
    estimated_distance = pooling_engine._estimate_total_distance(route_sequence)

    # Build farmer list
    farmers = []
    for seq, lr in route_sequence:
        farmer = db.query(User).filter(User.id == lr.farmer_id).first()
        farmers.append(
            FarmerInPool(
                id=str(lr.farmer_id),
                name=farmer.full_name if farmer else "Unknown",
                crop=lr.crop_type,
                crop_emoji=get_crop_emoji(lr.crop_type),
                weight_kg=lr.weight_kg,
                distance_km=round(
                    func.ST_Distance(
                        load.origin_geometry,
                        lr.origin_geometry,
                    ).label("distance_metres") / 1000, 2
                ) if load.id != lr.id else 0.0,
            )
        )

    # Calculate savings
    base_fare = estimated_distance * pooling_engine.RATE_PER_KM
    total_pool_cost = base_fare * (1 + pooling_engine.PLATFORM_COMMISSION)
    dedicated_fare = base_fare * (1 + pooling_engine.DEDICATED_PREMIUM)
    savings_pct = ((dedicated_fare - total_pool_cost) / dedicated_fare * 100) if dedicated_fare > 0 else 0

    capacity_pct = (total_weight / pooling_engine.TRUCK_CAPACITY_KG) * 100
    eta = max(int(estimated_distance / 30 * 60), 15)  # rough estimate

    return PoolAnalysisResponse(
        truck_capacity=pooling_engine.TRUCK_CAPACITY_KG,
        base_fare=round(base_fare, 2),
        platform_commission=pooling_engine.PLATFORM_COMMISSION,
        destination=load.destination_mandi,
        eta_minutes=eta,
        current_user_id=str(current_user.id),
        farmers=farmers,
        total_weight=total_weight,
        capacity_percentage=round(capacity_pct, 1),
        savings_percentage=round(max(savings_pct, 0), 1),
    )


@router.post("/trigger", response_model=PoolingResult)
async def trigger_pooling(
    load_id: UUID,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    """Manually trigger pooling for a specific load (Admin only)"""
    load = db.query(LoadRequest).filter(LoadRequest.id == load_id).first()

    if not load:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Load request not found",
        )

    if load.status != LoadStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot pool load with status: {load.status.value}",
        )

    pooling_engine = CapacityPoolingEngine(db)
    trip = pooling_engine.trigger_pooling(load)

    if not trip:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not create pooled trip",
        )

    savings = pooling_engine.calculate_savings(trip)
    trip_response = TripResponse.model_validate(trip)

    return PoolingResult(
        trip=trip_response,
        pooled_farmers=len(trip.trip_loads),
        total_weight=trip.total_weight_kg or 0,
        savings_percentage=savings,
    )


@router.get("/nearby", response_model=List[NearbyFarmer])
async def get_nearby_farmers(
    lat: float,
    lon: float,
    radius_km: float = 5.0,
    mandi: str = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get nearby pending load requests — uses PostGIS ST_Distance for accuracy."""
    try:
        origin_wkt = WKTElement(f"POINT({lon} {lat})", srid=4326)

        # Build query with spatial filter
        query = db.query(
            LoadRequest,
            func.ST_Distance(
                LoadRequest.origin_geometry,
                origin_wkt,
            ).label("distance_metres"),
        ).filter(
            LoadRequest.status == LoadStatus.PENDING,
            func.ST_DWithin(
                LoadRequest.origin_geometry,
                origin_wkt,
                radius_km * 1000,
            ),
        )

        if mandi:
            query = query.filter(LoadRequest.destination_mandi == mandi)

        rows = query.order_by("distance_metres").limit(20).all()

        results = []
        for load, distance_metres in rows:
            farmer = db.query(User).filter(User.id == load.farmer_id).first()
            results.append(
                NearbyFarmer(
                    load_request_id=load.id,
                    farmer_name=farmer.full_name if farmer else "Unknown",
                    weight_kg=load.weight_kg,
                    crop_type=load.crop_type,
                    distance_km=round(distance_metres / 1000, 2),
                    destination_mandi=load.destination_mandi,
                )
            )

        return results

    except Exception as e:
        logger.error("Error getting nearby farmers: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get nearby farmers",
        )


@router.post("/confirm", response_model=TripResponse)
async def confirm_pool(
    load_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Confirm pooling for a load - creates the trip"""
    load = db.query(LoadRequest).filter(LoadRequest.id == load_id).first()

    if not load:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Load request not found",
        )

    if load.farmer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only confirm your own load",
        )

    if load.status != LoadStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot confirm pool for load with status: {load.status.value}",
        )

    pooling_engine = CapacityPoolingEngine(db)
    trip = pooling_engine.trigger_pooling(load)

    if not trip:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not create pooled trip - no matching loads found",
        )

    return trip