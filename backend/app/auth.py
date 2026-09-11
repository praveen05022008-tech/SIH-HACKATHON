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

import bcrypt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password or not plain_password:
        return False
    # If already a bcrypt hash
    if hashed_password.startswith(("$2a$", "$2b$", "$2y$")):
        try:
            return bcrypt.checkpw(plain_password.encode("utf-8")[:72], hashed_password.encode("utf-8"))
        except Exception:
            return False
    # Legacy plaintext comparison
    return hashed_password == plain_password

def get_password_hash(password: str) -> str:
    pwd_bytes = (password or "").encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def authenticate_user(db: Session, email: str, password: str):
    """
    Finds and authenticates a user by email and password using bcrypt.
    Safely upgrades legacy plaintext passwords to bcrypt upon successful verification.
    """
    cleaned_email = (email or "").strip().lower()
    user = db.query(models.User).filter(models.User.email.ilike(cleaned_email)).first()
    if not user:
        return None

    if verify_password(password, user.password_hash):
        # Automatically upgrade legacy plaintext password to secure bcrypt hash
        if not user.password_hash.startswith(("$2a$", "$2b$", "$2y$")):
            try:
                user.password_hash = get_password_hash(password)
                db.commit()
                db.refresh(user)
            except Exception:
                db.rollback()
        return user

    return None

