import logging
import sys
import os
import ssl
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

try:
    from backend.app import config
except ImportError:
    try:
        from app import config
    except ImportError:
        import config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mayan-safe.database")

Base = declarative_base()

def normalize_db_url(raw_url: str):
    """Normalize database connection URL for PyMySQL and TiDB Cloud compatibility."""
    if not raw_url:
        return raw_url, {}

    # 1. Use pymysql driver
    if raw_url.startswith("mysql+mysqldb://"):
        norm = raw_url.replace("mysql+mysqldb://", "mysql+pymysql://", 1)
    elif raw_url.startswith("mysql://"):
        norm = raw_url.replace("mysql://", "mysql+pymysql://", 1)
    else:
        norm = raw_url

    parsed = urlparse(norm)
    qs = parse_qs(parsed.query)

    # 2. PyMySQL doesn't support 'ssl_mode' query parameter
    qs.pop("ssl_mode", None)

    # 3. TiDB Serverless / MySQL /sys is a read-only system database; route user data to /test
    path = parsed.path
    if path.rstrip("/") in ["", "/sys"]:
        path = "/test"

    new_query = urlencode(qs, doseq=True)
    cleaned_url = urlunparse(parsed._replace(path=path, query=new_query))

    connect_args = {}
    if "tidbcloud.com" in cleaned_url.lower() and "ssl_ca" not in cleaned_url:
        if os.path.exists("/etc/ssl/cert.pem"):
            connect_args["ssl"] = {"ca": "/etc/ssl/cert.pem"}
        else:
            connect_args["ssl"] = ssl.create_default_context()

    return cleaned_url, connect_args

def get_engine():
    db_url = config.DATABASE_URL
    
    # If placeholder password is present, fallback directly to SQLite
    if not db_url or "<PASSWORD>" in db_url:
        sqlite_path = os.path.join(os.path.dirname(__file__), "safety.db")
        sqlite_url = f"sqlite:///{sqlite_path}"
        logger.info(f"Using local SQLite database: {sqlite_url}")
        return create_engine(sqlite_url, connect_args={"check_same_thread": False})

    cleaned_url, connect_args = normalize_db_url(db_url)
    logger.info(f"Connecting to TiDB Cloud Enterprise Database: {cleaned_url.split('@')[-1] if '@' in cleaned_url else cleaned_url}")
    
    try:
        engine = create_engine(
            cleaned_url,
            connect_args=connect_args,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
            pool_recycle=1800
        )
        with engine.connect() as conn:
            logger.info("Successfully connected to TiDB Cloud Enterprise Database.")
        return engine
    except Exception as e:
        logger.warning(f"Could not connect to TiDB Cloud ({e}). Falling back to local SQLite database.")
        sqlite_path = os.path.join(os.path.dirname(__file__), "safety.db")
        sqlite_url = f"sqlite:///{sqlite_path}"
        return create_engine(sqlite_url, connect_args={"check_same_thread": False})

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    try:
        # Ensure tables exist
        from backend.app import models
        Base.metadata.create_all(bind=engine)
        with engine.connect() as conn:
            try:
                conn.execute(text("ALTER TABLE safety_directives ADD COLUMN target_scope VARCHAR(50) DEFAULT 'ALL'"))
                conn.commit()
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE safety_directives ADD COLUMN target_name VARCHAR(100) DEFAULT 'All Operational Teams'"))
                conn.commit()
            except Exception:
                pass
    except Exception as e:
        if "<PASSWORD>" in config.DATABASE_URL:
            logger.info("Database schema initialization deferred until valid TiDB password is provided in .env.")
        else:
            logger.warning(f"Database initialization note: {e}")

init_db()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
