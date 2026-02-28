from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db, row_to_dict
from app.models.user import User
from app.models.collecte import DailyRoute, Collection, CAV, GPSTrack, RouteTemplate, RouteTemplatePoint, Vehicle
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/collect", tags=["collect"])


@router.post("/scan")
async def scan_cav(data: dict, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    col = Collection(
        daily_route_id=data["daily_route_id"],
        cav_id=data["cav_id"],
        fill_level=data.get("fill_level"),
        gps_lat=data.get("gps_lat"),
        gps_lon=data.get("gps_lon"),
        note=data.get("note"),
        scanned_at=datetime.utcnow(),
    )
    db.add(col)
    await db.commit()
    await db.refresh(col)
    return row_to_dict(col)


@router.put("/scan/{scan_id}")
async def update_scan(scan_id: int, data: dict, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Collection).where(Collection.id == scan_id))
    col = result.scalar_one_or_none()
    if not col:
        raise HTTPException(status_code=404, detail="Collecte introuvable")
    for k, v in data.items():
        if hasattr(col, k) and k != "id":
            setattr(col, k, v)
    await db.commit()
    return row_to_dict(col)


@router.get("/scans/{daily_route_id}")
async def get_scans(daily_route_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Collection, CAV)
        .join(CAV, CAV.id == Collection.cav_id)
        .where(Collection.daily_route_id == daily_route_id)
        .order_by(Collection.scanned_at)
    )
    return [
        {**row_to_dict(col), "cav_nom": cav.nom, "cav_ville": cav.ville}
        for col, cav in result.all()
    ]


@router.post("/start")
async def start_route(data: dict, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(DailyRoute).where(DailyRoute.id == data["daily_route_id"]))
    dr = result.scalar_one_or_none()
    if not dr:
        raise HTTPException(status_code=404, detail="Tournée introuvable")
    dr.status = "en_cours"
    await db.commit()
    return {"message": "Tournée démarrée", "status": "en_cours"}


@router.post("/finish/{daily_route_id}")
async def finish_route(daily_route_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(DailyRoute).where(DailyRoute.id == daily_route_id))
    dr = result.scalar_one_or_none()
    if not dr:
        raise HTTPException(status_code=404, detail="Tournée introuvable")
    dr.status = "terminee"
    await db.commit()
    return {"message": "Tournée terminée", "status": "terminee"}


@router.post("/gps")
async def send_gps(data: dict, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    track = GPSTrack(
        daily_route_id=data["daily_route_id"],
        latitude=data["latitude"],
        longitude=data["longitude"],
        accuracy=data.get("accuracy"),
        speed=data.get("speed"),
    )
    db.add(track)
    await db.commit()
    return {"message": "Position enregistrée"}


@router.post("/gps/batch")
async def send_gps_batch(data: dict, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    positions = data.get("positions", [])
    for pos in positions:
        track = GPSTrack(
            daily_route_id=pos["daily_route_id"],
            latitude=pos["latitude"],
            longitude=pos["longitude"],
            accuracy=pos.get("accuracy"),
            speed=pos.get("speed"),
        )
        db.add(track)
    await db.commit()
    return {"message": f"{len(positions)} positions enregistrées"}


@router.get("/live")
async def live_dashboard(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = datetime.utcnow().date()
    result = await db.execute(
        select(DailyRoute, RouteTemplate, Vehicle)
        .outerjoin(RouteTemplate, RouteTemplate.id == DailyRoute.template_id)
        .outerjoin(Vehicle, Vehicle.id == DailyRoute.vehicle_id)
        .where(DailyRoute.date >= datetime.combine(today, datetime.min.time()))
        .order_by(DailyRoute.date)
    )
    routes = []
    for dr, rt, veh in result.all():
        d = row_to_dict(dr)
        d["tournee_nom"] = rt.nom if rt else None
        d["vehicule_nom"] = veh.nom if veh else None
        d["vehicule_immat"] = veh.immatriculation if veh else None
        # Nombre de collectes
        col_count = await db.execute(
            select(Collection).where(Collection.daily_route_id == dr.id)
        )
        d["nb_collectes"] = len(col_count.scalars().all())
        # Nombre de points prévus
        if dr.template_id:
            pt_count = await db.execute(
                select(RouteTemplatePoint).where(RouteTemplatePoint.route_template_id == dr.template_id)
            )
            d["nb_points_prevus"] = len(pt_count.scalars().all())
        else:
            d["nb_points_prevus"] = 0
        # Dernière position GPS
        last_gps = await db.execute(
            select(GPSTrack)
            .where(GPSTrack.daily_route_id == dr.id)
            .order_by(GPSTrack.recorded_at.desc())
            .limit(1)
        )
        gps = last_gps.scalar_one_or_none()
        d["last_gps"] = row_to_dict(gps) if gps else None
        routes.append(d)
    return routes


@router.get("/live/history/{daily_route_id}")
async def gps_history(daily_route_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(GPSTrack)
        .where(GPSTrack.daily_route_id == daily_route_id)
        .order_by(GPSTrack.recorded_at)
    )
    return [row_to_dict(g) for g in result.scalars().all()]
