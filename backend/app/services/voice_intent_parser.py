"""
Kisaan Mitr — Voice Intent Parser
Extracts booking details from farmer speech using Google Gemini 1.5 Flash
with a rule-based fallback parser when Gemini quota is exhausted.
"""

import json
import logging
import re
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from app.core.config import settings

logger = logging.getLogger(__name__)

# Allowed crop types for validation
ALLOWED_CROPS = [
    "Rice", "Wheat", "Tomato", "Onion", "Sugarcane", "Cotton",
    "Maize", "Pulses", "Potato", "Coffee", "Groundnut", "Other",
]

# Hindi/local crop name mappings
CROP_ALIASES = {
    "tamatar": "Tomato", "टमाटर": "Tomato", "tomato": "Tomato", "tomatoes": "Tomato",
    "chawal": "Rice", "चावल": "Rice", "rice": "Rice",
    "gehun": "Wheat", "गेहूं": "Wheat", "wheat": "Wheat",
    "pyaaz": "Onion", "प्याज": "Onion", "onion": "Onion", "onions": "Onion",
    "ganna": "Sugarcane", "गन्ना": "Sugarcane", "sugarcane": "Sugarcane",
    "kapaas": "Cotton", "कपास": "Cotton", "cotton": "Cotton",
    "makka": "Maize", "मक्का": "Maize", "corn": "Maize", "maize": "Maize",
    "dal": "Pulses", "दाल": "Pulses", "pulses": "Pulses",
    "aloo": "Potato", "आलू": "Potato", "potato": "Potato", "potatoes": "Potato",
    "coffee": "Coffee",
    "moongfali": "Groundnut", "मूंगफली": "Groundnut", "groundnut": "Groundnut",
    # Kannada aliases
    "ಏಳಕ್ಕಿ": "Rice", "ಗೋಧಿ": "Wheat", "ಟೊಮೇಟೊ": "Tomato",
    "ಈರುಳ್ಳಿ": "Onion", "ಕಬ್ಬು": "Sugarcane", "ಹತ್ತಿ": "Cotton",
}

# Date word mappings (Hindi, Kannada, English)
TODAY_WORDS = {"aaj", "आज", "today", "innu", "ಇಂದು"}
TOMORROW_WORDS = {"kal", "कल", "tomorrow", "naale", "ನಾಳೆ"}

GEMINI_SYSTEM_PROMPT = """You are helping a farmer in India book truck transport for crops.
The farmer spoke in {language}. Extract booking details and return ONLY valid JSON.

Return this exact JSON structure:
{{
  "crop_type": string (Rice/Wheat/Tomato/Onion/Sugarcane/Cotton/Maize/Pulses/Potato/Coffee/Groundnut/Other),
  "weight_kg": integer (1-800 only),
  "pickup_date": string (YYYY-MM-DD, today or future),
  "origin_location": string (place name or "current location"),
  "destination_mandi": string (APMC mandi name or "nearest"),
  "urgency": string ("urgent" or "normal"),
  "confidence_score": float (0.0-1.0),
  "missing_fields": array (list of fields not mentioned),
  "notes": string or null
}}

RULES:
- Map local names: tamatar→Tomato, chawal→Rice, gehun→Wheat, pyaaz→Onion
- Dates: aaj/innu→today, kal/naale→tomorrow, numeric dates as given
- Weight > 800kg: set weight_kg=800, add note "farmer said X kg, capped at 800"
- If field missing: set null, add to missing_fields array
- Confidence: 0.9+ if all fields present, 0.6-0.9 if some missing, <0.6 if unclear
- RETURN ONLY JSON. NO MARKDOWN. NO BACKTICKS. NO EXPLANATION."""


def _rule_based_parse(transcription: str) -> Dict[str, Any]:
    """
    Fallback rule-based parser when Gemini is unavailable.
    Uses regex patterns to extract weight, crop, date from the transcription.
    Returns confidence_score: 0.5 always (less reliable than Gemini).
    """
    text = transcription.lower().strip()
    result: Dict[str, Any] = {
        "crop_type": None,
        "weight_kg": None,
        "pickup_date": None,
        "origin_location": None,
        "destination_mandi": None,
        "urgency": "normal",
        "confidence_score": 0.5,
        "missing_fields": [],
        "notes": "Parsed using rule-based fallback",
    }

    # Extract weight — look for number + kg/kilo patterns
    weight_match = re.search(r"(\d+)\s*(kg|kilo|kilogram|किलो|ಕೆಜಿ)", text)
    if weight_match:
        result["weight_kg"] = min(int(weight_match.group(1)), 800)
    else:
        # Try standalone number that looks like weight
        num_match = re.search(r"\b(\d{1,3})\b", text)
        if num_match:
            val = int(num_match.group(1))
            if 1 <= val <= 800:
                result["weight_kg"] = val

    # Extract crop type from aliases and text
    for alias, crop in CROP_ALIASES.items():
        if alias in text:
            result["crop_type"] = crop
            break

    # Extract date
    words = set(text.split())
    if words & TODAY_WORDS:
        result["pickup_date"] = datetime.now().strftime("%Y-%m-%d")
    elif words & TOMORROW_WORDS:
        result["pickup_date"] = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    else:
        date_match = re.search(r"(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})", text)
        if date_match:
            day, month, year = date_match.group(1), date_match.group(2), date_match.group(3)
            if len(year) == 2:
                year = "20" + year
            result["pickup_date"] = f"{year}-{month.zfill(2)}-{day.zfill(2)}"

