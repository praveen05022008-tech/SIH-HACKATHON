import os
import datetime
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any

from backend.app import models, schemas, database, ai_service, precursor_engine, auth, seed

app = FastAPI(
    title="MAYAN-SAFE API",
    description="AI-Powered SIF Precursor Intelligence Platform Backend",
    version="1.0.0"
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize DB tables (SQLite automatically creates on start if not exists)
models.Base.metadata.create_all(bind=database.engine)

# Dependency to get db session
get_db = database.get_db

@app.get("/")
def read_root():
    return {
        "status": "online",
        "app": "MAYAN-SAFE AI-Powered SIF Precursor Platform",
        "engine": "GATI Core Engine",
        "database_type": "SQLite Fallback" if "sqlite" in str(database.engine.url) else "TiDB Cloud"
    }

# POST /api/auth/login
@app.post("/api/auth/login")
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = auth.authenticate_user(db, payload.email, payload.password)
    if not user:
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

# GET /api/dashboard
@app.get("/api/dashboard", response_model=schemas.DashboardResponse)
def get_dashboard(db: Session = Depends(get_db)):
    # KPIs
    total_reports = db.query(models.SafetyReport).count()
    sif_potential = db.query(models.SafetyEvent).filter(models.SafetyEvent.sif_probability >= 50.0).count()
    high_priority = db.query(models.SafetyEvent).filter(models.SafetyEvent.sif_probability >= 80.0, models.SafetyEvent.confidence >= 80.0).count()
    open_interventions = db.query(models.Intervention).filter(models.Intervention.status == "Open").count()

    kpis = schemas.KPIStats(
        total_reports=total_reports,
        sif_potential=sif_potential,
        high_priority=high_priority,
        open_interventions=open_interventions
    )

    # Site Precursor Density
    sites = db.query(models.Site).all()
    site_densities = []
    for s in sites:
        reports_count = db.query(models.SafetyEvent).filter(models.SafetyEvent.site == s.name).count()
        sif_count = db.query(models.SafetyEvent).filter(models.SafetyEvent.site == s.name, models.SafetyEvent.sif_probability >= 50.0).count()
        sif_pct = round((sif_count / reports_count * 100.0), 1) if reports_count > 0 else 0.0
        
        # High potential count (sif prob >= 75%)
        hi_pot = db.query(models.SafetyEvent).filter(models.SafetyEvent.site == s.name, models.SafetyEvent.sif_probability >= 75.0).count()
        
        site_densities.append(schemas.SitePrecursorDensity(
            site=s.name,
            reports=reports_count,
            sif_percentage=sif_pct,
            high_potential_count=hi_pot,
            trend="Increase" if reports_count % 3 == 0 else "Stable"
        ))
    
    # Sort site densities by reports desc or SIF% desc
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
            top_site=r.top_sites or "Refinery A"
        ))

    # Recent High-Potential Events
    recent = db.query(models.SafetyEvent).filter(
        models.SafetyEvent.sif_probability >= 50.0
    ).order_by(
        models.SafetyEvent.timestamp.desc()
    ).limit(8).all()

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
    life_saving_rule: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.SafetyEvent)
    
    if site and site != "All Sites":
        query = query.filter(models.SafetyEvent.site == site)
    if status and status != "All Statuses":
        query = query.filter(models.SafetyEvent.status == status)
    if life_saving_rule and life_saving_rule != "All Rules":
        query = query.filter(models.SafetyEvent.life_saving_rule == life_saving_rule)
        
    if sif_potential == "SIF Potential":
        query = query.filter(models.SafetyEvent.sif_probability >= 50.0)
    elif sif_potential == "Non-SIF":
        query = query.filter(models.SafetyEvent.sif_probability < 50.0)
        
    if search:
        query = query.filter(
            models.SafetyEvent.description.ilike(f"%{search}%") |
            models.SafetyEvent.id.ilike(f"%{search}%") |
            models.SafetyEvent.activity.ilike(f"%{search}%")
        )
        
    events = query.order_by(models.SafetyEvent.timestamp.desc()).all()
    return events

