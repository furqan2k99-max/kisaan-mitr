"""
Kisaan Mitr — Admin Router
Fleet management, mandi CRUD, and platform analytics.
All routes require ADMIN role.
"""

import logging
from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from geoalchemy2.elements import WKTElement

from app.models.database import get_db
from app.models.models import (
    Truck, TruckType, Mandi, Trip, TripStatus,
    LoadRequest, LoadStatus, User, UserRole, TripLoad, Payment,
)
from app.schemas.schemas import (
    TruckCreate, TruckUpdate, TruckResponse,
    MandiBase, MandiResponse,
)
from app.core.security import require_role

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Truck Fleet Management ───────────────────────────────────────────────────

@router.get("/trucks", response_model=List[TruckResponse])
async def list_trucks(
    available_only: bool = False,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    """List all trucks in the fleet."""
    query = db.query(Truck)
    if available_only:
        query = query.filter(Truck.is_available == True)  # noqa: E712
    return query.order_by(Truck.created_at.desc()).all()


@router.post("/trucks", response_model=TruckResponse, status_code=201)
async def create_truck(
    truck_data: TruckCreate,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    """Register a new truck."""
    existing = db.query(Truck).filter(Truck.registration_number == truck_data.registration_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Registration number already exists")

    truck = Truck(
        registration_number=truck_data.registration_number,
        truck_type=truck_data.truck_type,
        capacity_kg=truck_data.capacity_kg,
        driver_id=truck_data.driver_id,
        insurance_expiry=truck_data.insurance_expiry,
        permit_expiry=truck_data.permit_expiry,
    )
    if truck_data.current_location:
        truck.current_location = WKTElement(
            f"POINT({truck_data.current_location.lon} {truck_data.current_location.lat})",
            srid=4326,
        )

    db.add(truck)
    db.commit()
    db.refresh(truck)
    logger.info("Truck registered: %s", truck.registration_number)
    return truck


@router.put("/trucks/{truck_id}", response_model=TruckResponse)
async def update_truck(
    truck_id: UUID,
    truck_update: TruckUpdate,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    """Update truck details."""
    truck = db.query(Truck).filter(Truck.id == truck_id).first()
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")

    if truck_update.is_available is not None:
        truck.is_available = truck_update.is_available
    if truck_update.driver_id is not None:
        truck.driver_id = truck_update.driver_id
    if truck_update.current_location:
        truck.current_location = WKTElement(
            f"POINT({truck_update.current_location.lon} {truck_update.current_location.lat})",
            srid=4326,
        )

    db.commit()
    db.refresh(truck)
    return truck


# ── Mandi Management ────────────────────────────────────────────────────────

@router.get("/mandis", response_model=List[MandiResponse])
async def list_mandis(
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    """List all registered mandis."""
    return db.query(Mandi).order_by(Mandi.name).all()


@router.post("/mandis", response_model=MandiResponse, status_code=201)
async def create_mandi(
    mandi_data: MandiBase,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    """Register a new mandi."""
    existing = db.query(Mandi).filter(Mandi.name == mandi_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Mandi already registered")

    mandi = Mandi(
        name=mandi_data.name,
        state=mandi_data.state,
        district=mandi_data.district,
        geometry=WKTElement(
            f"POINT({mandi_data.location.lon} {mandi_data.location.lat})",
            srid=4326,
        ),
        address=mandi_data.address,
    )
    db.add(mandi)
    db.commit()
    db.refresh(mandi)
    logger.info("Mandi registered: %s", mandi.name)
    return mandi


# ── Platform Analytics ───────────────────────────────────────────────────────

@router.get("/analytics")
async def get_analytics(
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    """Platform-wide analytics dashboard data."""
    total_farmers = db.query(User).filter(User.role == UserRole.FARMER).count()
    total_drivers = db.query(User).filter(User.role == UserRole.DRIVER).count()
    total_trucks = db.query(Truck).count()
    available_trucks = db.query(Truck).filter(Truck.is_available == True).count()  # noqa: E712

    total_loads = db.query(LoadRequest).count()
    pending_loads = db.query(LoadRequest).filter(LoadRequest.status == LoadStatus.PENDING).count()
    delivered_loads = db.query(LoadRequest).filter(LoadRequest.status == LoadStatus.DELIVERED).count()

    total_trips = db.query(Trip).count()
    active_trips = db.query(Trip).filter(Trip.status.in_([TripStatus.SCHEDULED, TripStatus.IN_PROGRESS])).count()
    completed_trips = db.query(Trip).filter(Trip.status == TripStatus.COMPLETED).count()

    total_revenue = db.query(func.sum(Payment.amount)).filter(Payment.status == "captured").scalar() or 0
    total_weight_moved = db.query(func.sum(Trip.total_weight_kg)).filter(Trip.status == TripStatus.COMPLETED).scalar() or 0

    total_pooled_farmers = db.query(TripLoad).count()
    avg_farmers_per_trip = round(total_pooled_farmers / total_trips, 1) if total_trips > 0 else 0

    return {
        "users": {"total_farmers": total_farmers, "total_drivers": total_drivers},
        "fleet": {"total_trucks": total_trucks, "available_trucks": available_trucks},
        "loads": {"total": total_loads, "pending": pending_loads, "delivered": delivered_loads},
        "trips": {
            "total": total_trips, "active": active_trips, "completed": completed_trips,
            "avg_farmers_per_trip": avg_farmers_per_trip,
        },
        "financials": {"total_revenue": float(total_revenue)},
        "logistics": {"total_weight_moved_kg": int(total_weight_moved)},
    }
