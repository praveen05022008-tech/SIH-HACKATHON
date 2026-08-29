import os
from dotenv import load_dotenv

# Load from .env file
# Try loading from the app directory, then the parent backend directory
env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
SECRET_KEY = os.getenv("SECRET_KEY", "gati_secret_key_sih_2026_mayan_safe")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
ENV = os.getenv("ENV", "development")

# Determine if SQLite fallback is required
SQLITE_FALLBACK_URL = "sqlite:///./mayan_safe.db"
IS_SQLITE = False

if not DATABASE_URL or "<PASSWORD>" in DATABASE_URL or "password" in DATABASE_URL.lower() or len(DATABASE_URL.strip()) == 0:
    DATABASE_URL = SQLITE_FALLBACK_URL
    IS_SQLITE = True
