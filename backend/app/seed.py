import random
import datetime
from sqlalchemy.orm import Session
from backend.app.database import SessionLocal, Base, engine
from backend.app import models, ai_service, precursor_engine

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

    # 2. Seed Default Users
    demo_users = [
        models.User(email="manager@refinery.safe", name="Demo HSE Manager", password_hash="password123", role="HSE Manager"),
        models.User(email="analyst@refinery.safe", name="Demo Analyst", password_hash="password123", role="HSE Analyst"),
        models.User(email="reviewer@refinery.safe", name="Demo Reviewer", password_hash="password123", role="Reviewer"),
        models.User(email="admin@refinery.safe", name="System Admin", password_hash="password123", role="Admin")
    ]
    for u in demo_users:
        db.add(u)
    db.commit()
    print("Users seeded successfully.")

    # 3. Seed Sites and Units
    sites_data = [
        ("Refinery A", "REF-A", "Gujarat, India"),
        ("Refinery B", "REF-B", "Mumbai, India"),
        ("Refinery C", "REF-C", "Kochi, India"),
        ("Refinery D", "REF-D", "Digboi, India"),
        ("Refinery E", "REF-E", "Barauni, India")
    ]
    sites_map = {}
    for name, code, loc in sites_data:
        site_obj = models.Site(name=name, code=code, location=loc)
        db.add(site_obj)
        db.flush()
        sites_map[name] = site_obj.id

    units_data = [
        ("CDU", "Crude Distillation Unit"),
        ("FCCU", "Fluid Catalytic Cracking Unit"),
        ("DHU", "Diesel Hydrotreating Unit"),
        ("VDU", "Vacuum Distillation Unit"),
        ("Tank Farm", "Storage Tank Terminal Area"),
        ("Utility Block", "Power and Steam Utilities")
    ]
    for name, desc in units_data:
        for s_name, s_id in sites_map.items():
            unit_obj = models.Unit(site_id=s_id, name=name, code=name)
            db.add(unit_obj)
    db.commit()
    print("Sites and Units seeded.")

    # 4. Seed Life Saving Rules
    lsrs = [
        ("Energy Isolation", "Verify isolation and zero energy state before work begins.", "High", "Isolation verification not performed", "Refinery A", "Maintenance / Valve Work"),
        ("Line of Fire", "Keep yourself and others out of the path of potential energy release.", "High", "Lifting exclusion zone not barricaded", "Refinery B", "Lifting Operations"),
        ("Hot Work", "Control ignition sources and verify flammable gas concentrations.", "Medium", "Gas clearance test omitted before entry", "Refinery C", "Hot Work / Welding"),
        ("Confined Space", "Obtain authorization, test atmosphere, and verify rescue plan before entry.", "High", "Gas clearance test omitted before entry", "Refinery D", "Vessel Inspection / Entry"),
        ("Working at Height", "Use fall protection equipment when working above 1.8 meters.", "High", "Fall protection harness not anchored", "Refinery A", "Working at Height"),
        ("Lifting Operations", "Define lift plan, inspect rigging, and do not walk under suspended loads.", "Medium", "Lifting exclusion zone not barricaded", "Refinery D", "Lifting Operations"),
        ("Vehicle Safety", "Follow speed limits, wear seatbelts, and maintain pedestrian clearance.", "Low", "Adherence to procedures", "Refinery B", "Routine Maintenance"),
        ("Electrical Safety", "Verify dead state, use insulated tools, and restrict access to qualified persons.", "Medium", "Isolation verification not performed", "Refinery A", "Routine Maintenance")
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
    # Combine SIF-Potential reports and Non-SIF reports
    all_raw_reports = []
    
    # Process SIF reports
    for idx, (text, site, unit) in enumerate(RAW_REPORTS_DATA):
        days_offset = random.randint(1, 45)
        timestamp = datetime.datetime.utcnow() - datetime.timedelta(days=days_offset, hours=random.randint(1, 23))
        all_raw_reports.append((text, site, unit, timestamp, True))
        
    # Process Non-SIF reports
    for idx, (text, site, unit) in enumerate(NON_SIF_REPORTS):
        days_offset = random.randint(1, 45)
        timestamp = datetime.datetime.utcnow() - datetime.timedelta(days=days_offset, hours=random.randint(1, 23))
        all_raw_reports.append((text, site, unit, timestamp, False))
        
    # Shuffle reports to make timeline realistic
    all_raw_reports.sort(key=lambda x: x[3])
    
    evt_counter = 10001
    sif_count = 0
    high_priority_count = 0
    
    print(f"Analyzing and ingestion of {len(all_raw_reports)} reports...")
    
    for text, site_name, unit_name, ts, is_sif_seed in all_raw_reports:
        # Create raw safety report
        report = models.SafetyReport(
            raw_text=text,
            timestamp=ts,
            status="Analyzed"
        )
        db.add(report)
        db.flush()
        
        # Analyze using AI service
        analysis = ai_service.analyzeSafetyReport(text)
        
        # Override site and unit to keep seeded correlation
        analysis["site"] = site_name
        analysis["unit"] = unit_name
        analysis["location"] = f"{unit_name} - Area {random.choice(['1', '2', '3', '4'])}"
        
        # Force non-sif properties if it was a non-sif seed report
        if not is_sif_seed:
            analysis["sif_probability"] = round(random.uniform(5.0, 15.0), 1)
            analysis["confidence"] = round(random.uniform(60.0, 80.0), 1)
            analysis["life_saving_rule"] = "None"
        
        # Determine status
        status = "Needs Review"
        if analysis["sif_probability"] >= 70.0:
            status = "Needs Review"  # Will highlight in Review Queue
            sif_count += 1
            if analysis["confidence"] >= 85.0:
                high_priority_count += 1
        else:
            status = "Confirmed" if random.random() > 0.4 else "Needs Review"
            
        evt_id = f"EVT-{evt_counter}"
        evt_counter += 1
        
        # Create SafetyEvent
        event = models.SafetyEvent(
            id=evt_id,
            report_id=report.id,
            timestamp=ts,
            site=analysis["site"],
            unit=analysis["unit"],
            location=analysis["location"],
            activity=analysis["activity"],
            description=text,
            hazard=analysis["hazard"],
            energy_source=analysis["energy_source"],
            barrier=analysis["barrier"],
            barrier_failure=analysis["barrier_failure"],
            exposure=analysis["exposure"],
            consequence=analysis["consequence"],
            sif_probability=analysis["sif_probability"],
            confidence=analysis["confidence"],
            life_saving_rule=analysis["life_saving_rule"],
            status=status,
            reviewer=None,
            evidence=text,
            l1_milestone=analysis["l1_milestone"],
            l2_unit=analysis["l2_unit"],
            l3_discipline=analysis["l3_discipline"],
            l4_work_package=analysis["l4_work_package"],
            l5_activity=analysis["l5_activity"],
            l6_job=analysis["l6_job"]
        )
        db.add(event)
        
        # Create audit trail event
        audit = models.AuditEvent(
            event_id=evt_id,
            action="AI Classified",
            details=f"System automatically parsed safety report. predicted SIF probability: {analysis['sif_probability']}%, mapped to Life-Saving Rule: {analysis['life_saving_rule']}.",
            user_email="system@gati.engine",
            timestamp=ts
        )
        db.add(audit)
        
        # Create interventions for high SIF events
        if analysis["sif_probability"] >= 80.0:
            intervention = models.Intervention(
                event_id=evt_id,
                description=f"HSE Intervention: {analysis['recommended_action']}",
                status="Open" if random.random() > 0.5 else "Closed",
                assigned_to=random.choice(["HSE Manager", "Safety Inspector", "Operations Lead"]),
                due_date=ts + datetime.timedelta(days=7),
                created_at=ts
            )
            db.add(intervention)
            
        # Update Life-Saving Rule stats
        if analysis["life_saving_rule"] != "None":
            rule_obj = db.query(models.LifeSavingRule).filter(models.LifeSavingRule.name == analysis["life_saving_rule"]).first()
            if rule_obj:
                rule_obj.total_reports += 1
                if analysis["sif_probability"] >= 50.0:
                    rule_obj.sif_potential_reports += 1
                    
    db.commit()
    print(f"Seeded {evt_counter - 10001} Safety Events successfully.")

    # 6. Run Precursor Engine to aggregate pattern cards
    print("Detecting initial precursor patterns...")
    precursor_engine.detect_precursors(db)
    
    # 7. Seed sample historical corrections and GATI learning logs (8+ corrections)
    print("Seeding sample review history and GATI learning signals...")
    historical_events = db.query(models.SafetyEvent).filter(models.SafetyEvent.sif_probability > 40.0).limit(8).all()
    reviewers = db.query(models.User).filter(models.User.role == "Reviewer").all()
    reviewer_user = reviewers[0] if reviewers else None
    
    for idx, event in enumerate(historical_events):
        if not reviewer_user:
            break
            
        original_sif = "Non-SIF" if event.sif_probability < 50.0 else "SIF Potential"
        original_rule = event.life_saving_rule
        
        # Simulate correction
        corrected_sif = "SIF Potential" if original_sif == "Non-SIF" else "Non-SIF"
        corrected_rule = original_rule
        if idx % 2 == 0:
            corrected_rule = "Energy Isolation" if original_rule != "Energy Isolation" else "Line of Fire"
            
        # Write review log
        review = models.Review(
            event_id=event.id,
            reviewer_id=reviewer_user.id,
            reviewer_name=reviewer_user.name,
            original_sif=original_sif,
            original_rule=original_rule,
            corrected_sif=corrected_sif,
            corrected_rule=corrected_rule,
            timestamp=event.timestamp + datetime.timedelta(hours=4)
        )
        db.add(review)
        db.flush()
        
        # Write learning event log
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
        
        # Write audit trail
        audit_corr = models.AuditEvent(
            event_id=event.id,
            action="Reviewer Corrected",
            details=f"HSE Reviewer modified event. SIF changed from {original_sif} to {corrected_sif}. LSR changed from {original_rule} to {corrected_rule}. Learning signal dispatched to GATI.",
            user_email=reviewer_user.email,
            timestamp=review.timestamp
        )
        db.add(audit_corr)
        
        # Update event state to match correction
        event.sif_probability = 90.0 if corrected_sif == "SIF Potential" else 15.0
        event.life_saving_rule = corrected_rule
        event.status = "Corrected"
        event.reviewer = reviewer_user.name
        
    db.commit()
    print("Database seeding completed successfully.")
    db.close()

if __name__ == "__main__":
    seed_database()
