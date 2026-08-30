import datetime
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from backend.app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
    name = Column(String(100), nullable=False)
    role = Column(String(50), nullable=False)  # Field Worker, Safety Officer, Safety Manager, Admin, AI Pipeline Viewer
    is_active = Column(Boolean, default=True)

class Site(Base):
    __tablename__ = "sites"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    location = Column(String(100))
    site_type = Column(String(50), default="Drilling Rig") # Drilling Rig, Refinery, Offshore, Storage Terminal
    
    units = relationship("Unit", back_populates="site")

class Unit(Base):
    __tablename__ = "units"
    
    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey("sites.id"))
    name = Column(String(100), nullable=False)
    code = Column(String(50), nullable=False)
    
    site = relationship("Site", back_populates="units")

class SafetyReport(Base):
    __tablename__ = "safety_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    report_code = Column(String(50), unique=True, index=True, nullable=True) # e.g. #SIF26165-001
    report_type = Column(String(50), default="Unsafe Condition") # Unsafe Act, Unsafe Condition, Near Miss
    raw_text = Column(Text, nullable=False)
    audio_transcript = Column(Text, nullable=True)
    photo_url = Column(String(255), nullable=True)
    equipment_involved = Column(String(100), nullable=True)
    people_involved = Column(Integer, default=1)
    reporter_email = Column(String(100), default="worker@refinery.safe")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String(50), default="Pending")  # Pending, Analyzed, Error
    
    events = relationship("SafetyEvent", back_populates="report")

class SafetyEvent(Base):
    __tablename__ = "safety_events"
    
    id = Column(String(50), primary_key=True, index=True)  # e.g., SIF-10001 or #SIF26165-001
    report_id = Column(Integer, ForeignKey("safety_reports.id"))
    report_code = Column(String(50), nullable=True) # formatted e.g. #SIF26165-001
    report_type = Column(String(50), default="Unsafe Condition") # Unsafe Act, Unsafe Condition, Near Miss
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    site = Column(String(100))
    unit = Column(String(100))
    location = Column(String(100))
    activity = Column(String(100))
    description = Column(Text)
    hazard = Column(String(200))
    equipment_involved = Column(String(100), nullable=True)
    people_involved = Column(Integer, default=1)
    energy_source = Column(String(100))
    barrier = Column(String(200))
    barrier_failure = Column(String(200))
    exposure = Column(String(200))
    consequence = Column(String(200))
    
    # SIF Precursor Detection
    is_sif_precursor = Column(String(10), default="NO") # YES, NO
    
    # 0-10 Multi-Factor Risk Scoring Engine
    severity_score = Column(Float, default=5.0)       # 0 - 10
    exposure_score = Column(Float, default=5.0)       # 0 - 10
    barrier_score = Column(Float, default=5.0)        # 0 - 10
    consequence_score = Column(Float, default=5.0)    # 0 - 10
    sif_risk_score = Column(Float, default=5.0)       # 0 - 10 final composite score
    risk_level = Column(String(20), default="MEDIUM") # CRITICAL, HIGH, MEDIUM, LOW
    
    # Legacy percentage fields for compatibility
    sif_probability = Column(Float, default=50.0)  # Percentage e.g. 90.0%
    confidence = Column(Float, default=85.0)        # Confidence e.g. 92.0%
    
    life_saving_rule = Column(String(100))
    status = Column(String(50), default="Needs Review")  # Needs Review, Confirmed, Corrected, Non-SIF, Action Dispatched, Resolved
    reviewer = Column(String(100), nullable=True)
    evidence = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)
    recommended_action = Column(Text, nullable=True)
    
    # Officer Corrective Actions
    stop_work_issued = Column(Boolean, default=False)
    assigned_team = Column(String(100), nullable=True)
    action_id = Column(String(50), nullable=True) # e.g. ACT-1001
    action_status = Column(String(50), default="Pending") # Pending, In Progress, Completed, Verified
    resolution_notes = Column(Text, nullable=True)
    audio_transcript = Column(Text, nullable=True)
    photo_url = Column(String(255), nullable=True)
    
    # Operational hierarchy (L1-L6)
    l1_milestone = Column(String(200))
    l2_unit = Column(String(200))
    l3_discipline = Column(String(200))
    l4_work_package = Column(String(200))
    l5_activity = Column(String(200))
    l6_job = Column(String(200))

    report = relationship("SafetyReport", back_populates="events")
    reviews = relationship("Review", back_populates="event")
    interventions = relationship("Intervention", back_populates="event")

class LifeSavingRule(Base):
    __tablename__ = "life_saving_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    total_reports = Column(Integer, default=0)
    sif_potential_reports = Column(Integer, default=0)
    precursor_density = Column(String(50), default="Low")  # High, Medium, Low
    common_barrier_failure = Column(String(200))
    top_sites = Column(String(200))  # Comma separated
    top_activities = Column(String(200))  # Comma separated

class PrecursorPattern(Base):
    __tablename__ = "precursor_patterns"
    
    id = Column(String(50), primary_key=True, index=True)  # PAT-01
    name = Column(String(200), nullable=False)
    occurrences = Column(Integer, default=0)
    sites = Column(Integer, default=0)  # Number of sites affected
    activities = Column(String(200))
    life_saving_rule = Column(String(100))
    trend = Column(String(50))  # e.g., "+18%", "-5%", "Stable"
    barrier_failure = Column(String(200))
    risk_level = Column(String(50), default="LOW")  # CRITICAL, HIGH, MEDIUM, LOW

class Review(Base):
    __tablename__ = "reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(50), ForeignKey("safety_events.id"))
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewer_name = Column(String(100))
    original_sif = Column(String(50))
    original_rule = Column(String(100))
    corrected_sif = Column(String(50))
    corrected_rule = Column(String(100))
    feedback_to_worker = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    event = relationship("SafetyEvent", back_populates="reviews")
    learning_events = relationship("LearningEvent", back_populates="review")

class LearningEvent(Base):
    __tablename__ = "learning_events"
    
    id = Column(Integer, primary_key=True, index=True)
    review_id = Column(Integer, ForeignKey("reviews.id"))
    event_id = Column(String(50))
    original_prediction = Column(String(200))
    reviewer_decision = Column(String(200))
    learning_signal = Column(String(200))
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    review = relationship("Review", back_populates="learning_events")

class AuditEvent(Base):
    __tablename__ = "audit_events"
    
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(50))
    action = Column(String(100), nullable=False) # AI Classified, Officer Verified, Stop Work Issued, Action Dispatched, Resolved
    details = Column(Text)
    user_email = Column(String(100))
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class Intervention(Base):
    __tablename__ = "interventions"
    
    id = Column(Integer, primary_key=True, index=True)
    action_id = Column(String(50), unique=True, index=True, nullable=True) # ACT-1001
    event_id = Column(String(50), ForeignKey("safety_events.id"))
    description = Column(Text, nullable=False)
    status = Column(String(50), default="In Progress")  # In Progress, Completed, Verified, Closed
    priority = Column(String(20), default="HIGH") # CRITICAL, HIGH, MEDIUM, LOW
    assigned_to = Column(String(100)) # Maintenance Team, Rig Safety Team, etc.
    due_date = Column(DateTime)
    action_taken = Column(Text, nullable=True)
    stop_work_required = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    event = relationship("SafetyEvent", back_populates="interventions")

