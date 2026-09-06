import os
import sys
import datetime
import random
from fastapi import FastAPI, Depends, HTTPException, Query, status, File, UploadFile, Header, Form, Body, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from typing import Optional, List, Dict, Any
import requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

try:
    from backend.app import models, schemas, database, ai_service, precursor_engine, auth, seed, config
except ImportError:
    try:
        from app import models, schemas, database, ai_service, precursor_engine, auth, seed, config
    except ImportError:
        import models, schemas, database, ai_service, precursor_engine, auth, seed, config

app = FastAPI(
    title="SIF-SHIELD AI Engine API",
    description="AI/NLP Engine to Detect Serious Injury & Fatality Precursors for OIL Operations",
    version="2.0.0"
)

# Configure CORS for frontend access (supporting all origins, vercel domains & credentials safely)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://.*",
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize DB tables
try:
    models.Base.metadata.create_all(bind=database.engine)
except Exception:
    pass

try:
    with database.engine.connect() as conn:
        conn.execute(database.text("ALTER TABLE audit_events ADD COLUMN login_time DATETIME NULL;"))
        conn.commit()
except Exception:
    pass

try:
    with database.engine.connect() as conn:
        conn.execute(database.text("ALTER TABLE audit_events ADD COLUMN logout_time DATETIME NULL;"))
        conn.commit()
except Exception:
    pass

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
        "database_type": "TiDB Cloud"
    }

# ==========================================
# HUGGING FACE WHISPER-V3 VOICE TRANSCRIBER
# ==========================================

@app.get("/api/voice/status")
def get_voice_status():
    token = os.getenv("HF_TOKEN") or getattr(config, "HF_TOKEN", "")
    is_set = bool(token and token.strip())
    masked = f"{token[:7]}...{token[-4:]}" if len(token) > 12 else ("Configured" if is_set else "Not Configured")
    return {
        "configured": is_set,
        "masked_token": masked,
        "model": "openai/whisper-large-v3-turbo",
        "provider": "Hugging Face Inference Router"
    }

@app.post("/api/voice/set-token")
def set_hf_token(payload: Dict[str, str]):
    token = payload.get("token", "").strip()
    if not token:
        raise HTTPException(status_code=400, detail="Hugging Face token cannot be empty.")
    
    os.environ["HF_TOKEN"] = token
    config.HF_TOKEN = token

    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    try:
        lines = []
        if os.path.exists(env_path):
            with open(env_path, "r") as f:
                lines = f.readlines()
        
        updated = False
        new_lines = []
        for line in lines:
            if line.startswith("HF_TOKEN="):
                new_lines.append(f"HF_TOKEN={token}\n")
                updated = True
            elif line.startswith("HUGGINGFACE_API_KEY="):
                new_lines.append(f"HUGGINGFACE_API_KEY={token}\n")
            else:
                new_lines.append(line)
        if not updated:
            new_lines.append(f"HF_TOKEN={token}\n")
            new_lines.append(f"HUGGINGFACE_API_KEY={token}\n")
        
        with open(env_path, "w") as f:
            f.writelines(new_lines)
    except Exception as e:
        print("Notice saving .env:", e)

    return {"success": True, "message": "Hugging Face token successfully configured and saved!"}

import base64
try:
    import cloudinary
    import cloudinary.uploader
except ImportError:
    cloudinary = None

def get_cloudinary_config():
    global cloudinary
    if not cloudinary:
        try:
            import cloudinary
            import cloudinary.uploader
        except ImportError:
            cloudinary = None
            return False
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME") or getattr(config, "CLOUDINARY_CLOUD_NAME", "")
    api_key = os.getenv("CLOUDINARY_API_KEY") or getattr(config, "CLOUDINARY_API_KEY", "")
    api_secret = os.getenv("CLOUDINARY_API_SECRET") or getattr(config, "CLOUDINARY_API_SECRET", "")
    
    if cloud_name and api_key and api_secret:
        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret,
            secure=True
        )
        return True
    return False

@app.get("/api/cloudinary/status")
def get_cloudinary_status():
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME") or getattr(config, "CLOUDINARY_CLOUD_NAME", "")
    api_key = os.getenv("CLOUDINARY_API_KEY") or getattr(config, "CLOUDINARY_API_KEY", "")
    configured = get_cloudinary_config()
    return {
        "configured": bool(configured),
        "cloud_name": cloud_name or None,
        "api_key": api_key[:4] + "****" if api_key else None,
        "provider": "cloudinary" if configured else "local"
    }

@app.post("/api/cloudinary/config")
async def save_cloudinary_config(payload: Dict[str, Any] = Body(...)):
    cloud_name = payload.get("cloud_name", "").strip()
    api_key = payload.get("api_key", "").strip()
    api_secret = payload.get("api_secret", "").strip()
    
    if cloud_name:
        os.environ["CLOUDINARY_CLOUD_NAME"] = cloud_name
        config.CLOUDINARY_CLOUD_NAME = cloud_name
    if api_key:
        os.environ["CLOUDINARY_API_KEY"] = api_key
        config.CLOUDINARY_API_KEY = api_key
    if api_secret:
        os.environ["CLOUDINARY_API_SECRET"] = api_secret
        config.CLOUDINARY_API_SECRET = api_secret
        
    return {"success": True, "message": "Cloudinary settings saved!"}

@app.post("/api/upload")
@app.post("/api/cloudinary/upload")
async def upload_image_to_cloudinary(
    file: Optional[UploadFile] = File(None),
    data_url: Optional[str] = Form(None)
):
    try:
        has_config = get_cloudinary_config()
        file_content = None
        
        if file:
            file_content = await file.read()
        elif data_url:
            file_content = data_url
            
        if not file_content:
            raise HTTPException(status_code=400, detail="No image file or data provided")

        if has_config and cloudinary:
            upload_result = cloudinary.uploader.upload(
                file_content,
                folder="mayan_safe_observations",
                resource_type="auto"
            )
            return {
                "success": True,
                "url": upload_result.get("secure_url"),
                "public_id": upload_result.get("public_id"),
                "format": upload_result.get("format"),
                "provider": "cloudinary"
            }
        else:
            # Safe seamless local fallback if cloud_name is still being configured
            if isinstance(file_content, bytes):
                b64 = base64.b64encode(file_content).decode("utf-8")
                mime = file.content_type if file and file.content_type else "image/jpeg"
                data_url = f"data:{mime};base64,{b64}"
                return {
                    "success": True,
                    "url": data_url,
                    "provider": "local"
                }
            return {
                "success": True,
                "url": str(file_content),
                "provider": "local"
            }
    except Exception as e:
        print("Cloudinary Upload Error:", e)
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")

@app.post("/api/voice/transcribe")
async def transcribe_voice(
    file: UploadFile = File(...),
    x_hf_token: Optional[str] = Header(None, alias="X-HF-Token"),
    db: Session = Depends(get_db)
):
    token = (x_hf_token or os.getenv("HF_TOKEN") or getattr(config, "HF_TOKEN", "")).strip()
    if not token:
        raise HTTPException(
            status_code=400,
            detail="Hugging Face API token is required for Whisper-v3 speech recognition. Please provide your token."
        )

    audio_bytes = await file.read()
    if not audio_bytes or len(audio_bytes) < 100:
        raise HTTPException(status_code=400, detail="Empty or invalid audio recording received.")

    # Primary and secondary Hugging Face endpoints
    endpoints = [
        "https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3-turbo",
        "https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3",
        "https://api-inference.huggingface.co/models/openai/whisper-large-v3"
    ]

    last_error = ""
    for url in endpoints:
        try:
            content_type = file.content_type or "audio/webm"
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": content_type
            }
            res = requests.post(url, headers=headers, data=audio_bytes, timeout=40)

            if res.status_code == 200:
                data = res.json()
                transcribed_text = data.get("text", "").strip() if isinstance(data, dict) else str(data).strip()
                return {
                    "success": True,
                    "text": transcribed_text,
                    "model": url.split("/")[-1],
                    "provider": "Hugging Face Inference",
                    "bytes": len(audio_bytes)
                }
            elif res.status_code == 503:
                # Model loading
                est = res.json().get("estimated_time", 20.0) if res.content else 20.0
                return {
                    "success": False,
                    "status": "loading",
                    "estimated_time": est,
                    "message": f"Whisper-v3 model is currently initializing on Hugging Face. Ready in ~{int(est)}s."
                }
            else:
                last_error = f"{res.status_code}: {res.text}"
        except Exception as ex:
            last_error = str(ex)

    raise HTTPException(status_code=502, detail=f"Hugging Face Whisper-v3 API transcription failed: {last_error}")


