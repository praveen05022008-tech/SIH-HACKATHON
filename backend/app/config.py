import os
from dotenv import load_dotenv

# Load from .env or env file
for possible_env in [
    os.path.join(os.path.dirname(__file__), ".env"),
    os.path.join(os.path.dirname(__file__), "env"),
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
]:
    if os.path.exists(possible_env):
        load_dotenv(possible_env)

# Primary Enterprise Database (TiDB Cloud MySQL protocol)
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://3jfTYcg9qFzDk43.root:<PASSWORD>@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/sys"
)

SECRET_KEY = os.getenv("SECRET_KEY", "gati_secret_key_sih_2026_mayan_safe")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
ENV = os.getenv("ENV", "development")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

# Cloudinary Configuration (Image Uploads & Storage)
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY", "569737981981872")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "TpQm-JkWcqPn--7oeQWaUXoBA54")
CLOUDINARY_URL = os.getenv("CLOUDINARY_URL", "")

# AI Engine Configuration (Cerebras / OpenAI compatible)
AI_PROVIDER = os.getenv("AI_PROVIDER", "cerebras")
AI_API_KEY = os.getenv("AI_API_KEY", "")
AI_BASE_URL = os.getenv("AI_BASE_URL", "https://api.cerebras.ai/v1")
AI_MODEL = os.getenv("AI_MODEL", "gpt-oss-120b")

# Hugging Face Configuration (Whisper-v3 Speech AI)
HF_TOKEN = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_API_KEY") or ""
HF_WHISPER_URL = "https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3-turbo"
