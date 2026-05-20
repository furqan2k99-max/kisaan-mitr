import logging
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.models.database import get_db
from app.models.models import User
from app.models.models import UserRole as ModelUserRole

logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


RoleLiteral = Literal["farmer", "driver", "admin"]
ALLOWED_ROLES = {"farmer", "driver", "admin"}


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    phone: str = Field(..., min_length=10, max_length=15)
    role: RoleLiteral


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class AuthUser(BaseModel):
    id: UUID
    name: str
    email: EmailStr
    role: RoleLiteral


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: AuthUser


class RefreshResponse(BaseModel):
    access_token: str


def _to_auth_user(user: User) -> AuthUser:
    if user.role.value not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role not allowed",
        )
    return AuthUser(
        id=user.id,
        name=user.full_name,
        email=user.email,
        role=user.role.value,
    )


def _role_to_model_role(role: RoleLiteral) -> ModelUserRole:
    if role == "farmer":
        return ModelUserRole.FARMER
    if role == "driver":
        return ModelUserRole.DRIVER
    return ModelUserRole.ADMIN


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def register(request: Request, body: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user (farmer/driver/admin)."""
    try:
        existing_user = db.query(User).filter(User.email == body.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        user = User(
            email=body.email,
            password_hash=get_password_hash(body.password),
            full_name=body.name,
            phone=body.phone,
            role=_role_to_model_role(body.role),
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})

        logger.info("New user registered: %s - %s", user.id, user.email)
        return AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=_to_auth_user(user),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@router.post("/login", response_model=AuthResponse)
@limiter.limit("15/minute")
async def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user and return JWT tokens."""
    user = db.query(User).filter(User.email == body.email).first()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )

    if user.role.value not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role not allowed",
        )

    access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    logger.info("User logged in: %s - %s", user.id, user.email)

    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=_to_auth_user(user),
    )


@router.post("/refresh", response_model=RefreshResponse)
async def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    """Verify refresh token and return a new access token."""
    payload = decode_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == UUID(user_id)).first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    new_access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    return RefreshResponse(access_token=new_access_token)


@router.get("/me", response_model=AuthUser)
async def me(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Return current user from DB for a valid access token."""
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == UUID(user_id)).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Enforce Sprint 1 roles only.
    if user.role.value not in ("farmer", "driver", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role not allowed",
        )

    return _to_auth_user(user)

