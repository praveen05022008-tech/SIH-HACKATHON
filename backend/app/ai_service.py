import os
import re
import json
import sys
import random
import datetime
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

try:
    from backend.app import models, config
except ImportError:
    try:
        from app import models, config
    except ImportError:
        import models, config

# Base dictionary of keywords for SIF indicators and their initial weights (0 - 1.0)
BASE_SIF_KEYWORDS = {
    "fall": 0.90, "fell": 0.90, "falling": 0.92, "height": 0.85, "scaffold": 0.80, "scaffolding": 0.80, 
    "harness": 0.75, "lanyard": 0.75, "ladder": 0.70, "derrick": 0.90, "mast": 0.85, "manbasket": 0.85,
    "voltage": 0.95, "electrical": 0.85, "shock": 0.90, "electrocution": 0.98, "live wire": 0.95, "switchgear": 0.85, "arc flash": 0.95,
    "confined": 0.95, "vessel entry": 0.95, "oxygen": 0.90, "asphyxiation": 0.98, "h2s": 0.95, "toxic gas": 0.92, "toxic": 0.90,
    "isolation": 0.90, "isolated": 0.85, "unisolated": 0.95, "loto": 0.85, "valve": 0.70, "depressurise": 0.80, "energized": 0.90, "blowout": 0.98,
    "crane": 0.85, "lifting": 0.80, "lift": 0.80, "rigging": 0.75, "suspended load": 0.95, "sling": 0.75, "catline": 0.85, "dropped": 0.88, "dropped object": 0.92,
    "welding": 0.65, "grinding": 0.55, "spark": 0.60, "cutting": 0.65, "ignition": 0.80, "hydrocarbon": 0.85, "flammable": 0.85, "explosion": 0.95,
    "speeding": 0.65, "forklift": 0.70, "collision": 0.80, "vehicle": 0.65, "heavy machinery": 0.80,
    "trench": 0.75, "excavation": 0.75, "collapse": 0.85, "mud pump": 0.85, "iron roughneck": 0.90,
    "high pressure": 0.90, "bop": 0.95, "kill line": 0.90, "choke manifold": 0.90, "drill floor": 0.85,
    "line of fire": 0.92, "pinch point": 0.80, "crush": 0.85
}

