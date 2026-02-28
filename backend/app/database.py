from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from app.config import DATABASE_URL

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


def row_to_dict(obj):
    """Convertit un objet SQLAlchemy en dictionnaire."""
    if obj is None:
        return None
    d = {}
    for col in obj.__table__.columns:
        val = getattr(obj, col.name)
        d[col.name] = val
    return d


async def run_migrations(conn):
    """Migrations automatiques — ALTER TABLE ADD COLUMN IF NOT EXISTS."""
    migrations = [
        # CAV
        "ALTER TABLE cav ADD COLUMN IF NOT EXISTS suspension_motif VARCHAR",
        "ALTER TABLE cav ADD COLUMN IF NOT EXISTS complement_adresse VARCHAR",
        "ALTER TABLE cav ADD COLUMN IF NOT EXISTS communaute_communes VARCHAR",
        "ALTER TABLE cav ADD COLUMN IF NOT EXISTS entite_detentrice VARCHAR",
        "ALTER TABLE cav ADD COLUMN IF NOT EXISTS reference_eco_tlc VARCHAR",
        # Vehicle
        "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS ptc FLOAT",
        "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS charge_utile FLOAT",
        "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS volume_m3 FLOAT",
        "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS puissance_ch INTEGER",
        "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS type_energie VARCHAR",
        "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS tare FLOAT",
        # DailyRoute
        "ALTER TABLE daily_routes ADD COLUMN IF NOT EXISTS source VARCHAR DEFAULT 'standard'",
        "ALTER TABLE daily_routes ADD COLUMN IF NOT EXISTS chauffeur_id INTEGER",
        "ALTER TABLE daily_routes ADD COLUMN IF NOT EXISTS suiveur_id INTEGER",
        # Collection
        "ALTER TABLE collections ADD COLUMN IF NOT EXISTS ordre_reel INTEGER",
        # User
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS staff_id INTEGER",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP",
        # POJCollaborateur
        "ALTER TABLE poj_collaborateurs ADD COLUMN IF NOT EXISTS telephone VARCHAR",
    ]
    for migration in migrations:
        try:
            await conn.execute(text(migration))
        except Exception:
            pass


async def init_db():
    """Crée les tables et exécute les migrations."""
    from app.models import Base  # noqa: F811
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await run_migrations(conn)
