"""
Kisaan Mitr — Mandi Prices Router
Fetches live prices from Agmarknet (data.gov.in) API.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.core.security import get_current_active_user
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mandi-prices", tags=["Mandi Prices"])


class MandiPrice(BaseModel):
    market: str
    district: str
    state: str
    commodity: str
    min_price: float
    max_price: float
    modal_price: float
    arrival_date: str


class MandiPricesResponse(BaseModel):
    prices: list[MandiPrice]
    count: int
    message: Optional[str] = None
    last_updated: Optional[str] = None


async def _fetch_prices(params: dict, headers: dict) -> dict:
    """Fetch prices from Agmarknet API"""
    logger.info(f"Calling Agmarknet API with params: {params}")
    try:
        async with httpx.AsyncClient(timeout=30.0, headers=headers) as client:
            response = await client.get(settings.AGMARKNET_API_URL, params=params)
            logger.info(f"API response status: {response.status_code}")
            
            if response.status_code == 401:
                raise HTTPException(status_code=401, detail="Invalid API key")
            if response.status_code == 429:
                raise HTTPException(status_code=429, detail="Rate limit exceeded")
            
            response.raise_for_status()
            return response.json()
            
    except httpx.HTTPError as e:
        logger.error(f"Agmarknet API error: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch mandi prices: {str(e)}")


@router.get("/", response_model=MandiPricesResponse)
async def get_mandi_prices(
    commodity: str = Query(..., description="Crop name e.g., Tomato, Potato"),
    state: Optional[str] = Query(None, description="State name e.g., Karnataka"),
    district: Optional[str] = Query(None, description="District name"),
    limit: int = Query(10, le=50),
    current_user=Depends(get_current_active_user),
):
    """Fetch live mandi prices from Agmarknet (Indian Government API)"""
    
    if not settings.AGMARKNET_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Agmarknet API key not configured. Please set AGMARKNET_API_KEY in .env",
        )

    import httpx
    
    today = datetime.now()
    week_ago = today - timedelta(days=7)
    date_range = f"{week_ago.strftime('%d/%m/%Y')}:{today.strftime('%d/%m/%Y')}"

    base_params = {
        "api-key": settings.AGMARKNET_API_KEY,
        "format": "json",
        "limit": limit,
        "filters[commodity]": commodity,
        "filters[arrival_date]": date_range,
    }
    if state:
        base_params["filters[state]"] = state
    if district:
        base_params["filters[district]"] = district

    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    
    # Attempt 1: with state filter + date range
    data = await _fetch_prices(base_params, {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"})
    records = data.get("records", [])
    
    # Attempt 2: without state filter if empty
    if not records and state:
        logger.info(f"No records with state filter, retrying without state filter for {commodity}")
        retry_params = {k: v for k, v in base_params.items() if k != "filters[state]"}
        data = await _fetch_prices(retry_params, {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"})
        records = data.get("records", [])

    if not records:
        return MandiPricesResponse(
            prices=[],
            count=0,
            message=(
                f"No price data available for {commodity} this week. "
                "Agmarknet updates prices after markets close and report. "
                "Please check back tomorrow."
            ),
            last_updated=None
        )

    # Parse records
    prices = []
    for record in records:
        try:
            prices.append(MandiPrice(
                market=record.get("market", ""),
                district=record.get("district", ""),
                state=record.get("state", ""),
                commodity=record.get("commodity", ""),
                min_price=float(record.get("min_price", 0) or 0),
                max_price=float(record.get("max_price", 0) or 0),
                modal_price=float(record.get("modal_price", 0) or 0),
                arrival_date=record.get("arrival_date", ""),
            ))
        except (ValueError, TypeError) as e:
            logger.warning(f"Skipping invalid record: {record}, error: {e}")
            continue

    # Sort by arrival_date descending (newest first)
    prices.sort(key=lambda x: x.arrival_date, reverse=True)
    
    # Get most recent date for last_updated
    last_updated = prices[0].arrival_date if prices else None

    return MandiPricesResponse(prices=prices, count=len(prices), last_updated=last_updated)