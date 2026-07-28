from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.models.database import get_db
from app.core.security import get_current_active_user
from app.models.models import User, Rating

router = APIRouter(prefix="/api/v1/ratings", tags=["ratings"])


class RatingCreate(BaseModel):
    to_user_id: str
    trip_id: Optional[str] = None
    rating: int  # 1-5
    comment: Optional[str] = None


class RatingResponse(BaseModel):
    id: int
    from_user_id: str
    to_user_id: str
    trip_id: Optional[str]
    rating: int
    comment: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/received", response_model=List[RatingResponse])
async def get_received_ratings(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get ratings received by current user"""
    ratings = (
        db.query(Rating)
        .filter(Rating.to_user_id == current_user.id)
        .order_by(Rating.created_at.desc())
        .all()
    )
    return ratings


@router.get("/given", response_model=List[RatingResponse])
async def get_given_ratings(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get ratings given by current user"""
    ratings = (
        db.query(Rating)
        .filter(Rating.from_user_id == current_user.id)
        .order_by(Rating.created_at.desc())
        .all()
    )
    return ratings


@router.post("", response_model=RatingResponse)
async def create_rating(
    rating: RatingCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Create a new rating"""
    if rating.rating < 1 or rating.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    # Check if user exists
    to_user = db.query(User).filter(User.id == rating.to_user_id).first()
    if not to_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if str(current_user.id) == rating.to_user_id:
        raise HTTPException(status_code=400, detail="Cannot rate yourself")
    
    new_rating = Rating(
        from_user_id=current_user.id,
        to_user_id=rating.to_user_id,
        trip_id=rating.trip_id,
        rating=rating.rating,
        comment=rating.comment
    )
    db.add(new_rating)
    db.commit()
    db.refresh(new_rating)
    return new_rating


@router.get("/user/{user_id}")
async def get_user_rating_stats(
    user_id: str,
    db: Session = Depends(get_db),
):
    """Get average rating for a user"""
    ratings = db.query(Rating).filter(Rating.to_user_id == user_id).all()
    
    if not ratings:
        return {"average": 0, "count": 0}
    
    total = sum(r.rating for r in ratings)
    return {
        "average": round(total / len(ratings), 1),
        "count": len(ratings)
    }
