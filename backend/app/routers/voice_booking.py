"""
Kisaan Mitr — Voice Booking Router
5 endpoints for the voice-based load booking system:
  1. POST /transcribe         — Bhashini fallback transcription
  2. POST /parse-intent       — Gemini intent parsing
  3. POST /create-booking     — Create pending load request
  4. POST /confirm-booking    — Confirm booking (status → pending)
  5. DELETE /cancel-booking/{id} — Cancel pending_confirmation booking
"""

import logging
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.models import User, LoadRequest, LoadStatus, UserRole
from app.core.security import get_current_active_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice-booking", tags=["Voice Booking"])


# ── Request/Response Schemas ────────────────────────────────────────────────

class TranscribeRequest(BaseModel):
    """Input for Bhashini fallback transcription."""
    audio_base64: str = Field(..., min_length=100, description="Base64-encoded audio data")
    language: str = Field(default="hi", pattern="^(hi|kn|en)$")


class TranscribeResponse(BaseModel):
    """Output from Bhashini transcription."""
    transcription: str
    confidence: float
    source: str = "bhashini"


class ParseIntentRequest(BaseModel):
    """Input for Gemini intent parsing."""
    transcription: str = Field(..., min_length=2, description="Transcribed text from farmer")
    language: str = Field(default="hi", pattern="^(hi|kn|en)$")


class CreateBookingRequest(BaseModel):
    """Input for creating a pending booking from parsed intent."""
    parsed_intent: dict = Field(..., description="Parsed intent from Gemini/rule-based parser")
    user_location: dict = Field(default=None, description="Optional {lat, lon} from browser")


class ConfirmBookingRequest(BaseModel):
    """Input for confirming a pending booking."""
    booking_id: str = Field(..., description="UUID of the pending load request")


# ── Endpoint 1: Bhashini Transcription ──────────────────────────────────────

@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(
    req: TranscribeRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Transcribe audio using Bhashini API (free govt service).
    Called when Web Speech API fails or is unsupported.
    """
    from app.integrations.bhashini import BhashiniClient

    client = BhashiniClient()

    try:
        import base64
        audio_bytes = base64.b64decode(req.audio_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid audio_base64 data")

    result = await client.transcribe_audio(
        audio_data=audio_bytes,
        source_language=req.language,
        target_language="en",
    )

    if not result:
        raise HTTPException(
            status_code=503,
            detail="Could not transcribe audio. Please try again or type your request.",
        )

    return TranscribeResponse(
        transcription=result.get("text", ""),
        confidence=result.get("confidence", 0.0),
        source="bhashini",
    )


# ── Endpoint 2: Parse Intent (Gemini) ──────────────────────────────────────

@router.post("/parse-intent")
async def parse_intent(
    req: ParseIntentRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Parse farmer's transcribed text into structured booking intent.
    Uses Google Gemini 1.5 Flash with rule-based fallback.
    """
    from app.services.voice_intent_parser import parse_farming_intent

    parsed = await parse_farming_intent(
        transcription=req.transcription,
        language=req.language,
    )

    return {
        "intent": parsed,
        "transcription": req.transcription,
        "language": req.language,
    }


# ── Endpoint 3: Create Booking ─────────────────────────────────────────────

@router.post("/create-booking")
async def create_booking(
    req: CreateBookingRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Create a pending load request from parsed voice intent.
    Returns booking summary with fare estimate.
    """
    from app.services.voice_booking_agent import create_booking_from_intent

    logger.info("Create booking request - parsed_intent: %s, user_location: %s", req.parsed_intent, req.user_location)

    result = await create_booking_from_intent(
        parsed_intent=req.parsed_intent,
        user_id=str(current_user.id),
        user_location=req.user_location,
        db=db,
    )

    logger.info("Create booking result: %s", result)

    if "error" in result:
        raise HTTPException(
            status_code=422,
            detail={
                "error": result["error"],
                "field": result.get("field"),
                "suggestion": result.get("suggestion"),
                "nearby_mandis": result.get("nearby_mandis"),
            },
        )

    return result


# ── Endpoint 4: Confirm Booking ────────────────────────────────────────────

@router.post("/confirm-booking")
async def confirm_booking(
    req: ConfirmBookingRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Confirm a pending booking — changes status from pending_confirmation to pending.
    This makes the load visible to the pooling engine.
    """
    try:
        load_id = UUID(req.booking_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid booking ID format")

    load = db.query(LoadRequest).filter(LoadRequest.id == load_id).first()

    if not load:
        raise HTTPException(status_code=404, detail="Booking not found")

    if load.farmer_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to confirm this booking")

    if load.status != LoadStatus.PENDING:
        raise HTTPException(
            status_code=400,
            detail=f"Booking cannot be confirmed — current status is '{load.status}'",
        )

    # Change status to pending (visible to pooling engine)
    load.status = LoadStatus.PENDING
    db.commit()
    db.refresh(load)

    logger.info("Voice booking confirmed: load_id=%s by user=%s", load.id, current_user.id)

    # Trigger pooling engine (same as regular loads)
    # TODO: Technical debt — router-to-router coupling. Should call pooling SERVICE instead:
    #   from app.services.pooling_engine import run_pooling_for_load
    #   await run_pooling_for_load(load_id=req.booking_id, db=db)
    # Currently calls pooling router directly (works but creates coupling).
    try:
        from app.routers.pooling import confirm as pooling_confirm
        await pooling_confirm(load_id=req.booking_id, db=db)
        logger.info("Pooling triggered for voice booking: %s", load.id)
    except Exception as e:
        logger.warning("Pooling trigger failed for voice booking %s: %s", load.id, e)

    return {
        "status": "confirmed",
        "booking_id": str(load.id),
        "message": "Booking confirmed! Pooling started.",
    }


# ── Endpoint 5: Cancel Booking ─────────────────────────────────────────────

@router.delete("/cancel-booking/{booking_id}")
async def cancel_booking(
    booking_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Cancel a pending_confirmation booking before it's confirmed.
    """
    try:
        load_uuid = UUID(booking_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid booking ID format")

    load = db.query(LoadRequest).filter(LoadRequest.id == load_uuid).first()

    if not load:
        raise HTTPException(status_code=404, detail="Booking not found")

    if load.farmer_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this booking")

    if load.status not in (LoadStatus.PENDING,):
        raise HTTPException(
            status_code=400,
            detail=f"Booking cannot be cancelled — current status is '{load.status}'",
        )

    load.status = LoadStatus.CANCELLED
    db.commit()

    logger.info("Voice booking cancelled: load_id=%s by user=%s", load.id, current_user.id)

    return {
        "status": "cancelled",
        "booking_id": str(load.id),
        "message": "Booking cancelled.",
    }
