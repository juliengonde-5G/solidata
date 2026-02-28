import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://solidata:solidata_dev@db:5432/solidata")
SECRET_KEY = os.getenv("SECRET_KEY", "solidata-secret-key-change-in-production")
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 heures
ALGORITHM = "HS256"

DEPOT_LAT = float(os.getenv("DEPOT_LAT", "49.5008"))
DEPOT_LON = float(os.getenv("DEPOT_LON", "1.0506"))
