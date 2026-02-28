from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User, UserRole
from app.services.auth import hash_password


async def seed_admin(db: AsyncSession):
    """Crée le compte admin par défaut s'il n'existe pas."""
    result = await db.execute(select(User).where(User.username == "admin"))
    if result.scalar_one_or_none() is None:
        admin = User(
            username="admin",
            hashed_password=hash_password("admin2026"),
            full_name="Administrateur",
            email="admin@solidata.fr",
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(admin)
        await db.commit()
        print("[SEED] Compte admin créé (admin / admin2026)")
    else:
        print("[SEED] Compte admin existe déjà")
