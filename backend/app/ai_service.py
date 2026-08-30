import re
import random
import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.app import models

# Base dictionary of keywords for SIF indicators and their initial weights (0 - 1.0)
BASE_SIF_KEYWORDS = {
    "fall": 0.90, "height": 0.85, "scaffold": 0.80, "harness": 0.75, "ladder": 0.70, "derrick": 0.90,
    "voltage": 0.95, "electrical": 0.85, "shock": 0.90, "live wire": 0.95, "switchgear": 0.85,
    "confined": 0.95, "vessel entry": 0.95, "oxygen": 0.90, "asphyxiation": 0.98, "h2s": 0.95, "toxic gas": 0.92,
    "isolation": 0.90, "loto": 0.85, "valve": 0.70, "depressurise": 0.80, "energized": 0.90, "blowout": 0.98,
    "crane": 0.85, "lifting": 0.80, "rigging": 0.75, "suspended load": 0.95, "sling": 0.75, "catline": 0.85,
    "welding": 0.65, "grinding": 0.55, "spark": 0.60, "cutting": 0.65, "ignition": 0.80, "hydrocarbon": 0.85,
    "speeding": 0.65, "forklift": 0.70, "collision": 0.80, "vehicle": 0.65, "heavy machinery": 0.80,
    "trench": 0.75, "excavation": 0.75, "collapse": 0.85, "mud pump": 0.85, "iron roughneck": 0.90,
    "high pressure": 0.90, "bop": 0.95, "kill line": 0.90, "choke manifold": 0.90, "drill floor": 0.85
}

# Base keywords mapping to IOGP Life-Saving Rules
BASE_LSR_KEYWORDS = {
    "Energy Isolation": ["isolation", "isolated", "depressurise", "loto", "valve", "lock", "tag", "circuit breaker", "lockout", "bleed", "zero energy"],
    "Line of Fire": ["line of fire", "projectile", "blast", "traffic", "crush", "pinch", "suspended load", "falling object", "rotating equipment", "iron roughneck", "winch"],
    "Hot Work": ["welding", "grinding", "spark", "cutting", "ignition", "hot work", "permit", "flammable", "gas test", "torch", "fire watch"],
    "Confined Space": ["confined space", "vessel entry", "oxygen", "toxic gas", "manhole", "tank", "toxic", "h2s", "nitrogen", "purging", "breathing apparatus"],
    "Working at Height": ["scaffold", "harness", "fall", "height", "ladder", "roof", "platform", "fall protection", "derrick", "mast", "manbasket", "lanyard"],
    "Lifting Operations": ["crane", "lift", "rigging", "hoist", "suspended load", "sling", "derrick", "tagline", "winch", "shackle", "outrigger"],
    "Vehicle Safety": ["driving", "forklift", "truck", "seatbelt", "speeding", "collision", "vehicle", "pedestrian", "haul road"],
    "Electrical Safety": ["electrical", "high voltage", "conductor", "wiring", "shock", "live wire", "switchgear", "substation", "transformer", "arc flash"]
}

LSR_DESCRIPTIONS = {
    "Energy Isolation": "Verify isolation and zero energy state before work begins.",
    "Line of Fire": "Keep yourself and others out of the path of potential energy release.",
    "Hot Work": "Control ignition sources and verify flammable gas concentrations.",
    "Confined Space": "Obtain authorization, test atmosphere, and verify rescue plan before entry.",
    "Working at Height": "Use fall protection equipment when working above 1.8 meters.",
    "Lifting Operations": "Define lift plan, inspect rigging, and do not walk under suspended loads.",
    "Vehicle Safety": "Follow speed limits, wear seatbelts, and maintain pedestrian clearance.",
    "Electrical Safety": "Verify dead state, use insulated tools, and restrict access to qualified persons."
}

