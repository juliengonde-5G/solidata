from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db, row_to_dict
from app.models.user import User, UserRole
from app.models.poj import POJCollaborateur, POJAffectation
from app.services.auth import get_current_user, require_roles

router = APIRouter(prefix="/api/equipe", tags=["equipe"])


@router.get("/collaborateurs")
async def list_collaborateurs(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(POJCollaborateur).order_by(POJCollaborateur.nom))
    return [row_to_dict(c) for c in result.scalars().all()]


@router.get("/collaborateurs/stats")
async def collaborateur_stats(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(POJCollaborateur))
    collabs = result.scalars().all()
    total = len(collabs)
    dispo = sum(1 for c in collabs if not c.indispo)
    caces = sum(1 for c in collabs if c.caces)
    permis = sum(1 for c in collabs if c.permis)
    return {"total": total, "disponibles": dispo, "caces": caces, "permis": permis}


@router.post("/collaborateurs")
async def create_collaborateur(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    collab = POJCollaborateur(**{k: v for k, v in data.items() if hasattr(POJCollaborateur, k)})
    db.add(collab)
    await db.commit()
    await db.refresh(collab)
    return row_to_dict(collab)


@router.put("/collaborateurs/{collab_id}")
async def update_collaborateur(
    collab_id: int, data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    result = await db.execute(select(POJCollaborateur).where(POJCollaborateur.id == collab_id))
    collab = result.scalar_one_or_none()
    if not collab:
        raise HTTPException(status_code=404, detail="Collaborateur introuvable")
    for k, v in data.items():
        if hasattr(collab, k) and k != "id":
            setattr(collab, k, v)
    await db.commit()
    return row_to_dict(collab)


@router.delete("/collaborateurs/{collab_id}")
async def delete_collaborateur(
    collab_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    result = await db.execute(select(POJCollaborateur).where(POJCollaborateur.id == collab_id))
    collab = result.scalar_one_or_none()
    if not collab:
        raise HTTPException(status_code=404, detail="Collaborateur introuvable")
    await db.delete(collab)
    await db.commit()
    return {"message": "Collaborateur supprimé"}


@router.get("/planning")
async def get_planning(
    semaine: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(POJAffectation).order_by(POJAffectation.date_planning)
    if semaine:
        start = datetime.strptime(semaine, "%Y-%m-%d")
        from datetime import timedelta
        end = start + timedelta(days=7)
        query = query.where(POJAffectation.date_planning >= start, POJAffectation.date_planning < end)
    result = await db.execute(query)
    return [row_to_dict(a) for a in result.scalars().all()]


@router.post("/planning")
async def create_affectation(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    aff = POJAffectation(
        date_planning=datetime.strptime(data["date_planning"], "%Y-%m-%d"),
        poste_id=data["poste_id"],
        collab_id=data["collab_id"],
    )
    db.add(aff)
    await db.commit()
    await db.refresh(aff)
    return row_to_dict(aff)


@router.put("/planning/{aff_id}")
async def update_affectation(
    aff_id: int, data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    result = await db.execute(select(POJAffectation).where(POJAffectation.id == aff_id))
    aff = result.scalar_one_or_none()
    if not aff:
        raise HTTPException(status_code=404, detail="Affectation introuvable")
    for k, v in data.items():
        if hasattr(aff, k) and k != "id":
            if k == "date_planning":
                v = datetime.strptime(v, "%Y-%m-%d")
            setattr(aff, k, v)
    await db.commit()
    return row_to_dict(aff)


@router.delete("/planning/{aff_id}")
async def delete_affectation(
    aff_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    result = await db.execute(select(POJAffectation).where(POJAffectation.id == aff_id))
    aff = result.scalar_one_or_none()
    if not aff:
        raise HTTPException(status_code=404, detail="Affectation introuvable")
    await db.delete(aff)
    await db.commit()
    return {"message": "Affectation supprimée"}


@router.get("/disponibilite")
async def disponibilite(
    date: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(POJCollaborateur).where(POJCollaborateur.indispo == False))
    collabs = result.scalars().all()
    chauffeurs = [row_to_dict(c) for c in collabs if c.permis]
    suiveurs = [row_to_dict(c) for c in collabs]
    return {"chauffeurs": chauffeurs, "suiveurs": suiveurs}
