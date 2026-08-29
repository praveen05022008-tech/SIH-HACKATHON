import re
import random
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from backend.app import models

# Base dictionary of keywords for SIF indicators
BASE_SIF_KEYWORDS = {
    "fall": 0.85, "height": 0.80, "scaffold": 0.75, "harness": 0.70, "ladder": 0.65,
    "voltage": 0.90, "electrical": 0.80, "shock": 0.85, "live wire": 0.90,
    "confined": 0.90, "vessel entry": 0.95, "oxygen": 0.85, "asphyxiation": 0.95, "h2s": 0.90,
    "isolation": 0.85, "loto": 0.80, "valve": 0.65, "depressurise": 0.70, "energized": 0.85,
    "crane": 0.80, "lifting": 0.75, "rigging": 0.70, "suspended load": 0.90, "sling": 0.70,
    "welding": 0.60, "grinding": 0.50, "spark": 0.55, "cutting": 0.60, "ignition": 0.75,
    "speeding": 0.60, "forklift": 0.65, "collision": 0.75, "vehicle": 0.60,
    "trench": 0.70, "excavation": 0.70, "collapse": 0.80
}

# Base keywords mapping to IOGP Life-Saving Rules
BASE_LSR_KEYWORDS = {
    "Energy Isolation": ["isolation", "isolated", "depressurise", "loto", "valve", "lock", "tag", "circuit breaker", "lockout"],
    "Line of Fire": ["line of fire", "projectile", "blast", "traffic", "crush", "pinch", "suspended load", "falling object"],
    "Hot Work": ["welding", "grinding", "spark", "cutting", "ignition", "hot work", "permit", "flammable", "gas test"],
    "Confined Space": ["confined space", "vessel entry", "oxygen", "toxic gas", "manhole", "tank", "toxic", "h2s", "nitrogen"],
    "Working at Height": ["scaffold", "harness", "fall", "height", "ladder", "roof", "platform", "fall protection"],
    "Lifting Operations": ["crane", "lift", "rigging", "hoist", "suspended load", "sling", "derrick", "tagline"],
    "Vehicle Safety": ["driving", "forklift", "truck", "seatbelt", "speeding", "collision", "vehicle", "pedestrian"],
    "Electrical Safety": ["electrical", "high voltage", "conductor", "wiring", "shock", "live wire", "switchgear", "substation"]
}

# Map rules to description
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

