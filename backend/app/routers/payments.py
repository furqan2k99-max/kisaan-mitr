"""
Kisaan Mitr — Payments Router
Razorpay order creation, payment status, escrow release.
Fully functional in STUB mode when API keys are absent.
"""

import logging
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.models import (
    Payment, PaymentStatus, PaymentType, EscrowStatus,
    LoadRequest, LoadStatus, Trip, TripLoad, User, UserRole,
)
from app.schemas.schemas import PaymentCreate, PaymentResponse, RazorpayOrderRequest
from app.core.security import get_current_active_user, require_role
from app.integrations.razorpay import RazorpayClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/create-order")
async def create_payment_order(
    order_req: RazorpayOrderRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Create a Razorpay payment order for a load request."""
    load = db.query(LoadRequest).filter(LoadRequest.id == order_req.load_request_id).first()
    if not load:
        raise HTTPException(status_code=404, detail="Load request not found")

    if load.farmer_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")

    razorpay = RazorpayClient()
    order = await razorpay.create_payment_order(
        amount=order_req.amount,
        load_request_id=order_req.load_request_id,
        currency=order_req.currency,
    )

    if not order:
        raise HTTPException(status_code=502, detail="Payment gateway unavailable")

    # Persist payment record
    payment = Payment(
        user_id=current_user.id,
        load_request_id=order_req.load_request_id,
        amount=order_req.amount,
        status=PaymentStatus.PENDING,
        escrow_status=EscrowStatus.PENDING,
        payment_type=PaymentType.FULL,
        razorpay_payment_id=order.get("order_id"),
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    logger.info("Payment order created: %s for load %s", order.get("order_id"), order_req.load_request_id)
    return {**order, "payment_id": str(payment.id)}


@router.get("/{load_id}/status", response_model=PaymentResponse)
async def get_payment_status(
    load_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get payment status for a load request."""
    payment = (
        db.query(Payment)
        .filter(Payment.load_request_id == load_id)
        .order_by(Payment.created_at.desc())
        .first()
    )
    if not payment:
        raise HTTPException(status_code=404, detail="No payment found for this load")

    if payment.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")

    return payment


@router.post("/release-escrow")
async def release_escrow(
    load_id: UUID,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.DRIVER])),
    db: Session = Depends(get_db),
):
    """Release escrow after delivery confirmation (Admin/Driver only)."""
    payment = (
        db.query(Payment)
        .filter(Payment.load_request_id == load_id, Payment.status == PaymentStatus.CAPTURED)
        .first()
    )
    if not payment:
        raise HTTPException(status_code=404, detail="No captured payment found")

    razorpay = RazorpayClient()
    if payment.razorpay_payment_id:
        result = await razorpay.release_escrow(payment.razorpay_payment_id)
    else:
        result = {"status": "released", "amount": float(payment.amount)}

    payment.escrow_status = EscrowStatus.RELEASED
    load = db.query(LoadRequest).filter(LoadRequest.id == load_id).first()
    if load:
        load.status = LoadStatus.DELIVERED

    db.commit()
    logger.info("Escrow released for load %s", load_id)

    return {"status": "released", "load_id": str(load_id), "amount": float(payment.amount)}
