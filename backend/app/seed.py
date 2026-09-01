import random
import datetime
import sys
import os
from sqlalchemy.orm import Session

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

try:
    from backend.app.database import SessionLocal, Base, engine
    from backend.app import models, ai_service, precursor_engine
except ImportError:
    try:
        from app.database import SessionLocal, Base, engine
        from app import models, ai_service, precursor_engine
    except ImportError:
        from database import SessionLocal, Base, engine
        import models, ai_service, precursor_engine

# Raw synthetic reports dataset (100+ reports)
RAW_REPORTS_DATA = [
    # Energy Isolation (SIF Potential)
    ("During maintenance activity near the crude unit, a worker was observed entering the work area while the associated energy isolation was not independently verified. The line was believed to be depressurised but isolation status was unclear.", "Refinery A", "CDU"),
    ("Steam valve isolation at DHU was performed using a single gate valve instead of double block and bleed. Pressure gauge was fluctuating during pipe opening.", "Refinery B", "DHU"),
    ("Electrician started working on motor terminal box at FCCU while the circuit breaker was not locked out with LOTO locks. Circuit was later found live.", "Refinery A", "FCCU"),
    ("Valve maintenance on V-204 was initiated without verifying that the line pressure had reached zero. Residual hot condensate leaked from flange.", "Refinery C", "CDU"),
    ("A technician was found replacing a pressure transmitter at VDU unit without verifying isolation locks or verifying the block valve was fully closed.", "Refinery D", "VDU"),
    ("Instrument technician bypassed lock-out tag-out on control valve FV-102 at Refinery B to test calibration without informing the control room operator.", "Refinery B", "CDU"),
    ("Operator opened a drain valve on high pressure feed pump without confirming manual isolation valves upstream were closed. Minor hydrocarbon spray occurred.", "Refinery E", "FCCU"),
    ("Double block and bleed valves for vessel V-101 isolation were found passing. Isolation verification log was signed as completed.", "Refinery A", "Utility Block"),
    ("Contractor crew began hot line piping flange dismantle without LOTO padlock on the header valve. Operation stopped by HSE observer.", "Refinery C", "DHU"),
    ("Maintenance supervisor signed off line isolation as completed, but physical padlock was not installed on breaker panel breaker #12.", "Refinery D", "Utility Block"),

    # Working at Height (SIF Potential)
    ("An inspector was observed climbing scaffolding at CDU area without clipping harness lanyard to structural anchor point above 5 meters height.", "Refinery A", "CDU"),
    ("A subcontractor was working on a temporary scaffold platform at FCCU which was missing toe boards and mid-rails. Risk of material fall.", "Refinery B", "FCCU"),
    ("Technician adjusted pressure switch on top of separator vessel at DHU using a portable ladder that was not secured at top or bottom.", "Refinery C", "DHU"),
    ("Worker was seen walking on VDU piperack piping without wearing a safety harness or using a lifeline. High risk of fatal fall.", "Refinery D", "VDU"),
    ("Scaffolder was erecting scaffold tower at Utility Block and was standing on unpinned wooden planks which shifted as he moved.", "Refinery E", "Utility Block"),
    ("Contractor was working near roof edge of control room building without fall arrest system or barricades to prevent falling.", "Refinery A", "Utility Block"),
    ("A supervisor climbed VDU accumulator column ladder while carrying heavy tools in both hands, leaving zero hands for climbing contact.", "Refinery B", "VDU"),
    ("Worker stood on top rung of an A-frame ladder to clean lighting fixture in refinery storage shed, losing balance momentarily.", "Refinery C", "Utility Block"),
    ("Scaffold tags at crude unit were marked green (safe) but diagonal bracing and base plates were missing on the north face.", "Refinery D", "CDU"),
    ("A painter was observed standing on a handrail to reach high spots on tank TK-502 wall without safety harness protection.", "Refinery E", "Tank Farm"),

    # Confined Space (SIF Potential)
    ("Two entry workers entered columns at CDU for cleaning before the atmosphere gas test was completed and entry permit was signed by supervisor.", "Refinery A", "CDU"),
    ("HSE monitor noticed that the ventilation blower for tank TK-201 confined space entry was switched off while crew was working inside.", "Refinery B", "Tank Farm"),
    ("Operator entered pump pit chamber to inspect valve leak without personal gas detector or atmospheric clearance verification.", "Refinery C", "Utility Block"),
    ("Safety watch left manhole of vessel V-305 unattended while three contractors were performing internal weld repairs inside.", "Refinery D", "FCCU"),
    ("No rescue tripod or safety harness was prepared at the entrance of column C-102 during internal tray inspection work.", "Refinery A", "VDU"),
    ("Contractor entered separator vessel for cleaning and felt dizzy. Nitrogen purging was active in adjacent line with poor isolation.", "Refinery B", "DHU"),
    ("Internal gas test in tank TK-104 showed oxygen level at 17.5% but supervisor cleared the entry permit anyway without oxygen supply.", "Refinery C", "Tank Farm"),
    ("Technician climbed down to sewer manhole to take sludge sample without carrying multi-gas detector or wearing SCBA.", "Refinery D", "Utility Block"),
    ("Confined space entry permit for vessel V-401 was signed yesterday, but crew entered today without conducting a fresh gas analysis.", "Refinery E", "CDU"),
    ("Welding crew inside separator drum was using butane torch with no constant ventilation, causing accumulation of heat and smoke.", "Refinery A", "FCCU"),

    # Line of Fire (SIF Potential)
    ("During heavy lift of piping spool at VDU, a technician walked directly beneath the suspended load to adjust a tagline.", "Refinery D", "VDU"),
    ("A helper was observed grinding steel plate with no face shield or sparks shield, directing sparks directly towards gas cylinders.", "Refinery B", "Utility Block"),
    ("Operator was standing in direct line of sight of high-pressure boiler flange during steam pressure testing, bypassing safety barriers.", "Refinery C", "Utility Block"),
    ("Rigger stood between crane outrigger and concrete retaining wall during crane positioning. Risk of crushing if crane shifted.", "Refinery A", "FCCU"),
    ("Contractor was hammering flange bolts with sledgehammer while helper held the wedge with bare hands directly in path of hammer.", "Refinery E", "CDU"),
    ("Forklift reversed inside warehouse while helper was walking behind it. Forklift rear alarm was broken.", "Refinery D", "Utility Block"),
    ("Technician opened boiler inspect hatch while line was pressurized. Blast of hot air and dust escaped towards inspector.", "Refinery B", "Utility Block"),
    ("Piping crew did not barricade the area below flange bolt torqueing activity. Heavy wrench slipped and fell 10 meters to walkway.", "Refinery A", "CDU"),
    ("Excavator bucket was rotating near live piping line. Spotter was standing in the excavator swing radius with no visibility.", "Refinery C", "Tank Farm"),
    ("Operator unscrewed pressure valve cap on live chemical line without standing on safe side. Fluid sprayed opposite side.", "Refinery E", "DHU"),

    # Hot Work (SIF Potential)
    ("Welding was conducted on fuel gas piping at Refinery C crude unit while flammable gas concentration was not checked beforehand.", "Refinery C", "CDU"),
    ("Welder started structural welding at Tank Farm without placing fire blankets. Sparks fell onto oily sludge in interceptor pit.", "Refinery B", "Tank Farm"),
    ("Grinding crew started hot work at Utility Block with an expired hot work permit and without fire extinguisher at hand.", "Refinery D", "Utility Block"),
    ("Contractor used diesel generator inside gas compressor building. Generator exhaust was pointing towards vent line.", "Refinery A", "FCCU"),
    ("Welding machine grounding cable was connected to active process pipe rather than structural beam. Risk of electrical arc hole.", "Refinery E", "DHU"),
    ("Hot work permit was authorized, but gas monitor showed hydrocarbon levels at 5% LEL in the immediate welding area.", "Refinery A", "CDU"),
    ("Gas cutting contractor did not secure gas cylinder hoses. Oxygen and acetylene hoses were cracked and leaking near flame.", "Refinery B", "Utility Block"),
    ("Grinder operated near open oily sewer drain which was not sealed with fire-resistant clay or wet fire blankets.", "Refinery D", "FCCU"),
    ("Welder left active welding electrode holder on process piping while going for lunch break. Electrode was still energized.", "Refinery C", "VDU"),
    ("Supervisor authorized hot work near gasoline pump strainer without establishing a dedicated continuous fire watch.", "Refinery E", "Tank Farm"),

    # Lifting Operations (SIF Potential)
    ("Crane operator initiated lift of a 10-ton exchanger bundle at CDU without checking load rating chart or verifying lift plan.", "Refinery A", "CDU"),
    ("Rigging crew used a corroded steel sling with visible broken wires to lift chemical drums. Sling was not color-coded.", "Refinery C", "DHU"),
    ("Technician walked into lifting exclusion zone under suspended structural column while crane was slewing over the pipe rack.", "Refinery B", "FCCU"),
    ("A mobile crane was set up on soft soil at Refinery D without using spreader plates under outriggers. Outrigger sank slightly.", "Refinery D", "VDU"),
    ("Crane lifting hook was missing the safety latch. Rigger hooked up the wire rope sling anyway for lifting pipe spool.", "Refinery E", "Utility Block"),
    ("Rigging crew lifted large storage tank roof plate in high winds exceeding 25 knots. Plate swayed wildly near live lines.", "Refinery A", "Tank Farm"),
    ("Crane operator bypassed crane load-moment indicator (LMI) system to lift load that exceeded safe operating limits.", "Refinery B", "Utility Block"),
    ("A crane lift was executed directly over operating pumps at FCCU instead of routing the load along designated safe corridors.", "Refinery D", "FCCU"),
    ("HSE auditor noticed crane operator did not perform pre-lift checks. Crane hydraulic line was leaking oil on outriggers.", "Refinery C", "CDU"),
    ("Lifting crew did not attach tag lines to long structural beams, causing load to spin and hit scaffolding pole.", "Refinery E", "Utility Block"),

    # Vehicle Safety
    ("A refinery pick-up truck was caught driving at 50 km/h in a designated 15 km/h zone near the main CDU process unit.", "Refinery A", "CDU"),
    ("Contractor forklift driver was operating vehicle without fastening seatbelt and carrying load that blocked front vision.", "Refinery C", "Utility Block"),
    ("Subcontractor delivery truck reversed into Refinery B storage yard without helper backing support or reverse alarm functioning.", "Refinery B", "Tank Farm"),
    ("Operator was spotted reading mobile phone while driving a utility vehicle on refinery perimeter security road.", "Refinery D", "Utility Block"),
    ("Forklift driver carried an operator on the forks to reach high warehouse shelf for picking up gaskets. High fall risk.", "Refinery E", "Utility Block"),

    # Electrical Safety
    ("An electrician was found troubleshooting a 415V switchboard panel with cabinet door open and exposed live terminals, using uninsulated screwdriver.", "Refinery A", "Utility Block"),
    ("Temporary power distribution board at Refinery C was missing ground fault circuit interrupter (GFCI) and had exposed joints.", "Refinery C", "CDU"),
    ("A technician plugged in a high-pressure washing machine using frayed power cable with exposed copper wiring in wet area.", "Refinery B", "Tank Farm"),
    ("Maintenance crew started valve inspection near high voltage cables that were exposed due to ongoing excavation work.", "Refinery D", "VDU"),
    ("Worker touched switchboard panel with wet gloves. Safety warning labels were missing from the panel front face.", "Refinery E", "Utility Block")
]