# Base keywords mapping to IOGP Life-Saving Rules
BASE_LSR_KEYWORDS = {
    "Energy Isolation": ["isolation", "isolated", "unisolated", "depressurise", "loto", "valve", "lock", "tag", "circuit breaker", "lockout", "bleed", "zero energy", "energized"],
    "Line of Fire": ["line of fire", "projectile", "blast", "traffic", "crush", "pinch", "pinch point", "suspended load", "falling object", "dropped object", "rotating equipment", "iron roughneck", "winch"],
    "Hot Work": ["welding", "grinding", "spark", "cutting", "ignition", "hot work", "permit", "flammable", "gas test", "torch", "fire watch", "hydrocarbon"],
    "Confined Space": ["confined space", "confined", "vessel entry", "vessel", "oxygen", "toxic gas", "manhole", "tank", "toxic", "h2s", "nitrogen", "purging", "breathing apparatus", "asphyxiation"],
    "Working at Height": ["scaffold", "scaffolding", "harness", "lanyard", "fall", "fell", "falling", "height", "ladder", "roof", "platform", "fall protection", "derrick", "mast", "manbasket", "tie-off"],
    "Lifting Operations": ["crane", "lift", "lifting", "rigging", "hoist", "suspended load", "sling", "derrick", "tagline", "winch", "shackle", "outrigger", "dropped"],
    "Vehicle Safety": ["driving", "forklift", "truck", "seatbelt", "speeding", "collision", "vehicle", "pedestrian", "haul road"],
    "Electrical Safety": ["electrical", "high voltage", "voltage", "conductor", "wiring", "shock", "live wire", "switchgear", "substation", "transformer", "arc flash", "electrocution"]
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

STANDARD_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

def get_ai_status() -> Dict[str, Any]:
    """
    Returns the current configuration and operational status of the AI engine.
    """
    key = config.AI_API_KEY
    masked_key = ""
    if key and len(key) > 8:
        masked_key = f"{key[:7]}...{key[-4:]}"
    elif key:
        masked_key = "********"

    test_res = test_ai_connection()

    return {
        "provider": config.AI_PROVIDER,
        "model": config.AI_MODEL,
        "base_url": config.AI_BASE_URL,
        "has_key": bool(key and len(key.strip()) > 0),
        "masked_key": masked_key,
        "connection": test_res,
        "mode": "Live AI Cloud Inference" if test_res.get("success") else "GATI Calibrated Heuristic Engine (Offline Active)"
    }

def update_ai_config(provider: Optional[str] = None, api_key: Optional[str] = None, base_url: Optional[str] = None, model: Optional[str] = None) -> Dict[str, Any]:
    """
    Updates the in-memory AI configuration and persists it to backend/app/.env.
    """
    if provider:
        config.AI_PROVIDER = provider
    if api_key is not None and not api_key.startswith("csk-...") and not "..." in api_key:
        config.AI_API_KEY = api_key.strip()
    if base_url:
        config.AI_BASE_URL = base_url.strip()
    if model:
        config.AI_MODEL = model.strip()

    # Persist to .env file
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    try:
        lines = []
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                lines = f.readlines()

        new_lines = []
        found_keys = set()
        for line in lines:
            if line.startswith("AI_PROVIDER="):
                new_lines.append(f"AI_PROVIDER={config.AI_PROVIDER}\n")
                found_keys.add("AI_PROVIDER")
            elif line.startswith("AI_API_KEY="):
                new_lines.append(f"AI_API_KEY={config.AI_API_KEY}\n")
                found_keys.add("AI_API_KEY")
            elif line.startswith("AI_BASE_URL="):
                new_lines.append(f"AI_BASE_URL={config.AI_BASE_URL}\n")
                found_keys.add("AI_BASE_URL")
            elif line.startswith("AI_MODEL="):
                new_lines.append(f"AI_MODEL={config.AI_MODEL}\n")
                found_keys.add("AI_MODEL")
            else:
                new_lines.append(line)

        if "AI_PROVIDER" not in found_keys:
            new_lines.append(f"AI_PROVIDER={config.AI_PROVIDER}\n")
        if "AI_API_KEY" not in found_keys:
            new_lines.append(f"AI_API_KEY={config.AI_API_KEY}\n")
        if "AI_BASE_URL" not in found_keys:
            new_lines.append(f"AI_BASE_URL={config.AI_BASE_URL}\n")
        if "AI_MODEL" not in found_keys:
            new_lines.append(f"AI_MODEL={config.AI_MODEL}\n")

        with open(env_path, "w", encoding="utf-8") as f:
            f.writelines(new_lines)
    except Exception as e:
        print(f"Warning: Could not persist to .env: {e}")

    return get_ai_status()

def test_ai_connection(api_key: Optional[str] = None, base_url: Optional[str] = None, model: Optional[str] = None) -> Dict[str, Any]:
    """
    Tests live connectivity to the configured AI / LLM provider.
    """
    key = api_key or config.AI_API_KEY
    url = (base_url or config.AI_BASE_URL or "https://api.cerebras.ai/v1").rstrip("/") + "/chat/completions"
    model_name = model or config.AI_MODEL or "gpt-oss-120b"
    
    if not key or len(key.strip()) == 0:
        return {
            "success": False,
            "provider": config.AI_PROVIDER,
            "status": "No API Key Configured",
            "message": "AI API key is missing. System will operate on high-accuracy GATI heuristic engine."
        }
        
    start_time = datetime.datetime.utcnow()
    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": "You are SIF-SHIELD AI safety intelligence assistant. Respond in valid JSON."},
            {"role": "user", "content": "Ping test. Respond with {\"status\": \"OK\", \"model\": \"" + model_name + "\"}"}
        ],
        "temperature": 0.1,
        "max_tokens": 100
    }
    
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "User-Agent": STANDARD_USER_AGENT
    }
    
    try:
        req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers)
        with urllib.request.urlopen(req, timeout=8) as resp:
            elapsed_ms = int((datetime.datetime.utcnow() - start_time).total_seconds() * 1000)
            res_data = json.loads(resp.read().decode("utf-8"))
            return {
                "success": True,
                "provider": config.AI_PROVIDER,
                "status": "Connected (Online)",
                "model": model_name,
                "latency_ms": elapsed_ms,
                "message": f"Successfully connected to {config.AI_PROVIDER.upper()} endpoint in {elapsed_ms}ms."
            }
    except urllib.error.HTTPError as e:
        error_body = ""
        try:
            error_body = e.read().decode("utf-8")
        except:
            pass
        return {
            "success": False,
            "provider": config.AI_PROVIDER,
            "status": f"HTTP {e.code} ({e.reason})",
            "code": e.code,
            "message": f"API Provider responded with HTTP {e.code}: {error_body or e.reason}. Fallback engine active."
        }
    except Exception as e:
        return {
            "success": False,
            "provider": config.AI_PROVIDER,
            "status": "Connection Error",
            "message": f"Could not connect to {url}: {str(e)}. Fallback engine active."
        }

