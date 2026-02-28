import os
import shutil
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db, row_to_dict
from app.models.user import User
from app.models.recruitment import (
    Candidate, Position, PositionType, KanbanHistory,
    PCMTest, PCMProfile,
)
from app.models.poj import (
    POJCollaborateur, POJPoste, POJAffectation,
    POJVakEvent, POJVakPoste, POJVakAffectation,
)
from app.services.auth import get_current_user

router = APIRouter(prefix="/api", tags=["legacy"])


# ── Candidates ───────────────────────────────────────────────
@router.get("/candidates")
async def list_candidates(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Candidate).order_by(Candidate.created_at.desc()))
    return [row_to_dict(c) for c in result.scalars().all()]


@router.post("/candidates")
async def create_candidate(data: dict, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = Candidate(**{k: v for k, v in data.items() if hasattr(Candidate, k)})
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return row_to_dict(c)


@router.get("/candidates/{cid}")
async def get_candidate(cid: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Candidate).where(Candidate.id == cid))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Candidat introuvable")
    return row_to_dict(c)


@router.put("/candidates/{cid}")
async def update_candidate(cid: int, data: dict, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Candidate).where(Candidate.id == cid))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Candidat introuvable")
    for k, v in data.items():
        if hasattr(c, k) and k != "id":
            setattr(c, k, v)
    await db.commit()
    return row_to_dict(c)


@router.delete("/candidates/{cid}")
async def delete_candidate(cid: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Candidate).where(Candidate.id == cid))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Candidat introuvable")
    # Supprimer historique
    await db.execute(select(KanbanHistory).where(KanbanHistory.candidate_id == cid))
    await db.delete(c)
    await db.commit()
    return {"message": "Candidat supprimé"}


@router.post("/candidates/{cid}/move")
async def move_candidate(cid: int, data: dict, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Candidate).where(Candidate.id == cid))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Candidat introuvable")
    old_status = c.kanban_status
    c.kanban_status = data["to_status"]
    history = KanbanHistory(
        candidate_id=cid,
        from_status=old_status,
        to_status=data["to_status"],
        moved_by=current_user.username,
        note=data.get("note"),
    )
    db.add(history)
    await db.commit()
    return {"message": "Candidat déplacé", "from": old_status, "to": data["to_status"]}


@router.get("/candidates/{cid}/history")
async def candidate_history(cid: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(KanbanHistory).where(KanbanHistory.candidate_id == cid).order_by(KanbanHistory.moved_at.desc())
    )
    return [row_to_dict(h) for h in result.scalars().all()]


# ── Positions ────────────────────────────────────────────────
@router.get("/positions")
async def list_positions(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Position).order_by(Position.id))
    return [row_to_dict(p) for p in result.scalars().all()]


@router.post("/positions")
async def create_position(data: dict, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    p = Position(**{k: v for k, v in data.items() if hasattr(Position, k)})
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return row_to_dict(p)


@router.put("/positions/{pid}")
async def update_position(pid: int, data: dict, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Position).where(Position.id == pid))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Poste introuvable")
    for k, v in data.items():
        if hasattr(p, k) and k != "id":
            setattr(p, k, v)
    await db.commit()
    return row_to_dict(p)


@router.delete("/positions/{pid}")
async def delete_position(pid: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Position).where(Position.id == pid))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Poste introuvable")
    await db.delete(p)
    await db.commit()
    return {"message": "Poste supprimé"}


# ── Position Types ───────────────────────────────────────────
@router.get("/position-types")
async def list_position_types(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(PositionType).order_by(PositionType.id))
    return [row_to_dict(pt) for pt in result.scalars().all()]