def analyzeSafetyReport(text: str, db: Session = None, report_meta: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Analyzes safety report text and returns structured SIF-SHIELD AI safety event context
    including 0-10 Multi-Factor Risk Scoring and M1-M6 pipeline artifacts.
    """
    text_lower = (text or "").lower()
    
    # 1. GATI Continuous Learning calibration from database
    sif_keywords = BASE_SIF_KEYWORDS.copy()
    lsr_keywords = {k: list(v) for k, v in BASE_LSR_KEYWORDS.items()}
    
    if db is not None:
        try:
            learning_events = db.query(models.LearningEvent).all()
            for le in learning_events:
                sig = le.learning_signal or ""
                if "rule correction" in sig.lower():
                    corrected_rule = le.reviewer_decision
                    words = re.findall(r'\b\w{4,15}\b', text_lower)
                    for w in words:
                        if w not in ["during", "about", "there", "while", "where", "under", "which", "before", "after"]:
                            if corrected_rule in lsr_keywords and w not in lsr_keywords[corrected_rule]:
                                lsr_keywords[corrected_rule].append(w)
                elif "sif correction" in sig.lower():
                    corrected_sif = le.reviewer_decision
                    words = re.findall(r'\b\w{4,15}\b', text_lower)
                    for w in words:
                        if w in sif_keywords:
                            if corrected_sif == "SIF Potential":
                                sif_keywords[w] = min(1.0, sif_keywords[w] + 0.15)
                            else:
                                sif_keywords[w] = max(0.0, sif_keywords[w] - 0.15)
        except Exception as e:
            print(f"GATI learning database calibration skipped: {e}")

    # 2. Site / Location / Unit extraction
    site = (report_meta and report_meta.get("site")) or "Drilling Site A"
    for s in ["drilling site a", "drilling site b", "drilling site c", "refinery a", "refinery b", "refinery c", "refinery d", "refinery e", "offshore rig 04"]:
        if s in text_lower:
            site = s.title()
            break
            
    unit = (report_meta and report_meta.get("unit")) or "Rig Floor 01"
    for u in ["rig floor 01", "mud pump area", "substructure", "derrick mast", "cdu", "fccu", "dhu", "vdu", "tank farm", "utility block", "bop stack", "wellhead area"]:
        if u in text_lower:
            unit = u.upper() if len(u) <= 4 else u.title()
            break
            
    location = (report_meta and report_meta.get("location")) or f"{unit} - Zone 2"
    if "area" in text_lower or "zone" in text_lower:
        match = re.search(r'(area|zone)\s*([0-9a-zA-Z\-_]+)', text_lower)
        if match:
            location = f"{unit} - {match.group(1).title()} {match.group(2).upper()}"

    # 3. Activity Extraction
    activity = "Routine Operations / Maintenance"
    if "welding" in text_lower or "hot work" in text_lower or "cutting" in text_lower:
        activity = "Hot Work / Pipe Welding"
    elif "isolation" in text_lower or "loto" in text_lower or "valve" in text_lower or "depressurise" in text_lower:
        activity = "Energy Isolation / Valve Service"
    elif "crane" in text_lower or "lift" in text_lower or "rigging" in text_lower or "hoisting" in text_lower:
        activity = "Heavy Lifting Operations"
    elif "confined" in text_lower or "entry" in text_lower or "vessel" in text_lower or "tank entry" in text_lower:
        activity = "Confined Space / Vessel Entry"
    elif "scaffold" in text_lower or "height" in text_lower or "derrick" in text_lower or "mast" in text_lower or "ladder" in text_lower:
        activity = "Working at Height / Mast Inspection"
    elif "excavation" in text_lower or "trench" in text_lower:
        activity = "Excavation & Earthwork"
    elif "tripping" in text_lower or "drilling" in text_lower or "casing" in text_lower:
        activity = "Drilling & Casing Operations"

    # 4. Equipment Involved
    equipment = (report_meta and report_meta.get("equipment_involved")) or "General Machinery"
    if "crane" in text_lower or "rigging" in text_lower or "sling" in text_lower:
        equipment = "Hydraulic Mobile Crane / Slings"
    elif "bop" in text_lower or "blowout" in text_lower:
        equipment = "Blowout Preventer (BOP) Stack"
    elif "pump" in text_lower or "mud pump" in text_lower:
        equipment = "High Pressure Mud Pump HP-101"
    elif "breaker" in text_lower or "switchgear" in text_lower or "transformer" in text_lower:
        equipment = "415V Switchgear & Motor Panel"
    elif "scaffold" in text_lower or "ladder" in text_lower or "platform" in text_lower:
        equipment = "Tubular Scaffolding & Fall Arrestor"
    elif "tank" in text_lower or "vessel" in text_lower or "separator" in text_lower:
        equipment = "Crude Storage Vessel V-301"
    elif "valve" in text_lower or "flange" in text_lower or "manifold" in text_lower:
        equipment = "Choke Manifold High-Pressure Valve"

    # 5. Energy Source
    energy_source = (report_meta and report_meta.get("energy_source")) or "Mechanical"
    if "electrical" in text_lower or "power" in text_lower or "voltage" in text_lower or "wire" in text_lower:
        energy_source = "Electrical Energy"
    elif "pressure" in text_lower or "steam" in text_lower or "hydraulic" in text_lower or "line" in text_lower or "valve" in text_lower or "gas" in text_lower:
        energy_source = "Pressurized Fluid / Gas"
    elif "welding" in text_lower or "spark" in text_lower or "heat" in text_lower or "fire" in text_lower:
        energy_source = "Thermal / Ignition"
    elif "fall" in text_lower or "lift" in text_lower or "gravity" in text_lower or "suspended" in text_lower or "height" in text_lower:
        energy_source = "Gravitational Potential"
    elif "chemical" in text_lower or "h2s" in text_lower or "toxic" in text_lower or "acid" in text_lower:
        energy_source = "Chemical / Toxic Atmosphere"

    # 6. Hazard & Exposure
    hazard = "Occupational safety hazard"
    exposure = "Personnel within proximity of operational area"
    if "electrical" in text_lower or "voltage" in text_lower or "wire" in text_lower:
        hazard = "High-voltage electrical arc flash or electrocution exposure"
        exposure = "Electrician working directly within live enclosure envelope"
    elif "isolation" in text_lower or "pressure" in text_lower or "valve" in text_lower:
        hazard = "Uncontrolled high-pressure hazardous fluid release"
        exposure = "Technician positioned in direct trajectory of pressurized flange"
    elif "crane" in text_lower or "suspended" in text_lower or "load" in text_lower:
        hazard = "Suspended structural load failure / dropped object"
        exposure = "Field workers walking directly inside active drop zone"
    elif "fall" in text_lower or "height" in text_lower or "scaffold" in text_lower:
        hazard = "Catastrophic fall from elevated drilling structure"
        exposure = "Worker positioned on unanchored edge above 4 meters"
    elif "toxic" in text_lower or "h2s" in text_lower or "oxygen" in text_lower or "gas" in text_lower:
        hazard = "Acute H2S toxic gas exposure or oxygen deficiency"
        exposure = "Entry crew inside unventilated confined vessel chamber"
    elif "ignition" in text_lower or "fire" in text_lower or "spark" in text_lower or "welding" in text_lower:
        hazard = "Vapor cloud ignition and flash fire explosion"
        exposure = "Hot work crew operating near flammable gas pockets"

    # 7. Barrier & Barrier Failure
    barrier = "Permit-to-Work & Standard Safety Controls"
    barrier_failure = "Failure to follow established safety protocol"
    if "isolation" in text_lower or "loto" in text_lower or "lock" in text_lower:
        barrier = "Positive Mechanical Isolation (LOTO & Double Block & Bleed)"
        barrier_failure = "Zero-energy state verification bypassed / Locks missing"
    elif "harness" in text_lower or "scaffold" in text_lower or "fall" in text_lower:
        barrier = "100% Tie-off Fall Arrest System & Guardrails"
        barrier_failure = "Harness lanyard not anchored / Missing toe-boards"
    elif "gas test" in text_lower or "detector" in text_lower or "oxygen" in text_lower or "h2s" in text_lower:
        barrier = "Continuous Multi-Gas Atmospheric Clearance Testing"
        barrier_failure = "Atmospheric test omitted before entry / ventilation down"
    elif "crane" in text_lower or "rigging" in text_lower or "lift" in text_lower:
        barrier = "Rigging Inspection, Certified Lift Plan & Physical Exclusion Barricades"
        barrier_failure = "Lifting exclusion zone breached / Sling safety latch missing"
    elif "hot work" in text_lower or "welding" in text_lower or "fire watch" in text_lower:
        barrier = "Continuous Fire Watch & 10m Flammable Material Clearance"
        barrier_failure = "Hot work executed without continuous gas check or fire blanket"
    elif "electrical" in text_lower or "voltage" in text_lower:
        barrier = "Insulated PPE, Voltage Clearance Test & Lockout"
        barrier_failure = "Cabinet opened without testing circuit for dead state"

    # 8. Potential Consequence
    consequence = "Minor localized injury or asset delay"
    if "fatal" in text_lower or "sif" in text_lower or "death" in text_lower or "severe" in text_lower:
        consequence = "Potential Serious Injury or Fatality (SIF)"
    elif "fall" in text_lower or "height" in text_lower:
        consequence = "Fatal blunt trauma / severe spinal injury from high fall"
    elif "shock" in text_lower or "voltage" in text_lower or "electrical" in text_lower:
        consequence = "Fatal cardiac arrest / severe 3rd-degree arc burns"
    elif "explosion" in text_lower or "fire" in text_lower or "ignition" in text_lower:
        consequence = "Multiple fatalities and catastrophic facility fire"
    elif "h2s" in text_lower or "toxic" in text_lower or "oxygen" in text_lower:
        consequence = "Immediate asphyxiation / acute respiratory fatality"
    elif "crane" in text_lower or "suspended load" in text_lower:
        consequence = "Fatal crush injury / catastrophic impact from dropped load"

    # 9. Map to IOGP Life-Saving Rule
    mapped_rule = "None"
    max_matches = 0
    for rule, keywords in lsr_keywords.items():
        matches = sum(1 for kw in keywords if kw in text_lower)
        if matches > max_matches:
            max_matches = matches
            mapped_rule = rule

    if mapped_rule == "None":
        if "height" in text_lower or "fall" in text_lower or "scaffold" in text_lower:
            mapped_rule = "Working at Height"
        elif "isolation" in text_lower or "loto" in text_lower or "lock" in text_lower:
            mapped_rule = "Energy Isolation"
        elif "crane" in text_lower or "lift" in text_lower or "load" in text_lower:
            mapped_rule = "Lifting Operations"
        elif "confined" in text_lower or "vessel" in text_lower:
            mapped_rule = "Confined Space"
        elif "welding" in text_lower or "spark" in text_lower or "fire" in text_lower:
            mapped_rule = "Hot Work"
        elif "wire" in text_lower or "electrical" in text_lower or "voltage" in text_lower:
            mapped_rule = "Electrical Safety"
        else:
            mapped_rule = "Line of Fire"

    # 10. Multi-Factor 0-10 Risk Scoring Engine
    # Factor 1: Hazard Severity (0 - 10)
    matched_sif_weights = [weight for word, weight in sif_keywords.items() if word in text_lower]
    
    if matched_sif_weights:
        base_sev = max(matched_sif_weights) * 10.0
    else:
        base_sev = 3.0

    if any(k in text_lower for k in ["fatal", "death", "explosion", "h2s", "live wire", "high voltage", "suspended load", "blowout"]):
        severity_score = min(10.0, base_sev + 1.5)
    elif any(k in text_lower for k in ["fall", "height", "confined", "isolation", "loto", "fire", "crush"]):
        severity_score = min(9.2, base_sev + 0.8)
    else:
        severity_score = max(1.5, base_sev * 0.8)

    # Factor 2: Exposure Level (0 - 10)
    people_count = (report_meta and report_meta.get("people_involved")) or 1
    exposure_score = 4.0 + min(4.5, people_count * 1.5)
    if any(k in text_lower for k in ["under", "inside", "entered", "climbing", "touching", "bypassed", "without harness", "unclipped"]):
        exposure_score = min(10.0, exposure_score + 2.5)
    elif any(k in text_lower for k in ["near", "observed", "noticed", "walkway", "office"]):
        exposure_score = max(2.0, exposure_score - 1.5)

    # Factor 3: Safety Barrier Failure (0 - 10)
    barrier_score = 5.0
    if any(k in text_lower for k in ["not verified", "bypassed", "unverified", "no permit", "expired", "failed", "unclipped", "no harness", "no test"]):
        barrier_score = 9.5
    elif any(k in text_lower for k in ["loose", "missing", "faded", "broken", "unlocked"]):
        barrier_score = 7.0
    else:
        barrier_score = 3.5

    # Factor 4: Potential Consequence (0 - 10)
    consequence_score = 4.0
    if any(k in text_lower for k in ["sif", "fatal", "death", "disability", "rupture", "amputation", "suffocation", "arc flash"]):
        consequence_score = 9.8
    elif any(k in text_lower for k in ["trauma", "burn", "fracture", "injury", "shock", "collapse"]):
        consequence_score = 8.5
    elif any(k in text_lower for k in ["cut", "slip", "trip", "spill", "leak", "dust"]):
        consequence_score = 3.5
    else:
        consequence_score = 4.5

    # Final Composite SIF Risk Score (0 - 10 Scale)
    # Weighted formula: 0.35 * Severity + 0.25 * Exposure + 0.20 * Barrier + 0.20 * Consequence
    raw_sif_score = (0.35 * severity_score) + (0.25 * exposure_score) + (0.20 * barrier_score) + (0.20 * consequence_score)
    sif_risk_score = round(max(1.0, min(10.0, raw_sif_score)), 1)
    
    # Classification & SIF Precursor Flag
    if sif_risk_score >= 8.5:
        risk_level = "CRITICAL"
        is_sif_precursor = "YES"
    elif sif_risk_score >= 6.5:
        risk_level = "HIGH"
        is_sif_precursor = "YES"
    elif sif_risk_score >= 4.0:
        risk_level = "MEDIUM"
        is_sif_precursor = "NO"
    else:
        risk_level = "LOW"
        is_sif_precursor = "NO"

    # Legacy percentage compatibility
    sif_probability = round(min(99.0, max(5.0, sif_risk_score * 10.0)), 1)
    confidence = round(min(98.0, max(65.0, 70.0 + len(matched_sif_weights) * 5.0)), 1)

    # 11. AI Explanation & Recommendations
    explanation = f"Detected high-energy risk ({energy_source}) coupled with {barrier_failure.lower()}. Potential for {consequence.lower()}."
    if risk_level == "LOW":
        explanation = f"Standard operational observation with baseline hazard controls. No immediate high-energy SIF precursor detected."

    recommended_action = "Execute immediate barrier verification and re-brief work crew on Life-Saving Rule requirements."
    if mapped_rule == "Working at Height":
        recommended_action = "1. Enforce 100% harness tie-off to certified anchor. 2. Red-tag uncertified scaffolding immediately. 3. Suspend elevated work until inspected."
    elif mapped_rule == "Confined Space":
        recommended_action = "1. Immediate evacuation until 4-gas test re-verified. 2. Establish continuous forced mechanical ventilation. 3. Station dedicated stand-by watch."
    elif mapped_rule == "Energy Isolation":
        recommended_action = "1. Issue immediate Stop Work Order. 2. Apply individual LOTO padlocks to primary isolation points. 3. Depressurise line and confirm zero energy state."
    elif mapped_rule == "Lifting Operations":
        recommended_action = "1. Halt crane lift until exclusion zone is physically barricaded. 2. Verify rigging certification and load rating chart. 3. Attach dual taglines."
    elif mapped_rule == "Hot Work":
        recommended_action = "1. Halt hot work and test for flammable hydrocarbons within 15m. 2. Lay wet fire blankets over process drains. 3. Station dedicated fire watch with extinguisher."
    elif mapped_rule == "Electrical Safety":
        recommended_action = "1. De-energize and lock out upstream circuit breaker. 2. Perform test-before-touch verification using calibrated voltage meter. 3. Wear Arc Flash Category 4 PPE."

    # 12. Simulated Multi-Channel Notification Dispatch
    simulated_alerts = []
    if risk_level in ["CRITICAL", "HIGH"]:
        simulated_alerts.append({
            "channel": "DASHBOARD_BANNER",
            "target": "Safety Officer Alert Inbox",
            "message": f"🚨 URGENT {risk_level} SIF PRECURSOR: {activity} at {site} ({unit})",
            "status": "Dispatched"
        })
        simulated_alerts.append({
            "channel": "SMS_BROADCAST",
            "target": "+91-98765-XXXXX (Site Safety Head)",
            "message": f"[SIF-SHIELD AI ALERT] Critical precursor flagged at {site}. Score: {sif_risk_score}/10. Action required: {recommended_action[:60]}...",
            "status": "Delivered"
        })
        simulated_alerts.append({
            "channel": "MOBILE_PUSH",
            "target": "Field Supervisors App (OIL-HSE)",
            "message": f"High risk event flagged: {hazard}",
            "status": "Pushed"
        })

    # Operational refinery hierarchy context L1-L6
    l1_milestone = "OIL Annual Rig Operations 2026"
    l2_unit = f"{unit} Operational Section"
    l3_discipline = "Drilling & Mechanical HSE"
    if mapped_rule == "Electrical Safety":
        l3_discipline = "Electrical & Instrumentation"
    elif mapped_rule == "Hot Work":
        l3_discipline = "Fabrication & Piping"
    l4_work_package = f"{unit} Turnaround & Drilling Package"
    l5_activity = activity
    l6_job = f"Conduct {activity.lower()} at {location}"

    return {
        "sif_risk_score": sif_risk_score,
        "risk_level": risk_level,
        "is_sif_precursor": is_sif_precursor,
        "severity_score": round(severity_score, 1),
        "exposure_score": round(exposure_score, 1),
        "barrier_score": round(barrier_score, 1),
        "consequence_score": round(consequence_score, 1),
        "sif_probability": sif_probability,
        "confidence": confidence,
        "life_saving_rule": mapped_rule,
        "activity": activity,
        "equipment_involved": equipment,
        "site": site,
        "unit": unit,
        "location": location,
        "hazard": hazard,
        "energy_source": energy_source,
        "barrier": barrier,
        "barrier_failure": barrier_failure,
        "exposure": exposure,
        "consequence": consequence,
        "explanation": explanation,
        "recommended_action": recommended_action,
        "simulated_alerts": simulated_alerts,
        "l1_milestone": l1_milestone,
        "l2_unit": l2_unit,
        "l3_discipline": l3_discipline,
        "l4_work_package": l4_work_package,
        "l5_activity": l5_activity,
        "l6_job": l6_job
    }

