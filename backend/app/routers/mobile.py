from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db, row_to_dict
from app.models.user import User
from app.models.collecte import DailyRoute, RouteTemplate, RouteTemplatePoint, CAV, Collection, Vehicle
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/mobile", tags=["mobile"])


@router.get("/mes-tournees")
async def mes_tournees(
    date_str: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if date_str:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    else:
        target_date = datetime.utcnow().date()

    result = await db.execute(
        select(DailyRoute, RouteTemplate, Vehicle)
        .outerjoin(RouteTemplate, RouteTemplate.id == DailyRoute.template_id)
        .outerjoin(Vehicle, Vehicle.id == DailyRoute.vehicle_id)
        .where(DailyRoute.date >= datetime.combine(target_date, datetime.min.time()))
        .where(DailyRoute.date < datetime.combine(target_date, datetime.max.time()))
        .order_by(DailyRoute.periode)
    )
    routes = []
    for dr, rt, veh in result.all():
        d = row_to_dict(dr)
        d["tournee_nom"] = rt.nom if rt else None
        d["vehicule_nom"] = veh.nom if veh else None
        d["vehicule_immat"] = veh.immatriculation if veh else None
        routes.append(d)
    return routes


@router.get("/tournee/{daily_route_id}")
async def tournee_detail(
    daily_route_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(DailyRoute, RouteTemplate, Vehicle)
        .outerjoin(RouteTemplate, RouteTemplate.id == DailyRoute.template_id)
        .outerjoin(Vehicle, Vehicle.id == DailyRoute.vehicle_id)
        .where(DailyRoute.id == daily_route_id)
    )
    row = result.first()
    if not row:
        return {"error": "Tournée introuvable"}
    dr, rt, veh = row
    data = row_to_dict(dr)
    data["tournee_nom"] = rt.nom if rt else None
    data["vehicule_nom"] = veh.nom if veh else None
    data["vehicule_immat"] = veh.immatriculation if veh else None

    # Points de la tournée
    if dr.template_id:
        points_result = await db.execute(
            select(RouteTemplatePoint, CAV)
            .join(CAV, CAV.id == RouteTemplatePoint.cav_id)
            .where(RouteTemplatePoint.route_template_id == dr.template_id)
            .order_by(RouteTemplatePoint.ordre)
        )
        data["points"] = [
            {**row_to_dict(cav), "ordre": rtp.ordre}
            for rtp, cav in points_result.all()
        ]
    else:
        data["points"] = []

    # Collectes effectuées
    col_result = await db.execute(
        select(Collection, CAV)
        .join(CAV, CAV.id == Collection.cav_id)
        .where(Collection.daily_route_id == daily_route_id)
        .order_by(Collection.scanned_at)
    )
    data["collectes"] = [
        {**row_to_dict(col), "cav_nom": cav.nom, "cav_ville": cav.ville}
        for col, cav in col_result.all()
    ]

    return data