# Extract destination mandi from text
    mandi_patterns = [
        r"(?:to|towards?|for)\s+(\w+(?:\s+\w+)?)\s*(?:mandi|market|apmc)",
        r"(\w+)\s*(?:mandi|market|apmc)",
        r"(?:to|towards?|for)\s+([a-zA-Z\s]+?)(?:\s+tomorrow|\s+today|\s+next|\s*$)",
    ]
    for pattern in mandi_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            # Clean up: remove leading prepositions (in, at, to, for)
            mandi_name = match.group(1).strip().title()
            mandi_name = re.sub(r'^(In|At|To|For)\s+', '', mandi_name, flags=re.IGNORECASE)
            result["destination_mandi"] = mandi_name
            break

    # Detect urgency
    if any(w in text for w in ["urgent", "jaldi", "turant", "तुरंत", "ತಕ್ಷಣ"]):
        result["urgency"] = "urgent"

    # Build missing_fields list
    for field in ["crop_type", "weight_kg", "pickup_date", "destination_mandi"]:
        if result[field] is None:
            result["missing_fields"].append(field)

    # Adjust confidence based on missing fields
    missing_count = len(result["missing_fields"])
    if missing_count == 0:
        result["confidence_score"] = 0.7  # rule-based cap
    elif missing_count <= 1:
        result["confidence_score"] = 0.4
    else:
        result["confidence_score"] = 0.3

    return result


async def parse_farming_intent(
    transcription: str, language: str = "hi"
) -> Dict[str, Any]:
    """
    Parse farmer's spoken text into a structured booking intent.

    Flow: Try Gemini 1.5 Flash → on RateLimitError → fallback to rule-based parser.

    Args:
        transcription: The transcribed text from the farmer.
        language: Language code (hi, kn, en).

    Returns:
        Parsed intent dict with crop_type, weight_kg, pickup_date, etc.
    """
    # Try Gemini first
    try:
        import google.generativeai as genai

        api_key = getattr(settings, "GOOGLE_GEMINI_API_KEY", "")
        if not api_key:
            logger.warning("GOOGLE_GEMINI_API_KEY not set, using rule-based parser")
            return _rule_based_parse(transcription)

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        lang_name = {"hi": "Hindi", "kn": "Kannada", "en": "English"}.get(language, "Hindi")
        system_prompt = GEMINI_SYSTEM_PROMPT.format(language=lang_name)

        response = await model.generate_content_async(
            [system_prompt, transcription],
        )

        # Extract text from response
        response_text = response.text.strip()

        # Strip markdown code fences if present
        if response_text.startswith("```"):
            response_text = re.sub(r"^```(?:json)?\n?", "", response_text)
            response_text = re.sub(r"\n?```$", "", response_text)

        parsed = json.loads(response_text)

        # Validate and normalize crop_type
        if parsed.get("crop_type") and parsed["crop_type"] not in ALLOWED_CROPS:
            # Try to find a match
            for crop in ALLOWED_CROPS:
                if crop.lower() == parsed["crop_type"].lower():
                    parsed["crop_type"] = crop
                    break
            else:
                parsed["crop_type"] = "Other"

        # Cap weight at 800kg
        if parsed.get("weight_kg") and parsed["weight_kg"] > 800:
            parsed["notes"] = f"Farmer said {parsed['weight_kg']}kg, capped at 800"
            parsed["weight_kg"] = 800

        logger.info("Gemini parsed intent successfully: crop=%s, weight=%s", parsed.get("crop_type"), parsed.get("weight_kg"))
        return parsed

    except Exception as e:
        logger.warning("Gemini parsing failed (%s), falling back to rule-based parser", type(e).__name__)
        return _rule_based_parse(transcription)
