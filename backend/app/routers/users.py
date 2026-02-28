from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db, row_to_dict
from app.models.user import User, UserRole
from app.services.auth import get_current_user, require_roles, hash_password, verify_password

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/")
async def list_users(db: AsyncSession = Depends(get_db), current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER))):
    result = await db.execute(select(User).order_by(User.id))
    users = []
    for u in result.scalars().all():
        d = row_to_dict(u)
        d.pop("hashed_password", None)
        users.append(d)
    return users


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    d = row_to_dict(current_user)
    d.pop("hashed_password", None)
    return d


@router.get("/{user_id}")
async def get_user(user_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_roles(UserRole.ADMIN))):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    d = row_to_dict(user)
    d.pop("hashed_password", None)
    return d


@router.post("/")
async def create_user(data: dict, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_roles(UserRole.ADMIN))):
    existing = await db.execute(select(User).where(User.username == data["username"]))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username déjà utilisé")
    user = User(
        username=data["username"],
        hashed_password=hash_password(data["password"]),
        full_name=data.get("full_name"),
        email=data.get("email"),
        role=UserRole(data.get("role", "VIEWER")),
        is_active=data.get("is_active", True),
        staff_id=data.get("staff_id"),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    d = row_to_dict(user)
    d.pop("hashed_password", None)
    return d


@router.put("/{user_id}")
async def update_user(user_id: int, data: dict, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_roles(UserRole.ADMIN))):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    for field in ["full_name", "email", "is_active", "staff_id"]:
        if field in data:
            setattr(user, field, data[field])
    if "role" in data:
        user.role = UserRole(data["role"])
    if "password" in data and data["password"]:
        user.hashed_password = hash_password(data["password"])
    await db.commit()
    d = row_to_dict(user)
    d.pop("hashed_password", None)
    return d


@router.delete("/{user_id}")
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_roles(UserRole.ADMIN))):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Impossible de supprimer votre propre compte")
    await db.delete(user)
    await db.commit()
    return {"message": "Utilisateur supprimé"}


@router.post("/change-password")
async def change_password(data: dict, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not verify_password(data.get("old_password", ""), current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Ancien mot de passe incorrect")
    current_user.hashed_password = hash_password(data["new_password"])
    await db.commit()
    return {"message": "Mot de passe modifié"}


@router.post("/{user_id}/reset-password")
async def reset_password(user_id: int, data: dict, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_roles(UserRole.ADMIN))):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    user.hashed_password = hash_password(data["new_password"])
    await db.commit()
    return {"message": "Mot de passe réinitialisé"}