def analyzeSafetyReport(text: str, db: Session = None) -> Dict[str, Any]:
    """
    Analyzes safety report text and returns structured Mayan safety event context.
    Integrates GATI Learning by loading reviewer corrections from DB to update keyword weights.
    """
    text_lower = text.lower()
    
    # 1. Load GATI Learning updates from database
    sif_keywords = BASE_SIF_KEYWORDS.copy()
    lsr_keywords = {k: list(v) for k, v in BASE_LSR_KEYWORDS.items()}
    
    if db is not None:
        try:
            learning_events = db.query(models.LearningEvent).all()
            for le in learning_events:
                # Expecting format: "Correction to rule: X" or "Correction to SIF: X"
                sig = le.learning_signal
                # Parse rule corrections to map new keywords
                if "rule correction" in sig.lower():
                    # If reviewer corrected rule, we search words in original report that might link to corrected rule
                    corrected_rule = le.reviewer_decision
                    # Add all words of length > 4 from the raw text to that rule's keywords if not present
                    words = re.findall(r'\b\w{4,15}\b', text_lower)
                    for w in words:
                        if w not in ["during", "about", "there", "while", "where", "under", "which", "before", "after"]:
                            if corrected_rule in lsr_keywords and w not in lsr_keywords[corrected_rule]:
                                lsr_keywords[corrected_rule].append(w)
                                
                # Parse SIF corrections to adjust weights
                elif "sif correction" in sig.lower():
                    corrected_sif = le.reviewer_decision  # "SIF Potential" or "Non-SIF"
                    words = re.findall(r'\b\w{4,15}\b', text_lower)
                    for w in words:
                        if w in sif_keywords:
                            if corrected_sif == "SIF Potential":
                                sif_keywords[w] = min(1.0, sif_keywords[w] + 0.15)
                            else:
                                sif_keywords[w] = max(0.0, sif_keywords[w] - 0.15)
        except Exception as e:
            print(f"GATI learning database calibration skipped: {e}")

    # 2. Extract operational context and entities using dictionary mapping
    site = "Refinery A"
    for s in ["refinery a", "refinery b", "refinery c", "refinery d", "refinery e"]:
        if s in text_lower:
            site = s.title()
            break
            
    unit = "CDU"
    for u in ["cdu", "fccu", "dhu", "vdu", "tank farm", "jetty", "utility block", "crude unit"]:
        if u in text_lower:
            unit = u.upper()
            break
            
    location = f"{unit} - Area 3"
    if "area" in text_lower:
        match = re.search(r'area\s*([0-9a-zA-Z\-_]+)', text_lower)
        if match:
            location = f"{unit} - Area {match.group(1).upper()}"

    # Extract Activity
    activity = "Routine Maintenance"
    if "welding" in text_lower or "hot work" in text_lower:
        activity = "Hot Work / Welding"
    elif "isolation" in text_lower or "loto" in text_lower or "valve" in text_lower:
        activity = "Maintenance / Valve Work"
    elif "crane" in text_lower or "lift" in text_lower or "rigging" in text_lower:
        activity = "Lifting Operations"
    elif "confined" in text_lower or "entry" in text_lower or "vessel" in text_lower:
        activity = "Vessel Inspection / Entry"
    elif "scaffold" in text_lower or "height" in text_lower:
        activity = "Working at Height"
    elif "excavation" in text_lower or "trench" in text_lower:
        activity = "Excavation Work"

    # Extract Hazard
    hazard = "Unspecified occupational hazard"
    if "electrical" in text_lower or "wire" in text_lower or "voltage" in text_lower:
        hazard = "High-voltage electrical exposure"
    elif "isolation" in text_lower or "pressure" in text_lower or "valve" in text_lower:
        hazard = "Unexpected hazardous energy release"
    elif "crane" in text_lower or "suspended" in text_lower:
        hazard = "Suspended load failure / falling object"
    elif "fall" in text_lower or "scaffold" in text_lower:
        hazard = "Fall from elevated work platform"
    elif "toxic" in text_lower or "gas" in text_lower or "oxygen" in text_lower or "h2s" in text_lower:
        hazard = "Toxic gas accumulation or oxygen deficiency"
    elif "ignition" in text_lower or "fire" in text_lower or "spark" in text_lower:
        hazard = "Hydrocarbon vapor ignition / fire hazard"

    # Energy source
    energy_source = "Mechanical"
    if "electrical" in text_lower or "power" in text_lower or "voltage" in text_lower:
        energy_source = "Electrical"
    elif "pressure" in text_lower or "steam" in text_lower or "line" in text_lower or "valve" in text_lower:
        energy_source = "Pressure"
    elif "welding" in text_lower or "spark" in text_lower or "heat" in text_lower:
        energy_source = "Thermal"
    elif "fall" in text_lower or "lift" in text_lower or "gravity" in text_lower:
        energy_source = "Gravity"
    elif "chemical" in text_lower or "h2s" in text_lower or "gas" in text_lower or "acid" in text_lower:
        energy_source = "Chemical"

    # Barrier
    barrier = "Standard Operating Procedure"
    if "isolation" in text_lower or "loto" in text_lower:
        barrier = "Double Block and Bleed Isolation / LOTO Locks"
    elif "harness" in text_lower or "scaffold" in text_lower:
        barrier = "Fall Protection Harness / Scaffold Handrails"
    elif "gas test" in text_lower or "detector" in text_lower:
        barrier = "Atmospheric Gas Monitoring"
    elif "permit" in text_lower:
        barrier = "Work Permit System / Authorization"
    elif "crane" in text_lower or "rigging" in text_lower:
        barrier = "Lifting Plan & Crane Interlocks"

    # Barrier failure
    barrier_failure = "Adherence to procedures"
    if "not verified" in text_lower or "unverified" in text_lower or "unclear" in text_lower:
        barrier_failure = "Isolation verification not performed"
    elif "unclipped" in text_lower or "no harness" in text_lower or "without harness" in text_lower:
        barrier_failure = "Fall protection harness not anchored"
    elif "no test" in text_lower or "bypassed" in text_lower:
        barrier_failure = "Gas clearance test omitted before entry"
    elif "no permit" in text_lower or "expired" in text_lower:
        barrier_failure = "Working without valid Permit-to-Work"
    elif "walked under" in text_lower or "no barricade" in text_lower:
        barrier_failure = "Lifting exclusion zone not barricaded"

    # Exposure
    exposure = "Worker in close proximity"
    if "entering" in text_lower or "entered" in text_lower:
        exposure = "Personnel entering active work zone"
    elif "under" in text_lower:
        exposure = "Worker positioned directly beneath hazard"
    elif "climbing" in text_lower or "scaffold" in text_lower:
        exposure = "Technician working at elevated level"
    elif "inside" in text_lower:
        exposure = "Personnel inside confined space vessel"

    # Consequence
    consequence = "Minor injury / near miss"
    if "fatal" in text_lower or "sif" in text_lower or "death" in text_lower:
        consequence = "Serious Injury or Fatality (SIF)"
    elif "fall" in text_lower or "height" in text_lower:
        consequence = "Severe trauma due to high-altitude fall"
    elif "shock" in text_lower or "voltage" in text_lower:
        consequence = "Electrocution / fatal electrical shock"
    elif "explosion" in text_lower or "ignition" in text_lower:
        consequence = "Severe blast injury and thermal burns"
    elif "asphyxiation" in text_lower or "gas" in text_lower:
        consequence = "Fatal inhalation / atmospheric suffocation"

    # 3. Calculate SIF Potential & Confidence
    matched_sif_weights = []
    for word, weight in sif_keywords.items():
        if word in text_lower:
            matched_sif_weights.append(weight)
            
    if matched_sif_weights:
        # Take the maximum indicator weight, combined with the average of matched weights
        sif_prob = (max(matched_sif_weights) * 0.7 + (sum(matched_sif_weights) / len(matched_sif_weights)) * 0.3) * 100
        # Add a tiny random variance for prototype realism (between -3% and +3%)
        sif_prob = max(10.0, min(99.0, sif_prob + random.uniform(-3, 3)))
    else:
        # Baseline SIF probability if no keywords matched
        sif_prob = random.uniform(5.0, 15.0)

    # Calculate Confidence based on quantity of evidence keywords matched
    confidence = 50.0 + min(45.0, len(matched_sif_weights) * 8.0)
    confidence = round(confidence, 1)
    sif_prob = round(sif_prob, 1)

    # 4. Map to IOGP Life-Saving Rules
    mapped_rule = "None"
    max_matches = 0
    for rule, keywords in lsr_keywords.items():
        matches = sum(1 for kw in keywords if kw in text_lower)
        if matches > max_matches:
            max_matches = matches
            mapped_rule = rule

    # Default rules if no match but specific activity is present
    if mapped_rule == "None":
        if "height" in text_lower or "fall" in text_lower or "scaffold" in text_lower:
            mapped_rule = "Working at Height"
        elif "isolation" in text_lower or "loto" in text_lower or "lock" in text_lower:
            mapped_rule = "Energy Isolation"
        elif "crane" in text_lower or "lift" in text_lower:
            mapped_rule = "Lifting Operations"
        elif "confined" in text_lower or "vessel" in text_lower:
            mapped_rule = "Confined Space"
        elif "welding" in text_lower or "spark" in text_lower:
            mapped_rule = "Hot Work"
        elif "wire" in text_lower or "electrical" in text_lower or "voltage" in text_lower:
            mapped_rule = "Electrical Safety"
        else:
            # Pick a default based on minor score
            mapped_rule = "Line of Fire"

    # AI Reasoning Summary
    explanation = f"High potential because the report indicates {hazard.lower()} combined with {barrier_failure.lower()}."
    if sif_prob < 50.0:
        explanation = f"Low potential because the safety observation reports standard activities with no severe energy exposure signals."

    # Recommended action
    recommended_action = f"Verify isolation and work permit controls before work proceeds."
    if mapped_rule == "Working at Height":
        recommended_action = "Ensure harness is anchored 100% of the time. Inspect scaffolding tags."
    elif mapped_rule == "Confined Space":
        recommended_action = "Conduct fresh atmospheric gas testing. Establish stand-by watch personnel."
    elif mapped_rule == "Lifting Operations":
        recommended_action = "Verify lifting plan load rating and secure physical exclusion barriers."
    elif mapped_rule == "Hot Work":
        recommended_action = "Position fire watch and clear flammable materials within 10 meters."
    elif mapped_rule == "Electrical Safety":
        recommended_action = "Test circuit for dead state. Apply personal padlock to isolation switch."

    # Operational refinery hierarchy context L1-L6
    l1_milestone = "Refinery Turnaround 2026"
    l2_unit = f"{unit} Area"
    l3_discipline = "Mechanical Maintenance"
    if mapped_rule == "Electrical Safety":
        l3_discipline = "Electrical Systems"
    elif mapped_rule == "Hot Work":
        l3_discipline = "Piping & Fabrication"
    l4_work_package = f"{unit} Turnaround Maintenance Package"
    l5_activity = activity
    l6_job = f"Conduct {activity.lower()} at {location}"

    return {
        "sif_probability": sif_prob,
        "confidence": confidence,
        "life_saving_rule": mapped_rule,
        "activity": activity,
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
        "l1_milestone": l1_milestone,
        "l2_unit": l2_unit,
        "l3_discipline": l3_discipline,
        "l4_work_package": l4_work_package,
        "l5_activity": l5_activity,
        "l6_job": l6_job
    }
