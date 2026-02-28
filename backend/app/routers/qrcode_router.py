import uuid
from io import BytesIO
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db, row_to_dict
from app.models.user import User
from app.models.collecte import CAV, RouteTemplatePoint
from app.services.auth import get_current_user
import qrcode

router = APIRouter(prefix="/api/qr", tags=["qrcode"])


@router.post("/generate")
async def generate_qr_codes(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(CAV).where(CAV.qr_code == None))
    cavs = result.scalars().all()
    generated = 0
    for cav in cavs:
        code = f"ST-{cav.id:04d}-{uuid.uuid4().hex[:6].upper()}"
        cav.qr_code = code
        generated += 1
    await db.commit()
    return {"message": f"{generated} QR codes générés", "generated": generated}


@router.get("/list")
async def list_qr(
    route_id: int = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if route_id:
        result = await db.execute(
            select(CAV)
            .join(RouteTemplatePoint, RouteTemplatePoint.cav_id == CAV.id)
            .where(RouteTemplatePoint.route_template_id == route_id)
            .where(CAV.qr_code != None)
            .order_by(RouteTemplatePoint.ordre)
        )
    else:
        result = await db.execute(select(CAV).where(CAV.qr_code != None).order_by(CAV.id))
    return [row_to_dict(c) for c in result.scalars().all()]


@router.get("/image/{cav_id}")
async def qr_image(cav_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CAV).where(CAV.id == cav_id))
    cav = result.scalar_one_or_none()
    if not cav or not cav.qr_code:
        raise HTTPException(status_code=404, detail="QR code introuvable")
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(cav.qr_code)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="image/png")


@router.get("/resolve/{qr_code}")
async def resolve_qr(qr_code: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CAV).where(CAV.qr_code == qr_code))
    cav = result.scalar_one_or_none()
    if not cav:
        raise HTTPException(status_code=404, detail="QR code inconnu")
    return row_to_dict(cav)


@router.get("/export-pdf")
async def export_pdf(
    route_id: int = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    from reportlab.lib.units import mm

    if route_id:
        result = await db.execute(
            select(CAV)
            .join(RouteTemplatePoint, RouteTemplatePoint.cav_id == CAV.id)
            .where(RouteTemplatePoint.route_template_id == route_id)
            .where(CAV.qr_code != None)
            .order_by(RouteTemplatePoint.ordre)
        )
    else:
        result = await db.execute(select(CAV).where(CAV.qr_code != None).order_by(CAV.id))

    cavs = result.scalars().all()
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    w, h = A4

    cols, rows_per_page = 2, 3
    cell_w = w / cols
    cell_h = h / rows_per_page
    qr_size = 35 * mm

    for idx, cav in enumerate(cavs):
        page_idx = idx % (cols * rows_per_page)
        if page_idx == 0 and idx > 0:
            c.showPage()

        col = page_idx % cols
        row = page_idx // cols
        x = col * cell_w + (cell_w - qr_size) / 2
        y = h - (row + 1) * cell_h + (cell_h - qr_size) / 2 + 15

        # QR code image
        qr_obj = qrcode.QRCode(version=1, box_size=8, border=2)
        qr_obj.add_data(cav.qr_code)
        qr_obj.make(fit=True)
        img = qr_obj.make_image(fill_color="black", back_color="white")
        img_buffer = BytesIO()
        img.save(img_buffer, format="PNG")
        img_buffer.seek(0)

        from reportlab.lib.utils import ImageReader
        c.drawImage(ImageReader(img_buffer), x, y, width=qr_size, height=qr_size)

        # Texte
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(col * cell_w + cell_w / 2, y - 12, cav.nom[:30])
        c.setFont("Helvetica", 7)
        c.drawCentredString(col * cell_w + cell_w / 2, y - 22, f"{cav.ville or ''} — {cav.qr_code}")

    c.save()
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=etiquettes_qr.pdf"},
    )
