from app.database import Base
from app.models.user import User, UserRole
from app.models.collecte import (
    CAV, Vehicle, RouteTemplate, RouteTemplatePoint,
    DailyRoute, Collection, Weight, WeightHistory,
    VehicleChecklist, Incident, GPSTrack,
)
from app.models.recruitment import (
    PositionType, Position, Candidate, KanbanHistory,
    PCMTest, PCMProfile,
)
from app.models.poj import (
    POJCollaborateur, POJPoste, POJAffectation,
    POJVakEvent, POJVakPoste, POJVakAffectation,
)

__all__ = [
    "Base", "User", "UserRole",
    "CAV", "Vehicle", "RouteTemplate", "RouteTemplatePoint",
    "DailyRoute", "Collection", "Weight", "WeightHistory",
    "VehicleChecklist", "Incident", "GPSTrack",
    "PositionType", "Position", "Candidate", "KanbanHistory",
    "PCMTest", "PCMProfile",
    "POJCollaborateur", "POJPoste", "POJAffectation",
    "POJVakEvent", "POJVakPoste", "POJVakAffectation",
]
