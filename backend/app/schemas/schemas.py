from datetime import datetime, date, time
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from enum import Enum


class UserRole(str, Enum):
    FARMER = "farmer"
    FPO = "fpo"
    DRIVER = "driver"
    ADMIN = "admin"


class TruckType(str, Enum):
    TATA_ACE = "tata_ace"
    PICKUP = "pickup"
    MINI_TRUCK = "mini_truck"
    TRUCK = "truck"


class LoadStatus(str, Enum):
    PENDING = "pending"
    POOLED = "pooled"
    ASSIGNED = "assigned"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class TripStatus(str, Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    CAPTURED = "captured"
    FAILED = "failed"
    REFUNDED = "refunded"


class PaymentType(str, Enum):
    ADVANCE = "advance"
    FULL = "full"
    COD = "cod"


class GeoPointInput(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)
    phone: str = Field(..., min_length=10, max_length=20)
    role: UserRole = UserRole.FARMER
    language_preference: str = Field(default="en", pattern="^(en|kn|hi)$")


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    aadhaar_number: Optional[str] = Field(None, min_length=12, max_length=12)


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    phone: Optional[str] = Field(None, min_length=10, max_length=20)
    profile_image_url: Optional[str] = None
    language_preference: Optional[str] = Field(None, pattern="^(en|kn|hi)$")


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    aadhaar_number: Optional[str] = None
    profile_image_url: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TruckBase(BaseModel):
    registration_number: str = Field(..., min_length=5, max_length=20)
    truck_type: TruckType
    capacity_kg: int = Field(..., gt=0, le=10000)


class TruckCreate(TruckBase):
    driver_id: Optional[UUID] = None
    insurance_expiry: Optional[date] = None
    permit_expiry: Optional[date] = None
    current_location: Optional[GeoPointInput] = None


class TruckUpdate(BaseModel):
    current_location: Optional[GeoPointInput] = None
    is_available: Optional[bool] = None
    driver_id: Optional[UUID] = None


class TruckResponse(TruckBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    driver_id: Optional[UUID] = None
    is_available: bool
    insurance_expiry: Optional[date] = None
    permit_expiry: Optional[date] = None
    created_at: datetime


class LoadRequestCreate(BaseModel):
    weight_kg: int = Field(..., gt=0, le=800)
    crop_type: str = Field(..., min_length=1, max_length=100)
    crop_variety: Optional[str] = Field(None, max_length=100)
    origin: GeoPointInput
    origin_address: str = Field(..., min_length=10)
    destination_mandi: str = Field(..., min_length=1)
    destination: GeoPointInput
    pickup_date: date
    pickup_time_window_start: Optional[time] = None
    pickup_time_window_end: Optional[time] = None


class LoadRequestUpdate(BaseModel):
    weight_kg: Optional[int] = Field(None, gt=0, le=800)
    crop_type: Optional[str] = Field(None, min_length=1, max_length=100)
    pickup_date: Optional[date] = None
    pickup_time_window_start: Optional[time] = None
    pickup_time_window_end: Optional[time] = None
    status: Optional[LoadStatus] = None


class LoadRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    farmer_id: UUID
    weight_kg: int
    crop_type: str
    crop_variety: Optional[str] = None
    origin_address: str
    destination_mandi: str
    pickup_date: date
    pickup_time_window_start: Optional[time] = None
    pickup_time_window_end: Optional[time] = None
    status: LoadStatus
    expected_price: Optional[float] = None
    created_at: datetime
    updated_at: datetime


class TripLoadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    load_request_id: UUID
    pickup_sequence: Optional[int] = None
    allocated_weight_kg: Optional[int] = None
    fare_share: Optional[float] = None
    payment_status: str


class TripResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    truck_id: Optional[UUID] = None
    mandi_destination: str
    total_distance_km: Optional[float] = None
    total_weight_kg: Optional[int] = None
    status: TripStatus
    scheduled_pickup_start: Optional[datetime] = None
    estimated_arrival: Optional[datetime] = None
    base_fare: Optional[float] = None
    platform_commission_rate: float
    total_fare: Optional[float] = None
    created_at: datetime
    trip_loads: List[TripLoadResponse] = []


class TripCreate(BaseModel):
    truck_id: UUID
    mandi_destination: str
    load_request_ids: List[UUID]


class PoolingResult(BaseModel):
    trip: TripResponse
    pooled_farmers: int
    total_weight: int
    savings_percentage: float


class NearbyFarmer(BaseModel):
    load_request_id: UUID
    farmer_name: str
    weight_kg: int
    crop_type: str
    distance_km: float
    destination_mandi: str


class FarmerInPool(BaseModel):
    id: str
    name: str
    crop: str
    crop_emoji: str
    weight_kg: int
    distance_km: float


class PoolAnalysisResponse(BaseModel):
    truck_capacity: int
    base_fare: float
    platform_commission: float
    destination: str
    eta_minutes: int
    current_user_id: str
    farmers: List[FarmerInPool]
    total_weight: int
    capacity_percentage: float
    savings_percentage: float


class PaymentCreate(BaseModel):
    load_request_id: UUID
    amount: float = Field(..., gt=0)
    payment_type: PaymentType = PaymentType.FULL


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    load_request_id: Optional[UUID] = None
    trip_id: Optional[UUID] = None
    razorpay_payment_id: Optional[str] = None
    amount: float
    status: PaymentStatus
    escrow_status: str
    payment_type: PaymentType
    created_at: datetime


class RazorpayOrderRequest(BaseModel):
    amount: float = Field(..., gt=0)
    currency: str = Field(default="INR")
    receipt: Optional[str] = None
    load_request_id: UUID


class RazorpayOrderResponse(BaseModel):
    id: str
    entity: str
    amount: int
    currency: str
    receipt: Optional[str] = None
    status: str


class MandiBase(BaseModel):
    name: str = Field(..., min_length=1)
    state: str = Field(..., min_length=1)
    district: str = Field(..., min_length=1)
    location: GeoPointInput
    address: Optional[str] = None


class MandiResponse(MandiBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID


class ErrorResponse(BaseModel):
    detail: str
    code: Optional[str] = None
    field: Optional[str] = None