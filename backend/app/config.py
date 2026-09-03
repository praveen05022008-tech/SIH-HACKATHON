import os
import tempfile
import shutil
from dotenv import load_dotenv

# Load from .env or env file
for possible_env in [
    os.path.join(os.path.dirname(__file__), ".env"),
    os.path.join(os.path.dirname(__file__), "env"),
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
]:
    if os.path.exists(possible_env):
        load_dotenv(possible_env)

DATABASE_URL = os.getenv("DATABASE_URL", "")
SECRET_KEY = os.getenv("SECRET_KEY", "raksha_ai_secret_key_2026")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
ENV = os.getenv("ENV", "development")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Determine database url and fallback
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

# In Vercel or Serverless environments, filesystem is read-only except in temp directory
is_serverless = bool(os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"))
if is_serverless:
    SQLITE_DB_PATH = os.path.join(tempfile.gettempdir(), "mayan_safe.db")
    src_db = os.path.join(BASE_DIR, "mayan_safe.db")
    if os.path.exists(src_db) and not os.path.exists(SQLITE_DB_PATH):
        try:
            shutil.copy2(src_db, SQLITE_DB_PATH)
        except Exception:
            pass
else:
    SQLITE_DB_PATH = os.path.join(BASE_DIR, "mayan_safe.db")

SQLITE_FALLBACK_URL = f"sqlite:///{SQLITE_DB_PATH.replace(os.sep, '/')}"
IS_SQLITE = False

if not DATABASE_URL or "<PASSWORD>" in DATABASE_URL or "password" in DATABASE_URL.lower() or len(DATABASE_URL.strip()) == 0:
    DATABASE_URL = SQLITE_FALLBACK_URL
    IS_SQLITE = True

# AI Engine Configuration (Cerebras / OpenAI compatible)
AI_PROVIDER = os.getenv("AI_PROVIDER", "cerebras")
AI_API_KEY = os.getenv("AI_API_KEY", "")
AI_BASE_URL = os.getenv("AI_BASE_URL", "https://api.cerebras.ai/v1")
AI_MODEL = os.getenv("AI_MODEL", "gpt-oss-120b")

# Hugging Face Configuration (Whisper-v3 Speech AI)
HF_TOKEN = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_API_KEY") or ""
HF_WHISPER_URL = "https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3-turbo"
