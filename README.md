# Kisaan Mitr (AgriPool AI)

**Smart agriculture logistics platform** connecting farmers with transport pooling — reducing costs through AI-driven load consolidation.

## Tech Stack

- **Backend:** Python / FastAPI + SQLAlchemy + PostGIS
- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Database:** PostgreSQL with PostGIS extension
- **Infrastructure:** Docker Compose (backend, frontend, nginx, Jenkins)

## Key Features

| Feature | Description |
|---------|-------------|
| 🚛 **Smart Pooling** | Knapsack algorithm for load consolidation (800kg/truck, max 4 farmers) |
| 📍 **Geographic Routing** | PostGIS-powered — 5km radius primary, 10km fallback |
| 💰 **Dynamic Pricing** | ₹12/km, 12% commission, real-time cost breakdown |
| 🌾 **Mandi Prices** | Live market prices via Agmarknet API |
| 🌤️ **Weather Widget** | Static mock data on farmer dashboard |
| 🔔 **Notifications** | In-app notification system with read/delete |
| 💵 **Price Alerts** | Custom threshold alerts for crop prices |
| ⭐ **Ratings** | 1–5 star ratings between farmers and drivers |
| 🧑‍🌾 **Driver Dashboard** | Trip management, route view, availability toggle |
| 🧭 **Glass Navigation** | Custom bottom nav for mobile farmer experience |

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/furqan2k99-max/kisaan-mitr.git
cd kisaan-mitr

# 2. Create .env from template
cp .env.example .env
# Edit .env with your API keys

# 3. Start all services
docker compose up -d

# 4. Access
# Frontend:  http://localhost:3000
# Backend:   http://localhost:8000/docs
# nginx:     http://localhost
# Jenkins:   http://localhost:8080
```

## Environment Variables

See `.env.example` for all required variables. Key ones:

| Variable | Description |
|----------|-------------|
| `POSTGRES_USER` | DB user (default: `agrpool`) |
| `POSTGRES_PASSWORD` | DB password |
| `SECRET_KEY` | Backend secret key |
| `AGMARKNET_API_KEY` | Govt data API key for mandi prices |
| `GOOGLE_MAPS_API_KEY` | Maps API key |
| `RAZORPAY_KEY_ID` | Payment gateway key |
| `RAZORPAY_KEY_SECRET` | Payment gateway secret |

## Project Structure

```
kisaan-mitr/
├── backend/
│   └── app/
│       ├── routers/        # API endpoints
│       ├── models/         # SQLAlchemy models
│       ├── services/       # Business logic (pooling, etc.)
│       └── main.py         # FastAPI entrypoint
├── frontend/
│   └── src/
│       ├── app/            # Next.js App Router pages
│       ├── components/     # Reusable components
│       └── lib/            # API client, utils
├── nginx/                  # nginx config
├── docker-compose.yml
├── Jenkinsfile
└── .github/                # CI/CD workflows
```

## License

MIT
