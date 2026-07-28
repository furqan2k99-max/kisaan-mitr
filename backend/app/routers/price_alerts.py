from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.models.database import get_db
from app.core.security import get_current_active_user
from app.models.models import User, PriceAlert

router = APIRouter(prefix="/api/v1/price-alerts", tags=["price-alerts"])


class PriceAlertCreate(BaseModel):
    commodity: str
    state: Optional[str] = None
    target_price: float


class PriceAlertResponse(BaseModel):
    id: int
    commodity: str
    state: Optional[str]
    target_price: float
    is_active: bool
    triggered_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=List[PriceAlertResponse])
async def get_price_alerts(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get all price alerts for current user"""
    alerts = (
        db.query(PriceAlert)
        .filter(PriceAlert.user_id == current_user.id)
        .order_by(PriceAlert.created_at.desc())
        .all()
    )
    return alerts


@router.post("", response_model=PriceAlertResponse)
async def create_price_alert(
    alert: PriceAlertCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Create a new price alert"""
    new_alert = PriceAlert(
        user_id=current_user.id,
        commodity=alert.commodity,
        state=alert.state,
        target_price=alert.target_price,
        is_active=True
    )
    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)
    return new_alert


@router.delete("/{alert_id}")
async def delete_price_alert(
    alert_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Delete a price alert"""
    alert = (
        db.query(PriceAlert)
        .filter(PriceAlert.id == alert_id, PriceAlert.user_id == current_user.id)
        .first()
    )
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    db.delete(alert)
    db.commit()
    return {"status": "deleted"}


@router.put("/{alert_id}/toggle")
async def toggle_price_alert(
    alert_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Toggle price alert active status"""
    alert = (
        db.query(PriceAlert)
        .filter(PriceAlert.id == alert_id, PriceAlert.user_id == current_user.id)
        .first()
    )
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.is_active = not alert.is_active
    db.commit()
    return {"is_active": alert.is_active}
