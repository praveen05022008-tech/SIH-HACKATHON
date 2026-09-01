import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import Base, engine, SessionLocal
from app import models, auth

def reset_and_clean_database():
    print("Dropping all existing database tables...")
    Base.metadata.drop_all(bind=engine)
    
    print("Creating clean database tables with latest schema...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        print("Creating baseline authentic users...")
        users = [
            models.User(
                email="worker@refinery.safe",
                password_hash="password123",
                name="Field Worker Demo",
                role="Field Worker",
                is_active=True
            ),
            models.User(
                email="officer@refinery.safe",
                password_hash="password123",
                name="Safety Officer Lead",
                role="Safety Officer",
                is_active=True
            ),
            models.User(
                email="reviewer@refinery.safe",
                password_hash="password123",
                name="Safety Reviewer Lead",
                role="Safety Officer",
                is_active=True
            ),
            models.User(
                email="manager@refinery.safe",
                password_hash="password123",
                name="HSE Manager / Lead",
                role="Safety Manager",
                is_active=True
            ),
            models.User(
                email="admin@refinery.safe",
                password_hash="password123",
                name="System Administrator",
                role="Admin",
                is_active=True
            ),
        ]
        db.add_all(users)

        print("Initializing standard Sites and Units taxonomy...")
        sites = [
            models.Site(name="Drilling Site A", code="DS-A", location="Onshore Basin Sector 1", site_type="Drilling Rig"),
            models.Site(name="Drilling Site B", code="DS-B", location="Onshore Basin Sector 2", site_type="Drilling Rig"),
            models.Site(name="Drilling Site C", code="DS-C", location="Deepwell Pad 3", site_type="Drilling Rig"),
            models.Site(name="Refinery Unit 1", code="REF-01", location="Coastal Complex Area A", site_type="Refinery"),
            models.Site(name="Refinery Unit 2", code="REF-02", location="Coastal Complex Area B", site_type="Refinery"),
        ]
        db.add_all(sites)
        db.flush()

        units = [
            models.Unit(site_id=sites[0].id, name="Rig Floor 01", code="RF-01"),
            models.Unit(site_id=sites[0].id, name="Mud Pump Section", code="MP-01"),
            models.Unit(site_id=sites[1].id, name="FCCU - Section 01", code="FCCU-01"),
            models.Unit(site_id=sites[1].id, name="Tank Farm - Section 02", code="TF-02"),
            models.Unit(site_id=sites[2].id, name="Utility Block Section 02", code="UB-02"),
        ]
        db.add_all(units)

        print("Initializing official IOGP Life-Saving Rules reference catalog (with 0 demo reports)...")
        lsr_rules = [
            ("Energy Isolation", "Verify isolation and zero energy before work begins."),
            ("Working at Height", "Protect yourself against falling when working at height."),
            ("Confined Space", "Obtain authorization before entering a confined space."),
            ("Line of Fire", "Keep yourself and others out of the line of fire."),
            ("Hot Work", "Control flammables and ignition sources."),
            ("Lifting Operations", "Plan lifting operations and control the area."),
            ("Bypassing Safety Controls", "Obtain authorization before overriding safety controls."),
            ("Driving", "Follow safe driving rules and wear seatbelts."),
            ("Safe Mechanical Handling", "Use mechanical aids and inspect lifting gear."),
            ("Work Authorization", "Work with a valid permit when required.")
        ]
        for name, desc in lsr_rules:
            db.add(models.LifeSavingRule(
                name=name,
                description=desc,
                total_reports=0,
                sif_potential_reports=0,
                precursor_density="Low",
                common_barrier_failure="None reported yet",
                top_sites="None",
                top_activities="None"
            ))

        db.commit()
        print("Database successfully wiped and initialized with clean tables and zero demo events!")
    except Exception as e:
        db.rollback()
        print("Error initializing database:", e)
        raise
    finally:
        db.close()

if __name__ == "__main__":
    reset_and_clean_database()