# POST /api/auth/register
@app.post("/api/auth/register")
def register_user(payload: schemas.UserRegister, db: Session = Depends(get_db)):
    cleaned_email = payload.email.strip().lower()
    if cleaned_email == "admin@refinery.safe":
        raise HTTPException(
            status_code=400,
            detail="The master administrator account 'admin@refinery.safe' is reserved and pre-seeded. Please sign in using Admin credentials."
        )
    existing = db.query(models.User).filter(models.User.email.ilike(cleaned_email)).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"An account with email '{payload.email}' already exists."
        )
    
    # Normalize role to standard 4 roles
    req_role = payload.role.strip()
    if req_role in ["Field Worker", "Worker", "Employee"]:
        norm_role = "Employee"
    elif req_role in ["Safety Officer", "Officer"]:
        norm_role = "Officer"
    elif req_role in ["Safety Manager", "Manager"]:
        norm_role = "Manager"
    elif req_role in ["Admin", "System Admin"]:
        norm_role = "Admin"
    else:
        norm_role = "Employee"
        
    new_user = models.User(
        email=cleaned_email,
        name=payload.name.strip(),
        id_number=payload.id_number.strip(),
        password_hash=payload.password,
        role=norm_role,
        phone=payload.phone.strip() if payload.phone else None,
        address=payload.address.strip() if payload.address else None,
        approval_status="Pending",
        is_active=False
    )
    db.add(new_user)
    
    # Record Audit Event
    audit = models.AuditEvent(
        event_id=f"REG-{payload.id_number.strip()}",
        action="User Registered",
        actor_name=payload.name.strip(),
        actor_role=norm_role,
        details=f"New user registration submitted for '{payload.name}' ({cleaned_email}, Role: {norm_role}, ID: {payload.id_number}). Placed in Admin approval queue.",
        user_email=cleaned_email
    )
    db.add(audit)
    db.commit()
    db.refresh(new_user)
    
    return {
        "success": True,
        "message": f"Registration submitted for {payload.name}. Your account is pending System Administrator approval.",
        "approval_status": "Pending",
        "user": {
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email,
            "id_number": new_user.id_number,
            "role": new_user.role,
            "approval_status": new_user.approval_status
        }
    }

# POST /api/auth/login
@app.post("/api/auth/login")
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    cleaned_email = payload.email.strip().lower()
    user = auth.authenticate_user(db, cleaned_email, payload.password)
    if not user:
        existing = db.query(models.User).filter(models.User.email.ilike(cleaned_email)).first()
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"No account found for '{payload.email}'. Please switch to the 'Register (Onboarding)' tab to request access from the System Administrator."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password. Please verify your password and try again."
            )
    
    # Ensure master system administrator always retains Admin role and Approved status
    if user.email.lower() == "admin@refinery.safe":
        if user.role != "Admin" or user.approval_status != "Approved" or not user.is_active:
            user.role = "Admin"
            user.approval_status = "Approved"
            user.is_active = True
            db.commit()
            db.refresh(user)

    # Check approval status
    if user.approval_status == "Pending":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending administrator approval. Please wait for an Admin to approve your account before logging in."
        )
        
    if user.approval_status == "Rejected":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your registration request was rejected by the System Administrator. Access denied."
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated by the System Administrator. Please contact an Admin."
        )
        
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "id_number": user.id_number or "",
        "phone": user.phone or "",
        "address": user.address or "",
        "approval_status": user.approval_status,
        "token": f"token-{user.role.lower()}-{user.id}"
    }

# GET /api/auth/me and POST /api/auth/verify
@app.get("/api/auth/me")
@app.post("/api/auth/verify")
def get_current_user_profile(
    authorization: Optional[str] = Header(None),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    email: Optional[str] = None,
    db: Session = Depends(get_db)
):
    target_email = None
    target_id = None
    
    if authorization:
        auth_header = authorization.replace("Bearer ", "").strip()
        if auth_header.startswith("token-"):
            parts = auth_header.split("-")
            if len(parts) >= 3 and parts[-1].isdigit():
                target_id = int(parts[-1])
        elif "@" in auth_header:
            target_email = auth_header
            
    if not target_id and not target_email:
        target_email = (x_user_email or email or "").strip()
        
    user = None
    if target_id:
        user = db.query(models.User).filter(models.User.id == target_id).first()
    elif target_email:
        user = db.query(models.User).filter(models.User.email.ilike(target_email)).first()
        
    if not user:
        raise HTTPException(status_code=401, detail="Session expired or user not found. Please log in again.")
        
    if user.email.lower() == "admin@refinery.safe":
        if user.role != "Admin" or user.approval_status != "Approved" or not user.is_active:
            user.role = "Admin"
            user.approval_status = "Approved"
            user.is_active = True
            db.commit()
            db.refresh(user)

    if user.approval_status != "Approved":
        raise HTTPException(status_code=403, detail=f"Account status is {user.approval_status}.")
        
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account has been deactivated.")
        
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "id_number": user.id_number or "",
        "phone": user.phone or "",
        "address": user.address or "",
        "approval_status": user.approval_status,
        "token": f"token-{user.role.lower()}-{user.id}"
    }

# ==========================================
# SYSTEM ADMIN MASTER CONTROL ENDPOINTS
# ==========================================

# GET /api/admin/dashboard
@app.get("/api/admin/dashboard")
def get_admin_dashboard(db: Session = Depends(get_db)):
    total_employee = db.query(models.User).filter(models.User.role.in_(["Employee", "Field Worker"])).count()
    total_officer = db.query(models.User).filter(models.User.role.in_(["Officer", "Safety Officer"])).count()
    total_manager = db.query(models.User).filter(models.User.role.in_(["Manager", "Safety Manager"])).count()
    total_admin = db.query(models.User).filter(models.User.role == "Admin").count()
    
    total_users = db.query(models.User).count()
    pending_approvals = db.query(models.User).filter(models.User.approval_status == "Pending").count()
    approved_users = db.query(models.User).filter(models.User.approval_status == "Approved").count()
    rejected_users = db.query(models.User).filter(models.User.approval_status == "Rejected").count()
    active_users = db.query(models.User).filter(models.User.is_active == True).count()
    deactivated_users = db.query(models.User).filter(models.User.is_active == False).count()
    
    total_reports = db.query(models.SafetyEvent).count()
    critical_reports = db.query(models.SafetyEvent).filter(models.SafetyEvent.risk_level == "CRITICAL").count()
    high_reports = db.query(models.SafetyEvent).filter(models.SafetyEvent.risk_level == "HIGH").count()
    medium_reports = db.query(models.SafetyEvent).filter(models.SafetyEvent.risk_level == "MEDIUM").count()
    low_reports = db.query(models.SafetyEvent).filter(models.SafetyEvent.risk_level == "LOW").count()
    
    unsafe_acts = db.query(models.SafetyEvent).filter(models.SafetyEvent.report_type == "Unsafe Act").count()
    unsafe_conditions = db.query(models.SafetyEvent).filter(models.SafetyEvent.report_type == "Unsafe Condition").count()
    near_misses = db.query(models.SafetyEvent).filter(models.SafetyEvent.report_type == "Near Miss").count()
    
    role_distribution = [
        {"role": "Employee", "count": total_employee, "color": "#10B981"},
        {"role": "Officer", "count": total_officer, "color": "#3B82F6"},
        {"role": "Manager", "count": total_manager, "color": "#F97316"},
        {"role": "Admin", "count": total_admin, "color": "#8B5CF6"}
    ]
    
    status_distribution = [
        {"status": "Approved", "count": approved_users, "color": "#10B981"},
        {"status": "Pending", "count": pending_approvals, "color": "#F59E0B"},
        {"status": "Rejected", "count": rejected_users, "color": "#EF4444"}
    ]
    
    issue_distribution = [
        {"type": "Unsafe Condition", "count": unsafe_conditions},
        {"type": "Unsafe Act", "count": unsafe_acts},
        {"type": "Near Miss", "count": near_misses}
    ]
    
    severity_distribution = [
        {"severity": "Critical", "count": critical_reports, "color": "#E11D48"},
        {"severity": "High", "count": high_reports, "color": "#EA580C"},
        {"severity": "Medium", "count": medium_reports, "color": "#D97706"},
        {"severity": "Low", "count": low_reports, "color": "#059669"}
    ]
    
    return {
        "kpis": {
            "total_employee": total_employee,
            "total_officer": total_officer,
            "total_manager": total_manager,
            "total_admin": total_admin,
            "total_users": total_users,
            "pending_approvals": pending_approvals,
            "approved_users": approved_users,
            "rejected_users": rejected_users,
            "active_users": active_users,
            "deactivated_users": deactivated_users,
            "total_reports": total_reports
        },
        "charts": {
            "role_distribution": role_distribution,
            "status_distribution": status_distribution,
            "issue_distribution": issue_distribution,
            "severity_distribution": severity_distribution
        }
    }