# GET /api/events/:id
@app.get("/api/events/{event_id}")
def get_event_detail(event_id: str, db: Session = Depends(get_db)):
    event = db.query(models.SafetyEvent).filter(models.SafetyEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Safety event not found")
        
    audits = db.query(models.AuditEvent).filter(models.AuditEvent.event_id == event_id).order_by(models.AuditEvent.timestamp.desc()).all()
    interventions = db.query(models.Intervention).filter(models.Intervention.event_id == event_id).all()
    
    return {
        "event": event,
        "audits": audits,
        "interventions": interventions
    }

# POST /api/events/analyze
@app.post("/api/events/analyze")
def analyze_report(payload: schemas.SafetyReportCreate, db: Session = Depends(get_db)):
    # 1. Ingest report
    report = models.SafetyReport(
        raw_text=payload.raw_text,
        status="Pending"
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    
    # 2. Process (M1-M6) using AI service (incorporating GATI feedback weights)
    try:
        analysis = ai_service.analyzeSafetyReport(payload.raw_text, db)
        
        # Calculate event ID
        event_count = db.query(models.SafetyEvent).count()
        evt_id = f"EVT-{10001 + event_count}"
        
        # Create Safety Event
        event = models.SafetyEvent(
            id=evt_id,
            report_id=report.id,
            timestamp=datetime.datetime.utcnow(),
            site=analysis["site"],
            unit=analysis["unit"],
            location=analysis["location"],
            activity=analysis["activity"],
            description=payload.raw_text,
            hazard=analysis["hazard"],
            energy_source=analysis["energy_source"],
            barrier=analysis["barrier"],
            barrier_failure=analysis["barrier_failure"],
            exposure=analysis["exposure"],
            consequence=analysis["consequence"],
            sif_probability=analysis["sif_probability"],
            confidence=analysis["confidence"],
            life_saving_rule=analysis["life_saving_rule"],
            status="Needs Review", # New incoming analyses default to review needed
            reviewer=None,
            evidence=payload.raw_text,
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
            action="AI Classified",
            details=f"System automatically parsed safety report. predicted SIF probability: {analysis['sif_probability']}%, mapped to Life-Saving Rule: {analysis['life_saving_rule']}.",
            user_email="system@gati.engine"
        )
        db.add(audit)
        
        # Trigger Intervention if SIF probability is high
        if analysis["sif_probability"] >= 75.0:
            intervention = models.Intervention(
                event_id=evt_id,
                description=f"Action: {analysis['recommended_action']}",
                status="Open",
                assigned_to="HSE Supervisor",
                due_date=datetime.datetime.utcnow() + datetime.timedelta(days=3)
            )
            db.add(intervention)
            
        # Update Life Saving Rule count
        if analysis["life_saving_rule"] != "None":
            rule_obj = db.query(models.LifeSavingRule).filter(models.LifeSavingRule.name == analysis["life_saving_rule"]).first()
            if rule_obj:
                rule_obj.total_reports += 1
                if analysis["sif_probability"] >= 50.0:
                    rule_obj.sif_potential_reports += 1
                    
        report.status = "Analyzed"
        db.commit()
        
        # Recalculate precursors patterns
        precursor_engine.detect_precursors(db)
        
        return {
            "success": True,
            "event_id": evt_id,
            "analysis": analysis
        }
        
    except Exception as e:
        report.status = "Error"
        db.commit()
        raise HTTPException(status_code=500, detail=f"AI pipeline failure: {str(e)}")

# POST /api/events/:id/review
@app.post("/api/events/{event_id}/review")
def review_event(event_id: str, payload: schemas.SafetyEventReview, db: Session = Depends(get_db)):
    event = db.query(models.SafetyEvent).filter(models.SafetyEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    # Calculate original state strings for audit/learning logs
    original_sif = "SIF Potential" if event.sif_probability >= 50.0 else "Non-SIF"
    original_rule = event.life_saving_rule
    
    # Reviewer's inputs
    corrected_sif = payload.sif_potential
    corrected_rule = payload.life_saving_rule
    
    # 1. Write Review record
    review = models.Review(
        event_id=event.id,
        reviewer_name=payload.reviewer_name,
        original_sif=original_sif,
        original_rule=original_rule,
        corrected_sif=corrected_sif,
        corrected_rule=corrected_rule,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(review)
    db.flush() # obtain review.id
    
    # Determine if a learning calibration is triggered
    learning_signal = ""
    is_corrected = False
    
    if original_sif != corrected_sif:
        learning_signal += f"SIF correction: {original_sif} -> {corrected_sif}"
        is_corrected = True
    if original_rule != corrected_rule:
        if learning_signal:
            learning_signal += " | "
        learning_signal += f"LSR correction: {original_rule} -> {corrected_rule}"
        is_corrected = True
        
    if is_corrected:
        # 2. Write LearningEvent (GATI Engine Learning Loop)
        learning = models.LearningEvent(
            review_id=review.id,
            event_id=event.id,
            original_prediction=f"SIF: {original_sif}, Rule: {original_rule}",
            reviewer_decision=f"SIF: {corrected_sif}, Rule: {corrected_rule}",
            learning_signal=f"GATI calibrated: {learning_signal}",
            timestamp=datetime.datetime.utcnow()
        )
        db.add(learning)
        
        # Adjust rule counts
        # Deduct from original
        if original_rule != "None":
            orig_rule_obj = db.query(models.LifeSavingRule).filter(models.LifeSavingRule.name == original_rule).first()
            if orig_rule_obj:
                orig_rule_obj.total_reports = max(0, orig_rule_obj.total_reports - 1)
                if original_sif == "SIF Potential":
                    orig_rule_obj.sif_potential_reports = max(0, orig_rule_obj.sif_potential_reports - 1)
        # Add to corrected
        if corrected_rule != "None":
            new_rule_obj = db.query(models.LifeSavingRule).filter(models.LifeSavingRule.name == corrected_rule).first()
            if new_rule_obj:
                new_rule_obj.total_reports += 1
                if corrected_sif == "SIF Potential":
                    new_rule_obj.sif_potential_reports += 1
                    
        # Update event data based on correction
        event.sif_probability = 90.0 if corrected_sif == "SIF Potential" else 15.0
        event.life_saving_rule = corrected_rule
        event.status = "Corrected"
    else:
        event.status = "Confirmed"
        
    event.reviewer = payload.reviewer_name
    
    # 3. Write Audit Event
    audit = models.AuditEvent(
        event_id=event.id,
        action="Reviewer Validated",
        details=f"Reviewer '{payload.reviewer_name}' validated prediction. Decision SIF: {corrected_sif}, LSR: {corrected_rule}. "
                f"GATI Learning Loop feedback: {'Signal dispatched' if is_corrected else 'No weights update (confirmed matching)'}.",
        user_email=payload.reviewer_name.lower().replace(' ', '') + "@refinery.safe"
    )
    db.add(audit)
    
    db.commit()
    
    # Recalculate Precursor Patterns
    precursor_engine.detect_precursors(db)
    
    return {
        "success": True,
        "learning_calibrated": is_corrected,
        "signal": learning_signal or "Validated match (no correction required)"
    }

# GET /api/sif
@app.get("/api/sif")
def get_sif_intelligence(db: Session = Depends(get_db)):
    # Cards
    sif_reports = db.query(models.SafetyEvent).filter(models.SafetyEvent.sif_probability >= 50.0).count()
    high_conf = db.query(models.SafetyEvent).filter(models.SafetyEvent.sif_probability >= 50.0, models.SafetyEvent.confidence >= 85.0).count()
    needs_review = db.query(models.SafetyEvent).filter(models.SafetyEvent.status == "Needs Review", models.SafetyEvent.sif_probability >= 50.0).count()
    patterns_count = db.query(models.PrecursorPattern).count()

    # Heatmap/Scatter data: mapping Activities (X) to Precursor Density (Y)
    # Density represents average SIF probability of that activity
    activities_stats = db.query(
        models.SafetyEvent.activity,
        func.count(models.SafetyEvent.id).label("count"),
        func.avg(models.SafetyEvent.sif_probability).label("avg_sif")
    ).filter(
        models.SafetyEvent.activity != None
    ).group_by(
        models.SafetyEvent.activity
    ).all()

    scatter_data = []
    for act, count, avg_sif in activities_stats:
        scatter_data.append({
            "activity": act,
            "density": round(avg_sif, 1) if avg_sif else 0.0,
            "count": count
        })

    # Top Precursor list
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

# GET /api/sites/:id (Includes L1-L6 drilldown hierarchy)
@app.get("/api/sites/{site_name}")
def get_site_details(site_name: str, db: Session = Depends(get_db)):
    # Statistics
    total = db.query(models.SafetyEvent).filter(models.SafetyEvent.site == site_name).count()
    sif = db.query(models.SafetyEvent).filter(models.SafetyEvent.site == site_name, models.SafetyEvent.sif_probability >= 50.0).count()
    
    # Precursors
    precursor_density = "Medium"
    if sif > 15:
        precursor_density = "High"
    elif sif < 5:
        precursor_density = "Low"
        
    # Top rules
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
    
    # L1-L6 drill-down data
    events = db.query(models.SafetyEvent).filter(models.SafetyEvent.site == site_name).all()
    hierarchy = {}
    
    for e in events:
        l1 = e.l1_milestone or "Standard Operations"
        l2 = e.l2_unit or f"{e.unit} Unit"
        l3 = e.l3_discipline or "HSE Discipline"
        l4 = e.l4_work_package or "Piping Work Package"
        l5 = e.l5_activity or e.activity or "Standard Maintenance"
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
            "job": l6,
            "rule": e.life_saving_rule,
            "sif_probability": e.sif_probability,
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
    
    # Calculate dummy model improvement based on corrections
    model_imp = 0.0
    if total_reviews > 0:
        model_imp = round(min(18.5, (total_corrections * 1.5) + 5.0), 1)
        
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
    audits = db.query(models.AuditEvent).order_by(models.AuditEvent.timestamp.desc()).limit(50).all()
    return audits

# POST /api/reports/generate
@app.post("/api/reports/generate")
def generate_report(payload: Dict[str, str]):
    report_type = payload.get("type", "Daily HSE Intelligence Report")
    return {
        "success": True,
        "message": f"Successfully generated report '{report_type}'",
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "download_url": "/api/reports/download/mock-file.pdf"
    }

# POST /api/seed/reset
@app.post("/api/seed/reset")
def reset_and_seed_db():
    try:
        seed.seed_database()
        return {"success": True, "message": "Database successfully reset and re-seeded with demo safety reports."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reset database failed: {str(e)}")