# Non-SIF potential reports (minor, standard reports to create realistic distribution)
NON_SIF_REPORTS = [
    ("Oily rag was found on floor near pump P-102. Housekeeping action required to clear the area.", "Refinery A", "CDU"),
    ("Emergency exit sign near control room building was flickering. Maintenance ticket logged for lamp replacement.", "Refinery A", "CDU"),
    ("A minor water leakage was observed from cooling water utility line flange. Area barricaded, no oil present.", "Refinery B", "Utility Block"),
    ("Safety helmet rack at warehouse entry was broken. Helmets were kept on the floor.", "Refinery C", "Utility Block"),
    ("Worker was spotted wearing non-safety sneakers inside administrative office zone. Reminder issued.", "Refinery D", "Utility Block"),
    ("Empty wooden pallets were stacked too high (over 3 meters) in the refinery salvage yard.", "Refinery E", "Tank Farm"),
    ("Puddle of rainwater accumulated near control room entrance, creating a minor slip hazard. Housekeeping called.", "Refinery A", "Utility Block"),
    ("Eyewash station at chemical dosing skid had low water pressure. Maintenance team notified to clean strainer.", "Refinery B", "DHU"),
    ("Safety poster on Life Saving Rules was torn and illegible near canteen bulletin board.", "Refinery C", "Utility Block"),
    ("A trash bin in utility room was overflowing with paper waste. Cleaned by housekeeping crew.", "Refinery D", "Utility Block"),
    ("Handrail on administrative staircase was slightly loose. No immediate danger but needs tightening.", "Refinery E", "Utility Block"),
    ("HSE walk found that nitrogen cylinder gas valve caps were not placed in the storage shed.", "Refinery A", "Tank Farm"),
    ("Oily floor observed in mechanical workshop due to minor lube oil can drip during tool lubrication.", "Refinery B", "Utility Block"),
    ("Noise warning sign at compressor building door was faded. Needs replacement to comply with standards.", "Refinery C", "FCCU"),
    ("A worker forgot to wear safety goggles in administrative office while handling standard printer toner cartridge.", "Refinery D", "Utility Block"),
    ("Water bottle was left on top of electrical instrument enclosure. Removed immediately by supervisor.", "Refinery E", "Utility Block"),
    ("Scaffold pipe clamp was found lying on ground near road side. Housekeeping cleared it.", "Refinery A", "CDU"),
    ("Safety cabinet for storing earplugs was unlocked. Plugs are non-hazardous, but cabinet should be locked.", "Refinery B", "Utility Block"),
    ("Minor paint peeling on fire extinguisher station board at VDU. Scheduled for painting next week.", "Refinery D", "VDU"),
    ("Operator noted that safety walk records folder in control room was full and required new binder.", "Refinery E", "CDU"),
    ("Loose electrical wire conduit found in administrative hallway corridor, no live power detected.", "Refinery A", "Utility Block"),
    ("A fire hydrant access gate at Refinery C was partially blocked by temporary scaffolding pipes.", "Refinery C", "CDU"),
    ("Lube oil collection drum at workshop had a minor oil drip on the tray. Absorbent pads placed.", "Refinery D", "Utility Block"),
    ("Slight dusting of cement powder observed on floor near utility walkway. Cleared by contractor crew.", "Refinery B", "Utility Block"),
    ("Safety helmet chin strap was found broken on a standby inspector. Helmet replaced from stores.", "Refinery E", "FCCU"),
    ("A minor steam leakage from flange gasket of heating line was reported in mechanical workshop.", "Refinery A", "Utility Block"),
    ("First aid kit in control room had an expired burn ointment tube. Replaced from medical stores.", "Refinery B", "CDU"),
    ("A warning sign board for 'Hot Pipe - Do Not Touch' was loose and sliding down the pipe rack structure.", "Refinery C", "DHU"),
    ("Minor paint peeling noticed on the emergency exit stairways of the secondary control center.", "Refinery D", "VDU"),
    ("Two safety goggles in chemical lab were found scratched, reducing visibility. Replaced with new ones.", "Refinery E", "Utility Block"),
    ("Water dispenser near the administrative desk had minor water logging underneath it. Mopped immediately.", "Refinery A", "Utility Block"),
    ("HSE inspector noted that the earplug dispenser box at compressor building entryway was empty.", "Refinery B", "FCCU"),
    ("An extension board in office had a minor loose plug socket. Unplugged and sent for electrical check.", "Refinery C", "Utility Block"),
    ("Reflective safety vest was found torn on a field helper. Vest replaced before starting shift.", "Refinery D", "CDU"),
    ("Temporary warning tape around minor trench work was found torn due to wind. Replaced tape.", "Refinery E", "Tank Farm"),
    ("A flashlight battery was found dead during pre-shift equipment check at jetty operations. Replaced.", "Refinery A", "Utility Block")
]

