"""
Kisaan Mitr — Mandi Prices Router
Fetches live prices from Agmarknet (data.gov.in) API.
"""

import logging
from typing import Optional
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

    params = {
        "api-key": settings.AGMARKNET_API_KEY,
        "format": "json",
        "limit": limit,
    }

    if commodity:
        params[f"filters[commodity]"] = commodity
    if state:
        params[f"filters[state]"] = state
    if district:
        params[f"filters[district]"] = district

    logger.info(f"Calling Agmarknet API with params: {params}")
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(settings.AGMARKNET_API_URL, params=params)
            logger.info(f"API response status: {response.status_code}, body: {response.text[:500]}")
            
            if response.status_code == 401:
                raise HTTPException(status_code=401, detail="Invalid API key")
            
            if response.status_code == 429:
                raise HTTPException(status_code=429, detail="Rate limit exceeded")
                
            response.raise_for_status()
            data = response.json()
            
    except httpx.HTTPError as e:
        logger.error(f"Agmarknet API error: {e}, response: {getattr(e, 'response', 'N/A')}")
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch mandi prices: {str(e)}",
        )
    except Exception as e:
        logger.error(f"Unexpected error: {e}, response text: {response.text if 'response' in locals() else 'N/A'}")
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch mandi prices: {str(e)}",
        )

    records = data.get("records", [])
    
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

    return MandiPricesResponse(prices=prices, count=len(prices))


@router.get("/commodities")
async def get_commodities(
    current_user=Depends(get_current_active_user),
):
    """Get list of available commodities from Agmarknet"""
    
    if not settings.AGMARKNET_API_KEY:
        return {"commodities": []}
    
    return {
        "commodities": [
            "Wheat", "Rice", "Maize", "Mustard", "Soybean",
            "Tomato", "Potato", "Onion", "Garlic", "Ginger",
            "Banana", "Mango", "Apple", "Grapes", "Orange",
            "Cotton", "Sugarcane", "Jute", "Tobacco",
        ]
    }