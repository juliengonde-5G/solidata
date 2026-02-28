import os
import shutil
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select, func, extract
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db, row_to_dict
from app.models.user import User, UserRole
from app.models.collecte import (
    CAV, Vehicle, RouteTemplate, RouteTemplatePoint,
    DailyRoute, Weight, WeightHistory,
)
from app.services.auth import get_current_user, require_roles

router = APIRouter(prefix="/api", tags=["admin"])


# ── CAV ──────────────────────────────────────────────────────
@router.get("/cav")
async def list_cav(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(CAV).order_by(CAV.id))
    return [row_to_dict(c) for c in result.scalars().all()]


@router.get("/cav/stats")
async def cav_stats(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(CAV))
    cavs = result.scalars().all()
    villes = {}
    for c in cavs:
        v = c.ville or "Inconnue"
        villes.setdefault(v, {"total": 0, "actifs": 0})
        villes[v]["total"] += 1
        if c.is_active:
            villes[v]["actifs"] += 1
    return {"par_ville": villes, "total": len(cavs), "actifs": sum(1 for c in cavs if c.is_active)}


@router.get("/cav/{cav_id}")
async def get_cav(cav_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(CAV).where(CAV.id == cav_id))
    cav = result.scalar_one_or_none()
    if not cav:
        raise HTTPException(status_code=404, detail="CAV introuvable")
    data = row_to_dict(cav)
    # Tournées associées
    rtp = await db.execute(
        select(RouteTemplatePoint, RouteTemplate)
        .join(RouteTemplate, RouteTemplate.id == RouteTemplatePoint.route_template_id)
        .where(RouteTemplatePoint.cav_id == cav_id)
    )
    data["tournees"] = [{"id": rt.id, "nom": rt.nom, "ordre": rtp_row.ordre} for rtp_row, rt in rtp.all()]
    return data