def _call_llm_analysis(text: str, report_meta: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
    """
    Invokes the LLM to perform deep NLP entity extraction, hazard analysis, 
    IOGP life-saving rule classification, and 0-10 multi-factor risk scoring.
    """
    key = config.AI_API_KEY
    if not key or len(key.strip()) == 0:
        return None

    url = (config.AI_BASE_URL or "https://api.cerebras.ai/v1").rstrip("/") + "/chat/completions"
    model_name = config.AI_MODEL or "gpt-oss-120b"
    
    system_prompt = """You are SIF-SHIELD AI, an expert industrial safety engineer and precursor intelligence engine for oil & gas refinery and drilling operations (conforming to IOGP Report 459 and Campbell Institute SIF Framework).

Analyze the safety observation report and output a strictly valid JSON object with NO preamble or markdown ticks.

Schema:
{
  "site": string (e.g. "Digboi Refinery D", "Drilling Site A", "Offshore Rig 04"),
  "unit": string (e.g. "CDU", "FCCU", "Mud Pump Area", "Derrick Floor", "BOP Stack"),
  "location": string,
  "activity": string,
  "equipment_involved": string,
  "energy_source": string (e.g. "Pressurized Fluid / Gas", "Gravitational Potential", "Electrical (High Voltage)", "Thermal / Chemical", "Kinetic / Mechanical"),
  "hazard": string,
  "barrier": string,
  "barrier_failure": string,
  "exposure": string,
  "consequence": string,
  "life_saving_rule": string (Must be one of: "Energy Isolation", "Line of Fire", "Hot Work", "Confined Space", "Working at Height", "Lifting Operations", "Vehicle Safety", "Electrical Safety", "None"),
  "is_sif_precursor": string ("YES" or "NO"),
  "sif_probability": float (0.0 to 100.0),
  "confidence": float (70.0 to 99.0),
  "severity_score": float (0.0 to 10.0),
  "exposure_score": float (0.0 to 10.0),
  "barrier_score": float (0.0 to 10.0),
  "consequence_score": float (0.0 to 10.0),
  "sif_risk_score": float (0.0 to 10.0, calculated composite),
  "risk_level": string ("CRITICAL", "HIGH", "MEDIUM", or "LOW"),
  "explanation": string (Clear 1-2 sentence engineering narrative of the hazard breakdown),
  "recommended_action": string (Actionable 2-3 step corrective and preventive actions),
  "stop_work_recommended": boolean,
  "l1_milestone": string,
  "l2_unit": string,
  "l3_discipline": string,
  "l4_work_package": string,
  "l5_activity": string,
  "l6_job": string
}"""

    user_prompt = f"Worker Safety Report Text:\n\"{text}\"\n"
    if report_meta:
        user_prompt += f"\nMetadata provided: Site={report_meta.get('site', 'Auto-detect')}, Unit={report_meta.get('unit', 'Auto-detect')}, Audio Transcript={report_meta.get('audio_transcript', 'None')}"

    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.1
    }

    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "User-Agent": STANDARD_USER_AGENT
    }

    try:
        req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers)
        with urllib.request.urlopen(req, timeout=7) as resp:
            res_data = json.loads(resp.read().decode("utf-8"))
            content = res_data["choices"][0]["message"]["content"].strip()
            
            # Clean possible markdown wrapping
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
                
            parsed = json.loads(content.strip())
            
            # Add simulated alerts
            risk_lvl = parsed.get("risk_level", "MEDIUM")
            simulated_alerts = []
            if risk_lvl in ["CRITICAL", "HIGH"]:
                simulated_alerts.append({
                    "channel": "DASHBOARD_BANNER",
                    "target": "Safety Officer Alert Inbox",
                    "message": f"🚨 URGENT {risk_lvl} SIF PRECURSOR: {parsed.get('activity', 'Activity')} at {parsed.get('site', 'Site')} ({parsed.get('unit', 'Unit')})",
                    "status": "Dispatched"
                })
                simulated_alerts.append({
                    "channel": "SMS_BROADCAST",
                    "target": "+91-98765-XXXXX (Site Safety Head)",
                    "message": f"[SIF-SHIELD AI ALERT] Critical precursor flagged at {parsed.get('site', 'Site')}. Score: {parsed.get('sif_risk_score', 8.0)}/10.",
                    "status": "Delivered"
                })
            
            parsed["simulated_alerts"] = simulated_alerts
            parsed["ai_source"] = f"LLM ({config.AI_PROVIDER.title()}: {model_name})"
            return parsed
            
    except Exception as e:
        print(f"[SIF-SHIELD AI Engine] LLM invocation note: {str(e)}. Executing GATI deterministic engine.")
        return None

