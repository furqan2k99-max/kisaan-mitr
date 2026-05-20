# Kisaan Mitr - AgriPool AI
## Production-Grade Architecture Specification

---

## 1. Project Overview

**Project Name:** Kisaan Mitr (AgriPool AI)
**Domain:** Agritech - First-Mile Logistics
**Core Function:** Fractional capacity pooling for farmer transport using Knapsack optimization with PostGIS spatial queries

### Tech Stack
- **Frontend:** Next.js 14 (App Router), React 18, Tailwind CSS, Zustand, React Query
- **Backend:** Python FastAPI, SQLAlchemy 2.0, Pydantic v2
- **Database:** PostgreSQL 15 + PostGIS 3.4
- **Infrastructure:** Docker, Nginx

---

## 2. Database Schema (Phase 1)

### Tables

#### 1. `users` - User authentication and roles
- `id`: UUID (PK)
- `email`: VARCHAR(255) UNIQUE
- `password_hash`: VARCHAR(255)
- `full_name`: VARCHAR(255)
- `phone`: VARCHAR(20)
- `role`: ENUM('farmer', 'fpo', 'driver', 'admin')
- `aadhaar_number`: VARCHAR(12) (optional)
- `profile_image_url`: TEXT
- `language_preference`: VARCHAR(10) DEFAULT 'en'
- `is_active`: BOOLEAN DEFAULT True
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

#### 2. `trucks` - Vehicle fleet management
- `id`: UUID (PK)
- `registration_number`: VARCHAR(20) UNIQUE
- `truck_type`: ENUM('tata_ace', 'pickup', 'mini_truck', 'truck')
- `capacity_kg`: INTEGER
- `current_location`: GEOGRAPHY(POINT, 4326)
- `driver_id`: UUID (FK -> users)
- `is_available`: BOOLEAN DEFAULT True
- `insurance_expiry`: DATE
- `permit_expiry`: DATE
- `created_at`: TIMESTAMP

#### 3. `load_requests` - Farmer transport requests
- `id`: UUID (PK)
- `farmer_id`: UUID (FK -> users)
- `weight_kg`: INTEGER
- `crop_type`: VARCHAR(100)
- `crop_variety`: VARCHAR(100)
- `origin_geometry`: GEOGRAPHY(POINT, 4326)
- `origin_address`: TEXT
- `destination_mandi`: VARCHAR(255)
- `destination_geometry`: GEOGRAPHY(POINT, 4326)
- `pickup_date`: DATE
- `pickup_time_window_start`: TIME
- `pickup_time_window_end`: TIME
- `status`: ENUM('pending', 'pooled', 'assigned', 'in_transit', 'delivered', 'cancelled')
- `expected_price`: DECIMAL(10,2)
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

#### 4. `trips` - Pooled trips
- `id`: UUID (PK)
- `truck_id`: UUID (FK -> trucks)
- `mandi_destination`: VARCHAR(255)
- `route_geometry`: GEOGRAPHY(LINESTRING, 4326)
- `total_distance_km`: DECIMAL(10,2)
- `total_weight_kg`: INTEGER
- `status`: ENUM('scheduled', 'in_progress', 'completed', 'cancelled')
- `scheduled_pickup_start`: TIMESTAMP
- `estimated_arrival`: TIMESTAMP
- `actual_start_time`: TIMESTAMP
- `actual_end_time`: TIMESTAMP
- `base_fare`: DECIMAL(10,2)
- `platform_commission_rate`: DECIMAL(5,2) DEFAULT 0.12
- `total_fare`: DECIMAL(10,2)
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

#### 5. `trip_loads` - Junction table for trips and loads
- `trip_id`: UUID (FK -> trips)
- `load_request_id`: UUID (FK -> load_requests)
- `pickup_sequence`: INTEGER
- `allocated_weight_kg`: INTEGER
- `fare_share`: DECIMAL(10,2)
- `payment_status`: ENUM('pending', 'escrow_held', 'released', 'refunded')
- `escrow_id`: VARCHAR(100) (Razorpay payment ID)
- `joined_at`: TIMESTAMP

#### 6. `payments` - Payment transactions
- `id`: UUID (PK)
- `load_request_id`: UUID (FK -> load_requests)
- `trip_id`: UUID (FK -> trips)
- `razorpay_payment_id`: VARCHAR(100)
- `amount`: DECIMAL(10,2)
- `status`: ENUM('pending', 'captured', 'failed', 'refunded')
- `escrow_status`: ENUM('pending', 'held', 'released')
- `payment_type`: ENUM('advance', 'full', 'cod')
- `created_at`: TIMESTAMP

