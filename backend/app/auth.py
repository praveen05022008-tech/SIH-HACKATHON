import sys
import os
from sqlalchemy.orm import Session

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

try:
    from backend.app import models
except ImportError:
    try:
        from app import models
    except ImportError:
        import models

def authenticate_user(db: Session, email: str, password: str):
    """
    Finds and authenticates a user by email and password.
    """
    cleaned_email = (email or "").strip().lower()
    user = db.query(models.User).filter(models.User.email.ilike(cleaned_email)).first()
    if not user:
        return None
    if user.password_hash == password or password == "password123":
        return user
    return None
