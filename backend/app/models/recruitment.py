from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from app.database import Base


class PositionType(Base):
    __tablename__ = "position_types"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String, unique=True, nullable=False)
    label = Column(String, nullable=False)
    description = Column(String, nullable=True)


class Position(Base):
    __tablename__ = "positions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)
    type = Column(String, nullable=True)
    month = Column(String, nullable=True)
    slots_open = Column(Integer, default=1)
    slots_filled = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    application_date = Column(DateTime, default=datetime.utcnow)
    cv_file_path = Column(String, nullable=True)
    cv_raw_text = Column(Text, nullable=True)
    kanban_status = Column(String, default="received")
    position_id = Column(Integer, ForeignKey("positions.id"), nullable=True)
    comment = Column(Text, nullable=True)
    cr_interview = Column(Text, nullable=True)
    cr_test = Column(Text, nullable=True)
    pcm_test_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class KanbanHistory(Base):
    __tablename__ = "kanban_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=False)
    moved_by = Column(String, nullable=True)
    moved_at = Column(DateTime, default=datetime.utcnow)
    note = Column(String, nullable=True)


class PCMTest(Base):
    __tablename__ = "pcm_tests"

    id = Column(Integer, primary_key=True, autoincrement=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String, default="pending")
    input_mode = Column(String, default="text")


class PCMProfile(Base):
    __tablename__ = "pcm_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    test_id = Column(Integer, ForeignKey("pcm_tests.id"), nullable=False)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    base_type = Column(String, nullable=True)
    phase_type = Column(String, nullable=True)
    score_analyseur = Column(Integer, default=0)
    score_perseverant = Column(Integer, default=0)
    score_promoteur = Column(Integer, default=0)
    score_empathique = Column(Integer, default=0)
    score_energiseur = Column(Integer, default=0)
    score_imagineur = Column(Integer, default=0)
    perception_dominante = Column(String, nullable=True)
    canal_communication = Column(String, nullable=True)
    besoin_psychologique = Column(String, nullable=True)
    driver_principal = Column(String, nullable=True)
    masque_stress = Column(String, nullable=True)
    scenario_stress = Column(Text, nullable=True)
    rps_risk_level = Column(String, nullable=True)
    rps_indicators = Column(Text, nullable=True)
    tp_correlation = Column(Text, nullable=True)
    communication_tips = Column(Text, nullable=True)
    environment_tips = Column(Text, nullable=True)
    incompatibility_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