@router.post("/cav")
async def create_cav(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    cav = CAV(**{k: v for k, v in data.items() if hasattr(CAV, k)})
    db.add(cav)
    await db.commit()
    await db.refresh(cav)
    return row_to_dict(cav)


@router.put("/cav/{cav_id}")
async def update_cav(
    cav_id: int, data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    result = await db.execute(select(CAV).where(CAV.id == cav_id))
    cav = result.scalar_one_or_none()
    if not cav:
        raise HTTPException(status_code=404, detail="CAV introuvable")
    for k, v in data.items():
        if hasattr(cav, k) and k != "id":
            setattr(cav, k, v)
    cav.updated_at = datetime.utcnow()
    await db.commit()
    return row_to_dict(cav)


@router.delete("/cav/{cav_id}")
async def delete_cav(
    cav_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    result = await db.execute(select(CAV).where(CAV.id == cav_id))
    cav = result.scalar_one_or_none()
    if not cav:
        raise HTTPException(status_code=404, detail="CAV introuvable")
    await db.delete(cav)
    await db.commit()
    return {"message": "CAV supprimé"}


# ── Véhicules ────────────────────────────────────────────────
@router.get("/vehicles")
async def list_vehicles(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Vehicle).order_by(Vehicle.id))
    return [row_to_dict(v) for v in result.scalars().all()]


@router.post("/vehicles")
async def create_vehicle(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    vehicle = Vehicle(**{k: v for k, v in data.items() if hasattr(Vehicle, k)})
    db.add(vehicle)
    await db.commit()
    await db.refresh(vehicle)
    return row_to_dict(vehicle)


@router.put("/vehicles/{vehicle_id}")
async def update_vehicle(
    vehicle_id: int, data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Véhicule introuvable")
    for k, v in data.items():
        if hasattr(vehicle, k) and k != "id":
            setattr(vehicle, k, v)
    await db.commit()
    return row_to_dict(vehicle)


@router.delete("/vehicles/{vehicle_id}")
async def delete_vehicle(
    vehicle_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Véhicule introuvable")
    await db.delete(vehicle)
    await db.commit()
    return {"message": "Véhicule supprimé"}


# ── Tournées ─────────────────────────────────────────────────
@router.get("/routes")
async def list_routes(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(RouteTemplate).order_by(RouteTemplate.id))
    routes = []
    for rt in result.scalars().all():
        d = row_to_dict(rt)
        count = await db.execute(
            select(func.count()).select_from(RouteTemplatePoint)
            .where(RouteTemplatePoint.route_template_id == rt.id)
        )
        d["nb_cav"] = count.scalar() or 0
        routes.append(d)
    return routes


@router.get("/routes/{route_id}")
async def get_route(route_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(RouteTemplate).where(RouteTemplate.id == route_id))
    rt = result.scalar_one_or_none()
    if not rt:
        raise HTTPException(status_code=404, detail="Tournée introuvable")
    data = row_to_dict(rt)
    points_result = await db.execute(
        select(RouteTemplatePoint, CAV)
        .join(CAV, CAV.id == RouteTemplatePoint.cav_id)
        .where(RouteTemplatePoint.route_template_id == route_id)
        .order_by(RouteTemplatePoint.ordre)
    )
    data["points"] = [
        {**row_to_dict(cav), "ordre": rtp.ordre, "point_id": rtp.id}
        for rtp, cav in points_result.all()
    ]
    return data


@router.put("/routes/{route_id}")
async def update_route(
    route_id: int, data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    result = await db.execute(select(RouteTemplate).where(RouteTemplate.id == route_id))
    rt = result.scalar_one_or_none()
    if not rt:
        raise HTTPException(status_code=404, detail="Tournée introuvable")
    for k, v in data.items():
        if hasattr(rt, k) and k != "id":
            setattr(rt, k, v)
    await db.commit()
    return row_to_dict(rt)


@router.post("/routes/{route_id}/points")
async def add_route_point(
    route_id: int, data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    # Déterminer l'ordre max actuel
    max_order = await db.execute(
        select(func.max(RouteTemplatePoint.ordre))
        .where(RouteTemplatePoint.route_template_id == route_id)
    )
    next_order = (max_order.scalar() or 0) + 1
    rtp = RouteTemplatePoint(
        route_template_id=route_id,
        cav_id=data["cav_id"],
        ordre=data.get("ordre", next_order),
    )
    db.add(rtp)
    await db.commit()
    return {"message": "CAV ajouté à la tournée", "ordre": rtp.ordre}


@router.delete("/routes/{route_id}/points/{cav_id}")
async def remove_route_point(
    route_id: int, cav_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    result = await db.execute(
        select(RouteTemplatePoint)
        .where(RouteTemplatePoint.route_template_id == route_id, RouteTemplatePoint.cav_id == cav_id)
    )
    rtp = result.scalar_one_or_none()
    if not rtp:
        raise HTTPException(status_code=404, detail="Point introuvable")
    removed_order = rtp.ordre
    await db.delete(rtp)
    # Réordonner les points restants
    remaining = await db.execute(
        select(RouteTemplatePoint)
        .where(RouteTemplatePoint.route_template_id == route_id, RouteTemplatePoint.ordre > removed_order)
        .order_by(RouteTemplatePoint.ordre)
    )
    for pt in remaining.scalars().all():
        pt.ordre -= 1
    await db.commit()
    return {"message": "CAV retiré de la tournée"}


# ── Dashboard ────────────────────────────────────────────────
@router.get("/dashboard")
async def dashboard(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    cav_count = (await db.execute(select(func.count()).select_from(CAV))).scalar()
    cav_active = (await db.execute(select(func.count()).select_from(CAV).where(CAV.is_active == True))).scalar()
    vehicle_count = (await db.execute(select(func.count()).select_from(Vehicle))).scalar()
    route_count = (await db.execute(select(func.count()).select_from(RouteTemplate))).scalar()
    year = datetime.utcnow().year
    tonnage = (await db.execute(
        select(func.sum(WeightHistory.poids_net)).where(WeightHistory.annee == year)
    )).scalar()
    return {
        "cav_total": cav_count,
        "cav_actifs": cav_active,
        "vehicules": vehicle_count,
        "tournees": route_count,
        "tonnage_annuel": round((tonnage or 0) / 1000, 1),
    }


# ── Tonnage ──────────────────────────────────────────────────
@router.get("/tonnage/stats")
async def tonnage_stats(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(
            WeightHistory.annee,
            WeightHistory.mois,
            func.sum(WeightHistory.poids_net).label("total"),
            func.count().label("nb"),
        )
        .group_by(WeightHistory.annee, WeightHistory.mois)
        .order_by(WeightHistory.annee, WeightHistory.mois)
    )
    return [{"annee": r.annee, "mois": r.mois, "total_kg": r.total, "nb_pesees": r.nb} for r in result.all()]


@router.get("/tonnage/history")
async def tonnage_history(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(WeightHistory).order_by(WeightHistory.date_pesee.desc()).limit(200))
    return [row_to_dict(w) for w in result.scalars().all()]


# ── Upload & Import Excel ────────────────────────────────────
@router.post("/admin/upload/{filetype}")
async def upload_file(
    filetype: str,
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    upload_dir = "/app/uploads"
    os.makedirs(upload_dir, exist_ok=True)
    filepath = os.path.join(upload_dir, f"{filetype}_{file.filename}")
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"message": f"Fichier {filetype} uploadé", "path": filepath}


@router.post("/admin/import")
async def import_data(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    from app.services.import_data import run_import
    result = await run_import(data.get("filetype", "all"), db)
    return result
