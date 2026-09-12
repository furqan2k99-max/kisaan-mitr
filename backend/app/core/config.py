"""
Kisaan Mitr — Application Configuration
Uses Pydantic-settings v2 for native .env file parsing.
"""

from typing import List
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # ── App ──────────────────────────────────────────────
    APP_NAME: str = "Kisaan Mitr - AgriPool AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # ── Database ─────────────────────────────────────────
    DATABASE_URL: str = "postgresql://agrpool:agrpool123@db:5432/kisaan_mitr"

    # ── JWT Auth ─────────────────────────────────────────
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Bhashini NLP ─────────────────────────────────────
    BHASHINI_API_KEY: str = ""
    BHASHINI_API_URL: str = "https://api.bhashini.gov.in/v1/recognize"
    # If true, allows non-production stub behavior (no real network call).
    # Keep false in production.
    BHASHINI_STUB_MODE: bool = False

    # ── Google Maps ──────────────────────────────────────
    GOOGLE_MAPS_API_KEY: str = ""
    GOOGLE_MAPS_API_URL: str = "https://maps.googleapis.com/maps/api"

    # ── Razorpay ─────────────────────────────────────────
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""

    # ── Agmarknet (data.gov.in) ─────────────────────────
    AGMARKNET_API_KEY: str = ""
    AGMARKNET_API_URL: str = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"

    # ── CORS ─────────────────────────────────────────────
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://localhost",
        "http://127.0.0.1:3000",
        "http://127.0.0.1",
        "https://kisaanmitr.in",
        "https://www.kisaanmitr.in",
    ]

    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()