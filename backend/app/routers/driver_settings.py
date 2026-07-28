from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.models.database import get_db
from app.core.security import get_current_active_user
from app.models.models import User

router = APIRouter(prefix="/api/v1/driver", tags=["driver"])


class DriverAvailabilityUpdate(BaseModel):
    online: bool
    available_for: Optional[str] = None  # "same_day", "next_day"


class DriverStatusResponse(BaseModel):
    online: bool
    available_for: Optional[str]

    class Config:
        from_attributes = True


@router.get("/status", response_model=DriverStatusResponse)
async def get_driver_status(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get driver availability status"""
    if current_user.role not in ["driver", "admin"]:
        raise HTTPException(status_code=403, detail="Only drivers can access this")
    
    return {
        "online": current_user.driver_online or False,
        "available_for": current_user.driver_available_for
    }


@router.put("/status", response_model=DriverStatusResponse)
async def update_driver_status(
    status: DriverAvailabilityUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Update driver availability status"""
    if current_user.role not in ["driver", "admin"]:
        raise HTTPException(status_code=403, detail="Only drivers can access this")
    
    current_user.driver_online = status.online
    current_user.driver_available_for = status.available_for
    db.commit()
    db.refresh(current_user)
    
    return {
        "online": current_user.driver_online,
        "available_for": current_user.driver_available_for
    }
