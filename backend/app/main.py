"""
Kisaan Mitr — FastAPI Application Entry Point
Registers all routers, handles lifespan, CORS, and global error handling.
"""

import logging
import json
import base64
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Depends, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.models.database import init_db, engine, get_db
from app.routers import auth, load_requests, trips, pooling, payments, admin, mandi_prices, notifications, price_alerts, ratings, driver_settings, voice_booking

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Kisaan Mitr - AgriPool AI Backend")

    # Validate critical environment variables on startup
    if not settings.SECRET_KEY:
        raise RuntimeError(
            "SECRET_KEY is not set in environment variables. "
            "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
        )
    if len(settings.SECRET_KEY) < 32:
        raise RuntimeError(
            "SECRET_KEY is too short (minimum 32 characters). "
            "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
        )

    # Auto-seed mandis if table is empty
    try:
        from app.models.database import SessionLocal
        from app.models.models import Mandi
        db = SessionLocal()
        if db.query(Mandi).count() == 0:
            _seed_mandis(db)
        db.close()
    except Exception as e:
        logger.warning("Could not seed mandis: %s", e)

    yield
    logger.info("Shutting down Kisaan Mitr backend")


def _seed_mandis(db):
    """Seed Karnataka APMC mandis on first boot."""
    from app.models.models import Mandi
    from geoalchemy2.elements import WKTElement

    mandis = [
        ("Mysore (Bandipalya APMC)", "Karnataka", "Mysuru", 12.2958, 76.6394, "Bandipalya, Mysuru 570001"),
        ("Mandya APMC", "Karnataka", "Mandya", 12.5218, 76.8951, "APMC Yard, Mandya 571401"),
        ("K.R. Pete APMC", "Karnataka", "Mandya", 12.6570, 76.4890, "K.R. Pete, Mandya District"),
        ("Maddur APMC", "Karnataka", "Mandya", 12.5838, 77.0445, "Maddur Town, Mandya 571428"),
        ("Srirangapatna APMC", "Karnataka", "Mandya", 12.4179, 76.6893, "Srirangapatna, Mandya 571438"),
        ("Pandavapura APMC", "Karnataka", "Mandya", 12.4924, 76.6779, "Pandavapura, Mandya 571434"),
        ("Nagamangala APMC", "Karnataka", "Mandya", 12.8190, 76.7550, "Nagamangala, Mandya 571432"),
        ("T. Narasipura APMC", "Karnataka", "Mysuru", 12.2107, 76.9021, "T. Narasipura, Mysuru 571124"),
        ("Nanjangud APMC", "Karnataka", "Mysuru", 12.1168, 76.6837, "Nanjangud, Mysuru 571301"),
        ("Chamarajanagar APMC", "Karnataka", "Chamarajanagar", 11.9236, 76.9390, "APMC Yard, Chamarajanagar 571313"),
    ]

    for name, state, district, lat, lon, address in mandis:
        mandi = Mandi(
            name=name, state=state, district=district, address=address,
            geometry=WKTElement(f"POINT({lon} {lat})", srid=4326),
        )
        db.add(mandi)

    db.commit()
    logger.info("Seeded %d Karnataka APMC mandis", len(mandis))


limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Agritech platform for first-mile logistics using fractional capacity pooling",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Exception Handlers ──────────────────────────────────────────────────────

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "body": exc.body},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


# ── Health & Root ────────────────────────────────────────────────────────────

@app.get("/", tags=["Root"])
async def root():
    return {"message": "Welcome to Kisaan Mitr - AgriPool AI", "version": settings.APP_VERSION, "docs": "/docs"}


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "database": "connected", "version": settings.APP_VERSION}


# ── Register Routers ─────────────────────────────────────────────────────────

