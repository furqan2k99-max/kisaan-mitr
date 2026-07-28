"""
Kisaan Mitr — SQLAlchemy ORM Models
Uses GeoAlchemy2 Geography columns with GIST spatial indexes for
efficient PostGIS radius queries (ST_DWithin, ST_Distance).
"""

import uuid
import enum
from datetime import datetime, date, time
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, Date, Time,
    Numeric, Enum, ForeignKey, Text, UniqueConstraint, Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from geoalchemy2 import Geography

from app.models.database import Base


# ── Enums ────────────────────────────────────────────────────────────────────

class UserRole(enum.Enum):
    FARMER = "farmer"
    FPO = "fpo"
    DRIVER = "driver"
    ADMIN = "admin"


class TruckType(enum.Enum):
    TATA_ACE = "tata_ace"
    PICKUP = "pickup"
    MINI_TRUCK = "mini_truck"
    TRUCK = "truck"


class LoadStatus(enum.Enum):
    PENDING = "pending"
    POOLED = "pooled"
    ASSIGNED = "assigned"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class TripStatus(enum.Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class PaymentStatus(enum.Enum):
    PENDING = "pending"
    CAPTURED = "captured"
    FAILED = "failed"
    REFUNDED = "refunded"


class EscrowStatus(enum.Enum):
    PENDING = "pending"
    HELD = "held"
    RELEASED = "released"


class PaymentType(enum.Enum):
    ADVANCE = "advance"
    FULL = "full"
    COD = "cod"


# ── Models ───────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=False, index=True)
    role = Column(Enum(UserRole, values_callable=lambda x: [e.value for e in x]), nullable=False, default=UserRole.FARMER)
    aadhaar_number = Column(String(12), nullable=True)
    profile_image_url = Column(Text, nullable=True)
    language_preference = Column(String(10), default="en")
    is_active = Column(Boolean, default=True)
    driver_online = Column(Boolean, default=False)
    driver_available_for = Column(String(50), nullable=True)  # e.g., "same_day", "next_day"
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    load_requests = relationship("LoadRequest", back_populates="farmer")
    truck = relationship("Truck", back_populates="driver", uselist=False)
    payments = relationship("Payment", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    price_alerts = relationship("PriceAlert", back_populates="user")
    ratings_received = relationship("Rating", foreign_keys="Rating.to_user_id", back_populates="to_user")
    ratings_given = relationship("Rating", foreign_keys="Rating.from_user_id", back_populates="from_user")


class Truck(Base):
    __tablename__ = "trucks"
    __table_args__ = (
        Index("idx_truck_location_geog", "current_location", postgresql_using="gist"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    registration_number = Column(String(20), unique=True, nullable=False, index=True)
    truck_type = Column(Enum(TruckType, values_callable=lambda x: [e.value for e in x]), nullable=False)
    capacity_kg = Column(Integer, nullable=False)
    current_location = Column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False),
        nullable=True,
    )
    driver_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    is_available = Column(Boolean, default=True)
    insurance_expiry = Column(Date, nullable=True)
    permit_expiry = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    driver = relationship("User", back_populates="truck")
    trips = relationship("Trip", back_populates="truck")


class Mandi(Base):
    __tablename__ = "mandis"
    __table_args__ = (
        Index("idx_mandi_geog", "geometry", postgresql_using="gist"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, unique=True)
    state = Column(String(100), nullable=False)
    district = Column(String(100), nullable=False)
    geometry = Column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False),
        nullable=False,
    )
    address = Column(Text, nullable=True)


class LoadRequest(Base):
    __tablename__ = "load_requests"
    __table_args__ = (
        Index("idx_load_origin_geog", "origin_geometry", postgresql_using="gist"),
        Index("idx_load_dest_geog", "destination_geometry", postgresql_using="gist"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    farmer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    weight_kg = Column(Integer, nullable=False)
    crop_type = Column(String(100), nullable=False)
    crop_variety = Column(String(100), nullable=True)
    origin_geometry = Column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False),
        nullable=False,
    )
    origin_address = Column(Text, nullable=False)
    destination_mandi = Column(String(255), nullable=False, index=True)
    destination_geometry = Column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False),
        nullable=False,
    )
    pickup_date = Column(Date, nullable=False, index=True)
    pickup_time_window_start = Column(Time, nullable=True)
    pickup_time_window_end = Column(Time, nullable=True)
    status = Column(Enum(LoadStatus, values_callable=lambda x: [e.value for e in x]), default=LoadStatus.PENDING, index=True)
    expected_price = Column(Numeric(10, 2), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    farmer = relationship("User", back_populates="load_requests")
    trip_loads = relationship("TripLoad", back_populates="load_request")
    payments = relationship("Payment", back_populates="load_request")


class Trip(Base):
    __tablename__ = "trips"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    truck_id = Column(UUID(as_uuid=True), ForeignKey("trucks.id"), nullable=True)
    mandi_destination = Column(String(255), nullable=False, index=True)
    route_geometry = Column(
        Geography(geometry_type="LINESTRING", srid=4326),
        nullable=True,
    )
    total_distance_km = Column(Numeric(10, 2), nullable=True)
    total_weight_kg = Column(Integer, nullable=True)
    status = Column(Enum(TripStatus, values_callable=lambda x: [e.value for e in x]), default=TripStatus.SCHEDULED, index=True)
    scheduled_pickup_start = Column(DateTime, nullable=True)
    estimated_arrival = Column(DateTime, nullable=True)
    actual_start_time = Column(DateTime, nullable=True)
    actual_end_time = Column(DateTime, nullable=True)
    base_fare = Column(Numeric(10, 2), nullable=True)
    platform_commission_rate = Column(Numeric(5, 2), default=0.12)
    total_fare = Column(Numeric(10, 2), nullable=True)
    is_dedicated = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    truck = relationship("Truck", back_populates="trips")
    trip_loads = relationship("TripLoad", back_populates="trip")
    payments = relationship("Payment", back_populates="trip")
    ratings = relationship("Rating", back_populates="trip")


class TripLoad(Base):
    __tablename__ = "trip_loads"
    __table_args__ = (
        UniqueConstraint("trip_id", "load_request_id", name="uix_trip_load"),
    )

    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.id", ondelete="CASCADE"), primary_key=True)
    load_request_id = Column(UUID(as_uuid=True), ForeignKey("load_requests.id", ondelete="CASCADE"), primary_key=True)
    pickup_sequence = Column(Integer, nullable=True)
    allocated_weight_kg = Column(Integer, nullable=True)
    fare_share = Column(Numeric(10, 2), nullable=True)
    payment_status = Column(Enum(EscrowStatus, values_callable=lambda x: [e.value for e in x]), default=EscrowStatus.PENDING)
    escrow_id = Column(String(100), nullable=True)
    joined_at = Column(DateTime, default=datetime.utcnow)

    trip = relationship("Trip", back_populates="trip_loads")
    load_request = relationship("LoadRequest", back_populates="trip_loads")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    load_request_id = Column(UUID(as_uuid=True), ForeignKey("load_requests.id"), nullable=True)
    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.id"), nullable=True)
    razorpay_payment_id = Column(String(100), nullable=True, index=True)
    amount = Column(Numeric(10, 2), nullable=False)
    status = Column(Enum(PaymentStatus, values_callable=lambda x: [e.value for e in x]), default=PaymentStatus.PENDING)
    escrow_status = Column(Enum(EscrowStatus, values_callable=lambda x: [e.value for e in x]), default=EscrowStatus.PENDING)
    payment_type = Column(Enum(PaymentType, values_callable=lambda x: [e.value for e in x]), default=PaymentType.FULL)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="payments")
    load_request = relationship("LoadRequest", back_populates="payments")
    trip = relationship("Trip", back_populates="payments")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="info")  # info, success, warning, error
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")


class PriceAlert(Base):
    __tablename__ = "price_alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    commodity = Column(String(100), nullable=False)
    state = Column(String(100), nullable=True)
    target_price = Column(Numeric(10, 2), nullable=False)
    is_active = Column(Boolean, default=True)
    triggered_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="price_alerts")


class Rating(Base):
    __tablename__ = "ratings"

    id = Column(Integer, primary_key=True, index=True)
    from_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    to_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.id"), nullable=True)
    rating = Column(Integer, nullable=False)  # 1-5
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    from_user = relationship("User", foreign_keys=[from_user_id], back_populates="ratings_given")
    to_user = relationship("User", foreign_keys=[to_user_id], back_populates="ratings_received")
    trip = relationship("Trip", back_populates="ratings")