from sqlalchemy.orm import Session
from backend.app import models

def authenticate_user(db: Session, email: str, password: str):
    """
    Finds and authenticates a user for demo purposes.
    Supports preset credentials: manager@refinery.safe, analyst@refinery.safe, reviewer@refinery.safe.
    """
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        return None
    # For demo ease, we accept 'password123' or direct match
    if password == "password123" or user.password_hash == password:
        return user
    return None