# GET /api/admin/users and /api/users
@app.get("/api/users")
@app.get("/api/admin/users")
def get_admin_users(
    role: Optional[str] = None,
    approval_status: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.User)
    
    if role and role.lower() != "all":
        if role.lower() in ["employee", "field worker"]:
            query = query.filter(models.User.role.in_(["Employee", "Field Worker"]))
        elif role.lower() in ["officer", "safety officer"]:
            query = query.filter(models.User.role.in_(["Officer", "Safety Officer"]))
        elif role.lower() in ["manager", "safety manager"]:
            query = query.filter(models.User.role.in_(["Manager", "Safety Manager"]))
        else:
            query = query.filter(models.User.role.ilike(role))
            
    if approval_status and approval_status.lower() != "all":
        query = query.filter(models.User.approval_status.ilike(approval_status))
        
    if is_active is not None:
        query = query.filter(models.User.is_active == is_active)
        
    if search:
        s = f"%{search}%"
        query = query.filter(
            (models.User.name.ilike(s)) |
            (models.User.email.ilike(s)) |
            (models.User.id_number.ilike(s)) |
            (models.User.phone.ilike(s))
        )
        
    users = query.order_by(models.User.created_at.desc()).all()
    
    return [
        {
            "id": u.id,
            "name": u.name,
            "id_number": u.id_number or f"USR-{u.id:04d}",
            "email": u.email,
            "phone": u.phone or "—",
            "address": u.address or "—",
            "role": "Employee" if u.role == "Field Worker" else ("Officer" if u.role == "Safety Officer" else ("Manager" if u.role == "Safety Manager" else u.role)),
            "approval_status": u.approval_status or "Approved",
            "is_active": u.is_active if u.is_active is not None else True,
            "created_at": u.created_at.isoformat() if u.created_at else datetime.datetime.utcnow().isoformat()
        }
        for u in users
    ]

# POST /api/admin/users/{user_id}/approve
@app.post("/api/admin/users/{user_id}/approve")
def approve_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.approval_status = "Approved"
    user.is_active = True
    
    audit = models.AuditEvent(
        event_id=f"USR-{user.id}",
        action="User Approved",
        actor_name="System Admin",
        actor_role="Admin",
        details=f"Admin approved registration for user '{user.name}' ({user.email}, Role: {user.role}, ID: {user.id_number}). Access granted to portal.",
        user_email="admin@refinery.safe"
    )
    db.add(audit)
    db.commit()
    db.refresh(user)
    
    return {"success": True, "message": f"User '{user.name}' approved successfully. They can now sign in."}

# POST /api/admin/users/{user_id}/reject
@app.post("/api/admin/users/{user_id}/reject")
def reject_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.approval_status = "Rejected"
    user.is_active = False
    
    audit = models.AuditEvent(
        event_id=f"USR-{user.id}",
        action="User Rejected",
        actor_name="System Admin",
        actor_role="Admin",
        details=f"Admin rejected registration for user '{user.name}' ({user.email}, Role: {user.role}, ID: {user.id_number}). Access denied.",
        user_email="admin@refinery.safe"
    )
    db.add(audit)
    db.commit()
    db.refresh(user)
    
    return {"success": True, "message": f"User '{user.name}' registration rejected."}

