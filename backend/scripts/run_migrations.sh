#!/bin/bash
set -e

echo "Checking migration state..."

# Check if OUR application tables exist (not PostGIS system tables)
APP_TABLES=$(psql $DATABASE_URL -tAc "
    SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema='public' 
    AND table_name IN ('users', 'mandis', 'trucks', 'load_requests', 'trips', 'trip_loads', 'payments', 'notifications', 'price_alerts', 'ratings')
")

if [ "$APP_TABLES" -gt "0" ]; then
    echo "Application tables exist ($APP_TABLES found). Stamping current state..."
    alembic stamp head
fi

echo "Running alembic upgrade head..."
alembic upgrade head
echo "Migration complete!"