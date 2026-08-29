from pydantic import BaseModel, Field
from typing import Optional, List, Dict
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

class SafetyReportResponse(BaseModel):
    id: int
    raw_text: str
    timestamp: datetime.datetime
    status: str
    
    class Config:
        from_attributes = True

class SafetyEventResponse(BaseModel):
    id: str
    report_id: Optional[int] = None
    timestamp: datetime.datetime
    site: Optional[str] = None
    unit: Optional[str] = None
    location: Optional[str] = None
    activity: Optional[str] = None
    description: Optional[str] = None
    hazard: Optional[str] = None
    energy_source: Optional[str] = None
    barrier: Optional[str] = None
    barrier_failure: Optional[str] = None
    exposure: Optional[str] = None
    consequence: Optional[str] = None
    sif_probability: float
    confidence: float
    life_saving_rule: Optional[str] = None
    status: str
    reviewer: Optional[str] = None
    evidence: Optional[str] = None
    
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
    high_priority: int
    open_interventions: int

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