@router.post("/position-types")
async def create_position_type(data: dict, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    pt = PositionType(**{k: v for k, v in data.items() if hasattr(PositionType, k)})
    db.add(pt)
    await db.commit()
    await db.refresh(pt)
    return row_to_dict(pt)


@router.delete("/position-types/{ptid}")
async def delete_position_type(ptid: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(PositionType).where(PositionType.id == ptid))
    pt = result.scalar_one_or_none()
    if not pt:
        raise HTTPException(status_code=404, detail="Type de poste introuvable")
    await db.delete(pt)
    await db.commit()
    return {"message": "Type supprimé"}


# ── PCM ──────────────────────────────────────────────────────
@router.get("/pcm/questionnaire")
async def pcm_questionnaire(current_user: User = Depends(get_current_user)):
    from app.services.pcm_engine import get_questionnaire
    return get_questionnaire()


@router.post("/pcm/submit")
async def pcm_submit(data: dict, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.services.pcm_engine import compute_profile
    candidate_id = data["candidate_id"]
    answers = data["answers"]
    input_mode = data.get("input_mode", "text")

    # Créer le test
    test = PCMTest(candidate_id=candidate_id, status="completed", completed_at=datetime.utcnow(), input_mode=input_mode)
    db.add(test)
    await db.flush()

    # Calculer le profil
    profile_data = compute_profile(answers)

    profile = PCMProfile(
        test_id=test.id,
        candidate_id=candidate_id,
        **profile_data,
    )
    db.add(profile)

    # Mettre à jour le lien PCM du candidat
    cand_result = await db.execute(select(Candidate).where(Candidate.id == candidate_id))
    cand = cand_result.scalar_one_or_none()
    if cand:
        cand.pcm_test_id = test.id

    await db.commit()
    await db.refresh(profile)
    return row_to_dict(profile)


@router.get("/pcm/profiles")
async def pcm_profiles(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(PCMProfile).order_by(PCMProfile.created_at.desc()))
    return [row_to_dict(p) for p in result.scalars().all()]


@router.get("/pcm/profiles/{candidate_id}")
async def pcm_profile_by_candidate(candidate_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(PCMProfile).where(PCMProfile.candidate_id == candidate_id).order_by(PCMProfile.created_at.desc())
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profil PCM introuvable")
    return row_to_dict(profile)


@router.get("/pcm/types")
async def pcm_types(current_user: User = Depends(get_current_user)):
    from app.services.pcm_engine import get_types_data
    return get_types_data()


@router.get("/pcm/types/{type_key}")
async def pcm_type_detail(type_key: str, current_user: User = Depends(get_current_user)):
    from app.services.pcm_engine import get_types_data
    types = get_types_data()
    if type_key not in types:
        raise HTTPException(status_code=404, detail="Type PCM introuvable")
    return types[type_key]


# ── Stats ────────────────────────────────────────────────────
@router.get("/stats")
async def recruitment_stats(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    total = (await db.execute(select(func.count()).select_from(Candidate))).scalar() or 0
    by_status = {}
    for status in ["received", "preselected", "interview", "test", "hired"]:
        count = (await db.execute(
            select(func.count()).select_from(Candidate).where(Candidate.kanban_status == status)
        )).scalar() or 0
        by_status[status] = count
    positions_total = (await db.execute(select(func.count()).select_from(Position))).scalar() or 0
    return {"total_candidats": total, "par_statut": by_status, "total_postes": positions_total}


# ── Upload CV ────────────────────────────────────────────────
@router.post("/upload/cv")
async def upload_cv(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    upload_dir = "/app/uploads/cvs"
    os.makedirs(upload_dir, exist_ok=True)
    filepath = os.path.join(upload_dir, file.filename)
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"stored_path": filepath, "filename": file.filename}


# ── POJ ──────────────────────────────────────────────────────
@router.get("/poj/collaborateurs")
async def poj_list_collabs(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(POJCollaborateur).order_by(POJCollaborateur.nom))
    return [row_to_dict(c) for c in result.scalars().all()]


@router.post("/poj/collaborateurs")
async def poj_create_collab(data: dict, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = POJCollaborateur(**{k: v for k, v in data.items() if hasattr(POJCollaborateur, k)})
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return row_to_dict(c)


@router.put("/poj/collaborateurs/{cid}")
async def poj_update_collab(cid: int, data: dict, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(POJCollaborateur).where(POJCollaborateur.id == cid))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Collaborateur introuvable")
    for k, v in data.items():
        if hasattr(c, k) and k != "id":
            setattr(c, k, v)
    await db.commit()
    return row_to_dict(c)


@router.delete("/poj/collaborateurs/{cid}")
async def poj_delete_collab(cid: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(POJCollaborateur).where(POJCollaborateur.id == cid))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Collaborateur introuvable")
    await db.delete(c)
    await db.commit()
    return {"message": "Collaborateur supprimé"}


@router.get("/poj/postes")
async def poj_list_postes(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(POJPoste).order_by(POJPoste.id))
    return [row_to_dict(p) for p in result.scalars().all()]


@router.post("/poj/postes")
async def poj_create_poste(data: dict, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    p = POJPoste(**{k: v for k, v in data.items() if hasattr(POJPoste, k)})
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return row_to_dict(p)


@router.put("/poj/postes/{pid}")
async def poj_update_poste(pid: int, data: dict, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(POJPoste).where(POJPoste.id == pid))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Poste introuvable")
    for k, v in data.items():
        if hasattr(p, k) and k != "id":
            setattr(p, k, v)
    await db.commit()
    return row_to_dict(p)


@router.delete("/poj/postes/{pid}")
async def poj_delete_poste(pid: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(POJPoste).where(POJPoste.id == pid))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Poste introuvable")
    await db.delete(p)
    await db.commit()
    return {"message": "Poste supprimé"}


@router.get("/poj/planning/{date_str}")
async def poj_planning(date_str: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    target = datetime.strptime(date_str, "%Y-%m-%d")
    from datetime import timedelta
    end = target + timedelta(days=1)
    result = await db.execute(
        select(POJAffectation, POJCollaborateur, POJPoste)
        .join(POJCollaborateur, POJCollaborateur.id == POJAffectation.collab_id)
        .join(POJPoste, POJPoste.id == POJAffectation.poste_id)
        .where(POJAffectation.date_planning >= target, POJAffectation.date_planning < end)
    )
    return [
        {**row_to_dict(a), "collab_nom": f"{c.prenom or ''} {c.nom}", "poste_nom": p.nom}
        for a, c, p in result.all()
    ]


@router.post("/poj/planning/{date_str}")
async def poj_create_affectation(date_str: str, data: dict, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    a = POJAffectation(
        date_planning=datetime.strptime(date_str, "%Y-%m-%d"),
        poste_id=data["poste_id"],
        collab_id=data["collab_id"],
    )
    db.add(a)
    await db.commit()
    await db.refresh(a)
    return row_to_dict(a)


@router.delete("/poj/planning/{date_str}")
async def poj_clear_planning(date_str: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    target = datetime.strptime(date_str, "%Y-%m-%d")
    from datetime import timedelta
    end = target + timedelta(days=1)
    result = await db.execute(
        select(POJAffectation).where(POJAffectation.date_planning >= target, POJAffectation.date_planning < end)
    )
    for a in result.scalars().all():
        await db.delete(a)
    await db.commit()
    return {"message": "Planning vidé"}


@router.get("/poj/planning/range/{start}/{end}")
async def poj_planning_range(start: str, end: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    start_dt = datetime.strptime(start, "%Y-%m-%d")
    end_dt = datetime.strptime(end, "%Y-%m-%d")
    result = await db.execute(
        select(POJAffectation, POJCollaborateur, POJPoste)
        .join(POJCollaborateur, POJCollaborateur.id == POJAffectation.collab_id)
        .join(POJPoste, POJPoste.id == POJAffectation.poste_id)
        .where(POJAffectation.date_planning >= start_dt, POJAffectation.date_planning <= end_dt)
        .order_by(POJAffectation.date_planning)
    )
    return [
        {**row_to_dict(a), "collab_nom": f"{c.prenom or ''} {c.nom}", "poste_nom": p.nom}
        for a, c, p in result.all()
    ]


@router.get("/poj/stats/{date_str}")
async def poj_stats(date_str: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    target = datetime.strptime(date_str, "%Y-%m-%d")
    from datetime import timedelta
    end = target + timedelta(days=1)
    total_postes = (await db.execute(select(func.count()).select_from(POJPoste))).scalar() or 0
    obligatoires = (await db.execute(
        select(func.count()).select_from(POJPoste).where(POJPoste.obligatoire == True)
    )).scalar() or 0
    affectes = (await db.execute(
        select(func.count(func.distinct(POJAffectation.poste_id)))
        .where(POJAffectation.date_planning >= target, POJAffectation.date_planning < end)
    )).scalar() or 0
    return {"total_postes": total_postes, "obligatoires": obligatoires, "couverts": affectes}


@router.get("/poj/export/planning")
async def poj_export_planning(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(POJAffectation, POJCollaborateur, POJPoste)
        .join(POJCollaborateur, POJCollaborateur.id == POJAffectation.collab_id)
        .join(POJPoste, POJPoste.id == POJAffectation.poste_id)
        .order_by(POJAffectation.date_planning)
    )
    return [
        {**row_to_dict(a), "collab_nom": f"{c.prenom or ''} {c.nom}", "poste_nom": p.nom}
        for a, c, p in result.all()
    ]


# ── VAK ──────────────────────────────────────────────────────
@router.get("/poj/vak/events")
async def vak_list_events(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(POJVakEvent).order_by(POJVakEvent.date_start))
    return [row_to_dict(e) for e in result.scalars().all()]


@router.post("/poj/vak/events")
async def vak_create_event(data: dict, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    e = POJVakEvent(
        nom=data["nom"],
        date_start=datetime.strptime(data["date_start"], "%Y-%m-%d"),
        date_end=datetime.strptime(data["date_end"], "%Y-%m-%d"),
    )
    db.add(e)
    await db.commit()
    await db.refresh(e)
    return row_to_dict(e)


@router.delete("/poj/vak/events/{eid}")
async def vak_delete_event(eid: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(POJVakEvent).where(POJVakEvent.id == eid))
    e = result.scalar_one_or_none()
    if not e:
        raise HTTPException(status_code=404, detail="Événement VAK introuvable")
    await db.delete(e)
    await db.commit()
    return {"message": "Événement supprimé"}


@router.get("/poj/vak/postes")
async def vak_list_postes(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(POJVakPoste).order_by(POJVakPoste.id))
    return [row_to_dict(p) for p in result.scalars().all()]


@router.post("/poj/vak/postes")
async def vak_create_poste(data: dict, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    p = POJVakPoste(**{k: v for k, v in data.items() if hasattr(POJVakPoste, k)})
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return row_to_dict(p)
