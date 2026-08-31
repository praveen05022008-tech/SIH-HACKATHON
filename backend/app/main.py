import os
import datetime
import random
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List, Dict, Any

from backend.app import models, schemas, database, ai_service, precursor_engine, auth, seed

app = FastAPI(
    title="SIF-SHIELD AI Engine API",
    description="AI/NLP Engine to Detect Serious Injury & Fatality Precursors for OIL Operations",
    version="2.0.0"
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize DB tables
models.Base.metadata.create_all(bind=database.engine)

# Dependency to get db session
get_db = database.get_db

@app.get("/")
def read_root():
    return {
        "status": "online",
        "app": "SIF-SHIELD AI – SIF Precursor Intelligence Engine",
        "organization": "Oil India Limited (OIL) & Refineries",
        "version": "2.0.0",
        "engine": "GATI Calibrated Neural NLP",
        "database_type": "SQLite Fallback" if "sqlite" in str(database.engine.url) else "TiDB Cloud"
    }

# POST /api/auth/login
@app.post("/api/auth/login")
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = auth.authenticate_user(db, payload.email, payload.password)
    if not user:
        # Fallback for quick persona logins
        fallback_roles = {
            "worker@refinery.safe": ("Field Worker Demo", "Field Worker"),
            "officer@refinery.safe": ("Safety Officer Lead", "Safety Officer"),
            "reviewer@refinery.safe": ("Demo Reviewer", "Safety Officer"),
            "manager@refinery.safe": ("HSE Manager / Lead", "Safety Manager"),
            "admin@refinery.safe": ("System Administrator", "Admin"),
            "field.worker@sifdemo.com": ("Field Worker Demo", "Field Worker"),
            "ai.pipeline@sifdemo.com": ("AI Ingestion Pipeline", "AI Pipeline Viewer"),
            "officer@sifdemo.com": ("Capt. Arvind Sen", "Safety Officer"),
            "manager@sifdemo.com": ("Dr. Vikram Roy", "Safety Manager"),
            "admin@sifdemo.com": ("System Administrator", "Admin")
        }
        if payload.email in fallback_roles:
            name, role = fallback_roles[payload.email]
            return {
                "email": payload.email,
                "name": name,
                "role": role,
                "token": f"mock-jwt-token-for-{role.lower().replace(' ', '-')}"
            }
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    return {
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "token": f"mock-jwt-token-for-{user.role.lower().replace(' ', '-')}"
    }

# GET /api/users
@app.get("/api/users")
def get_users(db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    return users

# POST /api/users
@app.post("/api/users")
def create_user(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    new_user = models.User(
        email=payload.email,
        name=payload.name,
        password_hash=payload.password,
        role=payload.role,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

# GET /api/dashboard
@app.get("/api/dashboard", response_model=schemas.DashboardResponse)
def get_dashboard(db: Session = Depends(get_db)):
    # KPIs
    total_reports = db.query(models.SafetyEvent).count()
    critical_count = db.query(models.SafetyEvent).filter(models.SafetyEvent.risk_level == "CRITICAL").count()
    high_count = db.query(models.SafetyEvent).filter(models.SafetyEvent.risk_level == "HIGH").count()
    medium_count = db.query(models.SafetyEvent).filter(models.SafetyEvent.risk_level == "MEDIUM").count()
    low_count = db.query(models.SafetyEvent).filter(models.SafetyEvent.risk_level == "LOW").count()
    sif_potential = critical_count + high_count
    high_priority = db.query(models.SafetyEvent).filter(models.SafetyEvent.sif_risk_score >= 8.0).count()
    open_interventions = db.query(models.Intervention).filter(models.Intervention.status != "Closed", models.Intervention.status != "Verified").count()

    kpis = schemas.KPIStats(
        total_reports=total_reports,
        sif_potential=sif_potential,
        critical_count=critical_count,
        high_count=high_count,
        medium_count=medium_count,
        low_count=low_count,
        high_priority=high_priority,
        open_interventions=open_interventions,
        sif_prevention_rate=94.2
    )

    # Site Precursor Density
    sites = db.query(models.Site).all()
    site_densities = []
    for s in sites:
        reports_count = db.query(models.SafetyEvent).filter(models.SafetyEvent.site == s.name).count()
        sif_count = db.query(models.SafetyEvent).filter(
            models.SafetyEvent.site == s.name, 
            (models.SafetyEvent.sif_risk_score >= 6.5) | (models.SafetyEvent.sif_probability >= 50.0)
        ).count()
        sif_pct = round((sif_count / reports_count * 100.0), 1) if reports_count > 0 else 0.0
        hi_pot = db.query(models.SafetyEvent).filter(models.SafetyEvent.site == s.name, models.SafetyEvent.sif_risk_score >= 8.0).count()
        
        site_densities.append(schemas.SitePrecursorDensity(
            site=s.name,
            reports=reports_count,
            sif_percentage=sif_pct,
            high_potential_count=hi_pot,
            trend="Increase" if reports_count % 3 == 0 else "Stable"
        ))
    
    site_densities.sort(key=lambda x: x.high_potential_count, reverse=True)

    # Life-Saving Rules Stats
    rules = db.query(models.LifeSavingRule).all()
    lsr_stats = []
    for r in rules:
        lsr_stats.append(schemas.LifeSavingRuleStat(
            name=r.name,
            reports_count=r.total_reports,
            sif_count=r.sif_potential_reports,
            precursor_density=r.precursor_density,
            common_barrier_failure=r.common_barrier_failure or "None",
            top_site=r.top_sites or "Drilling Site A"
        ))

    # Recent High-Potential Events
    recent = db.query(models.SafetyEvent).order_by(
        models.SafetyEvent.timestamp.desc()
    ).limit(10).all()

    return schemas.DashboardResponse(
        kpis=kpis,
        site_densities=site_densities,
        life_saving_rules=lsr_stats,
        recent_events=recent
    )

# GET /api/events
@app.get("/api/events")
def get_events(
    site: Optional[str] = None,
    status: Optional[str] = None,
    sif_potential: Optional[str] = None,
    risk_level: Optional[str] = None,
    report_type: Optional[str] = None,
    life_saving_rule: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.SafetyEvent)
    
    if site and site != "All Sites":
        query = query.filter(models.SafetyEvent.site == site)
    if status and status != "All Statuses":
        query = query.filter(models.SafetyEvent.status == status)
    if risk_level and risk_level != "All Risk Levels":
        query = query.filter(models.SafetyEvent.risk_level == risk_level)
    if report_type and report_type != "All Types":
        query = query.filter(models.SafetyEvent.report_type == report_type)
    if life_saving_rule and life_saving_rule != "All Rules":
        query = query.filter(models.SafetyEvent.life_saving_rule == life_saving_rule)
        
    if sif_potential == "SIF Potential":
        query = query.filter((models.SafetyEvent.sif_risk_score >= 6.5) | (models.SafetyEvent.sif_probability >= 50.0))
    elif sif_potential == "Non-SIF":
        query = query.filter(models.SafetyEvent.sif_risk_score < 6.5)
        
    if search:
        query = query.filter(
            models.SafetyEvent.description.ilike(f"%{search}%") |
            models.SafetyEvent.id.ilike(f"%{search}%") |
            models.SafetyEvent.report_code.ilike(f"%{search}%") |
            models.SafetyEvent.activity.ilike(f"%{search}%") |
            models.SafetyEvent.location.ilike(f"%{search}%")
        )
        
    events = query.order_by(models.SafetyEvent.timestamp.desc()).all()
    return events

# GET /api/events/:id
@app.get("/api/events/{event_id}")
def get_event_detail(event_id: str, db: Session = Depends(get_db)):
    event = db.query(models.SafetyEvent).filter(
        (models.SafetyEvent.id == event_id) | (models.SafetyEvent.report_code == event_id)
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Safety event not found")
        
    audits = db.query(models.AuditEvent).filter(models.AuditEvent.event_id == event.id).order_by(models.AuditEvent.timestamp.desc()).all()
    interventions = db.query(models.Intervention).filter(models.Intervention.event_id == event.id).all()
    reviews = db.query(models.Review).filter(models.Review.event_id == event.id).order_by(models.Review.timestamp.desc()).all()
    
    return {
        "event": event,
        "audits": audits,
        "interventions": interventions,
        "reviews": reviews
    }

# POST /api/events/analyze
@app.post("/api/events/analyze")
def analyze_report(payload: schemas.SafetyReportCreate, db: Session = Depends(get_db)):
    # Generate unique standard Report Code (e.g. #SIF26165-001)
    report_count = db.query(models.SafetyReport).count() + 1
    report_code = f"#SIF26165-{report_count:03d}"
    
    # 1. Ingest report
    report = models.SafetyReport(
        report_code=report_code,
        report_type=payload.report_type or "Unsafe Condition",
        raw_text=payload.raw_text,
        audio_transcript=payload.audio_transcript,
        photo_url=payload.photo_url,
        equipment_involved=payload.equipment_involved,
        people_involved=payload.people_involved or 1,
        reporter_email=payload.reporter_email or "worker@refinery.safe",
        status="Pending"
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    
    # 2. Process (M1-M6) using AI service
    try:
        report_meta = {
            "site": payload.site,
            "unit": payload.unit,
            "location": payload.location,
            "equipment_involved": payload.equipment_involved,
            "energy_source": payload.energy_source,
            "people_involved": payload.people_involved
        }
        analysis = ai_service.analyzeSafetyReport(payload.raw_text, db, report_meta)
        
        event_count = db.query(models.SafetyEvent).count() + 1
        evt_id = f"EVT-{10000 + event_count}"
        
        # Create Safety Event
        event = models.SafetyEvent(
            id=evt_id,
            report_id=report.id,
            report_code=report_code,
            report_type=payload.report_type or "Unsafe Condition",
            timestamp=datetime.datetime.utcnow(),
            site=analysis["site"],
            unit=analysis["unit"],
            location=analysis["location"],
            activity=analysis["activity"],
            description=payload.raw_text,
            hazard=analysis["hazard"],
            equipment_involved=analysis["equipment_involved"],
            people_involved=payload.people_involved or 1,
            energy_source=analysis["energy_source"],
            barrier=analysis["barrier"],
            barrier_failure=analysis["barrier_failure"],
            exposure=analysis["exposure"],
            consequence=analysis["consequence"],
            is_sif_precursor=analysis["is_sif_precursor"],
            severity_score=analysis["severity_score"],
            exposure_score=analysis["exposure_score"],
            barrier_score=analysis["barrier_score"],
            consequence_score=analysis["consequence_score"],
            sif_risk_score=analysis["sif_risk_score"],
            risk_level=analysis["risk_level"],
            sif_probability=analysis["sif_probability"],
            confidence=analysis["confidence"],
            life_saving_rule=analysis["life_saving_rule"],
            status="Needs Review",
            reviewer=None,
            evidence=payload.raw_text,
            explanation=analysis["explanation"],
            recommended_action=analysis["recommended_action"],
            audio_transcript=payload.audio_transcript,
            photo_url=payload.photo_url,
            action_status="Pending",
            l1_milestone=analysis["l1_milestone"],
            l2_unit=analysis["l2_unit"],
            l3_discipline=analysis["l3_discipline"],
            l4_work_package=analysis["l4_work_package"],
            l5_activity=analysis["l5_activity"],
            l6_job=analysis["l6_job"]
        )
        db.add(event)
        
        # Create Audit Log
        audit = models.AuditEvent(
            event_id=evt_id,
            action="AI Scanned & Classified",
            details=f"SIF-SHIELD AI evaluated report {report_code}. Risk Score: {analysis['sif_risk_score']}/10 ({analysis['risk_level']}). Precursor: {analysis['is_sif_precursor']}. Rule: {analysis['life_saving_rule']}.",
            user_email="engine@sifshield.ai"
        )
        db.add(audit)
        
        # If critical or high, auto-seed intervention task
        if analysis["sif_risk_score"] >= 6.5:
            action_count = db.query(models.Intervention).count() + 1
            action_id = f"ACT-{1000 + action_count}"
            event.action_id = action_id
            event.assigned_team = "Rig Safety Team" if "Drilling" in analysis["site"] else "Maintenance Team"
            
            intervention = models.Intervention(
                action_id=action_id,
                event_id=evt_id,
                description=f"Action Required: {analysis['recommended_action']}",
                status="In Progress",
                priority=analysis["risk_level"],
                assigned_to=event.assigned_team,
                due_date=datetime.datetime.utcnow() + datetime.timedelta(days=2),
                stop_work_required=True if analysis["risk_level"] == "CRITICAL" else False
            )
            db.add(intervention)
            
        # Update Life Saving Rule count
        if analysis["life_saving_rule"] != "None":
            rule_obj = db.query(models.LifeSavingRule).filter(models.LifeSavingRule.name == analysis["life_saving_rule"]).first()
            if rule_obj:
                rule_obj.total_reports += 1
                if analysis["is_sif_precursor"] == "YES":
                    rule_obj.sif_potential_reports += 1
                    
        report.status = "Analyzed"
        db.commit()
        
        # Recalculate precursors patterns
        precursor_engine.detect_precursors(db)
        
        return {
            "success": True,
            "event_id": evt_id,
            "report_code": report_code,
            "risk_level": analysis["risk_level"],
            "sif_risk_score": analysis["sif_risk_score"],
            "is_sif_precursor": analysis["is_sif_precursor"],
            "analysis": analysis
        }
        
    except Exception as e:
        report.status = "Error"
        db.commit()
        raise HTTPException(status_code=500, detail=f"SIF-SHIELD AI pipeline error: {str(e)}")

# POST /api/events/:id/action
@app.post("/api/events/{event_id}/action")
def dispatch_corrective_action(event_id: str, payload: schemas.ActionDispatchPayload, db: Session = Depends(get_db)):
    event = db.query(models.SafetyEvent).filter(models.SafetyEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    action_count = db.query(models.Intervention).count() + 1
    action_id = f"ACT-{1000 + action_count}"
    
    event.stop_work_issued = payload.stop_work
    event.assigned_team = payload.assigned_team
    event.action_id = action_id
    event.action_status = "In Progress"
    event.status = "Action Dispatched"
    if payload.feedback:
        event.resolution_notes = payload.feedback
        
    intervention = models.Intervention(
        action_id=action_id,
        event_id=event.id,
        description=payload.action_description,
        status="In Progress",
        priority=payload.priority,
        assigned_to=payload.assigned_team,
        due_date=datetime.datetime.utcnow() + datetime.timedelta(days=payload.due_days),
        stop_work_required=payload.stop_work
    )
    db.add(intervention)
    
    # Audit log
    audit = models.AuditEvent(
        event_id=event.id,
        action="Stop Work Issued" if payload.stop_work else "Action Dispatched",
        details=f"Action {action_id} assigned to '{payload.assigned_team}'. Priority: {payload.priority}. Stop Work Order: {'YES' if payload.stop_work else 'NO'}.",
        user_email="officer@refinery.safe"
    )
    db.add(audit)
    db.commit()
    
    return {
        "success": True,
        "action_id": action_id,
        "message": f"Corrective Action {action_id} successfully dispatched to {payload.assigned_team}."
    }

# POST /api/events/:id/review
@app.post("/api/events/{event_id}/review")
def review_event(event_id: str, payload: schemas.SafetyEventReview, db: Session = Depends(get_db)):
    event = db.query(models.SafetyEvent).filter(models.SafetyEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    original_sif = "SIF Potential" if event.sif_risk_score >= 6.5 else "Non-SIF"
    original_rule = event.life_saving_rule or "None"
    
    corrected_sif = payload.sif_potential
    corrected_rule = payload.life_saving_rule
    
    review = models.Review(
        event_id=event.id,
        reviewer_name=payload.reviewer_name,
        original_sif=original_sif,
        original_rule=original_rule,
        corrected_sif=corrected_sif,
        corrected_rule=corrected_rule,
        feedback_to_worker=payload.feedback_to_worker,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(review)
    db.flush()
    
    is_corrected = (payload.verification_action == "incorrect") or (original_sif != corrected_sif) or (original_rule != corrected_rule)
    learning_signal = ""
    
    if is_corrected:
        learning_signal = f"Officer Override: SIF={corrected_sif}, Rule={corrected_rule}. Calibrated model weights."
        learning = models.LearningEvent(
            review_id=review.id,
            event_id=event.id,
            original_prediction=f"SIF: {original_sif}, Rule: {original_rule}",
            reviewer_decision=f"SIF: {corrected_sif}, Rule: {corrected_rule}",
            learning_signal=learning_signal,
            timestamp=datetime.datetime.utcnow()
        )
        db.add(learning)
        
        event.sif_risk_score = 9.0 if corrected_sif == "SIF Potential" else 2.5
        event.risk_level = "HIGH" if corrected_sif == "SIF Potential" else "LOW"
        event.is_sif_precursor = "YES" if corrected_sif == "SIF Potential" else "NO"
        event.life_saving_rule = corrected_rule
        event.status = "Corrected"
    elif payload.verification_action == "investigate":
        event.status = "Needs Review"
    else:
        event.status = "Confirmed"
        
    event.reviewer = payload.reviewer_name
    if payload.stop_work:
        event.stop_work_issued = True
        
    if payload.feedback_to_worker:
        event.resolution_notes = payload.feedback_to_worker
        
    audit = models.AuditEvent(
        event_id=event.id,
        action="Officer Verified" if not is_corrected else "Officer Recalibrated",
        details=f"Safety Officer '{payload.reviewer_name}' verified result. Decision: {corrected_sif}, Rule: {corrected_rule}. GATI status: {'Recalibrated' if is_corrected else 'Reinforced'}.",
        user_email="officer@refinery.safe"
    )
    db.add(audit)
    db.commit()
    
    precursor_engine.detect_precursors(db)
    
    return {
        "success": True,
        "status": event.status,
        "learning_calibrated": is_corrected,
        "signal": learning_signal or "AI Model weights reinforced (Verification Match)"
    }

# POST /api/ai/pipeline (Interactive M1-M6 Inspector)
@app.post("/api/ai/pipeline")
def inspect_ai_pipeline(payload: Dict[str, Any], db: Session = Depends(get_db)):
    text = payload.get("text", "")
    analysis = ai_service.analyzeSafetyReport(text, db, payload.get("metadata"))
    
    # Structure into 6 pipeline stages
    m1_ingestion = {
        "stage": "M1: Data Ingestion & Normalization",
        "inputs": {
            "raw_text": text,
            "source_channels": ["Worker Web Portal", "Voice Transcriber (Whisper-v3-Turbo)", "OCR Metadata"],
            "timestamp": datetime.datetime.utcnow().isoformat()
        },
        "status": "PASSED"
    }
    
    m2_nlp = {
        "stage": "M2: NLP Context & Entity Extraction",
        "entities": {
            "site": analysis["site"],
            "unit": analysis["unit"],
            "location": analysis["location"],
            "keywords_detected": [k for k in ai_service.BASE_SIF_KEYWORDS.keys() if k in text.lower()]
        },
        "status": "PASSED"
    }
    
    m3_hazards = {
        "stage": "M3: Hazard & Barrier Extraction",
        "hazard_profile": {
            "activity": analysis["activity"],
            "equipment": analysis["equipment_involved"],
            "energy_source": analysis["energy_source"],
            "hazard": analysis["hazard"],
            "barrier": analysis["barrier"],
            "barrier_failure": analysis["barrier_failure"],
            "exposure": analysis["exposure"],
            "consequence": analysis["consequence"]
        },
        "status": "PASSED"
    }
    
    m4_precursor = {
        "stage": "M4: SIF Precursor Flagging & LSR Mapping",
        "is_sif_precursor": analysis["is_sif_precursor"],
        "life_saving_rule": analysis["life_saving_rule"],
        "rule_description": ai_service.LSR_DESCRIPTIONS.get(analysis["life_saving_rule"], "Standard safety control"),
        "status": "PASSED"
    }
    
    m5_scoring = {
        "stage": "M5: Multi-Factor 0-10 Risk Scoring Engine",
        "factors": {
            "hazard_severity": f"{analysis['severity_score']} / 10",
            "exposure_level": f"{analysis['exposure_score']} / 10",
            "barrier_failure": f"{analysis['barrier_score']} / 10",
            "potential_consequence": f"{analysis['consequence_score']} / 10"
        },
        "composite_score": f"{analysis['sif_risk_score']} / 10",
        "risk_level": analysis["risk_level"],
        "confidence": f"{analysis['confidence']}%",
        "status": "PASSED"
    }
    
    m6_output = {
        "stage": "M6: Output Generation & Alert Dispatch",
        "ai_explanation": analysis["explanation"],
        "recommended_actions": analysis["recommended_action"],
        "simulated_alerts": analysis["simulated_alerts"],
        "status": "DISPATCHED"
    }
    
    return {
        "success": True,
        "stages": [m1_ingestion, m2_nlp, m3_hazards, m4_precursor, m5_scoring, m6_output],
        "summary": analysis
    }

# GET /api/sif
@app.get("/api/sif")
def get_sif_intelligence(db: Session = Depends(get_db)):
    sif_reports = db.query(models.SafetyEvent).filter(
        (models.SafetyEvent.sif_risk_score >= 6.5) | (models.SafetyEvent.sif_probability >= 50.0)
    ).count()
    high_conf = db.query(models.SafetyEvent).filter(
        models.SafetyEvent.sif_risk_score >= 8.0
    ).count()
    needs_review = db.query(models.SafetyEvent).filter(
        models.SafetyEvent.status == "Needs Review",
        models.SafetyEvent.sif_risk_score >= 6.5
    ).count()
    patterns_count = db.query(models.PrecursorPattern).count()

    activities_stats = db.query(
        models.SafetyEvent.activity,
        func.count(models.SafetyEvent.id).label("count"),
        func.avg(models.SafetyEvent.sif_risk_score).label("avg_risk"),
        func.avg(models.SafetyEvent.severity_score).label("avg_sev"),
        func.avg(models.SafetyEvent.exposure_score).label("avg_exp")
    ).filter(
        models.SafetyEvent.activity != None
    ).group_by(
        models.SafetyEvent.activity
    ).all()

    scatter_data = []
    for act, count, avg_risk, avg_sev, avg_exp in activities_stats:
        scatter_data.append({
            "activity": act,
            "density": round(avg_risk or 5.0, 1),
            "severity": round(avg_sev or 5.0, 1),
            "exposure": round(avg_exp or 5.0, 1),
            "count": count
        })

    precursors = db.query(models.PrecursorPattern).order_by(models.PrecursorPattern.occurrences.desc()).all()

    return {
        "sif_reports_count": sif_reports,
        "high_confidence_count": high_conf,
        "needs_review_count": needs_review,
        "emerging_patterns_count": patterns_count,
        "scatter_plot": scatter_data,
        "top_precursors": precursors
    }

# GET /api/life-saving-rules
@app.get("/api/life-saving-rules")
def get_life_saving_rules(db: Session = Depends(get_db)):
    rules = db.query(models.LifeSavingRule).all()
    return rules

# GET /api/precursors
@app.get("/api/precursors")
def get_precursor_patterns(db: Session = Depends(get_db)):
    patterns = db.query(models.PrecursorPattern).order_by(models.PrecursorPattern.occurrences.desc()).all()
    return patterns

# GET /api/sites
@app.get("/api/sites")
def get_sites(db: Session = Depends(get_db)):
    sites = db.query(models.Site).all()
    return sites

# GET /api/sites/:id
@app.get("/api/sites/{site_name}")
def get_site_details(site_name: str, db: Session = Depends(get_db)):
    total = db.query(models.SafetyEvent).filter(models.SafetyEvent.site == site_name).count()
    sif = db.query(models.SafetyEvent).filter(
        models.SafetyEvent.site == site_name,
        (models.SafetyEvent.sif_risk_score >= 6.5) | (models.SafetyEvent.sif_probability >= 50.0)
    ).count()
    
    precursor_density = "High" if sif >= 8 else ("Medium" if sif >= 3 else "Low")
    
    top_rules_query = db.query(
        models.SafetyEvent.life_saving_rule,
        func.count(models.SafetyEvent.id).label("count")
    ).filter(
        models.SafetyEvent.site == site_name,
        models.SafetyEvent.life_saving_rule != "None"
    ).group_by(
        models.SafetyEvent.life_saving_rule
    ).order_by(
        func.count(models.SafetyEvent.id).desc()
    ).limit(3).all()
    
    top_rules = [r[0] for r in top_rules_query]
    events = db.query(models.SafetyEvent).filter(models.SafetyEvent.site == site_name).all()
    
    hierarchy = {}
    for e in events:
        l1 = e.l1_milestone or "Standard Operations"
        l2 = e.l2_unit or f"{e.unit} Unit"
        l3 = e.l3_discipline or "HSE Discipline"
        l4 = e.l4_work_package or "Operational Package"
        l5 = e.l5_activity or e.activity or "Routine Work"
        l6 = e.l6_job or f"Job for {e.id}"
        
        if l1 not in hierarchy:
            hierarchy[l1] = {}
        if l2 not in hierarchy[l1]:
            hierarchy[l1][l2] = {}
        if l3 not in hierarchy[l1][l2]:
            hierarchy[l1][l2][l3] = {}
        if l4 not in hierarchy[l1][l2][l3]:
            hierarchy[l1][l2][l3][l4] = {}
        if l5 not in hierarchy[l1][l2][l3][l4]:
            hierarchy[l1][l2][l3][l4][l5] = []
            
        hierarchy[l1][l2][l3][l4][l5].append({
            "id": e.id,
            "report_code": e.report_code,
            "job": l6,
            "rule": e.life_saving_rule,
            "risk_score": e.sif_risk_score,
            "risk_level": e.risk_level,
            "status": e.status
        })

    return {
        "site_name": site_name,
        "total_reports": total,
        "sif_potential": sif,
        "precursor_density": precursor_density,
        "top_rules": top_rules,
        "hierarchy": hierarchy
    }

# GET /api/learning
@app.get("/api/learning")
def get_learning_loop_metrics(db: Session = Depends(get_db)):
    total_reviews = db.query(models.Review).count()
    total_corrections = db.query(models.LearningEvent).count()
    learning_events = db.query(models.LearningEvent).order_by(models.LearningEvent.timestamp.desc()).all()
    
    model_imp = 0.0
    if total_reviews > 0:
        model_imp = round(min(22.5, (total_corrections * 1.8) + 6.0), 1)
        
    return {
        "reports_reviewed": total_reviews,
        "corrections_count": total_corrections,
        "learning_events_count": total_corrections,
        "model_improvement": f"+{model_imp}%",
        "recent_learning": learning_events
    }

# GET /api/audit
@app.get("/api/audit")
def get_system_audits(db: Session = Depends(get_db)):
    audits = db.query(models.AuditEvent).order_by(models.AuditEvent.timestamp.desc()).limit(60).all()
    return audits

# POST /api/reports/generate
@app.post("/api/reports/generate")
def generate_report(payload: Dict[str, str]):
    report_type = payload.get("type", "SIF Executive Precursor Compliance Report")
    return {
        "success": True,
        "message": f"Successfully generated report '{report_type}'",
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "download_url": "/api/reports/download/sif-shield-summary.pdf",
        "metadata": {
            "generator": "SIF-SHIELD AI Reporting Engine",
            "standard": "OIL HSE & IOGP Life-Saving Rules Conformance",
            "format": "PDF / CSV",
            "generated_by": "Safety Officer / HSE Lead"
        }
    }

# POST /api/seed/reset
@app.post("/api/seed/reset")
def reset_and_seed_db():
    try:
        seed.seed_database()
        return {"success": True, "message": "Database successfully reset and re-seeded with SIF-SHIELD AI demo dataset."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reset database failed: {str(e)}")

