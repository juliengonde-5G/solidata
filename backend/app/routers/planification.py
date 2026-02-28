from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db, row_to_dict
from app.models.user import User, UserRole
from app.models.collecte import DailyRoute, RouteTemplate, Vehicle
from app.services.auth import get_current_user, require_roles
from app.services.predictive import COEFFICIENTS_SAISONNIERS, get_predictions

router = APIRouter(prefix="/api/planification", tags=["planification"])


@router.get("/prediction")
async def prediction(
    start_date: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if start_date:
        start = datetime.strptime(start_date, "%Y-%m-%d")
    else:
        today = datetime.utcnow()
        start = today - timedelta(days=today.weekday())

    return get_predictions(start)


@router.get("/saisonnalite")
async def saisonnalite(current_user: User = Depends(get_current_user)):
    return COEFFICIENTS_SAISONNIERS


@router.post("/generate")
async def generate_planning(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    mode = data.get("mode", "standard")
    start_date = datetime.strptime(data["start_date"], "%Y-%m-%d")

    # Récupérer véhicules actifs
    veh_result = await db.execute(select(Vehicle).where(Vehicle.is_active == True))
    vehicles = veh_result.scalars().all()

    # Récupérer tournées actives
    rt_result = await db.execute(select(RouteTemplate).where(RouteTemplate.is_active == True))
    routes = rt_result.scalars().all()

    if not vehicles or not routes:
        return {"message": "Pas de véhicules ou tournées disponibles", "created": 0}

    created = 0
    for day_offset in range(5):  # Lundi-Vendredi
        current_date = start_date + timedelta(days=day_offset)

        for periode in ["matin", "apres_midi"]:
            if mode == "standard":
                # Chaque véhicule fait une tournée
                for i, veh in enumerate(vehicles):
                    route_idx = (day_offset * len(vehicles) * 2 + i + (0 if periode == "matin" else len(vehicles))) % len(routes)
                    dr = DailyRoute(
                        date=current_date,
                        periode=periode,
                        template_id=routes[route_idx].id,
                        vehicle_id=veh.id,
                        source="standard",
                        status="planifiee",
                    )
                    db.add(dr)
                    created += 1
            elif mode == "prediction":
                mois = current_date.month
                coeff = COEFFICIENTS_SAISONNIERS.get(mois, 1.0)
                nb_tournees = max(1, round(len(vehicles) * coeff))
                for i in range(min(nb_tournees, len(vehicles))):
                    route_idx = (day_offset * nb_tournees * 2 + i) % len(routes)
                    dr = DailyRoute(
                        date=current_date,
                        periode=periode,
                        template_id=routes[route_idx].id,
                        vehicle_id=vehicles[i].id,
                        source="prediction",
                        status="planifiee",
                    )
                    db.add(dr)
                    created += 1

    await db.commit()
    return {"message": f"Planning généré ({mode})", "created": created}


@router.get("/semaine")
async def planning_semaine(
    start_date: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if start_date:
        start = datetime.strptime(start_date, "%Y-%m-%d")
    else:
        today = datetime.utcnow()
        start = today - timedelta(days=today.weekday())

    end = start + timedelta(days=5)
    result = await db.execute(
        select(DailyRoute, RouteTemplate, Vehicle)
        .outerjoin(RouteTemplate, RouteTemplate.id == DailyRoute.template_id)
        .outerjoin(Vehicle, Vehicle.id == DailyRoute.vehicle_id)
        .where(and_(DailyRoute.date >= start, DailyRoute.date < end))
        .order_by(DailyRoute.date, DailyRoute.periode)
    )
    slots = []
    for dr, rt, veh in result.all():
        d = row_to_dict(dr)
        d["tournee_nom"] = rt.nom if rt else None
        d["vehicule_nom"] = veh.nom if veh else None
        d["vehicule_immat"] = veh.immatriculation if veh else None
        slots.append(d)
    return slots


@router.post("/slot")
async def add_slot(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    dr = DailyRoute(
        date=datetime.strptime(data["date"], "%Y-%m-%d"),
        periode=data["periode"],
        template_id=data.get("template_id"),
        vehicle_id=data.get("vehicle_id"),
        chauffeur_id=data.get("chauffeur_id"),
        suiveur_id=data.get("suiveur_id"),
        source="manual",
        status="planifiee",
    )
    db.add(dr)
    await db.commit()
    await db.refresh(dr)
    return row_to_dict(dr)


@router.put("/slot/{slot_id}")
async def update_slot(
    slot_id: int, data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    result = await db.execute(select(DailyRoute).where(DailyRoute.id == slot_id))
    dr = result.scalar_one_or_none()
    if not dr:
        raise HTTPException(status_code=404, detail="Créneau introuvable")
    for k, v in data.items():
        if hasattr(dr, k) and k != "id":
            if k == "date":
                v = datetime.strptime(v, "%Y-%m-%d")
            setattr(dr, k, v)
    await db.commit()
    return row_to_dict(dr)


@router.delete("/slot/{slot_id}")
async def delete_slot(
    slot_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    result = await db.execute(select(DailyRoute).where(DailyRoute.id == slot_id))
    dr = result.scalar_one_or_none()
    if not dr:
        raise HTTPException(status_code=404, detail="Créneau introuvable")
    await db.delete(dr)
    await db.commit()
    return {"message": "Créneau supprimé"}
