from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, UniqueConstraint
from app.database import Base


class CAV(Base):
    __tablename__ = "cav"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nom = Column(String, nullable=False)
    adresse = Column(String, nullable=True)
    complement_adresse = Column(String, nullable=True)
    code_postal = Column(String, nullable=True)
    ville = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    nb_cav = Column(Integer, default=1)
    frequence_passage = Column(Integer, default=1)
    communaute_communes = Column(String, nullable=True)
    entite_detentrice = Column(String, nullable=True)
    reference_eco_tlc = Column(String, nullable=True)
    qr_code = Column(String, unique=True, nullable=True)
    is_active = Column(Boolean, default=True)
    suspension_motif = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    immatriculation = Column(String, nullable=False)
    nom = Column(String, nullable=True)
    marque = Column(String, nullable=True)
    modele = Column(String, nullable=True)
    ptc = Column(Float, nullable=True)
    charge_utile = Column(Float, nullable=True)
    volume_m3 = Column(Float, nullable=True)
    puissance_ch = Column(Integer, nullable=True)
    type_energie = Column(String, nullable=True)
    tare = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class RouteTemplate(Base):
    __tablename__ = "route_templates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nom = Column(String, nullable=False)
    description = Column(String, nullable=True)
    secteur = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class RouteTemplatePoint(Base):
    __tablename__ = "route_template_points"

    id = Column(Integer, primary_key=True, autoincrement=True)
    route_template_id = Column(Integer, ForeignKey("route_templates.id"), nullable=False)
    cav_id = Column(Integer, ForeignKey("cav.id"), nullable=False)
    ordre = Column(Integer, nullable=False)

    __table_args__ = (
        UniqueConstraint("route_template_id", "cav_id", name="uq_route_cav"),
    )


class DailyRoute(Base):
    __tablename__ = "daily_routes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(DateTime, nullable=False)
    periode = Column(String, nullable=False)  # "matin" / "apres_midi"
    template_id = Column(Integer, ForeignKey("route_templates.id"), nullable=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)
    chauffeur_id = Column(Integer, nullable=True)
    suiveur_id = Column(Integer, nullable=True)
    source = Column(String, default="standard")
    status = Column(String, default="planifiee")
    created_at = Column(DateTime, default=datetime.utcnow)


class Collection(Base):
    __tablename__ = "collections"

    id = Column(Integer, primary_key=True, autoincrement=True)
    daily_route_id = Column(Integer, ForeignKey("daily_routes.id"), nullable=False)
    cav_id = Column(Integer, ForeignKey("cav.id"), nullable=False)
    scanned_at = Column(DateTime, default=datetime.utcnow)
    fill_level = Column(String, nullable=True)
    gps_lat = Column(Float, nullable=True)
    gps_lon = Column(Float, nullable=True)
    ordre_reel = Column(Integer, nullable=True)
    note = Column(String, nullable=True)


class Weight(Base):
    __tablename__ = "weights"

    id = Column(Integer, primary_key=True, autoincrement=True)
    daily_route_id = Column(Integer, ForeignKey("daily_routes.id"), nullable=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)
    poids_brut = Column(Integer, nullable=True)
    tare = Column(Integer, nullable=True)
    poids_net = Column(Integer, nullable=True)
    weighed_at = Column(DateTime, default=datetime.utcnow)
    note = Column(String, nullable=True)


class WeightHistory(Base):
    __tablename__ = "weight_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    external_id = Column(String, nullable=True)
    origine = Column(String, nullable=True)
    categorie = Column(String, nullable=True)
    poids_net = Column(Float, nullable=True)
    tare = Column(Float, nullable=True)
    poids_brut = Column(Float, nullable=True)
    date_pesee = Column(DateTime, nullable=True)
    mois = Column(Integer, nullable=True)
    trimestre = Column(Integer, nullable=True)
    annee = Column(Integer, nullable=True)


class VehicleChecklist(Base):
    __tablename__ = "vehicle_checklists"

    id = Column(Integer, primary_key=True, autoincrement=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    driver_id = Column(Integer, nullable=True)
    date = Column(DateTime, default=datetime.utcnow)
    kilometrage = Column(Integer, nullable=True)
    niveau_carburant = Column(String, nullable=True)
    etat_pneus = Column(String, nullable=True)
    eclairage_ok = Column(Boolean, default=True)
    freins_ok = Column(Boolean, default=True)
    retros_ok = Column(Boolean, default=True)
    proprete_ok = Column(Boolean, default=True)
    hayons_ok = Column(Boolean, default=True)
    commentaire = Column(String, nullable=True)
    validation = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    daily_route_id = Column(Integer, ForeignKey("daily_routes.id"), nullable=True)
    cav_id = Column(Integer, ForeignKey("cav.id"), nullable=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)
    reporter_id = Column(Integer, nullable=True)
    type = Column(String, nullable=True)
    description = Column(String, nullable=True)
    photo_path = Column(String, nullable=True)
    severity = Column(String, default="moyen")
    status = Column(String, default="ouvert")
    gps_lat = Column(Float, nullable=True)
    gps_lon = Column(Float, nullable=True)
    reported_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)


class GPSTrack(Base):
    __tablename__ = "gps_tracks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    daily_route_id = Column(Integer, ForeignKey("daily_routes.id"), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    accuracy = Column(Float, nullable=True)
    speed = Column(Float, nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow)