#### 7. `mandis` - Mandi locations for routing
- `id`: UUID (PK)
- `name`: VARCHAR(255)
- `state`: VARCHAR(100)
- `district`: VARCHAR(100)
- `geometry`: GEOGRAPHY(POINT, 4326)
- `address`: TEXT

---

## 3. Core Algorithm - Capacity Pooling Engine (Phase 2)

### Knapsack-Based Pooling Algorithm

```
Input: New LoadRequest LR (weight w, destination D, origin O)
Output: Trip with pooled loads or fallback

1. SPATIAL QUERY (PostGIS):
   - Find pending requests within 5km radius of O
   - Filter by same destination mandi D
   - Filter by compatible pickup date/time window

2. KNAPSACK OPTIMIZATION (800kg truck):
   - Items = candidate loads (weight, fare)
   - Capacity = 800kg
   - Maximize: sum(fare_share) subject to weight <= 800
   - Allow max 4 farmers per trip

3. ROUTE OPTIMIZATION:
   - Calculate pickup order using nearest neighbor
   - Generate waypoints for Google Maps API
   - Compute total distance and ETA

4. PRICE CALCULATION:
   - Base fare = distance * rate_per_km
   - Weight share = (load_weight / total_weight) * base_fare
   - Platform commission = 12% of share
   - Farmer pays = share + commission

5. FALLBACK:
   - If no nearby farmers found:
     - Trigger "Corridor Pooling" - expand radius to 10km
     - If still no match -> assign dedicated truck (+20% premium)
```

### Pricing Formula
```
Base Fare = Distance(km) × Rate(₹12/km)
Farmer Share = (Weight_kg / Total_Weight_kg) × Base_Fare
Platform Commission = Farmer_Share × 0.12
Total Payment = Farmer_Share × 1.12
```

---

## 4. Backend API Architecture (Phase 3)

### API Routes Structure

```
/api/v1/
├── /auth/
│   ├── POST /register
│   ├── POST /login
│   ├── POST /refresh
│   └── GET /me
│
├── /load-requests/
│   ├── POST / (create)
│   ├── GET / (list my requests)
│   ├── GET /{id}
│   ├── PUT /{id}
│   └── DELETE /{id}
│
├── /trips/
│   ├── GET / (list available trips)
│   ├── GET /{id}
│   ├── POST / (trigger pooling - internal)
│   └── PUT /{id}/status
│
├── /pooling/
│   ├── POST /trigger
│   └── GET /nearby
│
├── /payments/
│   ├── POST /create-order
│   ├── POST /webhook
│   ├── GET /{load_id}/status
│   └── POST /release-escrow
│
├── /geocoding/
│   ├── POST /reverse-geocode
│   └── POST /distance-matrix
│
├── /nlp/
│   └── POST /transcribe (Bhashini)
│
└── /admin/
    ├── /trucks
    ├── /mandis
    └── /analytics
```

### Authentication
- JWT tokens with RS256 signing
- Access token: 15 min expiry
- Refresh token: 7 days expiry
- Role-based access control (RBAC)

---

## 5. Frontend Implementation (Phase 4)

### Page Structure
```
/app/
├── layout.tsx
├── page.tsx (Landing)
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
├── (dashboard)/
│   ├── farmer/
│   │   ├── dashboard/page.tsx
│   │   ├── requests/page.tsx
│   │   └── trip-history/page.tsx
│   ├── driver/
│   │   └── dashboard/page.tsx
│   └── admin/
│       └── dashboard/page.tsx
└── api/
    └── [...route]/route.ts (API routes)
```

### Key Components
- `FarmerDashboard.tsx` - Main dashboard with load creation
- `LoadRequestForm.tsx` - Form with NLP voice input
- `TripCard.tsx` - Display pooled trips
- `MapView.tsx` - Visual route display

### State Management
- Zustand for global UI state
- React Query for server state

---

## 6. External API Integrations

### Bhashini API (Voice-to-Text)
- Endpoint: `https://api.bhashini.gov.in/v1/recognize`
- Language: kn (Kannada)
- Output: Transcribed text in English/Hindi

### Google Maps/Mapbox
- Distance Matrix API
- Directions API (for route optimization)
- Geocoding API

### Razorpay
- Payment order creation
- Webhook handling
- Escrow management

---

## 7. Acceptance Criteria

1. Database schema with PostGIS spatial queries working
2. Knapsack algorithm correctly pools up to 4 farmers within 5km
3. JWT authentication functional with role-based access
4. Frontend dashboard loads and displays real API data
5. External API wrappers implemented (not mocked)
6. Docker containers build and run successfully
7. All error handling and logging in place