"""
Kisaan Mitr — Voice Booking Agent
Creates a pending load request from parsed voice intent data.
Handles geocoding, mandi search, fare estimation, and DB persistence.
"""

import asyncio
import logging
import math
import time
from datetime import date, datetime
from typing import Optional, Dict, Any, List

import httpx
from sqlalchemy.orm import Session

from app.models.models import LoadRequest, Mandi, User, LoadStatus

logger = logging.getLogger(__name__)

# Karnataka bounding box (approx)
KARNATAKA_LAT_MIN, KARNATAKA_LAT_MAX = 11.5, 18.5
KARNATAKA_LON_MIN, KARNATAKA_LON_MAX = 74.0, 78.6

# Allowed crop types
ALLOWED_CROPS = {
    "Rice", "Wheat", "Tomato", "Onion", "Sugarcane", "Cotton",
    "Maize", "Pulses", "Potato", "Coffee", "Groundnut", "Other",
}

FARE_PER_KM = 12.0
POOLING_SAVINGS_PERCENT = 40


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points using Haversine formula."""
    R = 6371.0
    lat1_r, lon1_r = math.radians(lat1), math.radians(lon1)
    lat2_r, lon2_r = math.radians(lat2), math.radians(lon2)
    dlat = lat2_r - lat1_r
    dlon = lon2_r - lon1_r
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _is_in_karnataka(lat: float, lon: float) -> bool:
    """Check if coordinates are within Karnataka state bounds."""
    return KARNATAKA_LAT_MIN <= lat <= KARNATAKA_LAT_MAX and KARNATAKA_LON_MIN <= lon <= KARNATAKA_LON_MAX


# Module-level rate limiter for Nominatim (1 req/sec per policy)
_nominatim_last_call = 0.0
_nominatim_lock = asyncio.Lock()


async def _geocode_location(place_name: str) -> Optional[Dict[str, Any]]:
    """
    Geocode a place name using Nominatim (OpenStreetMap) — free, no API key.
    Respects 1 req/sec rate limit. Returns {lat, lon, display_name} or None.
    """
    global _nominatim_last_call

    # Enforce 1 second rate limit
    async with _nominatim_lock:
        now = time.monotonic()
        elapsed = now - _nominatim_last_call
        if elapsed < 1.0:
            await asyncio.sleep(1.0 - elapsed)
        _nominatim_last_call = time.monotonic()

    search_query = f"{place_name}, Karnataka, India"
    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": search_query, "format": "json", "limit": 1, "countrycodes": "in"}
    headers = {"User-Agent": "kisaan-mitr-app"}  # Required by Nominatim policy

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, params=params, headers=headers)
            if response.status_code == 200:
                results = response.json()
                if results:
                    return {
                        "lat": float(results[0]["lat"]),
                        "lon": float(results[0]["lon"]),
                        "display_name": results[0].get("display_name", place_name),
                    }
    except Exception as e:
        logger.warning("Nominatim geocoding failed for '%s': %s", place_name, e)

    return None


def _find_nearest_mandi(
    db: Session, lat: float, lon: float, exclude_name: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """Find the nearest mandi to given coordinates using PostGIS."""
    from sqlalchemy import text
    from geoalchemy2.shape import to_shape

    try:
        # Find nearest mandi using PostGIS distance
        query = text("""
            SELECT id, name, state, district, address,
                   ST_Y(geometry::geometry) as lat,
                   ST_X(geometry::geometry) as lon,
                   ST_Distance(
                       geometry::geometry,
                       ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geometry
                   ) as distance
            FROM mandis
            ORDER BY geometry::geometry <-> ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geometry
            LIMIT 3
        """)

        result = db.execute(query, {"lat": lat, "lon": lon})
        rows = result.fetchall()

        mandis = []
        for row in rows:
            if exclude_name and row.name.lower() == exclude_name.lower():
                continue
            mandis.append({
                "id": str(row.id),
                "name": row.name,
                "district": row.district,
                "lat": row.lat,
                "lon": row.lon,
                "distance_km": round(row.distance / 1000, 1) if row.distance else 0,
            })

        return mandis[0] if mandis else None

    except Exception as e:
        logger.error("PostGIS mandi search failed: %s", e)
        return None


def _find_mandi_by_name(db: Session, name: str, user_lat: float = None, user_lon: float = None) -> Optional[Dict[str, Any]]:
    """Fuzzy search mandis by name with typo tolerance and optional location-based ranking."""
    from sqlalchemy import text

    try:
        # Try 1: Exact ILIKE
        query = text("""
            SELECT id, name, state, district, address,
                   ST_Y(geometry::geometry) as lat,
                   ST_X(geometry::geometry) as lon
            FROM mandis
            WHERE name ILIKE :pattern
            LIMIT 3
        """)
        result = db.execute(query, {"pattern": f"%{name}%"})
        rows = result.fetchall()
        if rows:
            return _build_mandi_result(rows[0])

        # Try 2: Try variations for common typos (remove last char, remove vowels, etc.)
        variations = _generate_name_variations(name)
        for variant in variations:
            query = text("""
                SELECT id, name, state, district, address,
                       ST_Y(geometry::geometry) as lat,
                       ST_X(geometry::geometry) as lon
                FROM mandis
                WHERE name ILIKE :pattern
                LIMIT 1
            """)
            result = db.execute(query, {"pattern": f"%{variant}%"})
            rows = result.fetchall()
            if rows:
                logger.info("Matched mandi via variation '%s' for input '%s'", variant, name)
                return _build_mandi_result(rows[0])

        # Try 3: If user location provided, find nearest mandis and return closest
        if user_lat is not None and user_lon is not None:
            nearby = _find_nearest_mandi(db, user_lat, user_lon)
            if nearby:
                logger.info("Fell back to nearest mandi for '%s'", name)
                return nearby

        return None

    except Exception as e:
        logger.error("Mandi name search failed: %s", e)
        return None


def _build_mandi_result(row) -> Dict[str, Any]:
    """Build mandi dict from DB row."""
    return {
        "id": str(row.id),
        "name": row.name,
        "district": row.district,
        "lat": row.lat,
        "lon": row.lon,
    }


def _generate_name_variations(name: str) -> List[str]:
    """Generate common typo variations for mandi name matching."""
    variations = []
    name_lower = name.lower()
    
    # Remove last character (handles "Mandiya" -> "Mandya")
    if len(name_lower) > 3:
        variations.append(name_lower[:-1])
    
    # Remove 'i' before 'a' at end (handles "Mandiya" -> "Mandya")
    if name_lower.endswith('iya'):
        variations.append(name_lower[:-3] + 'ya')
    
    # Remove 'i' before 'i' at end (handles "Mandii" -> "Mandi")
    if name_lower.endswith('ii'):
        variations.append(name_lower[:-1])
    
    return variations


def _find_nearby_mandis(db: Session, lat: float, lon: float, limit: int = 3) -> List[Dict[str, Any]]:
    """Find nearest mandis for farmer to pick from."""
    from sqlalchemy import text

    try:
        query = text("""
            SELECT id, name, district,
                   ST_Y(geometry::geometry) as lat,
                   ST_X(geometry::geometry) as lon,
                   ST_Distance(
                       geometry::geometry,
                       ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geometry
                   ) as distance
            FROM mandis
            ORDER BY geometry::geometry <-> ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geometry
            LIMIT :limit
        """)

        result = db.execute(query, {"lat": lat, "lon": lon, "limit": limit})
        rows = result.fetchall()

        return [
            {
                "id": str(row.id),
                "name": row.name,
                "district": row.district,
                "lat": row.lat,
                "lon": row.lon,
                "distance_km": round(row.distance / 1000, 1) if row.distance else 0,
            }
            for row in rows
        ]
    except Exception as e:
        logger.error("Nearby mandi search failed: %s", e)
        return []


async def create_booking_from_intent(
    parsed_intent: Dict[str, Any],
    user_id: str,
    user_location: Optional[Dict[str, float]] = None,
    db: Session = None,
) -> Dict[str, Any]:
    """
    Create a pending load request from a parsed voice intent.

    Steps:
    1. Validate intent fields
    2. Geocode origin location
    3. Find destination mandi
    4. Calculate fare estimate
    5. Create LoadRequest in DB with status "pending_confirmation"
    6. Return booking summary

    Args:
        parsed_intent: The parsed intent dict from voice_intent_parser.
        user_id: UUID of the current user.
        user_location: Optional {lat, lon} from browser geolocation.
        db: SQLAlchemy database session.

    Returns:
        Booking summary dict or error dict.
    """
    # ── Step 1: Validate intent ────────────────────────────────────────
    crop_type = parsed_intent.get("crop_type")
    weight_kg = parsed_intent.get("weight_kg")
    pickup_date_str = parsed_intent.get("pickup_date")
    origin_location = parsed_intent.get("origin_location")
    destination_mandi_name = parsed_intent.get("destination_mandi")
    confidence = parsed_intent.get("confidence_score", 0.5)
    missing_fields = parsed_intent.get("missing_fields", [])

    # Validate crop type
    if crop_type and crop_type not in ALLOWED_CROPS:
        crop_type = "Other"

    # Validate weight
    if weight_kg is not None:
        if weight_kg < 1:
            return {"error": "Weight must be at least 1 kg", "field": "weight_kg", "suggestion": "Please specify the weight of your crop"}
        if weight_kg > 800:
            weight_kg = 800
            parsed_intent["notes"] = f"Farmer said more than 800kg, capped at 800kg"

    # Validate pickup date
    pickup_date = None
    if pickup_date_str:
        try:
            pickup_date = date.fromisoformat(pickup_date_str)
            if pickup_date < date.today():
                # Suggest tomorrow
                from datetime import timedelta
                pickup_date = date.today() + timedelta(days=1)
                parsed_intent["notes"] = (parsed_intent.get("notes", "") + " | Date was in the past, set to tomorrow").strip(" |")
                pickup_date_str = pickup_date.isoformat()
        except ValueError:
            return {"error": "Invalid date format", "field": "pickup_date", "suggestion": "Please provide a valid date"}

    # ── Step 2: Geocode origin ─────────────────────────────────────────
    origin_lat, origin_lon = None, None
    origin_address = "Unknown location"

    # If origin_location not provided or explicitly "current location", use user_location
    if (not origin_location or origin_location.lower() in ("current location", "当前位置", "current", "auto")):
        if user_location:
            origin_lat = user_location["lat"]
            origin_lon = user_location["lon"]
            origin_address = f"Current location ({origin_lat:.4f}, {origin_lon:.4f})"
        else:
            return {"error": "Location access needed", "field": "origin_location", "suggestion": "Please share your location or enter your address"}
    elif origin_location:
        geocoded = await _geocode_location(origin_location)
        if geocoded:
            origin_lat = geocoded["lat"]
            origin_lon = geocoded["lon"]
            origin_address = geocoded["display_name"]

            # Check Karnataka bounds
            if not _is_in_karnataka(origin_lat, origin_lon):
                return {"error": "Location outside Karnataka", "field": "origin_location", "suggestion": "We currently serve Karnataka only"}
        else:
            return {"error": "Could not find location", "field": "origin_location", "suggestion": "Please enter a more specific location in Karnataka"}

    if origin_lat is None or origin_lon is None:
        return {"error": "Origin location required", "field": "origin_location", "suggestion": "Please enter your pickup location"}

    # ── Step 3: Find destination mandi ─────────────────────────────────
    mandi_data = None

    if destination_mandi_name and destination_mandi_name.lower() != "nearest":
        # Try fuzzy search by name with typo tolerance
        mandi_data = _find_mandi_by_name(db, destination_mandi_name, origin_lat, origin_lon)

    if not mandi_data:
        # Find nearest mandi
        mandi_data = _find_nearest_mandi(db, origin_lat, origin_lon, exclude_name=destination_mandi_name)

    if not mandi_data:
        # Return 3 nearest mandis for farmer to pick
        nearby = _find_nearby_mandis(db, origin_lat, origin_lon, limit=3)
        return {
            "error": "Mandi not found",
            "field": "destination_mandi",
            "suggestion": "Please choose from these nearby mandis",
            "nearby_mandis": nearby,
        }

    dest_lat = mandi_data["lat"]
    dest_lon = mandi_data["lon"]

    # ── Step 4: Calculate fare estimate ────────────────────────────────
    distance_km = _haversine_km(origin_lat, origin_lon, dest_lat, dest_lon)
    total_fare = round(distance_km * FARE_PER_KM, 2)
    pooled_fare = round(total_fare * (1 - POOLING_SAVINGS_PERCENT / 100), 2)
    savings = round(total_fare - pooled_fare, 2)

    # ── Step 5: Create LoadRequest in DB ───────────────────────────────
    from uuid import UUID

    try:
        load = LoadRequest(
            farmer_id=UUID(user_id) if isinstance(user_id, str) else user_id,
            weight_kg=weight_kg or 100,
            crop_type=crop_type or "Other",
            origin_address=origin_address,
            destination_mandi=mandi_data["name"],
            pickup_date=pickup_date or date.today(),
            status=LoadStatus.PENDING,
            expected_price=total_fare,
        )

        # Set origin/destination geometry
        from geoalchemy2.elements import WKTElement
        load.origin_geometry = WKTElement(f"POINT({origin_lon} {origin_lat})", srid=4326)
        load.destination_geometry = WKTElement(f"POINT({dest_lon} {dest_lat})", srid=4326)

        db.add(load)
        db.commit()
        db.refresh(load)

        logger.info("Voice booking created: load_id=%s, crop=%s, weight=%s", load.id, crop_type, weight_kg)

        # ── Step 6: Return booking summary ─────────────────────────────
        nearby = _find_nearby_mandis(db, origin_lat, origin_lon, limit=5)
        return {
            "booking_id": str(load.id),
            "crop_type": crop_type or "Other",
            "weight_kg": weight_kg or 100,
            "pickup_date": pickup_date.isoformat() if pickup_date else date.today().isoformat(),
            "origin": {"address": origin_address, "lat": origin_lat, "lon": origin_lon},
            "destination_mandi": {"name": mandi_data["name"], "lat": dest_lat, "lon": dest_lon},
            "distance_km": round(distance_km, 1),
            "estimated_fare": f"\u20b9{total_fare:.0f}",
            "pooled_fare_estimate": f"\u20b9{pooled_fare:.0f}",
            "savings_estimate": f"\u20b9{savings:.0f} ({POOLING_SAVINGS_PERCENT}% cheaper)",
            "status": "pending_confirmation",
            "missing_fields": missing_fields,
            "confidence_score": confidence,
            "nearby_mandis": nearby,
        }

    except Exception as e:
        logger.error("Failed to create voice booking: %s", e)
        db.rollback()
        return {"error": "Couldn't save booking. Please try again.", "field": "db", "suggestion": "Retry"}
