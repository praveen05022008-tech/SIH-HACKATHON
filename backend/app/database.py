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
        try:
            import certifi
            ca_path = certifi.where()
        except ImportError:
            ca_path = "/etc/ssl/cert.pem" if os.path.exists("/etc/ssl/cert.pem") else None

        if ca_path and os.path.exists(ca_path):
            connect_args["ssl"] = {"ca": ca_path}
        else:
            connect_args["ssl"] = {"ssl_mode": "VERIFY_IDENTITY", "check_hostname": False}

    return cleaned_url, connect_args

_engine = None

def get_engine():
    global _engine
    if _engine is not None:
        return _engine

    db_url = config.DATABASE_URL
    if not db_url or "<PASSWORD>" in db_url:
        logger.error("TiDB database URL is missing or contains placeholder <PASSWORD>. SQLite local fallback is disabled.")
        raise RuntimeError(
            "TiDB Cloud database is configured as the EXCLUSIVE database. "
            "Local SQLite database has been disabled. "
            "Please provide your valid TiDB password in backend/app/.env (DATABASE_URL)."
        )

    cleaned_url, connect_args = normalize_db_url(db_url)
    logger.info(f"Connecting to TiDB Cloud Enterprise Database: {cleaned_url.split('@')[-1] if '@' in cleaned_url else cleaned_url}")

    import time
    max_retries = 3
    last_err = None
    for attempt in range(1, max_retries + 1):
        try:
            eng = create_engine(
                cleaned_url,
                connect_args=connect_args,
                pool_size=10,
                max_overflow=20,
                pool_pre_ping=True,
                pool_recycle=1800
            )
            with eng.connect() as conn:
                logger.info("Successfully connected to TiDB Cloud Enterprise Database.")
            _engine = eng
            return _engine
        except Exception as e:
            last_err = e
            logger.warning(f"Database connection attempt {attempt}/{max_retries} failed: {e}")
            if attempt < max_retries:
                time.sleep(2 * attempt)

    raise RuntimeError(f"Could not connect to TiDB Cloud Enterprise Database after {max_retries} attempts: {last_err}")

class LazyEngineProxy:
    def __getattr__(self, name):
        return getattr(get_engine(), name)

engine = LazyEngineProxy()

def SessionLocal():
    eng = get_engine()
    sm = sessionmaker(autocommit=False, autoflush=False, bind=eng)
    return sm()

def init_db():
    try:
        from backend.app import models
        eng = get_engine()
        Base.metadata.create_all(bind=eng)
        with eng.connect() as conn:
            for stmt in [
                "ALTER TABLE safety_directives ADD COLUMN target_scope VARCHAR(50) DEFAULT 'ALL'",
                "ALTER TABLE safety_directives ADD COLUMN target_name VARCHAR(100) DEFAULT 'All Operational Teams'",
                "ALTER TABLE audit_events ADD COLUMN login_time DATETIME NULL",
                "ALTER TABLE audit_events ADD COLUMN logout_time DATETIME NULL"
            ]:
                try:
                    conn.execute(text(stmt))
                    conn.commit()
                except Exception:
                    pass
        logger.info("Database schema initialized and verified.")
    except Exception as e:
        if "<PASSWORD>" in config.DATABASE_URL:
            logger.info("Database schema initialization deferred until valid TiDB password is provided in .env.")
        else:
            logger.warning(f"Database initialization note: {e}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

