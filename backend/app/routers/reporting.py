from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.models.collecte import WeightHistory, Weight, Collection
from app.services.auth import get_current_user
from datetime import datetime
from io import BytesIO
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api/reporting", tags=["reporting"])

# Facteurs ADEME
CO2_PAR_TONNE = 22.0  # kg CO2 évités par tonne recyclée
EAU_PAR_TONNE = 15000.0  # litres d'eau économisés par tonne


@router.get("/synthese")
async def synthese(
    annee: int = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not annee:
        annee = datetime.utcnow().year

    # Tonnage historique
    tonnage_result = await db.execute(
        select(func.sum(WeightHistory.poids_net)).where(WeightHistory.annee == annee)
    )
    tonnage_hist = tonnage_result.scalar() or 0

    # Tonnage pesées récentes
    tonnage_recent = (await db.execute(select(func.sum(Weight.poids_net)))).scalar() or 0

    total_kg = tonnage_hist + tonnage_recent
    total_tonnes = total_kg / 1000

    # Stats collectes
    nb_pesees_hist = (await db.execute(
        select(func.count()).select_from(WeightHistory).where(WeightHistory.annee == annee)
    )).scalar() or 0
    nb_pesees_recent = (await db.execute(select(func.count()).select_from(Weight))).scalar() or 0
    nb_collectes = (await db.execute(select(func.count()).select_from(Collection))).scalar() or 0

    # Par mois
    mois_result = await db.execute(
        select(WeightHistory.mois, func.sum(WeightHistory.poids_net))
        .where(WeightHistory.annee == annee)
        .group_by(WeightHistory.mois)
        .order_by(WeightHistory.mois)
    )
    par_mois = {r[0]: r[1] for r in mois_result.all()}

    return {
        "annee": annee,
        "tonnage_kg": total_kg,
        "tonnage_tonnes": round(total_tonnes, 2),
        "nb_pesees": nb_pesees_hist + nb_pesees_recent,
        "nb_collectes": nb_collectes,
        "co2_evite_kg": round(total_tonnes * CO2_PAR_TONNE, 1),
        "eau_economisee_litres": round(total_tonnes * EAU_PAR_TONNE, 0),
        "emplois_insertion": 30,
        "par_mois": par_mois,
    }


@router.get("/export-pdf")
async def export_pdf(
    annee: int = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not annee:
        annee = datetime.utcnow().year

    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas

    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    w, h = A4

    c.setFont("Helvetica-Bold", 20)
    c.drawString(50, h - 60, f"Solidarité Textiles — Rapport {annee}")
    c.setFont("Helvetica", 12)
    c.drawString(50, h - 90, "Collecte de Textiles, Linges, Chaussures")
    c.drawString(50, h - 110, "Métropole Rouen Normandie")

    # Tonnage
    tonnage_result = await db.execute(
        select(func.sum(WeightHistory.poids_net)).where(WeightHistory.annee == annee)
    )
    tonnage = (tonnage_result.scalar() or 0) / 1000
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, h - 160, f"Tonnage total : {tonnage:.1f} tonnes")
    c.drawString(50, h - 185, f"CO₂ évité : {tonnage * CO2_PAR_TONNE:.0f} kg")
    c.drawString(50, h - 210, f"Eau économisée : {tonnage * EAU_PAR_TONNE:.0f} litres")

    c.setFont("Helvetica", 10)
    c.drawString(50, 50, "Rapport généré automatiquement — Solidata ERP")

    c.save()
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=rapport_{annee}.pdf"},
    )
