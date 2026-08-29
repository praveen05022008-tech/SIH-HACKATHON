import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app import config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mayan-safe.database")

Base = declarative_base()

def get_engine():
    db_url = config.DATABASE_URL
    is_sqlite = config.IS_SQLITE
    
    # Try connecting to the primary DB
    try:
        if not is_sqlite:
            logger.info(f"Attempting connection to TiDB/MySQL: {db_url.split('@')[-1] if '@' in db_url else db_url}")
            engine = create_engine(
                db_url,
                pool_pre_ping=True,
                pool_recycle=3600
            )
            # Test connection
            with engine.connect() as conn:
                logger.info("Successfully connected to TiDB/MySQL database.")
            return engine
    except Exception as e:
        logger.error(f"Failed to connect to TiDB database: {e}. Falling back to SQLite.")
    
    # SQLite Fallback engine
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
