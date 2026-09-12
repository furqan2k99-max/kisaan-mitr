"""initial_schema

Revision ID: 82ce9ce9ec36
Revises: 
Create Date: 2026-09-12 04:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geography

# revision identifiers, used by Alembic.
revision = '82ce9ce9ec36'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enable PostGIS extension first
    op.execute('CREATE EXTENSION IF NOT EXISTS postgis')

    # ── Users ──────────────────────────────────────────────────────────────
    op.create_table(
        'users',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(255), unique=True, nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('phone', sa.String(20), nullable=False),
        sa.Column('role', sa.Enum('farmer', 'fpo', 'driver', 'admin', name='userrole', native_enum=False), nullable=False, server_default='farmer'),
        sa.Column('aadhaar_number', sa.String(12), nullable=True),
        sa.Column('profile_image_url', sa.Text(), nullable=True),
        sa.Column('language_preference', sa.String(10), server_default='en'),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true')),
        sa.Column('driver_online', sa.Boolean(), server_default=sa.text('false')),
        sa.Column('driver_available_for', sa.String(50), nullable=True, server_default='same_day'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()')),
    )

    # ── Trucks ─────────────────────────────────────────────────────────────
    op.create_table(
        'trucks',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('registration_number', sa.String(20), unique=True, nullable=False),
        sa.Column('truck_type', sa.Enum('tata_ace', 'pickup', 'mini_truck', 'truck', name='trucktype', native_enum=False), nullable=False),
        sa.Column('capacity_kg', sa.Integer(), nullable=False),
        sa.Column('current_location', Geography(geometry_type='POINT', srid=4326, spatial_index=False), nullable=True),
        sa.Column('driver_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('is_available', sa.Boolean(), server_default=sa.text('true')),
        sa.Column('insurance_expiry', sa.Date(), nullable=True),
        sa.Column('permit_expiry', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
    )
    op.create_index('idx_truck_location_geog', 'trucks', ['current_location'], postgresql_using='gist')

    # ── Mandis ─────────────────────────────────────────────────────────────
    op.create_table(
        'mandis',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), unique=True, nullable=False),
        sa.Column('state', sa.String(100), nullable=False),
        sa.Column('district', sa.String(100), nullable=False),
        sa.Column('geometry', Geography(geometry_type='POINT', srid=4326, spatial_index=False), nullable=False),
        sa.Column('address', sa.Text(), nullable=True),
    )
    op.create_index('idx_mandi_geog', 'mandis', ['geometry'], postgresql_using='gist')

    # ── Load Requests ──────────────────────────────────────────────────────
    op.create_table(
        'load_requests',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('farmer_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('weight_kg', sa.Integer(), nullable=False),
        sa.Column('crop_type', sa.String(100), nullable=False),
        sa.Column('crop_variety', sa.String(100), nullable=True),
        sa.Column('origin_geometry', Geography(geometry_type='POINT', srid=4326, spatial_index=False), nullable=False),
        sa.Column('origin_address', sa.Text(), nullable=False),
        sa.Column('destination_mandi', sa.String(255), nullable=False),
        sa.Column('destination_geometry', Geography(geometry_type='POINT', srid=4326, spatial_index=False), nullable=False),
        sa.Column('pickup_date', sa.Date(), nullable=False),
        sa.Column('pickup_time_window_start', sa.Time(), nullable=True),
        sa.Column('pickup_time_window_end', sa.Time(), nullable=True),
        sa.Column('status', sa.Enum('pending', 'pooled', 'assigned', 'in_transit', 'delivered', 'cancelled', name='loadstatus', native_enum=False), server_default='pending'),
        sa.Column('expected_price', sa.Numeric(10, 2), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()')),
    )
    op.create_index('idx_load_origin_geog', 'load_requests', ['origin_geometry'], postgresql_using='gist')
    op.create_index('idx_load_dest_geog', 'load_requests', ['destination_geometry'], postgresql_using='gist')

    # ── Trips ──────────────────────────────────────────────────────────────
    op.create_table(
        'trips',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('truck_id', UUID(as_uuid=True), sa.ForeignKey('trucks.id'), nullable=True),
        sa.Column('mandi_destination', sa.String(255), nullable=False),
        sa.Column('route_geometry', Geography(geometry_type='LINESTRING', srid=4326, spatial_index=False), nullable=True),
        sa.Column('total_distance_km', sa.Numeric(10, 2), nullable=True),
        sa.Column('total_weight_kg', sa.Integer(), nullable=True),
        sa.Column('status', sa.Enum('scheduled', 'in_progress', 'completed', 'cancelled', name='tripstatus', native_enum=False), server_default='scheduled'),
        sa.Column('scheduled_pickup_start', sa.DateTime(), nullable=True),
        sa.Column('estimated_arrival', sa.DateTime(), nullable=True),
        sa.Column('actual_start_time', sa.DateTime(), nullable=True),
        sa.Column('actual_end_time', sa.DateTime(), nullable=True),
        sa.Column('base_fare', sa.Numeric(10, 2), nullable=True),
        sa.Column('platform_commission_rate', sa.Numeric(5, 2), server_default='0.12'),
        sa.Column('total_fare', sa.Numeric(10, 2), nullable=True),
        sa.Column('is_dedicated', sa.Boolean(), server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()')),
    )

    # ── Trip Loads ─────────────────────────────────────────────────────────
    op.create_table(
        'trip_loads',
        sa.Column('trip_id', UUID(as_uuid=True), sa.ForeignKey('trips.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('load_request_id', UUID(as_uuid=True), sa.ForeignKey('load_requests.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('pickup_sequence', sa.Integer(), nullable=True),
        sa.Column('allocated_weight_kg', sa.Integer(), nullable=True),
        sa.Column('fare_share', sa.Numeric(10, 2), nullable=True),
        sa.Column('payment_status', sa.Enum('pending', 'held', 'released', name='escrowstatus', native_enum=False), server_default='pending'),
        sa.Column('escrow_id', sa.String(100), nullable=True),
        sa.Column('joined_at', sa.DateTime(), server_default=sa.text('now()')),
    )
    op.create_unique_constraint('uix_trip_load', 'trip_loads', ['trip_id', 'load_request_id'])

    # ── Payments ───────────────────────────────────────────────────────────
    op.create_table(
        'payments',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('load_request_id', UUID(as_uuid=True), sa.ForeignKey('load_requests.id'), nullable=True),
        sa.Column('trip_id', UUID(as_uuid=True), sa.ForeignKey('trips.id'), nullable=True),
        sa.Column('razorpay_payment_id', sa.String(100), nullable=True),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('status', sa.Enum('pending', 'captured', 'failed', 'refunded', name='paymentstatus', native_enum=False), server_default='pending'),
        sa.Column('escrow_status', sa.Enum('pending', 'held', 'released', name='escrowstatus', native_enum=False), server_default='pending'),
        sa.Column('payment_type', sa.Enum('advance', 'full', 'cod', name='paymenttype', native_enum=False), server_default='full'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
    )

    # ── Notifications ──────────────────────────────────────────────────────
    op.create_table(
        'notifications',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('type', sa.String(50), server_default='info'),
        sa.Column('read', sa.Boolean(), server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
    )

    # ── Price Alerts ───────────────────────────────────────────────────────
    op.create_table(
        'price_alerts',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('commodity', sa.String(100), nullable=False),
        sa.Column('state', sa.String(100), nullable=True),
        sa.Column('target_price', sa.Numeric(10, 2), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true')),
        sa.Column('triggered_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
    )

    # ── Ratings ────────────────────────────────────────────────────────────
    op.create_table(
        'ratings',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('from_user_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('to_user_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('trip_id', UUID(as_uuid=True), sa.ForeignKey('trips.id'), nullable=True),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
    )




def downgrade() -> None:
    op.drop_table('ratings')
    op.drop_table('price_alerts')
    op.drop_table('notifications')
    op.drop_table('payments')
    op.drop_table('trip_loads')
    op.drop_table('trips')
    op.drop_table('load_requests')
    op.drop_table('mandis')
    op.drop_table('trucks')
    op.drop_table('users')
    op.execute('DROP EXTENSION IF EXISTS postgis')