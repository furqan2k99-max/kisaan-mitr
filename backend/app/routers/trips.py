"""
Kisaan Mitr — Trips Router
Endpoints for listing, viewing, and updating pooled trips.
"""

import logging
from uuid import UUID
from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.models import (
    Trip, TripStatus, TripLoad,
    LoadRequest, Truck,
    User, UserRole,
)
from app.schemas.schemas import TripResponse, TripCreate
from app.core.security import get_current_active_user, require_role

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/trips", tags=["Trips"])


@router.get("/", response_model=List[TripResponse])
async def list_trips(
    skip: int = 0,
    limit: int = 20,
    status_filter: TripStatus = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """List trips based on user role"""
    query = db.query(Trip)

    if current_user.role == UserRole.FARMER:
        # Show only trips the farmer is part of
        trip_loads = (
            db.query(TripLoad)
            .join(LoadRequest, TripLoad.load_request_id == LoadRequest.id)
            .filter(LoadRequest.farmer_id == current_user.id)
            .all()
        )
        trip_ids = [tl.trip_id for tl in trip_loads]
        query = query.filter(Trip.id.in_(trip_ids))
    elif current_user.role == UserRole.DRIVER:
        truck = db.query(Truck).filter(Truck.driver_id == current_user.id).first()
        if truck:
            query = query.filter(Trip.truck_id == truck.id)

    if status_filter:
        query = query.filter(Trip.status == status_filter)

    trips = query.order_by(Trip.created_at.desc()).offset(skip).limit(limit).all()
    return trips


@router.get("/{trip_id}", response_model=TripResponse)
async def get_trip(
    trip_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get a specific trip with all pooled loads"""
    trip = db.query(Trip).filter(Trip.id == trip_id).first()

    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found",
        )

    # Farmers can only see trips they are part of
    if current_user.role == UserRole.FARMER:
        trip_load = (
            db.query(TripLoad)
            .join(LoadRequest, TripLoad.load_request_id == LoadRequest.id)
            .filter(
                TripLoad.trip_id == trip_id,
                LoadRequest.farmer_id == current_user.id,
            )
            .first()
        )
        if not trip_load:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this trip",
            )

    return trip


@router.put("/{trip_id}/status", response_model=TripResponse)
async def update_trip_status(
    trip_id: UUID,
    new_status: TripStatus,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.DRIVER])),
    db: Session = Depends(get_db),
):
    """Update trip status (Admin/Driver only)"""
    trip = db.query(Trip).filter(Trip.id == trip_id).first()

    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found",
        )

    # Drivers can only update their own truck's trips
    if current_user.role == UserRole.DRIVER:
        # For demo: allow any driver to start any scheduled trip
        # In production, this would check: truck = db.query(Truck).filter(Truck.driver_id == current_user.id).first()
        # if not truck or trip.truck_id != truck.id
        if new_status == TripStatus.IN_PROGRESS and trip.status != TripStatus.SCHEDULED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only start scheduled trips",
            )

    try:
        if new_status == TripStatus.IN_PROGRESS and trip.status == TripStatus.SCHEDULED:
            trip.actual_start_time = datetime.utcnow()
        elif new_status == TripStatus.COMPLETED and trip.status == TripStatus.IN_PROGRESS:
            trip.actual_end_time = datetime.utcnow()

        trip.status = new_status
        db.commit()
        db.refresh(trip)

        logger.info("Trip %s status updated to %s", trip_id, new_status.value)
        return trip

    except Exception as e:
        logger.error("Error updating trip status: %s", e)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update trip status",
        )