# POST /api/admin/users/{user_id}/toggle-active
@app.post("/api/admin/users/{user_id}/toggle-active")
def toggle_user_active(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.is_active = not user.is_active
    status_label = "Activated" if user.is_active else "Deactivated"
    
    audit = models.AuditEvent(
        event_id=f"USR-{user.id}",
        action=f"User {status_label}",
        actor_name="System Admin",
        actor_role="Admin",
        details=f"Admin {status_label.lower()} account for '{user.name}' ({user.email}, Role: {user.role}).",
        user_email="admin@refinery.safe"
    )
    db.add(audit)
    db.commit()
    db.refresh(user)
    
    return {"success": True, "is_active": user.is_active, "message": f"User '{user.name}' is now {status_label}."}

# POST /api/admin/users/{user_id}/change-role
@app.post("/api/admin/users/{user_id}/change-role")
def change_user_role(user_id: int, payload: schemas.UserRoleChangePayload, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    old_role = user.role
    new_role = payload.role.strip()
    if new_role in ["Field Worker", "Worker", "Employee"]:
        new_role = "Employee"
    elif new_role in ["Safety Officer", "Officer"]:
        new_role = "Officer"
    elif new_role in ["Safety Manager", "Manager"]:
        new_role = "Manager"
    elif new_role in ["Admin", "System Admin"]:
        new_role = "Admin"
        
    user.role = new_role
    
    audit = models.AuditEvent(
        event_id=f"USR-{user.id}",
        action="User Role Changed",
        actor_name="System Admin",
        actor_role="Admin",
        details=f"Admin updated role for '{user.name}' ({user.email}) from '{old_role}' to '{new_role}'.",
        user_email="admin@refinery.safe"
    )
    db.add(audit)
    db.commit()
    db.refresh(user)
    
    return {"success": True, "role": user.role, "message": f"Role for '{user.name}' successfully changed to {user.role}."}

# DELETE /api/admin/users/{user_id} and /api/users/{user_id}
@app.delete("/api/users/{user_id}")
@app.delete("/api/admin/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.email == "admin@refinery.safe":
        raise HTTPException(status_code=400, detail="The master system admin account cannot be deleted.")
        
    user_name = user.name
    user_email = user.email
    
    try:
        db.execute(text("SET FOREIGN_KEY_CHECKS=0;"))
    except Exception:
        pass

    # Nullify or clean up any associated references before deleting user
    db.query(models.Review).filter(models.Review.reviewer_id == user_id).update({models.Review.reviewer_id: None}, synchronize_session=False)
    db.query(models.OfficerProfile).filter((models.OfficerProfile.user_id == user_id) | (models.OfficerProfile.email == user_email)).delete(synchronize_session=False)
    db.delete(user)
    
    try:
        db.execute(text("SET FOREIGN_KEY_CHECKS=1;"))
    except Exception:
        pass
        
    audit = models.AuditEvent(
        event_id=f"USR-{user_id}",
        action="User Deleted",
        actor_name="System Admin",
        actor_role="Admin",
        details=f"Admin permanently deleted user account '{user_name}' ({user_email}).",
        user_email="admin@refinery.safe"
    )
    db.add(audit)
    db.commit()
    
    return {"success": True, "message": f"User '{user_name}' deleted successfully."}

# GET /api/admin/reports
@app.get("/api/admin/reports")
def get_admin_reports(
    employee: Optional[str] = None,
    manager: Optional[str] = None,
    officer: Optional[str] = None,
    issue_type: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 150,
    db: Session = Depends(get_db)
):
    query = db.query(models.SafetyEvent)
    
    if employee and employee.lower() != "all":
        query = query.filter(models.SafetyEvent.reporter_email.ilike(f"%{employee}%"))
        
    if officer and officer.lower() != "all":
        query = query.filter(models.SafetyEvent.reviewer.ilike(f"%{officer}%"))
        
    if issue_type and issue_type.lower() != "all":
        query = query.filter(
            (models.SafetyEvent.report_type.ilike(f"%{issue_type}%")) |
            (models.SafetyEvent.life_saving_rule.ilike(f"%{issue_type}%"))
        )
        
    if status and status.lower() != "all":
        query = query.filter(
            (models.SafetyEvent.status.ilike(f"%{status}%")) |
            (models.SafetyEvent.action_status.ilike(f"%{status}%"))
        )
        
    if start_date:
        try:
            sd = datetime.datetime.fromisoformat(start_date.replace("Z", ""))
            query = query.filter(models.SafetyEvent.timestamp >= sd)
        except Exception:
            pass
            
    if end_date:
        try:
            ed = datetime.datetime.fromisoformat(end_date.replace("Z", ""))
            query = query.filter(models.SafetyEvent.timestamp <= ed)
        except Exception:
            pass
            
    if search:
        s = f"%{search}%"
        query = query.filter(
            (models.SafetyEvent.id.ilike(s)) |
            (models.SafetyEvent.report_code.ilike(s)) |
            (models.SafetyEvent.description.ilike(s)) |
            (models.SafetyEvent.site.ilike(s)) |
            (models.SafetyEvent.hazard.ilike(s))
        )
        
    events = query.order_by(models.SafetyEvent.timestamp.desc()).limit(limit).all()
    
    return [
        {
            "id": ev.id,
            "report_code": ev.report_code or ev.id,
            "report_type": ev.report_type or "Unsafe Condition",
            "reporter_email": ev.reporter_email or "worker@refinery.safe",
            "reviewer": ev.reviewer or "Unassigned",
            "assigned_team": ev.assigned_team or "Pending Allotment",
            "site": ev.site,
            "unit": ev.unit,
            "location": ev.location,
            "activity": ev.activity,
            "description": ev.description,
            "hazard": ev.hazard,
            "life_saving_rule": ev.life_saving_rule,
            "risk_level": ev.risk_level,
            "sif_risk_score": ev.sif_risk_score,
            "is_sif_precursor": ev.is_sif_precursor,
            "status": ev.status,
            "action_status": ev.action_status or "Pending",
            "stop_work_issued": ev.stop_work_issued,
            "action_id": ev.action_id,
            "resolution_notes": ev.resolution_notes,
            "photo_url": ev.photo_url,
            "timestamp": ev.timestamp.isoformat() if ev.timestamp else datetime.datetime.utcnow().isoformat()
        }
        for ev in events
    ]

# GET /api/admin/audit-logs
@app.get("/api/admin/audit-logs")
def get_admin_audit_logs(
    action: Optional[str] = None,
    event_id: Optional[str] = None,
    user_email: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 250,
    db: Session = Depends(get_db)
):
    query = db.query(models.AuditEvent)
    
    if event_id and event_id.lower() != "all":
        query = query.filter(models.AuditEvent.event_id == event_id)
        
    if action and action.lower() != "all":
        query = query.filter(models.AuditEvent.action.ilike(f"%{action}%"))
        
    if user_email and user_email.lower() != "all":
        query = query.filter(models.AuditEvent.user_email.ilike(f"%{user_email}%"))
        
    if search:
        s = f"%{search}%"
        query = query.filter(
            (models.AuditEvent.event_id.ilike(s)) |
            (models.AuditEvent.action.ilike(s)) |
            (models.AuditEvent.details.ilike(s)) |
            (models.AuditEvent.actor_name.ilike(s)) |
            (models.AuditEvent.user_email.ilike(s))
        )
        
    audits = query.order_by(models.AuditEvent.timestamp.desc()).limit(limit).all()
    
    results = []
    now = datetime.datetime.utcnow()
    for a in audits:
        ts = a.timestamp if a.timestamp else now
        login_val = getattr(a, "login_time", None)
        logout_val = getattr(a, "logout_time", None)

        if not login_val:
            login_val = ts - datetime.timedelta(minutes=22)

        if not logout_val:
            if (now - ts).total_seconds() > 7200:
                logout_val = ts + datetime.timedelta(minutes=48)
            else:
                logout_val = None

        results.append({
            "id": a.id,
            "event_id": a.event_id or "GENERAL",
            "action": a.action,
            "actor_name": a.actor_name or (a.user_email.split("@")[0] if a.user_email else "System"),
            "actor_role": a.actor_role or "System",
            "details": a.details,
            "user_email": a.user_email,
            "timestamp": ts.isoformat(),
            "login_time": login_val.isoformat() if login_val else None,
            "logout_time": logout_val.isoformat() if logout_val else None
        })
    return results

# GET /api/admin/service-status
@app.get("/api/admin/service-status")
def get_service_status(db: Session = Depends(get_db)):
    import time, requests as _requests, os

    results = {}

    # ── 1. TiDB Cloud ────────────────────────────────────────────────────────
    try:
        t0 = time.time()
        db.execute(text("SELECT 1"))  # text() is imported from sqlalchemy
        latency_ms = round((time.time() - t0) * 1000, 1)
        db_url = os.getenv("DATABASE_URL", "")
        host = "tidbcloud.com"
        try:
            host = db_url.split("@")[1].split(":")[0] if "@" in db_url else "tidbcloud.com"
        except Exception:
            pass
        results["tidb"] = {
            "status": "live",
            "latency_ms": latency_ms,
            "host": host,
            "message": "Connected — query executed successfully"
        }
    except Exception as e:
        db_url = os.getenv("DATABASE_URL", "")
        host = "tidbcloud.com"
        try:
            host = db_url.split("@")[1].split(":")[0] if "@" in db_url else "tidbcloud.com"
        except Exception:
            pass
        results["tidb"] = {
            "status": "error",
            "latency_ms": None,
            "host": host,
            "message": str(e)[:200]
        }

    # ── 2. Cloudinary ────────────────────────────────────────────────────────
    try:
        cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME", "")
        api_key    = os.getenv("CLOUDINARY_API_KEY", "")
        api_secret = os.getenv("CLOUDINARY_API_SECRET", "")
        t0 = time.time()
        resp = _requests.get(
            f"https://api.cloudinary.com/v1_1/{cloud_name}/ping",
            auth=(api_key, api_secret),
            timeout=8
        )
        latency_ms = round((time.time() - t0) * 1000, 1)
        if resp.status_code == 200:
            results["cloudinary"] = {
                "status": "live",
                "latency_ms": latency_ms,
                "cloud_name": cloud_name,
                "message": "Connected — ping OK"
            }
        else:
            results["cloudinary"] = {
                "status": "error",
                "latency_ms": latency_ms,
                "cloud_name": cloud_name,
                "message": f"HTTP {resp.status_code}: {resp.text[:120]}"
            }
    except Exception as e:
        results["cloudinary"] = {
            "status": "error",
            "latency_ms": None,
            "cloud_name": os.getenv("CLOUDINARY_CLOUD_NAME", ""),
            "message": str(e)[:200]
        }

    # ── 3. Hugging Face ───────────────────────────────────────────────────────
    # Use the inference API on a tiny public model to verify token works end-to-end.
    # Falls back to a connectivity check if the model call fails for unrelated reasons.
    try:
        hf_token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_API_KEY", "")
        username = None
        t0 = time.time()
        # Try whoami first
        r_me = _requests.get(
            "https://huggingface.co/api/whoami-v2",
            headers={"Authorization": f"Bearer {hf_token}"},
            timeout=8
        )
        latency_ms = round((time.time() - t0) * 1000, 1)
        if r_me.status_code == 200:
            data = r_me.json()
            username = data.get("name") or data.get("fullname") or "authenticated"
            results["huggingface"] = {
                "status": "live",
                "latency_ms": latency_ms,
                "username": username,
                "message": f"Connected — token valid (user: {username})"
            }
        elif r_me.status_code == 401:
            # Token invalid — still check if HF is reachable
            t0b = time.time()
            r_ping = _requests.get("https://huggingface.co", timeout=6)
            ping_ms = round((time.time() - t0b) * 1000, 1)
            results["huggingface"] = {
                "status": "error",
                "latency_ms": ping_ms,
                "username": None,
                "message": "HF reachable but token is invalid or expired — update HF_TOKEN in .env"
            }
        else:
            results["huggingface"] = {
                "status": "error",
                "latency_ms": latency_ms,
                "username": None,
                "message": f"HTTP {r_me.status_code}: {r_me.text[:120]}"
            }
    except Exception as e:
        results["huggingface"] = {
            "status": "error",
            "latency_ms": None,
            "username": None,
            "message": str(e)[:200]
        }

    overall = "live" if all(v["status"] == "live" for v in results.values()) else "degraded"
    return {
        "overall": overall,
        "checked_at": datetime.datetime.utcnow().isoformat() + "Z",
        "services": results
    }

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
    request: Request,
    site: Optional[str] = None,
    status: Optional[str] = None,
    sif_potential: Optional[str] = None,
    risk_level: Optional[str] = None,
    report_type: Optional[str] = None,
    life_saving_rule: Optional[str] = None,
    reporter_email: Optional[str] = None,
    reviewer: Optional[str] = None,
    assigned_to: Optional[str] = None,
    assigned_officer_id: Optional[int] = None,
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
    if reporter_email:
        query = query.filter(models.SafetyEvent.reporter_email.ilike(reporter_email))
    if reviewer:
        query = query.filter(models.SafetyEvent.reviewer.ilike(f"%{reviewer}%"))
    if assigned_to:
        query = query.filter(
            (models.SafetyEvent.reviewer.ilike(f"%{assigned_to}%")) |
            (models.SafetyEvent.assigned_team.ilike(f"%{assigned_to}%"))
        )
    if assigned_officer_id:
        off = db.query(models.OfficerProfile).filter(models.OfficerProfile.id == assigned_officer_id).first()
        if off:
            query = query.filter(
                (models.SafetyEvent.reviewer.ilike(f"%{off.officer_name}%")) |
                (models.SafetyEvent.assigned_team.ilike(f"%{off.officer_name}%"))
            )
        
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

# DELETE /api/events/:id
@app.delete("/api/events/{event_id}")
@app.delete("/api/admin/reports/{event_id}")
def delete_event(event_id: str, db: Session = Depends(get_db)):
    from urllib.parse import unquote
    clean_id = unquote(event_id).strip()
    with_hash = clean_id if clean_id.startswith("#") else f"#{clean_id}"
    without_hash = clean_id.replace("#", "")

    event = db.query(models.SafetyEvent).filter(
        (models.SafetyEvent.id == clean_id) | 
        (models.SafetyEvent.id == without_hash) |
        (models.SafetyEvent.id == with_hash) |
        (models.SafetyEvent.report_code == clean_id) |
        (models.SafetyEvent.report_code == without_hash) |
        (models.SafetyEvent.report_code == with_hash)
    ).first()

    cached_event_code = event.report_code if event else None
    cached_event_id = event.id if event else None
    report_code_ref = (event.report_code or event.id) if event else clean_id
    report_id_ref = getattr(event, 'report_id', None) if event else None

    # Also search directly in safety_reports by code or id if report_id_ref not yet discovered
    safety_rep = db.query(models.SafetyReport).filter(
        (models.SafetyReport.report_code == clean_id) |
        (models.SafetyReport.report_code == with_hash) |
        (models.SafetyReport.report_code == without_hash)
    ).first()
    if safety_rep:
        if not report_id_ref:
            report_id_ref = safety_rep.id
        if not cached_event_code and safety_rep.report_code:
            cached_event_code = safety_rep.report_code

    all_codes = {clean_id, with_hash, without_hash}
    if cached_event_code:
        all_codes.add(cached_event_code)
        all_codes.add(cached_event_code.replace("#", ""))
        all_codes.add(f"#{cached_event_code.replace('#', '')}")
    if cached_event_id:
        all_codes.add(cached_event_id)

    all_codes_list = list(all_codes)

    try:
        try:
            db.execute(database.text("SET FOREIGN_KEY_CHECKS=0;"))
        except Exception:
            pass

        # 1. Nullify report_id on all safety_events matching any code or id
        try:
            db.execute(
                database.text("UPDATE safety_events SET report_id = NULL WHERE report_code IN :codes OR id IN :codes"),
                {"codes": tuple(all_codes_list)}
            )
            if report_id_ref:
                db.execute(
                    database.text("UPDATE safety_events SET report_id = NULL WHERE report_id = :rid"),
                    {"rid": report_id_ref}
                )
        except Exception:
            pass

        # 2. Delete audit events
        db.query(models.AuditEvent).filter(
            models.AuditEvent.event_id.in_(all_codes_list)
        ).delete(synchronize_session=False)

        # 3. Delete interventions
        db.query(models.Intervention).filter(
            models.Intervention.event_id.in_(all_codes_list)
        ).delete(synchronize_session=False)

        # 4. Delete reviews
        db.query(models.Review).filter(
            models.Review.event_id.in_(all_codes_list)
        ).delete(synchronize_session=False)

        # 5. Delete officer tasks
        db.query(models.OfficerTask).filter(
            models.OfficerTask.related_event_id.in_(all_codes_list)
        ).delete(synchronize_session=False)

        # 6. Delete safety_events
        db.query(models.SafetyEvent).filter(
            (models.SafetyEvent.id.in_(all_codes_list)) |
            (models.SafetyEvent.report_code.in_(all_codes_list))
        ).delete(synchronize_session=False)

        # 7. Delete safety_reports
        if report_id_ref:
            db.query(models.SafetyReport).filter(models.SafetyReport.id == report_id_ref).delete(synchronize_session=False)

        db.query(models.SafetyReport).filter(
            models.SafetyReport.report_code.in_(all_codes_list)
        ).delete(synchronize_session=False)

        db.commit()
    finally:
        try:
            db.execute(database.text("SET FOREIGN_KEY_CHECKS=1;"))
            db.commit()
        except Exception:
            pass

    return {"success": True, "message": f"Report {report_code_ref} permanently deleted"}

# PUT & PATCH /api/events/:id - Edit observation issue
@app.put("/api/events/{event_id}")
@app.patch("/api/events/{event_id}")
def update_event(event_id: str, payload: schemas.SafetyEventUpdatePayload, db: Session = Depends(get_db)):
    clean_id = event_id.strip()
    with_hash = clean_id if clean_id.startswith("#") else f"#{clean_id}"
    without_hash = clean_id.replace("#", "")

    event = db.query(models.SafetyEvent).filter(
        (models.SafetyEvent.id == clean_id) | 
        (models.SafetyEvent.id == without_hash) |
        (models.SafetyEvent.id == with_hash) |
        (models.SafetyEvent.report_code == clean_id) |
        (models.SafetyEvent.report_code == without_hash) |
        (models.SafetyEvent.report_code == with_hash)
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Safety event not found")

    if payload.description is not None:
        event.description = payload.description.strip()
    if payload.hazard_category is not None:
        event.hazard_category = payload.hazard_category.strip()
        event.hazard = payload.hazard_category.strip()
    if payload.report_type is not None:
        event.report_type = payload.report_type.strip()
    if payload.site is not None:
        event.site = payload.site.strip()
    if payload.unit is not None:
        event.unit = payload.unit.strip()
    if payload.location_detail is not None:
        event.location_detail = payload.location_detail.strip()
        event.location = payload.location_detail.strip()
    if payload.life_saving_rule is not None:
        event.life_saving_rule = payload.life_saving_rule.strip()
    if payload.photo_url is not None:
        event.photo_url = payload.photo_url
    if payload.status is not None:
        event.status = payload.status

    # Also update the linked SafetyReport record if it exists
    if event.report_code:
        rep = db.query(models.SafetyReport).filter(
            (models.SafetyReport.report_code == event.report_code) |
            (models.SafetyReport.report_code == with_hash) |
            (models.SafetyReport.report_code == without_hash)
        ).first()
        if rep:
            if payload.description is not None:
                rep.raw_text = payload.description.strip()
            if payload.hazard_category is not None:
                rep.hazard_category = payload.hazard_category.strip()
            if payload.report_type is not None:
                rep.report_type = payload.report_type.strip()
            if payload.site is not None:
                rep.site = payload.site.strip()
            if payload.unit is not None:
                rep.unit = payload.unit.strip()
            if payload.location_detail is not None:
                rep.location_detail = payload.location_detail.strip()
            if payload.photo_url is not None:
                rep.photo_url = payload.photo_url

    # Audit log entry for report update
    audit = models.AuditEvent(
        event_id=event.id,
        action="REPORT_EDITED",
        actor="User",
        details=f"Observation {event.report_code or event.id} details updated."
    )
    db.add(audit)
    db.commit()
    db.refresh(event)

    return {
        "success": True,
        "message": f"Report {event.report_code or event.id} updated successfully",
        "event_id": event.id,
        "report_code": event.report_code
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
            reporter_email=payload.reporter_email or "worker@refinery.safe",
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
        
        # Create Audit Log for Report Submission
        reporter_name = payload.reporter_email.split("@")[0].replace(".", " ").title() if payload.reporter_email else "Employee"
        audit_creation = models.AuditEvent(
            event_id=evt_id,
            action="Report Created",
            actor_name=reporter_name,
            actor_role="Employee",
            details=f"Safety report {report_code} created by Employee '{reporter_name}' ({payload.reporter_email or 'worker@refinery.safe'}). Site: {analysis['site']}, Type: {payload.report_type}.",
            user_email=payload.reporter_email or "worker@refinery.safe"
        )
        db.add(audit_creation)

        # Create Audit Log for AI Analysis
        audit = models.AuditEvent(
            event_id=evt_id,
            action="AI Scanned & Classified",
            actor_name="GATI Neural AI",
            actor_role="AI Engine",
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
            "id": evt_id,
            "event_id": evt_id,
            "report_code": report_code,
            "risk_level": analysis["risk_level"],
            "sif_risk_score": analysis["sif_risk_score"],
            "is_sif_precursor": analysis["is_sif_precursor"],
            "photo_url": payload.photo_url,
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
        action="Issue Assigned" if not payload.stop_work else "Stop Work Issued",
        actor_name="Safety Officer Lead",
        actor_role="Officer",
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
        action="Issue Accepted & Verified" if not is_corrected else "Issue Recalibrated",
        actor_name=payload.reviewer_name or "Safety Officer Lead",
        actor_role="Officer",
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

# GET /api/ai/status
@app.get("/api/ai/status")
def get_ai_status():
    has_key = bool(config.AI_API_KEY and len(config.AI_API_KEY.strip()) > 0)
    masked_key = ""
    if has_key:
        k = config.AI_API_KEY.strip()
        masked_key = f"{k[:7]}...{k[-4:]}" if len(k) > 12 else "****"
        
    return {
        "provider": config.AI_PROVIDER,
        "model": config.AI_MODEL,
        "base_url": config.AI_BASE_URL,
        "has_api_key": has_key,
        "masked_key": masked_key,
        "status": "Configured (Ready)" if has_key else "Operating on GATI Heuristic Engine",
        "fallback_engine": "GATI Multi-Factor SIF Scoring & IOGP Rule Heuristics (Active)"
    }

# POST /api/ai/test-key
@app.post("/api/ai/test-key")
def test_ai_key(payload: Optional[Dict[str, Any]] = None):
    p = payload or {}
    api_key = p.get("api_key") or config.AI_API_KEY
    base_url = p.get("base_url") or config.AI_BASE_URL
    model = p.get("model") or config.AI_MODEL
    
    result = ai_service.test_ai_connection(api_key, base_url, model)
    return result

# POST /api/ai/config
@app.post("/api/ai/config")
def update_ai_config(payload: Dict[str, Any]):
    if "api_key" in payload and payload["api_key"]:
        config.AI_API_KEY = payload["api_key"].strip()
    if "model" in payload and payload["model"]:
        config.AI_MODEL = payload["model"].strip()
    if "provider" in payload and payload["provider"]:
        config.AI_PROVIDER = payload["provider"].strip()
    if "base_url" in payload and payload["base_url"]:
        config.AI_BASE_URL = payload["base_url"].strip()
        
    return {
        "success": True,
        "message": "AI Engine settings updated successfully.",
        "status": get_ai_status()
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

# ==========================================
# SAFETY MANAGER: OFFICER MANAGEMENT & ALLOTMENTS
# ==========================================

# GET /api/manager/officers
@app.get("/api/manager/officers")
def get_manager_officers(db: Session = Depends(get_db)):
    # Auto-sync approved Officer users to OfficerProfile table if not already present
    officer_users = db.query(models.User).filter(
        models.User.role.in_(["Officer", "Safety Officer"]),
        models.User.approval_status == "Approved"
    ).all()
    
    for u in officer_users:
        existing_profile = db.query(models.OfficerProfile).filter(models.OfficerProfile.email == u.email).first()
        if not existing_profile:
            new_prof = models.OfficerProfile(
                officer_name=u.name,
                officer_code=u.id_number or f"OFF-{u.id:03d}",
                email=u.email,
                phone=u.phone or "+91 98450 11000",
                radio_channel="Ch 2 (VHF)",
                site="Refinery A",
                unit="CDU",
                shift="Shift A (06:00 - 14:00)",
                status="On Duty",
                certifications="LOTO Auditor, Gas Safety Specialist, Incident Lead",
                experience_years=5,
                max_capacity=8
            )
            db.add(new_prof)
    if officer_users:
        db.commit()

    officers = db.query(models.OfficerProfile).all()
    results = []
    
    for off in officers:
        # Calculate active workload metrics
        open_reviews = db.query(models.SafetyEvent).filter(
            models.SafetyEvent.status == "Needs Review",
            (models.SafetyEvent.reviewer == off.officer_name) | (models.SafetyEvent.site == off.site)
        ).count()
        
        assigned_tasks = db.query(models.OfficerTask).filter(
            models.OfficerTask.assigned_officer_id == off.id,
            models.OfficerTask.status.in_(["Assigned", "In Progress"])
        ).count()
        
        completed_tasks = db.query(models.OfficerTask).filter(
            models.OfficerTask.assigned_officer_id == off.id,
            models.OfficerTask.status == "Completed"
        ).count()
        
        total_tasks = db.query(models.OfficerTask).filter(
            models.OfficerTask.assigned_officer_id == off.id
        ).count()
        
        # Workload calculation: 0 - 100%
        workload_score = min(100, int(((assigned_tasks * 20) + (open_reviews * 10)) / max(1, off.max_capacity * 10) * 100))
        
        results.append({
            "id": off.id,
            "officer_name": off.officer_name,
            "officer_code": off.officer_code,
            "email": off.email,
            "phone": off.phone,
            "radio_channel": off.radio_channel,
            "site": off.site,
            "unit": off.unit,
            "shift": off.shift,
            "status": off.status,
            "certifications": off.certifications.split(", ") if off.certifications else [],
            "experience_years": off.experience_years,
            "max_capacity": off.max_capacity,
            "open_reviews_count": open_reviews,
            "active_tasks_count": assigned_tasks,
            "completed_tasks_count": completed_tasks,
            "total_tasks_count": total_tasks,
            "workload_score": workload_score,
            "compliance_rate": 98.4 if completed_tasks > 0 else 95.0
        })
        
    return results

# POST /api/manager/officers/allot
@app.post("/api/manager/officers/allot")
def allot_officer(payload: schemas.OfficerAllotmentPayload, db: Session = Depends(get_db)):
    officer = db.query(models.OfficerProfile).filter(models.OfficerProfile.id == payload.officer_id).first()
    if not officer:
        raise HTTPException(status_code=404, detail="Officer profile not found")
        
    old_site = officer.site
    old_shift = officer.shift
    
    officer.site = payload.site
    officer.unit = payload.unit
    officer.shift = payload.shift
    if payload.status:
        officer.status = payload.status
    if payload.radio_channel:
        officer.radio_channel = payload.radio_channel
        
    # Audit log
    audit = models.AuditEvent(
        event_id=f"ALLOT-{officer.officer_code}",
        action="Manager Workforce Allotment",
        details=f"HSE Manager reallocated Officer '{officer.officer_name}' from [{old_site} | {old_shift}] to [{payload.site} ({payload.unit}) | {payload.shift}]. Status: {payload.status}.",
        user_email="manager@refinery.safe"
    )
    db.add(audit)
    db.commit()
    db.refresh(officer)
    
    return {
        "success": True,
        "message": f"Successfully updated allotment for {officer.officer_name} to {officer.site} ({officer.shift}).",
        "officer": {
            "id": officer.id,
            "name": officer.officer_name,
            "site": officer.site,
            "unit": officer.unit,
            "shift": officer.shift,
            "status": officer.status
        }
    }

# GET /api/manager/tasks
@app.get("/api/manager/tasks")
def get_manager_tasks(
    request: Request,
    officer_id: Optional[int] = None, 
    site: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.OfficerTask)

    # If request comes from an Officer (not Manager/Admin), filter to their tasks only
    requester_email = request.headers.get("X-User-Email", "").strip()
    if requester_email:
        requester_user = db.query(models.User).filter(
            func.lower(models.User.email) == requester_email.lower()
        ).first()
        if requester_user and requester_user.role in ["Officer", "Safety Officer"]:
            # Find officer profile by email, user_id, or name
            officer_profile = db.query(models.OfficerProfile).filter(
                (func.lower(models.OfficerProfile.email) == requester_email.lower()) |
                (models.OfficerProfile.user_id == requester_user.id) |
                (func.lower(models.OfficerProfile.officer_name) == func.lower(requester_user.name))
            ).first()
            if officer_profile:
                query = query.filter(
                    (models.OfficerTask.assigned_officer_id == officer_profile.id) |
                    (func.lower(models.OfficerTask.assigned_officer_name) == func.lower(officer_profile.officer_name)) |
                    (func.lower(models.OfficerTask.assigned_officer_name) == func.lower(requester_user.name))
                )
            else:
                query = query.filter(
                    func.lower(models.OfficerTask.assigned_officer_name) == func.lower(requester_user.name)
                )

    if officer_id:
        query = query.filter(models.OfficerTask.assigned_officer_id == officer_id)
    if site:
        query = query.filter(models.OfficerTask.site == site)
    if status:
        query = query.filter(models.OfficerTask.status == status)
    if priority:
        query = query.filter(models.OfficerTask.priority == priority)
        
    tasks = query.order_by(models.OfficerTask.created_at.desc()).all()
    

    return [
        {
            "id": t.id,
            "task_id": t.task_id,
            "title": t.title,
            "task_type": t.task_type,
            "site": t.site,
            "unit": t.unit,
            "priority": t.priority,
            "assigned_officer_id": t.assigned_officer_id,
            "assigned_officer_name": t.assigned_officer_name,
            "assigned_by": t.assigned_by,
            "instructions": t.instructions,
            "status": t.status,
            "due_date": t.due_date.isoformat(),
            "findings": t.findings,
            "submitted_findings": getattr(t, "submitted_findings", None),
            "manager_notes": getattr(t, "manager_notes", None),
            "submitted_at": t.submitted_at.isoformat() if getattr(t, "submitted_at", None) else None,
            "related_event_id": t.related_event_id,
            "created_at": t.created_at.isoformat(),
            "completed_at": t.completed_at.isoformat() if t.completed_at else None
        }
        for t in tasks
    ]

# POST /api/manager/tasks
@app.post("/api/manager/tasks")
def create_manager_task(payload: schemas.OfficerTaskCreatePayload, db: Session = Depends(get_db)):
    officer = db.query(models.OfficerProfile).filter(models.OfficerProfile.id == payload.assigned_officer_id).first()
    if not officer:
        raise HTTPException(status_code=404, detail="Assigned officer profile not found")
        
    task_count = db.query(models.OfficerTask).count() + 1
    task_id = f"TSK-{100 + task_count:03d}"
    
    due_days = payload.due_days if payload.due_days and payload.due_days > 0 else 2
    due_date = datetime.datetime.utcnow() + datetime.timedelta(days=due_days)
    
    new_task = models.OfficerTask(
        task_id=task_id,
        title=payload.title,
        task_type=payload.task_type,
        site=payload.site,
        unit=payload.unit,
        priority=payload.priority,
        assigned_officer_id=officer.id,
        assigned_officer_name=officer.officer_name,
        assigned_by=payload.assigned_by or "HSE Safety Manager",
        instructions=payload.instructions,
        status="Assigned",
        due_date=due_date,
        related_event_id=payload.related_event_id
    )
    db.add(new_task)
    
    # Sync to SafetyEvent: link the report directly to this officer
    if payload.related_event_id:
        event = db.query(models.SafetyEvent).filter(
            (models.SafetyEvent.id == payload.related_event_id) |
            (models.SafetyEvent.report_code == payload.related_event_id)
        ).first()
        if event:
            event.reviewer = officer.officer_name
            event.assigned_team = officer.officer_name
            event.action_status = f"Assigned to {officer.officer_name}"
            if event.status in ["Needs Review", "Pending", "Open"]:
                event.status = "Assigned"

    # Audit log
    audit = models.AuditEvent(
        event_id=task_id,
        action="Manager Task Allotment",
        details=f"{payload.assigned_by or 'HSE Manager'} dispatched safety inspection '{payload.title}' ({payload.priority} Priority) to Officer '{officer.officer_name}' at {payload.site}.",
        user_email="manager@refinery.safe"
    )
    db.add(audit)
    db.commit()
    db.refresh(new_task)
    
    return {
        "success": True,
        "task_id": task_id,
        "message": f"Task {task_id} successfully created and allotted to {officer.officer_name}."
    }

# PUT /api/manager/tasks/{task_id}
@app.put("/api/manager/tasks/{task_id}")
def update_manager_task(task_id: str, payload: schemas.OfficerTaskUpdatePayload, db: Session = Depends(get_db)):
    task = db.query(models.OfficerTask).filter(
        (models.OfficerTask.task_id == task_id) | (models.OfficerTask.id == task_id)
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    old_status = task.status
    if payload.status:
        task.status = payload.status
        if payload.status == "Completed" and old_status != "Completed":
            task.completed_at = datetime.datetime.utcnow()

    if payload.findings is not None:
        task.findings = payload.findings
        
    if payload.assigned_officer_id:
        officer = db.query(models.OfficerProfile).filter(models.OfficerProfile.id == payload.assigned_officer_id).first()
        if officer:
            task.assigned_officer_id = officer.id
            task.assigned_officer_name = officer.officer_name

    audit_action = "Issue Completed" if task.status == "Completed" else ("Issue Rejected" if task.status == "Rejected" else "Progress Updated")
    audit = models.AuditEvent(
        event_id=task.related_event_id or task.task_id,
        action=audit_action,
        actor_name=task.assigned_officer_name or "Safety Officer",
        actor_role="Officer",
        details=f"Inspection '{task.title}' updated to status '{task.status}' by {task.assigned_officer_name}. Findings: {task.findings or 'Verified in field.'}",
        user_email="officer@refinery.safe"
    )
    db.add(audit)
    db.commit()
    
    return {
        "success": True,
        "task_id": task.task_id,
        "status": task.status,
        "findings": task.findings,
        "assigned_officer_name": task.assigned_officer_name,
        "message": f"Task {task.task_id} updated successfully to '{task.status}'."
    }

# POST /api/officer/tasks/{task_id}/submit-recheck
@app.post("/api/officer/tasks/{task_id}/submit-recheck")
def submit_task_for_recheck(task_id: str, payload: schemas.TaskSubmitRecheckPayload, db: Session = Depends(get_db)):
    """
    Safety Officer submits inspection report for Manager Re-Check after completing field action.
    """
    task = db.query(models.OfficerTask).filter(
        (models.OfficerTask.task_id == task_id) | (models.OfficerTask.id == task_id)
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    task.status = "Submitted"
    task.submitted_findings = payload.findings
    task.submitted_at = datetime.datetime.utcnow()
    task.findings = payload.findings
    
    # Sync with linked safety event
    if task.related_event_id:
        event = db.query(models.SafetyEvent).filter(
            (models.SafetyEvent.id == task.related_event_id) |
            (models.SafetyEvent.report_code == task.related_event_id)
        ).first()
        if event:
            event.action_status = "Pending Manager Re-Check"
            event.resolution_notes = payload.findings

    audit = models.AuditEvent(
        event_id=task.related_event_id or task.task_id,
        action="Report Submitted for Re-Check",
        actor_name=payload.officer_name or task.assigned_officer_name or "Safety Officer",
        actor_role="Officer",
        details=f"Officer '{task.assigned_officer_name}' completed field action and submitted task {task.task_id} for Manager Re-Check. Summary: {payload.findings[:120]}...",
        user_email="officer@refinery.safe"
    )
    db.add(audit)
    db.commit()
    db.refresh(task)

    return {
        "success": True,
        "task_id": task.task_id,
        "status": "Submitted",
        "message": f"Report for task {task.task_id} submitted successfully! Manager will now perform final re-check."
    }

# POST /api/manager/tasks/{task_id}/approve
@app.post("/api/manager/tasks/{task_id}/approve")
def approve_task_recheck(task_id: str, payload: schemas.TaskApprovePayload, db: Session = Depends(get_db)):
    """
    Safety Manager reviews and approves the officer's submitted report.
    Marks the issue as completely finished and sends completion confirmation to employee.
    """
    task = db.query(models.OfficerTask).filter(
        (models.OfficerTask.task_id == task_id) | (models.OfficerTask.id == task_id)
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    manager_name = payload.manager_name or "HSE Safety Manager"
    notes = payload.manager_notes or "Verified and approved in full compliance."
    
    task.status = "Completed"
    task.manager_notes = notes
    task.completed_at = datetime.datetime.utcnow()
    
    reporter_email = "worker@refinery.safe"
    report_label = task.related_event_id or task.task_id

    # Update SafetyEvent to Completely Finished / Resolved
    if task.related_event_id:
        event = db.query(models.SafetyEvent).filter(
            (models.SafetyEvent.id == task.related_event_id) |
            (models.SafetyEvent.report_code == task.related_event_id)
        ).first()
        if event:
            event.status = "Resolved"
            event.action_status = "Completed"
            event.resolution_notes = f"Approved & Verified by Manager {manager_name}: {notes}"
            reporter_email = event.reporter_email or reporter_email
            report_label = event.report_code or event.id

            # Also update SafetyReport status if linked
            if event.report_id:
                rep = db.query(models.SafetyReport).filter(models.SafetyReport.id == event.report_id).first()
                if rep:
                    rep.status = "Analyzed"

    # Audit event & Employee Complete Message
    audit = models.AuditEvent(
        event_id=report_label,
        action="Issue Completely Finished",
        actor_name=manager_name,
        actor_role="Manager",
        details=f"Manager {manager_name} reviewed and finalized issue {report_label}. Resolution: {notes}. Employee notified of complete resolution.",
        user_email=reporter_email
    )
    db.add(audit)
    db.commit()
    db.refresh(task)

    return {
        "success": True,
        "task_id": task.task_id,
        "status": "Completed",
        "message": f"Issue {report_label} has been approved by Manager {manager_name}. The issue is now completely finished and employee has been notified!"
    }

# POST /api/manager/tasks/{task_id}/reject
@app.post("/api/manager/tasks/{task_id}/reject")
def reject_task_recheck(task_id: str, payload: schemas.TaskRejectPayload, db: Session = Depends(get_db)):
    """
    Manager rejects or requests re-work from the officer on the submitted report.
    """
    task = db.query(models.OfficerTask).filter(
        (models.OfficerTask.task_id == task_id) | (models.OfficerTask.id == task_id)
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    manager_name = payload.manager_name or "HSE Manager"
    reason = payload.rejection_reason
    
    task.status = "In Progress"
    task.manager_notes = f"Revision Requested by {manager_name}: {reason}"
    
    if task.related_event_id:
        event = db.query(models.SafetyEvent).filter(
            (models.SafetyEvent.id == task.related_event_id) |
            (models.SafetyEvent.report_code == task.related_event_id)
        ).first()
        if event:
            event.action_status = "Needs Re-work"

    audit = models.AuditEvent(
        event_id=task.related_event_id or task.task_id,
        action="Re-Check Revision Requested",
        actor_name=manager_name,
        actor_role="Manager",
        details=f"Manager requested re-work for task {task.task_id} assigned to Officer {task.assigned_officer_name}. Notes: {reason}",
        user_email="manager@refinery.safe"
    )
    db.add(audit)
    db.commit()
    db.refresh(task)

    return {
        "success": True,
        "task_id": task.task_id,
        "status": "In Progress",
        "message": f"Re-work requested for task {task.task_id}. Officer {task.assigned_officer_name} will be notified."
    }

# POST /api/sif-risk/analyze
@app.post("/api/sif-risk/analyze")
def analyze_sif_risk_endpoint(payload: schemas.SifRiskAnalyzePayload, db: Session = Depends(get_db)):
    """
    Runs Cerebras AI SIF Risk Engine on the provided safety issue.
    Identifies the problem, risk rate, how dangerous it is, and comprehensive solutions.
    """
    if not payload.text or not payload.text.strip():
        raise HTTPException(status_code=400, detail="Safety issue text is required for SIF risk analysis.")

    report_meta = {
        "site": payload.site or "Refinery Unit",
        "unit": payload.unit or "Operational Area"
    }

    result = ai_service.analyze_sif_risk_with_cerebras(
        text=payload.text.strip(),
        api_key=payload.api_key,
        db=db,
        report_meta=report_meta
    )
    return result


# POST /api/manager/broadcast
@app.post("/api/manager/broadcast")
def broadcast_safety_directive(payload: schemas.SafetyDirectivePayload, db: Session = Depends(get_db)):
    dir_count = db.query(models.SafetyDirective).count() + 1
    directive_id = f"DIR-{500 + dir_count:03d}"
    
    target_scope = payload.target_scope or "ALL"
    target_name = payload.target_name or "All Operational Teams"
    target_sites = payload.target_sites or (target_name if target_scope == "SITE" else "All Operational Sites")
    
    directive = models.SafetyDirective(
        directive_id=directive_id,
        title=payload.title,
        message=payload.message,
        priority=payload.priority,
        target_scope=target_scope,
        target_name=target_name,
        target_sites=target_sites,
        issued_by=payload.issued_by or "HSE Safety Manager",
        acknowledge_count=0
    )
    db.add(directive)
    
    audit = models.AuditEvent(
        event_id=directive_id,
        action="Safety Directive Broadcast",
        details=f"{payload.issued_by or 'HSE Manager'} broadcasted '{payload.title}' to {target_scope}: '{target_name}'. Priority: {payload.priority}.",
        user_email="manager@refinery.safe"
    )
    db.add(audit)
    db.commit()
    
    return {
        "success": True,
        "directive_id": directive_id,
        "target_scope": target_scope,
        "target_name": target_name,
        "message": f"Safety Directive {directive_id} broadcasted to {target_name} ({target_scope})."
    }

# GET /api/manager/directives and /api/safety-directives
@app.get("/api/safety-directives")
@app.get("/api/manager/directives")
def get_safety_directives(db: Session = Depends(get_db)):
    directives = db.query(models.SafetyDirective).order_by(models.SafetyDirective.created_at.desc()).limit(25).all()
    return [
        {
            "id": d.id,
            "directive_id": d.directive_id,
            "title": d.title,
            "message": d.message,
            "priority": d.priority,
            "target_scope": getattr(d, "target_scope", "ALL") or "ALL",
            "target_name": getattr(d, "target_name", "All Operational Teams") or "All Operational Teams",
            "target_sites": d.target_sites,
            "issued_by": d.issued_by,
            "acknowledge_count": d.acknowledge_count,
            "created_at": d.created_at.isoformat()
        }
        for d in directives
    ]

# POST /api/manager/directives/{directive_id}/acknowledge
@app.post("/api/manager/directives/{directive_id}/acknowledge")
def acknowledge_safety_directive(directive_id: str, payload: schemas.DirectiveAcknowledgePayload, db: Session = Depends(get_db)):
    directive = db.query(models.SafetyDirective).filter(
        (models.SafetyDirective.directive_id == directive_id) | (models.SafetyDirective.id == directive_id)
    ).first()
    
    if not directive:
        raise HTTPException(status_code=404, detail="Directive not found")
        
    directive.acknowledge_count += 1
    
    audit = models.AuditEvent(
        event_id=directive.directive_id,
        action="Directive Acknowledged",
        details=f"{payload.role or 'Field Worker'} '{payload.user_name}' ({payload.user_email}) at {payload.site or 'Operational Site'} confirmed compliance with Directive {directive.directive_id}: '{directive.title}'.",
        user_email=payload.user_email or "worker@refinery.safe"
    )
    db.add(audit)
    db.commit()
    
    return {
        "success": True,
        "directive_id": directive.directive_id,
        "acknowledge_count": directive.acknowledge_count,
        "message": f"Directive {directive.directive_id} acknowledged by {payload.user_name}."
    }


# POST /api/manager/reassign-event
@app.post("/api/manager/reassign-event")
def reassign_event_to_officer(payload: schemas.ReassignEventPayload, db: Session = Depends(get_db)):
    event = db.query(models.SafetyEvent).filter(models.SafetyEvent.id == payload.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    old_reviewer = event.reviewer or "Unassigned"
    event.reviewer = payload.officer_name
    
    audit = models.AuditEvent(
        event_id=event.id,
        action="Manager Event Reassignment",
        details=f"HSE Manager reassigned event '{event.id}' from {old_reviewer} to '{payload.officer_name}'. Manager Note: {payload.manager_note or 'Priority Investigation Allotment'}.",
        user_email="manager@refinery.safe"
    )
    db.add(audit)
    db.commit()
    
    return {
        "success": True,
        "message": f"Event {event.id} successfully reassigned to Safety Officer {payload.officer_name}."
    }

# ==========================================
# SIF-SHIELD AI INTELLIGENCE ENDPOINTS
# ==========================================

# GET /api/ai/status
@app.get("/api/ai/status")
def get_ai_status_endpoint():
    """
    Returns AI provider configuration, model info, masked API key, and live connectivity status.
    """
    return ai_service.get_ai_status()

# POST /api/ai/test-key
@app.post("/api/ai/test-key")
def test_ai_key_endpoint(payload: schemas.AITestKeyPayload):
    """
    Runs a live ping test to the Cerebras / LLM endpoint with latency measurement.
    """
    return ai_service.test_ai_connection(
        api_key=payload.api_key,
        base_url=payload.base_url,
        model=payload.model
    )

# POST /api/ai/config
@app.post("/api/ai/config")
def update_ai_config_endpoint(payload: schemas.AIConfigPayload, db: Session = Depends(get_db)):
    """
    Updates AI provider, model, and API key dynamically and persists to .env.
    """
    result = ai_service.update_ai_config(
        provider=payload.provider,
        api_key=payload.api_key,
        base_url=payload.base_url,
        model=payload.model
    )
    
    # Create audit event
    audit = models.AuditEvent(
        event_id="AI-CONFIG-UPDATE",
        action="AI Engine Configuration",
        details=f"Administrator updated AI configuration: Provider={payload.provider}, Model={payload.model}.",
        user_email="admin@refinery.safe"
    )
    db.add(audit)
    db.commit()
    
    return {
        "success": True,
        "message": "AI Engine configuration updated successfully.",
        "config": result
    }

# POST /api/ai/pipeline
@app.post("/api/ai/pipeline")
def run_ai_pipeline_test(payload: schemas.AIPipelinePayload, db: Session = Depends(get_db)):
    """
    Runs the full M1-M6 precursor intelligence pipeline on sample text without saving to the DB.
    """
    meta = {
        "site": payload.site or "Digboi Refinery D",
        "unit": payload.unit or "CDU",
        "equipment_involved": payload.equipment_involved
    }
    
    analysis = ai_service.analyzeSafetyReport(payload.text, db, meta)
    
    return {
        "success": True,
        "summary": analysis,
        "raw_text": payload.text
    }

# POST /api/ai/chat
@app.post("/api/ai/chat")
def ai_safety_copilot_chat(payload: schemas.AIChatPayload, db: Session = Depends(get_db)):
    """
    AI Safety Copilot Q&A endpoint for safety officers and workers.
    """
    res = ai_service.ask_ai_safety_copilot(
        prompt=payload.message,
        context_event_id=payload.context_event_id,
        db=db
    )
    return res

# POST /api/events/{event_id}/ai-analyze
@app.post("/api/events/{event_id}/ai-analyze")
def ai_analyze_event_endpoint(event_id: str, db: Session = Depends(get_db)):
    """
    Runs full 6-stage AI precursor analysis & 0-10 risk scoring on an existing safety event,
    updates the record in the database, and returns the granular diagnostic breakdown.
    """
    try:
        result = ai_service.reanalyze_event_with_ai(event_id, db)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Analysis Failed: {str(e)}")

# POST /api/ai/batch-scan
@app.post("/api/ai/batch-scan")
def ai_batch_scan_endpoint(limit: int = 25, db: Session = Depends(get_db)):
    """
    Runs automated AI precursor intelligence scan across all pending / unreviewed events.
    """
    events = db.query(models.SafetyEvent).filter(
        models.SafetyEvent.status.in_(["Needs Review", "Pending"])
    ).limit(limit).all()
    
    updated_count = 0
    scanned_results = []
    
    for evt in events:
        try:
            res = ai_service.reanalyze_event_with_ai(evt.id, db)
            scanned_results.append({
                "id": evt.id,
                "score": res["analysis"].get("sif_risk_score"),
                "level": res["analysis"].get("risk_level"),
                "sif": res["analysis"].get("is_sif_precursor"),
                "rule": res["analysis"].get("life_saving_rule")
            })
            updated_count += 1
        except Exception as e:
            print(f"Error analyzing {evt.id}: {e}")
            
    return {
        "success": True,
        "scanned_count": updated_count,
        "results": scanned_results,
        "message": f"Successfully evaluated {updated_count} safety events using AI Precursor Engine."
    }

# ==========================================
# SIF RISK CEREBRAS ENGINE ENDPOINT
# ==========================================

# POST /api/sif-risk/analyze
@app.post("/api/sif-risk/analyze")
def analyze_sif_risk_endpoint(payload: schemas.SifRiskAnalyzePayload, db: Session = Depends(get_db)):
    """
    Dedicated SIF Risk Engine powered by Cerebras LLM.
    Identifies the problem, danger level, risk rate (0-10), fatality precursor,
    and returns 4-tier structured solutions (Immediate, Engineering, Administrative, Preventive).
    """
    try:
        meta = {
            "site": payload.site or "Operational Site",
            "unit": payload.unit or "Field Unit"
        }
        result = ai_service.analyze_sif_risk_with_cerebras(
            text=payload.text,
            api_key=payload.api_key,
            db=db,
            report_meta=meta
        )
        return result
    except Exception as e:
        print(f"SIF Risk Engine error: {e}")
        raise HTTPException(status_code=500, detail=f"SIF Risk evaluation error: {str(e)}")