app.include_router(auth.router, prefix="/api/v1")
app.include_router(load_requests.router, prefix="/api/v1")
app.include_router(trips.router, prefix="/api/v1")
app.include_router(pooling.router, prefix="/api/v1")
app.include_router(payments.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(mandi_prices.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(price_alerts.router, prefix="/api/v1")
app.include_router(ratings.router, prefix="/api/v1")
app.include_router(driver_settings.router, prefix="/api/v1")
app.include_router(voice_booking.router, prefix="/api/v1")


# ── Public Endpoints ─────────────────────────────────────────────────────────

@app.get("/api/v1/mandis", tags=["Mandis"])
async def list_mandis_public(db=Depends(get_db)):
    """Public endpoint: list all registered APMC mandis (no auth required)."""
    from sqlalchemy.orm import Session
    from app.models.models import Mandi
    from geoalchemy2.shape import to_shape

    mandis = db.query(Mandi).order_by(Mandi.name).all()
    results = []
    for m in mandis:
        point = to_shape(m.geometry)
        results.append({
            "id": str(m.id), "name": m.name, "state": m.state,
            "district": m.district, "address": m.address,
            "lat": point.y, "lon": point.x,
        })
    return results


# ── Inline Lightweight Endpoints ─────────────────────────────────────────────

@app.post("/api/v1/payments/webhook", tags=["Payments"])
async def razorpay_webhook(request: Request):
    """Handle Razorpay webhook callbacks."""
    from app.integrations.razorpay import RazorpayClient
    from app.models.database import SessionLocal
    from app.models.models import Payment, PaymentStatus, EscrowStatus

    razorpay = RazorpayClient()
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    if not razorpay.verify_webhook_signature(body.decode(), signature):
        return JSONResponse(status_code=401, content={"detail": "Invalid signature"})

    event = json.loads(body)
    event_type = event.get("event")
    logger.info("Razorpay webhook: %s", event_type)

    db = SessionLocal()
    try:
        if event_type == "payment.captured":
            pid = event.get("payload", {}).get("payment", {}).get("id")
            payment = db.query(Payment).filter(Payment.razorpay_payment_id == pid).first()
            if payment:
                payment.status = PaymentStatus.CAPTURED
                payment.escrow_status = EscrowStatus.HELD
                db.commit()
        elif event_type == "payment.failed":
            pid = event.get("payload", {}).get("payment", {}).get("id")
            payment = db.query(Payment).filter(Payment.razorpay_payment_id == pid).first()
            if payment:
                payment.status = PaymentStatus.FAILED
                db.commit()
    except Exception as e:
        logger.error("Webhook processing error: %s", e)
        db.rollback()
    finally:
        db.close()

    return {"status": "processed"}


@app.post("/api/v1/nlp/transcribe", tags=["NLP"])
async def transcribe_audio(request: Request):
    """Transcribe Kannada audio to structured load-request intent."""
    from app.integrations.bhashini import VoiceInputProcessor

    body = await request.json()
    audio_base64 = body.get("audio_data")

    if not audio_base64:
        return JSONResponse(status_code=400, content={"detail": "audio_data required"})

    try:
        audio_bytes = base64.b64decode(audio_base64)
        processor = VoiceInputProcessor()
        result = await processor.process_voice_to_load_request(audio_bytes)
        return result if result else JSONResponse(status_code=503, content={"detail": "Transcription unavailable"})
    except Exception as e:
        logger.error("Transcription error: %s", e)
        return JSONResponse(status_code=500, content={"detail": "Transcription failed"})


@app.get("/api/v1/geocoding/reverse", tags=["Geocoding"])
async def reverse_geocode(lat: float, lon: float):
    """Reverse-geocode coordinates to a human-readable address."""
    from app.integrations.google_maps import GoogleMapsClient
    maps = GoogleMapsClient()
    result = await maps.reverse_geocode(lat, lon)
    return result if result else {"error": "Geocoding unavailable"}


@app.post("/api/v1/geocoding/distance-matrix", tags=["Geocoding"])
async def distance_matrix(request: Request):
    """Compute distance matrix between origins and destinations."""
    from app.integrations.google_maps import GoogleMapsClient
    body = await request.json()
    maps = GoogleMapsClient()
    result = await maps.get_distance_matrix(body.get("origins", []), body.get("destinations", []))
    return result if result else {"error": "Distance matrix unavailable"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)