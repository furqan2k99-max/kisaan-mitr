"""
Kisaan Mitr — Bhashini NLP Integration
Kannada voice-to-text with structured intent parsing.
"""

import logging
import base64
import re
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class BhashiniClient:
    """Bhashini API wrapper for Kannada-to-English voice-to-text NLP."""

    def __init__(self):
        self.api_key = settings.BHASHINI_API_KEY
        self.api_url = settings.BHASHINI_API_URL
        self.stub_mode = bool(getattr(settings, "BHASHINI_STUB_MODE", False))
        if not self.api_key and not self.stub_mode:
            logger.warning("Bhashini disabled: BHASHINI_API_KEY is not configured")
        if self.stub_mode:
            logger.warning("Bhashini running in STUB mode (no network calls)")

    async def transcribe_audio(
        self,
        audio_data: bytes,
        source_language: str = "kn",
        target_language: str = "en",
    ) -> Optional[Dict[str, Any]]:
        """Transcribe Kannada audio to English text."""
        if self.stub_mode:
            return None

        if not self.api_key:
            return None

        try:
            audio_base64 = base64.b64encode(audio_data).decode("utf-8")
            payload = {
                "audio": audio_base64,
                "source_language": source_language,
                "target_language": target_language,
                "format": "wav",
                "sample_rate": 16000,
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.api_url,
                    headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                    json=payload,
                )
                if response.status_code == 200:
                    result = response.json()
                    logger.info("Bhashini transcription successful")
                    return {
                        "text": result.get("text", ""),
                        "confidence": result.get("confidence", 0.0),
                        "source_language": source_language,
                        "target_language": target_language,
                    }
                else:
                    logger.error("Bhashini API error: %s - %s", response.status_code, response.text)
                    return None

        except Exception as e:
            logger.error("Bhashini transcription error: %s", e)
            return None

    async def translate_text(
        self,
        text: str,
        source_language: str = "kn",
        target_language: str = "en",
    ) -> Optional[str]:
        """Translate text between Indian languages."""
        if self.stub_mode or not self.api_key:
            return text  # pass-through when disabled/stubbed

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.api_url}/translate",
                    headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                    json={"text": text, "source_language": source_language, "target_language": target_language},
                )
                if response.status_code == 200:
                    return response.json().get("translated_text", text)
                return text
        except Exception as e:
            logger.error("Bhashini translation error: %s", e)
            return text


class VoiceInputProcessor:
    """Processes farmer voice input for load request creation."""

    def __init__(self):
        self.bhashini = BhashiniClient()

    async def process_voice_to_load_request(self, audio_data: bytes) -> Optional[Dict[str, Any]]:
        """Convert farmer voice input to structured load request data."""
        transcription = await self.bhashini.transcribe_audio(audio_data, source_language="kn", target_language="en")
        if not transcription:
            return None

        text = transcription["text"]
        parsed = self._parse_voice_command(text)
        parsed["transcription"] = transcription
        return parsed

    def _parse_voice_command(self, text: str) -> Dict[str, Any]:
        """Parse natural language command into structured data."""
        result: Dict[str, Any] = {
            "weight_kg": None,
            "crop_type": None,
            "destination_mandi": None,
            "pickup_date": None,
            "raw_text": text,
        }

        # Extract weight
        weight_match = re.search(r"(\d+)\s*(kg|kilo)", text, re.IGNORECASE)
        if weight_match:
            result["weight_kg"] = int(weight_match.group(1))

        # Extract crop type
        crops = ["tomato", "potato", "onion", "rice", "wheat", "sugarcane", "coffee", "cotton", "groundnut", "maize"]
        text_lower = text.lower()
        for crop in crops:
            if crop in text_lower or f"{crop}es" in text_lower or f"{crop}s" in text_lower:
                result["crop_type"] = crop
                break

        # Extract mandi destination
        mandi_patterns = [
            r"(?:to|towards?|for)\s+(\w+(?:\s+\w+)?)\s*(?:mandi|market|apmc)",
            r"(\w+)\s*(?:mandi|market|apmc)",
        ]
        for pattern in mandi_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                result["destination_mandi"] = match.group(1).strip()
                break

        # Extract date
        if "tomorrow" in text_lower:
            result["pickup_date"] = (datetime.now() + timedelta(days=1)).date().isoformat()
        elif "today" in text_lower:
            result["pickup_date"] = datetime.now().date().isoformat()
        else:
            date_match = re.search(r"(\d{1,2})[/-](\d{1,2})[/-](\d{4})", text)
            if date_match:
                result["pickup_date"] = f"{date_match.group(3)}-{date_match.group(2)}-{date_match.group(1)}"

        return result