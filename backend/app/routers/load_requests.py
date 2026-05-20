"""
Kisaan Mitr — Load Requests Router
CRUD endpoints for farmer transport requests.
Uses GeoAlchemy2 WKTElement for PostGIS geometry insertion.
"""

import logging
from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from geoalchemy2.elements import WKTElement

from app.models.database import get_db
from app.models.models import LoadRequest, LoadStatus, User, UserRole
from app.schemas.schemas import (
    LoadRequestCreate,
    LoadRequestUpdate,
    LoadRequestResponse,
)
from app.core.security import get_current_active_user, require_role

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/load-requests", tags=["Load Requests"])


def _make_point(lat: float, lon: float) -> WKTElement:
    """Create a PostGIS-compatible POINT geography from lat/lon."""
    return WKTElement(f"POINT({lon} {lat})", srid=4326)


@router.post("/", response_model=LoadRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_load_request(
    load_data: LoadRequestCreate,
    current_user: User = Depends(require_role([UserRole.FARMER, UserRole.FPO])),
    db: Session = Depends(get_db),
):
    """Create a new transport request (Farmer/FPO only)"""
    try:
        load_request = LoadRequest(
            farmer_id=current_user.id,
            weight_kg=load_data.weight_kg,
            crop_type=load_data.crop_type,
            crop_variety=load_data.crop_variety,
            origin_geometry=_make_point(load_data.origin.lat, load_data.origin.lon),
            origin_address=load_data.origin_address,
            destination_mandi=load_data.destination_mandi,
            destination_geometry=_make_point(load_data.destination.lat, load_data.destination.lon),
            pickup_date=load_data.pickup_date,
            pickup_time_window_start=load_data.pickup_time_window_start,
            pickup_time_window_end=load_data.pickup_time_window_end,
            status=LoadStatus.PENDING,
        )

        db.add(load_request)
        db.commit()
        db.refresh(load_request)

        logger.info("Load request created: %s by farmer %s", load_request.id, current_user.id)

        # Auto-trigger pooling disabled - user can manually trigger via View Pool button
        # from app.services.pooling_engine import CapacityPoolingEngine
        # pooling_engine = CapacityPoolingEngine(db)
        # trip = pooling_engine.trigger_pooling(load_request)
        # if trip:
        #     logger.info("Load %s pooled into trip %s", load_request.id, trip.id)
        #     db.refresh(load_request)

        return load_request

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error creating load request: %s", e, exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create load request: {str(e)}",
        )


@router.get("/", response_model=List[LoadRequestResponse])
async def list_load_requests(
    skip: int = 0,
    limit: int = 20,
    status_filter: LoadStatus = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """List user's load requests with optional status filter"""
    query = db.query(LoadRequest).filter(LoadRequest.farmer_id == current_user.id)

    if status_filter:
        query = query.filter(LoadRequest.status == status_filter)

    loads = query.order_by(LoadRequest.created_at.desc()).offset(skip).limit(limit).all()
    return loads


@router.get("/{load_id}", response_model=LoadRequestResponse)
async def get_load_request(
    load_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get a specific load request by ID"""
    load = db.query(LoadRequest).filter(LoadRequest.id == load_id).first()

    if not load:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Load request not found",
        )

    if load.farmer_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this load request",
        )

    return load


@router.put("/{load_id}", response_model=LoadRequestResponse)
async def update_load_request(
    load_id: UUID,
    load_update: LoadRequestUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Update a load request (only pending requests can be modified)"""
    load = db.query(LoadRequest).filter(LoadRequest.id == load_id).first()

    if not load:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Load request not found",
        )

    if load.farmer_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this load request",
        )

    if load.status != LoadStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot update load request with status: {load.status.value}",
        )

    try:
        update_data = load_update.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            if value is not None:
                setattr(load, field, value)

        db.commit()
        db.refresh(load)

        logger.info("Load request updated: %s", load_id)
        return load

    except Exception as e:
        logger.error("Error updating load request: %s", e)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update load request",
        )


@router.delete("/{load_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_load_request(
    load_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Cancel a pending load request"""
    load = db.query(LoadRequest).filter(LoadRequest.id == load_id).first()

    if not load:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Load request not found",
        )

    if load.farmer_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to cancel this load request",
        )

    if load.status != LoadStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel load request with status: {load.status.value}",
        )

    try:
        load.status = LoadStatus.CANCELLED
        db.commit()
        logger.info("Load request cancelled: %s", load_id)
    except Exception as e:
        logger.error("Error cancelling load request: %s", e)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel load request",
        )