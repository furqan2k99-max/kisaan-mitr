"""
Kisaan Mitr — Mandi Seed Script
Seeds 10 realistic APMC Mandis in the Mysuru/Mandya region.

Usage:
    docker compose exec backend python -m scripts.seed_mandis
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.models.database import SessionLocal, init_db
from app.models.models import Mandi
from geoalchemy2.elements import WKTElement
from sqlalchemy import text

MANDIS = [
    {
        "name": "Mysore (Bandipalya APMC)",
        "state": "Karnataka",
        "district": "Mysuru",
        "lat": 12.2958,
        "lon": 76.6394,
        "address": "Bandipalya APMC Yard, Mysuru 570001",
    },
    {
        "name": "Mandya APMC",
        "state": "Karnataka",
        "district": "Mandya",
        "lat": 12.5218,
        "lon": 76.8951,
        "address": "APMC Market Yard, Mandya 571401",
    },
    {
        "name": "K.R. Pete APMC",
        "state": "Karnataka",
        "district": "Mandya",
        "lat": 12.6570,
        "lon": 76.4890,
        "address": "K.R. Pete Town, Mandya District 571426",
    },
    {
        "name": "Maddur APMC",
        "state": "Karnataka",
        "district": "Mandya",
        "lat": 12.5838,
        "lon": 77.0445,
        "address": "APMC Yard, Maddur, Mandya 571428",
    },
    {
        "name": "Srirangapatna APMC",
        "state": "Karnataka",
        "district": "Mandya",
        "lat": 12.4179,
        "lon": 76.6893,
        "address": "Srirangapatna Town, Mandya 571438",
    },
    {
        "name": "Pandavapura APMC",
        "state": "Karnataka",
        "district": "Mandya",
        "lat": 12.4924,
        "lon": 76.6779,
        "address": "Pandavapura, Mandya 571434",
    },
    {
        "name": "Nagamangala APMC",
        "state": "Karnataka",
        "district": "Mandya",
        "lat": 12.8190,
        "lon": 76.7550,
        "address": "Nagamangala Town, Mandya 571432",
    },
    {
        "name": "T. Narasipura APMC",
        "state": "Karnataka",
        "district": "Mysuru",
        "lat": 12.2107,
        "lon": 76.9021,
        "address": "T. Narasipura, Mysuru 571124",
    },
    {
        "name": "Nanjangud APMC",
        "state": "Karnataka",
        "district": "Mysuru",
        "lat": 12.1168,
        "lon": 76.6837,
        "address": "Nanjangud Town, Mysuru 571301",
    },
    {
        "name": "Chamarajanagar APMC",
        "state": "Karnataka",
        "district": "Chamarajanagar",
        "lat": 11.9236,
        "lon": 76.9390,
        "address": "APMC Yard, Chamarajanagar 571313",
    },
]


def seed():
    db = SessionLocal()
    try:
        existing = db.query(Mandi).count()
        if existing > 0:
            print(f"Database already has {existing} mandis. Skipping seed.")
            return

        for m in MANDIS:
            mandi = Mandi(
                name=m["name"],
                state=m["state"],
                district=m["district"],
                address=m["address"],
                geometry=WKTElement(f"POINT({m['lon']} {m['lat']})", srid=4326),
            )
            db.add(mandi)

        db.commit()
        print(f"Successfully seeded {len(MANDIS)} APMC Mandis (Mysuru/Mandya region)")

        # Verify
        for mandi in db.query(Mandi).all():
            print(f"  ✓ {mandi.name} ({mandi.district})")

    except Exception as e:
        print(f"Error seeding mandis: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    print("Initializing database...")
    init_db()
    print("Seeding mandis...")
    seed()