def analyzeSafetyReport(text: str, db: Session = None, report_meta: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Analyzes safety report text using the LLM engine when available, 
    with seamless fallback to the calibrated GATI deterministic scoring engine.
    """
    # 1. Attempt LLM invocation
    llm_result = _call_llm_analysis(text, report_meta)
    if llm_result:
        return llm_result

    # 2. Deterministic GATI Rule & Heuristic Engine (Fallback / Offline)
    text_lower = (text or "").lower()
    
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

    # Site / Location / Unit extraction
    site = (report_meta and report_meta.get("site")) or "Digboi Refinery D"
    for s in ["drilling site a", "drilling site b", "drilling site c", "refinery a", "refinery b", "refinery c", "refinery d", "refinery e", "offshore rig 04", "digboi refinery d", "numaligarh terminal"]:
        if s in text_lower:
            site = s.title()
            break
            
    unit = (report_meta and report_meta.get("unit")) or "CDU"
    for u in ["rig floor 01", "mud pump area", "substructure", "derrick mast", "cdu", "fccu", "dhu", "vdu", "tank farm", "utility block", "bop stack", "wellhead area"]:
        if u in text_lower:
            unit = u.upper() if len(u) <= 4 else u.title()
            break
            
    location = (report_meta and report_meta.get("location")) or f"{unit} - Zone 2"
    if "area" in text_lower or "zone" in text_lower:
        match = re.search(r'(area|zone)\s*([0-9a-zA-Z\-_]+)', text_lower)
        if match:
            location = f"{unit} - {match.group(1).title()} {match.group(2).upper()}"

    # Activity Extraction
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

    # Equipment Involved
    equipment = (report_meta and report_meta.get("equipment_involved")) or "General Machinery"
    if "crane" in text_lower or "rigging" in text_lower or "sling" in text_lower:
        equipment = "Hydraulic Mobile Crane / Slings"
    elif "bop" in text_lower or "blowout" in text_lower:
        equipment = "Blowout Preventer (BOP) Stack"
    elif "valve" in text_lower or "flange" in text_lower:
        equipment = "High Pressure Isolation Flange Valves"
    elif "scaffold" in text_lower or "ladder" in text_lower:
        equipment = "Platform Scaffolding / Fall Arrester"
    elif "welding" in text_lower or "torch" in text_lower:
        equipment = "Oxy-Acetylene Cutting & TIG Welding Rig"

    # Energy Source Extraction
    energy_source = "Mechanical / Kinetic"
    if "voltage" in text_lower or "electrical" in text_lower or "shock" in text_lower or "wire" in text_lower:
        energy_source = "Electrical (High Voltage)"
    elif "fall" in text_lower or "height" in text_lower or "dropped" in text_lower:
        energy_source = "Gravitational Potential"
    elif "pressure" in text_lower or "steam" in text_lower or "gas" in text_lower or "valve" in text_lower or "bleed" in text_lower:
        energy_source = "Pressurized Fluid / Gas"
    elif "welding" in text_lower or "flame" in text_lower or "spark" in text_lower or "fire" in text_lower:
        energy_source = "Thermal / Chemical"

    # Hazard Detection
    hazard = "Uncontrolled energy release in active operating zone"
    if "fall" in text_lower or "height" in text_lower or "ladder" in text_lower:
        hazard = "Catastrophic fall from elevated scaffold"
    elif "isolation" in text_lower or "loto" in text_lower or "valve" in text_lower:
        hazard = "Unexpected pressurized hazardous fluid/gas ejection"
    elif "crane" in text_lower or "lift" in text_lower or "rigging" in text_lower:
        hazard = "Suspended structural load failure / dropped object"
    elif "confined" in text_lower or "toxic" in text_lower or "oxygen" in text_lower:
        hazard = "Atmospheric asphyxiation or toxic H2S exposure"
    elif "spark" in text_lower or "welding" in text_lower or "hot work" in text_lower:
        hazard = "Ignition of volatile hydrocarbon atmospheric pocket"
    elif "shock" in text_lower or "electrical" in text_lower:
        hazard = "Direct contact electrocution from high-voltage conductor"

    # Barrier & Failure Detection
    barrier = "Engineering Control / Physical Barrier"
    barrier_failure = "Protocol bypass or verification failure"
    if "harness" in text_lower or "fall" in text_lower:
        barrier = "Fall Protection Harness / Scaffold Handrails"
        barrier_failure = "Harness lanyard not anchored or scaffold uncertified"
    elif "loto" in text_lower or "isolation" in text_lower:
        barrier = "Double Block & Bleed Isolation / LOTO Locks"
        barrier_failure = "Zero-energy verification not performed before disconnect"
    elif "gas" in text_lower or "hot work" in text_lower:
        barrier = "Multi-Gas Continuous Atmospheric Detector"
        barrier_failure = "Hot work initiated without gas clearance clearance permit"
    elif "confined" in text_lower:
        barrier = "Confined Space Entry Permit & Mechanical Air Blower"
        barrier_failure = "Forced ventilation not established before personnel entry"
    elif "lift" in text_lower or "crane" in text_lower:
        barrier = "Barricaded Exclusion Zone & Certified Rigging Slings"
        barrier_failure = "Personnel entered crane drop radius without tagline"

    # Exposure & Consequence
    exposure = "Work crew stationed within immediate release zone"
    consequence = "Catastrophic bodily trauma / fatal SIF incident"

    # LSR Mapping
    rule_scores = {r: 0 for r in BASE_LSR_KEYWORDS.keys()}
    for rule, keywords in lsr_keywords.items():
        for kw in keywords:
            if kw in text_lower:
                rule_scores[rule] += 1
    best_rule = max(rule_scores, key=rule_scores.get)
    mapped_rule = best_rule if rule_scores[best_rule] > 0 else "None"

    # Keyword Weights & SIF Calculation
    found_weights = [weight for kw, weight in sif_keywords.items() if kw in text_lower]
    keyword_sif_score = max(found_weights) if found_weights else 0.20
    is_precursor_flag = keyword_sif_score >= 0.70 or mapped_rule in ["Energy Isolation", "Working at Height", "Confined Space", "Lifting Operations"]
    is_sif_precursor = "YES" if is_precursor_flag else "NO"

    # 0-10 Multi-Factor Scoring Engine
    severity_score = min(9.8, max(2.0, (keyword_sif_score * 10.0) + (1.2 if mapped_rule != "None" else -1.5)))
    exposure_score = min(9.5, max(1.5, (keyword_sif_score * 8.5) + (1.5 if "crew" in text_lower or "worker" in text_lower else 0.5)))
    barrier_score = min(9.9, max(2.5, (keyword_sif_score * 9.0) + 1.0))
    consequence_score = min(9.9, max(2.0, (severity_score * 0.6) + (barrier_score * 0.4)))
    
    sif_risk_score = round(min(9.9, (severity_score * 0.35) + (exposure_score * 0.25) + (barrier_score * 0.25) + (consequence_score * 0.15)), 1)
    
    if sif_risk_score >= 8.5:
        risk_level = "CRITICAL"
    elif sif_risk_score >= 6.5:
        risk_level = "HIGH"
    elif sif_risk_score >= 4.0:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    sif_probability = round(min(98.0, max(5.0, sif_risk_score * 10.2)), 1)
    confidence = round(min(96.0, max(74.0, 80.0 + (len(found_weights) * 3.5))), 1)

    explanation = f"SIF Precursor Flagged: Observation identifies failure of primary barrier '{barrier}' under {energy_source} conditions. High probability of Life-Saving Rule violation: {mapped_rule}."

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
            "message": f"[SIF-SHIELD AI ALERT] Critical precursor flagged at {site}. Score: {sif_risk_score}/10.",
            "status": "Delivered"
        })

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
        "l6_job": l6_job,
        "ai_source": "GATI Heuristic Engine (High-Accuracy Deterministic Mode)"
    }


def ask_ai_safety_copilot(prompt: str, context_event_id: Optional[str] = None, db: Session = None) -> Dict[str, Any]:
    """
    SIF Safety Copilot assistant for queries, precursor advice, root causes, and IOGP compliance.
    """
    key = config.AI_API_KEY
    model_name = config.AI_MODEL or "gpt-oss-120b"
    url = (config.AI_BASE_URL or "https://api.cerebras.ai/v1").rstrip("/") + "/chat/completions"

    event_context = ""
    if context_event_id and db is not None:
        try:
            evt = db.query(models.SafetyEvent).filter(
                (models.SafetyEvent.id == context_event_id) | (models.SafetyEvent.report_code == context_event_id)
            ).first()
            if evt:
                event_context = f"\nContext Safety Event [{evt.id} | {evt.report_code}]: Site={evt.site}, Unit={evt.unit}, Rule={evt.life_saving_rule}, SIF Score={evt.sif_risk_score}/10, Hazard={evt.hazard}, Barrier Failure={evt.barrier_failure}, Description={evt.description}."
        except Exception:
            pass

    system_instruction = (
        "You are SIF-SHIELD AI Safety Assistant, an expert HSE advisor for Oil India Limited (OIL) "
        "and refinery/drilling operations adhering strictly to IOGP Report 459 and Campbell Institute SIF frameworks. "
        "Provide professional, structured, actionable advice highlighting precursor risks, life-saving rules, "
        "and direct barrier controls."
    )

    if key and len(key.strip()) > 0:
        try:
            payload = {
                "model": model_name,
                "messages": [
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": f"{prompt}{event_context}"}
                ],
                "temperature": 0.2,
                "max_tokens": 600
            }
            headers = {
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
                "User-Agent": STANDARD_USER_AGENT
            }
            req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers)
            with urllib.request.urlopen(req, timeout=8) as resp:
                res_data = json.loads(resp.read().decode("utf-8"))
                reply = res_data["choices"][0]["message"]["content"].strip()
                return {
                    "success": True,
                    "response": reply,
                    "provider": config.AI_PROVIDER,
                    "model": model_name,
                    "source": "Live LLM Engine"
                }
        except Exception as e:
            print(f"Safety Copilot LLM call fallback: {e}")

    # High-intelligence Domain Fallback Synthesis
    prompt_lower = prompt.lower()
    fallback_resp = ""

    if "loto" in prompt_lower or "isolation" in prompt_lower or "energy" in prompt_lower:
        fallback_resp = (
            "### Energy Isolation & LOTO Protocol (IOGP LSR #1)\n\n"
            "**Key Principles:**\n"
            "1. **Zero Energy Verification:** Always depressurize, bleed residual fluids, and verify zero voltage before breaking containment.\n"
            "2. **Positive Isolation:** Double block and bleed (DBB) or physical blind flange is mandatory for hazardous hydrocarbons and high pressures (>10 bar).\n"
            "3. **Personal Padlocks:** Every worker exposed to stored energy must apply their personal padlock and danger tag to the group lock box."
        )
    elif "height" in prompt_lower or "fall" in prompt_lower or "scaffold" in prompt_lower or "derrick" in prompt_lower:
        fallback_resp = (
            "### Working at Height & Fall Prevention (IOGP LSR #5)\n\n"
            "**Safety Requirements:**\n"
            "1. **100% Tie-Off:** Full-body harness with double shock-absorbing lanyards anchored to certified anchor points (min 22.2 kN / 5,000 lbs rating) above 1.8m.\n"
            "2. **Scaffold Certification:** Green inspection tag signed within the last 7 days required prior to access.\n"
            "3. **Dropped Object Prevention:** Tool lanyards and toe-boards mandatory on derrick mast and elevated platforms."
        )
    elif "confined" in prompt_lower or "vessel" in prompt_lower or "oxygen" in prompt_lower or "gas" in prompt_lower:
        fallback_resp = (
            "### Confined Space Entry & Atmospheric Safety (IOGP LSR #4)\n\n"
            "**Mandatory Safety Protocol:**\n"
            "1. **Pre-Entry Gas Testing:** Verify O2 (19.5% - 23.5%), LEL (<1%), H2S (<5 ppm), and CO (<25 ppm) at multiple elevations.\n"
            "2. **Continuous Forced Ventilation:** Maintain positive air blower exhaust throughout vessel occupancy.\n"
            "3. **Dedicated Standby Watch:** Trained rescuer stationed at manway with retrieval winch and emergency SCBA."
        )
    elif "lift" in prompt_lower or "crane" in prompt_lower or "rigging" in prompt_lower or "sling" in prompt_lower:
        fallback_resp = (
            "### Heavy Lifting & Suspended Loads (IOGP LSR #6)\n\n"
            "**Operational Directives:**\n"
            "1. **Exclusion Zone Barricading:** Maintain 1.5x boom radius red-tape exclusion zone; zero personnel under suspended load.\n"
            "2. **Rigging Inspection:** Pre-use visual check of wire rope slings, shackles, and crane load-moment indicator (LMI).\n"
            "3. **Tagline Control:** Use minimum two synthetic fiber taglines for rotational load control."
        )
    else:
        fallback_resp = (
            f"### SIF-SHIELD AI Safety Assessment\n\n"
            f"**Operational Analysis for: \"{prompt}\"**\n\n"
            "1. **Precursor Hazard Screening:** Evaluate potential high-energy sources (pressurized hydrocarbons, gravitational elevation, electrical potential) and the presence of direct critical barriers.\n"
            "2. **Primary Mitigation Directive:** Enforce strict adherence to Oil India Limited (OIL) Standard Operating Procedures and IOGP Life-Saving Rules.\n"
            "3. **Stop Work Authority (SWA):** Any personnel detecting barrier breakdown or unverified energy isolation is empowered and required to issue an immediate Stop Work Order."
        )

    return {
        "success": True,
        "response": fallback_resp,
        "provider": config.AI_PROVIDER,
        "model": "GATI Calibrated Expert Heuristic",
        "source": "GATI Safety Knowledge Base"
    }

