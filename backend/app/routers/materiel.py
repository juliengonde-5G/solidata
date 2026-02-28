from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db, row_to_dict
from app.models.user import User
from app.models.collecte import VehicleChecklist, Incident, Vehicle
from app.services.auth import get_current_user
import os
import shutil

router = APIRouter(prefix="/api/materiel", tags=["materiel"])


@router.post("/checklist")
async def create_checklist(data: dict, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    cl = VehicleChecklist(**{k: v for k, v in data.items() if hasattr(VehicleChecklist, k)})
    db.add(cl)
    await db.commit()
    await db.refresh(cl)
    return row_to_dict(cl)


@router.get("/checklist/today")
async def today_checklists(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = datetime.utcnow().date()
    result = await db.execute(
        select(VehicleChecklist, Vehicle)
        .join(Vehicle, Vehicle.id == VehicleChecklist.vehicle_id)
        .where(VehicleChecklist.date >= datetime.combine(today, datetime.min.time()))
        .order_by(VehicleChecklist.date.desc())
    )
    return [
        {**row_to_dict(cl), "vehicule_nom": v.nom, "vehicule_immat": v.immatriculation}
        for cl, v in result.all()
    ]


@router.get("/checklist/vehicle/{vehicle_id}")
async def vehicle_checklists(vehicle_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(VehicleChecklist)
        .where(VehicleChecklist.vehicle_id == vehicle_id)
        .order_by(VehicleChecklist.date.desc())
        .limit(30)
    )
    return [row_to_dict(cl) for cl in result.scalars().all()]


@router.get("/checklist/stats")
async def checklist_stats(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    total = (await db.execute(select(func.count()).select_from(VehicleChecklist))).scalar() or 0
    validated = (await db.execute(
        select(func.count()).select_from(VehicleChecklist).where(VehicleChecklist.validation == True)
    )).scalar() or 0
    return {"total": total, "validees": validated}


@router.post("/incident")
async def create_incident(data: dict, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    incident = Incident(**{k: v for k, v in data.items() if hasattr(Incident, k)})
    incident.reporter_id = current_user.id
    db.add(incident)
    await db.commit()
    await db.refresh(incident)
    return row_to_dict(incident)


@router.put("/incident/{incident_id}")
async def update_incident(incident_id: int, data: dict, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident introuvable")
    for k, v in data.items():
        if hasattr(incident, k) and k != "id":
            setattr(incident, k, v)
    if data.get("status") == "resolu":
        incident.resolved_at = datetime.utcnow()
    await db.commit()
    return row_to_dict(incident)


@router.get("/incidents")
async def list_incidents(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Incident).order_by(Incident.reported_at.desc()).limit(100))
    return [row_to_dict(i) for i in result.scalars().all()]


@router.get("/incidents/stats")
async def incidents_stats(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    total = (await db.execute(select(func.count()).select_from(Incident))).scalar() or 0
    ouverts = (await db.execute(
        select(func.count()).select_from(Incident).where(Incident.status == "ouvert")
    )).scalar() or 0
    return {"total": total, "ouverts": ouverts, "resolus": total - ouverts}


@router.post("/incident/{incident_id}/photo")
async def upload_incident_photo(
    incident_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident introuvable")
    upload_dir = "/app/uploads/incidents"
    os.makedirs(upload_dir, exist_ok=True)
    filepath = os.path.join(upload_dir, f"incident_{incident_id}_{file.filename}")
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)
    incident.photo_path = filepath
    await db.commit()
    return {"message": "Photo ajoutée", "path": filepath}