def seed_database():
    db = SessionLocal()
    print("Database seeding started...")
    
    # 1. Clean existing records
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("Cleaned existing tables and created fresh schemas.")

    # 2. Seed Default Users (5 personas)
    demo_users = [
        models.User(email="worker@refinery.safe", name="Ramesh Kumar (Drilling Tech)", password_hash="password123", role="Field Worker"),
        models.User(email="officer@refinery.safe", name="Capt. Arvind Sen (Safety Lead)", password_hash="password123", role="Safety Officer"),
        models.User(email="reviewer@refinery.safe", name="Priya Sharma (HSE Inspector)", password_hash="password123", role="Safety Officer"),
        models.User(email="manager@refinery.safe", name="Dr. Vikram Roy (Head of HSE)", password_hash="password123", role="Safety Manager"),
        models.User(email="admin@refinery.safe", name="DevOps System Admin", password_hash="password123", role="Admin")
    ]
    for u in demo_users:
        db.add(u)
    db.commit()
    print("Users seeded successfully with 5 personas.")

    # 2b. Seed Officer Profiles
    officer_profiles = [
        models.OfficerProfile(
            officer_name="Capt. Arvind Sen",
            officer_code="OFF-101",
            email="officer@refinery.safe",
            phone="+91 98450 11001",
            radio_channel="Ch 4 (VHF Drilling)",
            site="Drilling Site A",
            unit="Rig Floor 01",
            shift="Shift A (06:00 - 14:00)",
            status="On Duty",
            certifications="LOTO Auditor, Heavy Lift Supervisor, NEBOSH IGC, High-Pressure Gas Specialist",
            experience_years=12,
            max_capacity=8
        ),
        models.OfficerProfile(
            officer_name="Priya Sharma",
            officer_code="OFF-102",
            email="reviewer@refinery.safe",
            phone="+91 98450 11002",
            radio_channel="Ch 2 (VHF Refinery)",
            site="Digboi Refinery D",
            unit="CDU",
            shift="Shift B (14:00 - 22:00)",
            status="In Field",
            certifications="Confined Space Entry Lead, Gas Tester Certified, Working at Height Auditor",
            experience_years=8,
            max_capacity=6
        ),
        models.OfficerProfile(
            officer_name="Rajesh Verma",
            officer_code="OFF-103",
            email="r.verma@refinery.safe",
            phone="+91 98450 11003",
            radio_channel="Ch 6 (Offshore KG)",
            site="Offshore Rig 04",
            unit="Substructure & BOP",
            shift="Night Vigil (22:00 - 06:00)",
            status="On Duty",
            certifications="BOSIET Offshore, Well-Control Barrier Certified, Emergency Response Commander",
            experience_years=10,
            max_capacity=7
        ),
        models.OfficerProfile(
            officer_name="Ananya Das",
            officer_code="OFF-104",
            email="a.das@refinery.safe",
            phone="+91 98450 11004",
            radio_channel="Ch 3 (Process Safety)",
            site="Drilling Site B",
            unit="Mud Pump Area",
            shift="Shift A (06:00 - 14:00)",
            status="In Field",
            certifications="Energy Isolation Master, Hot Work Permit Issuer, Incident Investigator",
            experience_years=7,
            max_capacity=6
        ),
        models.OfficerProfile(
            officer_name="Col. M. S. Gill",
            officer_code="OFF-105",
            email="ms.gill@refinery.safe",
            phone="+91 98450 11005",
            radio_channel="Ch 5 (Field Ops)",
            site="Drilling Site C",
            unit="Rig Floor 01",
            shift="Shift B (14:00 - 22:00)",
            status="On Standby",
            certifications="Drilling Rig Safety Lead, Crane & Lifting Auditor, Hazardous Chemical Safety",
            experience_years=15,
            max_capacity=9
        ),
        models.OfficerProfile(
            officer_name="Sunil Sengupta",
            officer_code="OFF-106",
            email="s.sengupta@refinery.safe",
            phone="+91 98450 11006",
            radio_channel="Ch 1 (Operations)",
            site="Barauni Unit E",
            unit="FCCU",
            shift="Night Vigil (22:00 - 06:00)",
            status="On Duty",
            certifications="Electrical Safety Auditor, LOTO Specialist, Fire Prevention Lead",
            experience_years=6,
            max_capacity=5
        )
    ]
    for op in officer_profiles:
        db.add(op)
    db.commit()
    print("Officer Profiles seeded.")


    # 3. Seed Sites and Units
    sites_data = [
        ("Drilling Site A", "DRILL-A", "Assam Basin, India", "Drilling Rig"),
        ("Drilling Site B", "DRILL-B", "Duliajan Block, India", "Drilling Rig"),
        ("Drilling Site C", "DRILL-C", "Rajasthan Onshore, India", "Drilling Rig"),
        ("Offshore Rig 04", "OFF-04", "KG Basin Offshore, India", "Offshore Platform"),
        ("Digboi Refinery D", "REF-D", "Digboi, Assam", "Refinery Unit"),
        ("Barauni Unit E", "REF-E", "Barauni, Bihar", "Refinery Unit")
    ]
    sites_map = {}
    for name, code, loc, stype in sites_data:
        site_obj = models.Site(name=name, code=code, location=loc, site_type=stype)
        db.add(site_obj)
        db.flush()
        sites_map[name] = site_obj.id

    units_data = [
        ("Rig Floor 01", "Derrick and Rotary Table Zone"),
        ("Mud Pump Area", "High-Pressure Mud Circulation Unit"),
        ("Substructure & BOP", "Blowout Preventer Stack & Choke Manifold"),
        ("CDU", "Crude Distillation Unit"),
        ("FCCU", "Fluid Catalytic Cracking Unit"),
        ("Tank Farm", "Crude Storage Terminal")
    ]
    for name, desc in units_data:
        for s_name, s_id in sites_map.items():
            unit_obj = models.Unit(site_id=s_id, name=name, code=name)
            db.add(unit_obj)
    db.commit()
    print("Sites and Units seeded.")

    # 4. Seed Life Saving Rules
    lsrs = [
        ("Energy Isolation", "Verify isolation and zero energy state before work begins.", "High", "Zero-energy state verification bypassed", "Drilling Site A", "Energy Isolation / Valve Service"),
        ("Line of Fire", "Keep yourself and others out of the path of potential energy release.", "High", "Lifting exclusion zone breached", "Drilling Site B", "Heavy Lifting Operations"),
        ("Hot Work", "Control ignition sources and verify flammable gas concentrations.", "Medium", "Hot work executed without continuous gas check", "Drilling Site C", "Hot Work / Pipe Welding"),
        ("Confined Space", "Obtain authorization, test atmosphere, and verify rescue plan before entry.", "High", "Atmospheric test omitted before entry", "Offshore Rig 04", "Confined Space / Vessel Entry"),
        ("Working at Height", "Use fall protection equipment when working above 1.8 meters.", "High", "Harness lanyard not anchored", "Drilling Site A", "Working at Height / Mast Inspection"),
        ("Lifting Operations", "Define lift plan, inspect rigging, and do not walk under suspended loads.", "Medium", "Suspended load exclusion zone breached", "Drilling Site B", "Heavy Lifting Operations"),
        ("Vehicle Safety", "Follow speed limits, wear seatbelts, and maintain pedestrian clearance.", "Low", "Failure to follow established safety protocol", "Digboi Refinery D", "Routine Operations / Maintenance"),
        ("Electrical Safety", "Verify dead state, use insulated tools, and restrict access to qualified persons.", "Medium", "Cabinet opened without testing circuit for dead state", "Drilling Site A", "Routine Operations / Maintenance")
    ]
    for name, desc, density, barrier, site, activity in lsrs:
        rule = models.LifeSavingRule(
            name=name,
            description=desc,
            total_reports=0,
            sif_potential_reports=0,
            precursor_density=density,
            common_barrier_failure=barrier,
            top_sites=site,
            top_activities=activity
        )
        db.add(rule)
    db.commit()
    print("Life-Saving Rules seeded.")

    # 5. Ingest and Process raw safety reports (totaling 100+ reports)
    all_raw_reports = []
    
    # Process SIF reports
    for idx, (text, site, unit) in enumerate(RAW_REPORTS_DATA):
        days_offset = random.randint(1, 45)
        timestamp = datetime.datetime.utcnow() - datetime.timedelta(days=days_offset, hours=random.randint(1, 23))
        # Map some sites to Drilling sites
        mapped_site = "Drilling Site A" if "Refinery A" in site else ("Drilling Site B" if "Refinery B" in site else ("Drilling Site C" if "Refinery C" in site else ("Offshore Rig 04" if "Refinery D" in site else "Digboi Refinery D")))
        all_raw_reports.append((text, mapped_site, unit, timestamp, True))
        
    # Process Non-SIF reports
    for idx, (text, site, unit) in enumerate(NON_SIF_REPORTS):
        days_offset = random.randint(1, 45)
        timestamp = datetime.datetime.utcnow() - datetime.timedelta(days=days_offset, hours=random.randint(1, 23))
        mapped_site = "Drilling Site A" if "Refinery A" in site else ("Drilling Site B" if "Refinery B" in site else ("Drilling Site C" if "Refinery C" in site else ("Offshore Rig 04" if "Refinery D" in site else "Digboi Refinery D")))
        all_raw_reports.append((text, mapped_site, unit, timestamp, False))
        
    all_raw_reports.sort(key=lambda x: x[3])
    
    evt_counter = 1
    action_counter = 1
    
    print(f"Analyzing and ingestion of {len(all_raw_reports)} reports...")
    
    report_types_pool = ["Unsafe Act", "Unsafe Condition", "Near Miss"]
    
    for text, site_name, unit_name, ts, is_sif_seed in all_raw_reports:
        rep_code = f"#SIF26165-{evt_counter:03d}"
        rep_type = random.choice(report_types_pool) if not is_sif_seed else ("Near Miss" if "nearly" in text.lower() or "stopped" in text.lower() else ("Unsafe Act" if "worker" in text.lower() or "technician" in text.lower() else "Unsafe Condition"))
        
        report = models.SafetyReport(
            report_code=rep_code,
            report_type=rep_type,
            raw_text=text,
            audio_transcript=f"[Voice Transcript] {text}" if evt_counter % 3 == 0 else None,
            photo_url="/static/sample_hazard.jpg" if evt_counter % 2 == 0 else None,
            equipment_involved="High-Pressure Drilling Mud System" if "pump" in text.lower() else "Rig Equipment",
            people_involved=random.randint(1, 3),
            reporter_email="worker@refinery.safe",
            timestamp=ts,
            status="Analyzed"
        )
        db.add(report)
        db.flush()
        
        # Analyze using AI service
        analysis = ai_service.analyzeSafetyReport(text, db, {"site": site_name, "unit": unit_name})
        
        analysis["site"] = site_name
        analysis["unit"] = unit_name
        analysis["location"] = f"{unit_name} - Section {random.choice(['01', '02', '03', '04'])}"
        
        if not is_sif_seed:
            analysis["sif_risk_score"] = round(random.uniform(1.5, 3.8), 1)
            analysis["risk_level"] = "LOW"
            analysis["is_sif_precursor"] = "NO"
            analysis["severity_score"] = round(random.uniform(1.0, 3.5), 1)
            analysis["exposure_score"] = round(random.uniform(1.0, 3.0), 1)
            analysis["barrier_score"] = round(random.uniform(1.0, 3.0), 1)
            analysis["consequence_score"] = round(random.uniform(1.0, 3.0), 1)
            analysis["sif_probability"] = round(random.uniform(8.0, 20.0), 1)
            analysis["confidence"] = round(random.uniform(70.0, 85.0), 1)
            analysis["life_saving_rule"] = "None"
        
        evt_id = f"EVT-{10000 + evt_counter}"
        
        status = "Needs Review"
        if analysis["risk_level"] in ["CRITICAL", "HIGH"]:
            status = "Needs Review" if random.random() > 0.4 else "Action Dispatched"
        else:
            status = "Confirmed" if random.random() > 0.3 else "Needs Review"
            
        action_id = None
        stop_work = False
        assigned_team = None
        
        if analysis["sif_risk_score"] >= 6.5 or status == "Action Dispatched":
            action_id = f"ACT-{1000 + action_counter}"
            action_counter += 1
            stop_work = True if analysis["risk_level"] == "CRITICAL" else False
            assigned_team = "Rig Safety Team" if "Drill" in site_name else "Maintenance Team"
            
            intervention = models.Intervention(
                action_id=action_id,
                event_id=evt_id,
                description=f"Immediate corrective intervention: {analysis['recommended_action']}",
                status="Completed" if random.random() > 0.6 else "In Progress",
                priority=analysis["risk_level"],
                assigned_to=assigned_team,
                due_date=ts + datetime.timedelta(days=3),
                stop_work_required=stop_work,
                created_at=ts
            )
            db.add(intervention)
            
        event = models.SafetyEvent(
            id=evt_id,
            report_id=report.id,
            report_code=rep_code,
            report_type=rep_type,
            timestamp=ts,
            site=analysis["site"],
            unit=analysis["unit"],
            location=analysis["location"],
            activity=analysis["activity"],
            description=text,
            hazard=analysis["hazard"],
            equipment_involved=analysis["equipment_involved"],
            people_involved=report.people_involved,
            energy_source=analysis["energy_source"],
            barrier=analysis["barrier"],
            barrier_failure=analysis["barrier_failure"],
            exposure=analysis["exposure"],
            consequence=analysis["consequence"],
            is_sif_precursor=analysis["is_sif_precursor"],
            severity_score=analysis["severity_score"],
            exposure_score=analysis["exposure_score"],
            barrier_score=analysis["barrier_score"],
            consequence_score=analysis["consequence_score"],
            sif_risk_score=analysis["sif_risk_score"],
            risk_level=analysis["risk_level"],
            sif_probability=analysis["sif_probability"],
            confidence=analysis["confidence"],
            life_saving_rule=analysis["life_saving_rule"],
            status=status,
            reviewer="Capt. Arvind Sen" if status in ["Confirmed", "Action Dispatched"] else None,
            evidence=text,
            explanation=analysis["explanation"],
            recommended_action=analysis["recommended_action"],
            stop_work_issued=stop_work,
            assigned_team=assigned_team,
            action_id=action_id,
            action_status="In Progress" if action_id else "Pending",
            resolution_notes="Officer verified high-energy barrier bypass and issued immediate control measures." if action_id else None,
            audio_transcript=report.audio_transcript,
            photo_url=report.photo_url,
            l1_milestone=analysis["l1_milestone"],
            l2_unit=analysis["l2_unit"],
            l3_discipline=analysis["l3_discipline"],
            l4_work_package=analysis["l4_work_package"],
            l5_activity=analysis["l5_activity"],
            l6_job=analysis["l6_job"]
        )
        db.add(event)
        
        audit = models.AuditEvent(
            event_id=evt_id,
            action="AI Scanned & Classified",
            details=f"SIF-SHIELD AI evaluated report {rep_code}. Risk: {analysis['sif_risk_score']}/10 ({analysis['risk_level']}). Rule: {analysis['life_saving_rule']}.",
            user_email="engine@sifshield.ai",
            timestamp=ts
        )
        db.add(audit)
        
        if analysis["life_saving_rule"] != "None":
            rule_obj = db.query(models.LifeSavingRule).filter(models.LifeSavingRule.name == analysis["life_saving_rule"]).first()
            if rule_obj:
                rule_obj.total_reports += 1
                if analysis["is_sif_precursor"] == "YES":
                    rule_obj.sif_potential_reports += 1
                    
        evt_counter += 1
                    
    db.commit()
    print(f"Seeded {evt_counter - 1} Safety Events successfully.")

    # 6. Precursor patterns
    print("Detecting initial precursor patterns...")
    precursor_engine.detect_precursors(db)
    
    # 7. Seed sample historical corrections & GATI learning logs
    print("Seeding sample review history and GATI learning signals...")
    historical_events = db.query(models.SafetyEvent).filter(models.SafetyEvent.sif_risk_score > 5.0).limit(8).all()
    reviewer_user = db.query(models.User).filter(models.User.email == "officer@refinery.safe").first()
    
    for idx, event in enumerate(historical_events):
        if not reviewer_user:
            break
            
        original_sif = "Non-SIF" if event.sif_risk_score < 6.5 else "SIF Potential"
        original_rule = event.life_saving_rule
        
        corrected_sif = "SIF Potential" if original_sif == "Non-SIF" else "Non-SIF"
        corrected_rule = original_rule
        if idx % 2 == 0:
            corrected_rule = "Energy Isolation" if original_rule != "Energy Isolation" else "Line of Fire"
            
        review = models.Review(
            event_id=event.id,
            reviewer_id=reviewer_user.id,
            reviewer_name=reviewer_user.name,
            original_sif=original_sif,
            original_rule=original_rule,
            corrected_sif=corrected_sif,
            corrected_rule=corrected_rule,
            feedback_to_worker="Safety Officer reviewed the hazard and confirmed energy isolation requirements.",
            timestamp=event.timestamp + datetime.timedelta(hours=4)
        )
        db.add(review)
        db.flush()
        
        learning_signal = f"SIF Correction: calibrated {event.activity} weights to {corrected_sif}"
        if original_rule != corrected_rule:
            learning_signal += f" | Rule Correction: mapped keywords to {corrected_rule}"
            
        learning = models.LearningEvent(
            review_id=review.id,
            event_id=event.id,
            original_prediction=f"SIF: {original_sif}, Rule: {original_rule}",
            reviewer_decision=f"SIF: {corrected_sif}, Rule: {corrected_rule}",
            learning_signal=learning_signal,
            timestamp=review.timestamp + datetime.timedelta(seconds=5)
        )
        db.add(learning)
        
        audit_corr = models.AuditEvent(
            event_id=event.id,
            action="Officer Corrected",
            details=f"Safety Officer modified event. SIF: {original_sif} -> {corrected_sif}. LSR: {original_rule} -> {corrected_rule}. Calibrated neural weights.",
            user_email=reviewer_user.email,
            timestamp=review.timestamp
        )
        db.add(audit_corr)
        
        event.sif_risk_score = 9.2 if corrected_sif == "SIF Potential" else 2.5
        event.risk_level = "HIGH" if corrected_sif == "SIF Potential" else "LOW"
        event.is_sif_precursor = "YES" if corrected_sif == "SIF Potential" else "NO"
        event.life_saving_rule = corrected_rule
        event.status = "Corrected"
        event.reviewer = reviewer_user.name
        
    # 6. Seed Safety Manager Allotted Tasks
    tasks_seed = [
        models.OfficerTask(
            task_id="TSK-101",
            title="Surprise LOTO Audit & Zero-Energy Verification",
            task_type="Surprise LOTO Inspection",
            site="Drilling Site A",
            unit="Rig Floor 01",
            priority="CRITICAL",
            assigned_officer_id=1,
            assigned_officer_name="Capt. Arvind Sen",
            assigned_by="Dr. Vikram Roy (Head of HSE)",
            instructions="Inspect all double block and bleed valve lockouts on line FL-402 and verify physical padlocks before next mud pump pressurization test.",
            status="In Progress",
            due_date=datetime.datetime.utcnow() + datetime.timedelta(hours=18),
            findings="Inspected 3 isolation stations. 1 tag missing signature, immediate remedy applied.",
            related_event_id="EVT-10001"
        ),
        models.OfficerTask(
            task_id="TSK-102",
            title="Scaffold Fall-Arrest Anchorage Audit",
            task_type="SIF Precursor Audit",
            site="Digboi Refinery D",
            unit="CDU",
            priority="HIGH",
            assigned_officer_id=2,
            assigned_officer_name="Priya Sharma",
            assigned_by="Dr. Vikram Roy (Head of HSE)",
            instructions="Execute physical tag verification on all contractor scaffolding above 6m height following recurring near-miss reports.",
            status="Assigned",
            due_date=datetime.datetime.utcnow() + datetime.timedelta(days=1),
            related_event_id="EVT-10004"
        ),
        models.OfficerTask(
            task_id="TSK-103",
            title="Offshore BOP Stack High-Pressure Barrier Check",
            task_type="Stop Work Verification",
            site="Offshore Rig 04",
            unit="Substructure & BOP",
            priority="CRITICAL",
            assigned_officer_id=3,
            assigned_officer_name="Rajesh Verma",
            assigned_by="Dr. Vikram Roy (Head of HSE)",
            instructions="Verify accumulator bottle pressure gauges and secondary shear ram hydraulic backup systems.",
            status="Completed",
            due_date=datetime.datetime.utcnow() - datetime.timedelta(hours=6),
            findings="Accumulator pressure checked at 3000 PSI nominal. Shear rams operational. Certification logged.",
            completed_at=datetime.datetime.utcnow() - datetime.timedelta(hours=5),
            related_event_id="EVT-10008"
        ),
        models.OfficerTask(
            task_id="TSK-104",
            title="Mud Pump Circulation Zone Safety Patrol",
            task_type="Zone Safety Patrol",
            site="Drilling Site B",
            unit="Mud Pump Area",
            priority="MEDIUM",
            assigned_officer_id=4,
            assigned_officer_name="Ananya Das",
            assigned_by="Dr. Vikram Roy (Head of HSE)",
            instructions="Inspect mud shaker vibrating screens and verify high-pressure hose whip-check cables are secured.",
            status="Assigned",
            due_date=datetime.datetime.utcnow() + datetime.timedelta(days=2)
        )
    ]
    for ts_item in tasks_seed:
        db.add(ts_item)

    # 7. Seed Safety Directives from Safety Manager
    directives_seed = [
        models.SafetyDirective(
            directive_id="DIR-501",
            title="Mandatory Double Block & Bleed Verification for All Valve Disconnects",
            message="Effective immediately across all drilling and refinery sites: Single-valve isolations on lines >150 PSI are strictly prohibited without written HSE Lead exemption. All officers must physically spot-check breaker panels.",
            priority="URGENT",
            target_sites="All Operational Sites",
            issued_by="Dr. Vikram Roy (Head of HSE)",
            acknowledge_count=5
        ),
        models.SafetyDirective(
            directive_id="DIR-502",
            title="High-Wind Rig Crane Operation Stand-Down Protocol",
            message="Sustained wind gusts exceeding 20 knots require immediate cessation of heavy tandem lifts at Drilling Site A and B. Safety officers must confirm crane anemometer calibration.",
            priority="HIGH",
            target_sites="Drilling Site A, Drilling Site B",
            issued_by="Dr. Vikram Roy (Head of HSE)",
            acknowledge_count=4
        )
    ]
    for ds in directives_seed:
        db.add(ds)

    db.commit()
    print("Database seeding completed successfully.")
    db.close()


if __name__ == "__main__":
    seed_database()

