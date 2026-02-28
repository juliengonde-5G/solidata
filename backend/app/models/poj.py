from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from app.database import Base


class POJCollaborateur(Base):
    __tablename__ = "poj_collaborateurs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nom = Column(String, nullable=False)
    prenom = Column(String, nullable=True)
    contrat = Column(String, nullable=True)
    caces = Column(Boolean, default=False)
    permis = Column(Boolean, default=False)
    indispo = Column(Boolean, default=False)
    equipe = Column(String, nullable=True)
    telephone = Column(String, nullable=True)


class POJPoste(Base):
    __tablename__ = "poj_postes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nom = Column(String, nullable=False)
    groupe = Column(String, nullable=True)
    obligatoire = Column(Boolean, default=False)
    req_caces = Column(Boolean, default=False)
    req_permis = Column(Boolean, default=False)


class POJAffectation(Base):
    __tablename__ = "poj_affectations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    date_planning = Column(DateTime, nullable=False)
    poste_id = Column(Integer, ForeignKey("poj_postes.id"), nullable=False)
    collab_id = Column(Integer, ForeignKey("poj_collaborateurs.id"), nullable=False)


class POJVakEvent(Base):
    __tablename__ = "poj_vak_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nom = Column(String, nullable=False)
    date_start = Column(DateTime, nullable=False)
    date_end = Column(DateTime, nullable=False)


class POJVakPoste(Base):
    __tablename__ = "poj_vak_postes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nom = Column(String, nullable=False)
    obligatoire = Column(Boolean, default=False)


class POJVakAffectation(Base):
    __tablename__ = "poj_vak_affectations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    vak_id = Column(Integer, ForeignKey("poj_vak_events.id"), nullable=False)
    date_planning = Column(DateTime, nullable=False)
    vak_poste_id = Column(Integer, ForeignKey("poj_vak_postes.id"), nullable=False)
    collab_id = Column(Integer, ForeignKey("poj_collaborateurs.id"), nullable=False)
