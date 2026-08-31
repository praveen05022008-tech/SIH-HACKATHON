from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import datetime

class UserBase(BaseModel):
    email: str
    name: str
    role: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    
    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: str
    password: str

class SafetyReportCreate(BaseModel):
    raw_text: str
    report_type: Optional[str] = "Unsafe Condition"  # Unsafe Act, Unsafe Condition, Near Miss
    hazard_category: Optional[str] = None
    shift_timing: Optional[str] = None
    location_detail: Optional[str] = None
    site: Optional[str] = "Drilling Site A"
    unit: Optional[str] = "Rig Floor 01"
    location: Optional[str] = "Substructure / BOP Area"
    equipment_involved: Optional[str] = "Top Drive / Derrick"
    people_involved: Optional[int] = 1
    energy_source: Optional[str] = "Mechanical / High Pressure"
    audio_transcript: Optional[str] = None
    photo_url: Optional[str] = None
    reporter_email: Optional[str] = "worker@refinery.safe"

class SafetyReportResponse(BaseModel):
    id: int
    report_code: Optional[str] = None
    report_type: Optional[str] = "Unsafe Condition"
    raw_text: str
    audio_transcript: Optional[str] = None
    photo_url: Optional[str] = None
    equipment_involved: Optional[str] = None
    people_involved: Optional[int] = 1
    reporter_email: Optional[str] = None
    timestamp: datetime.datetime
    status: str
    
    class Config:
        from_attributes = True

class SafetyEventResponse(BaseModel):
    id: str
    report_id: Optional[int] = None
    report_code: Optional[str] = None
    report_type: Optional[str] = "Unsafe Condition"
    reporter_email: Optional[str] = None
    hazard_category: Optional[str] = None
    shift_timing: Optional[str] = None
    location_detail: Optional[str] = None
    timestamp: datetime.datetime
    site: Optional[str] = None
    unit: Optional[str] = None
    location: Optional[str] = None
    activity: Optional[str] = None
    description: Optional[str] = None
    hazard: Optional[str] = None
    equipment_involved: Optional[str] = None
    people_involved: Optional[int] = 1
    energy_source: Optional[str] = None
    barrier: Optional[str] = None
    barrier_failure: Optional[str] = None
    exposure: Optional[str] = None
    consequence: Optional[str] = None
    
    # 0-10 Multi-Factor Risk Scoring Engine
    severity_score: Optional[float] = 5.0
    exposure_score: Optional[float] = 5.0
    barrier_score: Optional[float] = 5.0
    consequence_score: Optional[float] = 5.0
    sif_risk_score: Optional[float] = 5.0
    risk_level: Optional[str] = "MEDIUM"
    is_sif_precursor: Optional[str] = "NO"
    
    # Legacy compatibility
    sif_probability: Optional[float] = 50.0
    confidence: Optional[float] = 85.0
    life_saving_rule: Optional[str] = None
    status: str
    reviewer: Optional[str] = None
    evidence: Optional[str] = None
    explanation: Optional[str] = None
    recommended_action: Optional[str] = None
    
    # Officer Corrective Actions
    stop_work_issued: Optional[bool] = False
    assigned_team: Optional[str] = None
    action_id: Optional[str] = None
    action_status: Optional[str] = "Pending"
    resolution_notes: Optional[str] = None
    audio_transcript: Optional[str] = None
    photo_url: Optional[str] = None
    
    # Hierarchy
    l1_milestone: Optional[str] = None
    l2_unit: Optional[str] = None
    l3_discipline: Optional[str] = None
    l4_work_package: Optional[str] = None
    l5_activity: Optional[str] = None
    l6_job: Optional[str] = None
    
    class Config:
        from_attributes = True

class SafetyEventReview(BaseModel):
    sif_potential: str  # "SIF Potential" or "Non-SIF"
    life_saving_rule: str
    reviewer_name: str
    verification_action: Optional[str] = "correct" # "correct", "investigate", "incorrect"
    stop_work: Optional[bool] = False
    assigned_team: Optional[str] = "Maintenance Team"
    corrective_action_text: Optional[str] = None
    feedback_to_worker: Optional[str] = None

class ActionDispatchPayload(BaseModel):
    event_id: str
    action_description: str
    assigned_team: str
    priority: str = "HIGH" # CRITICAL, HIGH, MEDIUM, LOW
    stop_work: bool = False
    due_days: int = 3
    feedback: Optional[str] = None

class PrecursorPatternResponse(BaseModel):
    id: str
    name: str
    occurrences: int
    sites: int
    activities: Optional[str] = None
    life_saving_rule: Optional[str] = None
    trend: Optional[str] = None
    barrier_failure: Optional[str] = None
    risk_level: str
    
    class Config:
        from_attributes = True

class LearningEventResponse(BaseModel):
    id: int
    event_id: str
    original_prediction: str
    reviewer_decision: str
    learning_signal: str
    timestamp: datetime.datetime
    
    class Config:
        from_attributes = True

class AuditEventResponse(BaseModel):
    id: int
    event_id: str
    action: str
    details: Optional[str] = None
    user_email: Optional[str] = None
    timestamp: datetime.datetime
    
    class Config:
        from_attributes = True

class KPIStats(BaseModel):
    total_reports: int
    sif_potential: int
    critical_count: int = 0
    high_count: int = 0
    medium_count: int = 0
    low_count: int = 0
    high_priority: int
    open_interventions: int
    sif_prevention_rate: float = 94.2

class SitePrecursorDensity(BaseModel):
    site: str
    reports: int
    sif_percentage: float
    high_potential_count: int
    trend: str

class LifeSavingRuleStat(BaseModel):
    name: str
    reports_count: int
    sif_count: int
    precursor_density: str
    common_barrier_failure: str
    top_site: str

class DashboardResponse(BaseModel):
    kpis: KPIStats
    site_densities: List[SitePrecursorDensity]
    life_saving_rules: List[LifeSavingRuleStat]
    recent_events: List[SafetyEventResponse]

