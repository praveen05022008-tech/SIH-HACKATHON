import logging
import sys
import os
from sqlalchemy import create_engine
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

def get_engine():
    db_url = config.DATABASE_URL
    is_sqlite = config.IS_SQLITE
    
    # Try connecting to primary Enterprise DB (TiDB Cloud / PostgreSQL / MySQL)
    try:
        if not is_sqlite:
            logger.info(f"Attempting connection to Primary Enterprise DB: {db_url.split('@')[-1] if '@' in db_url else db_url}")
            engine = create_engine(
                db_url,
                pool_size=20,
                max_overflow=30,
                pool_pre_ping=True,
                pool_recycle=1800
            )
            with engine.connect() as conn:
                logger.info("Successfully connected to SIF-SHIELD AI Enterprise Database.")
            return engine
    except Exception as e:
        logger.error(f"Failed to connect to primary database: {e}. Utilizing high-performance SQLite engine.")
    
    # SQLite fallback engine with multi-threading
    logger.info("Initializing SQLite database connection.")
    engine = create_engine(
        config.SQLITE_FALLBACK_URL,
        connect_args={"check_same_thread": False}
    )
    return engine

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
