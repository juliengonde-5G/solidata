from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db, row_to_dict
from app.models.user import User
from app.models.collecte import Weight, DailyRoute, Vehicle
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/pesee", tags=["pesee"])


@router.post("/")
async def create_weight(data: dict, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    w = Weight(
        daily_route_id=data.get("daily_route_id"),
        vehicle_id=data.get("vehicle_id"),
        poids_brut=data.get("poids_brut"),
        tare=data.get("tare"),
        poids_net=data.get("poids_net"),
        note=data.get("note"),
    )
    if w.poids_brut and w.tare and not w.poids_net:
        w.poids_net = w.poids_brut - w.tare
    db.add(w)
    await db.commit()
    await db.refresh(w)
    return row_to_dict(w)


@router.put("/{weight_id}")
async def update_weight(weight_id: int, data: dict, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Weight).where(Weight.id == weight_id))
    w = result.scalar_one_or_none()
    if not w:
        raise HTTPException(status_code=404, detail="Pesée introuvable")
    for k, v in data.items():
        if hasattr(w, k) and k != "id":
            setattr(w, k, v)
    if w.poids_brut and w.tare:
        w.poids_net = w.poids_brut - w.tare
    await db.commit()
    return row_to_dict(w)


@router.get("/tournee/{daily_route_id}")
async def weight_for_route(daily_route_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Weight).where(Weight.daily_route_id == daily_route_id))
    weights = result.scalars().all()
    return [row_to_dict(w) for w in weights]


@router.get("/history")
async def weight_history(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Weight, DailyRoute, Vehicle)
        .outerjoin(DailyRoute, DailyRoute.id == Weight.daily_route_id)
        .outerjoin(Vehicle, Vehicle.id == Weight.vehicle_id)
        .order_by(Weight.weighed_at.desc())
        .limit(100)
    )
    return [
        {**row_to_dict(w), "tournee_date": dr.date if dr else None, "vehicule_nom": veh.nom if veh else None}
        for w, dr, veh in result.all()
    ]


@router.get("/stats")
async def weight_stats(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    total = (await db.execute(select(func.sum(Weight.poids_net)))).scalar() or 0
    count = (await db.execute(select(func.count()).select_from(Weight))).scalar() or 0
    avg = total / count if count else 0
    return {"total_kg": total, "nb_pesees": count, "moyenne_kg": round(avg, 1)}
