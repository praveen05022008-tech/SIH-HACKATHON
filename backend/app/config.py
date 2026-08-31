import os
from dotenv import load_dotenv

# Load from .env file
env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
SECRET_KEY = os.getenv("SECRET_KEY", "raksha_ai_secret_key_2026")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
ENV = os.getenv("ENV", "development")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Determine database url and fallback
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SQLITE_DB_PATH = os.path.join(BASE_DIR, "mayan_safe.db")
SQLITE_FALLBACK_URL = f"sqlite:///{SQLITE_DB_PATH.replace(os.sep, '/')}"
IS_SQLITE = False

if not DATABASE_URL or "<PASSWORD>" in DATABASE_URL or "password" in DATABASE_URL.lower() or len(DATABASE_URL.strip()) == 0:
    DATABASE_URL = SQLITE_FALLBACK_URL
    IS_SQLITE = True
