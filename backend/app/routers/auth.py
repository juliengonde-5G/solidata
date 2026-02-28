from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db, row_to_dict
from app.models.user import User, UserRole
from app.schemas.auth import LoginRequest, TokenResponse, UserResponse
from app.services.auth import (
    verify_password, hash_password, create_access_token,
    get_current_user, require_roles,
)

router = APIRouter(prefix="/api", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == req.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Identifiants incorrects")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Compte désactivé")
    user.last_login = datetime.utcnow()
    await db.commit()
    token = create_access_token({"sub": user.username, "role": user.role.value})
    return TokenResponse(access_token=token, role=user.role.value, full_name=user.full_name)


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return row_to_dict(current_user)


@router.put("/me/password")
async def change_my_password(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(data.get("old_password", ""), current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Ancien mot de passe incorrect")
    current_user.hashed_password = hash_password(data["new_password"])
    await db.commit()
    return {"message": "Mot de passe modifié"}


@router.get("/users")
async def list_users(
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).order_by(User.id))
    return [row_to_dict(u) for u in result.scalars().all()]


@router.post("/users")
async def create_user(
    data: dict,
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
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
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return row_to_dict(user)


@router.put("/users/{user_id}")
async def update_user(
    user_id: int,
    data: dict,
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
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
    return row_to_dict(user)


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    await db.delete(user)
    await db.commit()
    return {"message": "Utilisateur supprimé"}
