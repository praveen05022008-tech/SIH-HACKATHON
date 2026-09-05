# MAYAN-SAFE: AI-Powered SIF Precursor Intelligence Platform

> **Smart India Hackathon 2026 Prototype**
> *Tagline: "From Safety Reports to Early Warning."*
> *refinery HSE (Health, Safety, and Environment) Decision Support Tool*

---

## 1. Project Overview

MAYAN-SAFE is a production-style safety analytics application designed specifically for oil-refineries and heavy chemical manufacturing environments. 

Rather than reviewing safety reports periodically or manually, MAYAN-SAFE continuously ingests:
- Unsafe Act (UA) and Unsafe Condition (UC) observations
- Near-miss logs and incident reports
- Field narratives and safety statements

It automatically extracts critical parameters (safeguards, energy sources, hazards, location context L1-L6), predicts SIF (Serious Injury or Fatality) potential, maps reports to IOGP Life-Saving Rules, and identifies recurring precursor clusters to prevent major accidents before they occur.

---

## 2. Technology Stack

* **Frontend**: React (TypeScript), Tailwind CSS v4, Recharts, Lucide Icons, Vite
* **Backend**: Python FastAPI, SQLAlchemy ORM, Uvicorn
* **Database**: TiDB Cloud (MySQL protocol)

---

## 3. Setup & Installation

### Prerequisite Versions
- Node.js (v24.x or newer)
- Python (v3.12.x or newer)
- npm (v11.x or newer)

### Installation Steps

1. **Clone/Open Workspace**:
   Ensure you are in the project root directory.

2. **Set up Backend**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables**:
   Create or modify the environment file at `backend/app/.env`.
   ```ini
   DATABASE_URL=mysql+pymysql://3jfTYcg9qFzDk43.root:<PASSWORD>@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/sys
   SECRET_KEY=gati_secret_key_sih_2026_mayan_safe
   ENV=development
   ```
   *Replace `<PASSWORD>` with your TiDB Cloud database password.*

4. **Seed the Database**:
   Run the seeding script to compile 100+ raw observations, default rules, and sample learning history logs.
   ```bash
   python -m backend.app.seed
   ```

5. **Start the API Server**:
   ```bash
   uvicorn backend.app.main:app --reload --port 8000
   ```

6. **Set up and Launch Frontend**:
   Open a separate command window:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Open the output URL (typically `http://localhost:5173`) in your browser.

---

## 4. Demo Login Credentials

The application provides quick login autofill selectors on the login page for three demo roles:

* **HSE Manager**: `manager@refinery.safe` / `password123`
* **HSE Analyst**: `analyst@refinery.safe` / `password123`
* **Reviewer**: `reviewer@refinery.safe` / `password123`

---

## 5. API Documentation

Key REST endpoints:

* `GET /api/dashboard`: Fetches overall refinery KPIs, Site rankings, LSR status and recent SIF events list.
* `GET /api/events`: Fetches all events with query parameters (`site`, `status`, `sif_potential`, `life_saving_rule`, `search`).
* `GET /api/events/{event_id}`: Fetches a single safety event detail with audit timelines.
* `POST /api/events/analyze`: Submits a free-text report to run through the M1-M6 pipeline.
* `POST /api/events/{event_id}/review`: Submits reviewer validation which adjusts GATI weights.
* `GET /api/sif`: Fetches SIF scatter bubble plot counts.
* `GET /api/precursors`: Fetches active recurring precursor pattern card logs.
* `GET /api/learning`: Fetches GATI learning calibration metrics.
* `POST /api/seed/reset`: Purges and resets database seed data.

---

## 6. AI/NLP Architecture

1. **Deterministic Rule Engine**: Maps keywords inside safety reports (e.g. `"isolation"`, `"harness"`, `"excavation"`) to predicted SIF scores and IOGP Life-Saving Rules out of the box.
2. **GATI Feedback Calibration**: When a reviewer corrects an event, a `LearningEvent` is logged. The AI analysis engine queries corrections at runtime and modifies SIF scores and rule keywords dynamically.
3. **Replacement Interface**: The AI layer is encapsulated in `backend/app/ai_service.py` behind the `analyzeSafetyReport` interface, allowing later plug-and-play connection to LLMs like OpenAI, Hugging Face, or local models.

---

## 7. Known Limitations & Future Improvements

- **Mock PDF Export**: The reports export features generated mock downloads.
- **LLM Integration**: The prototype uses keyword parsing rules to guarantee immediate offline functionality. Adding OpenAI APIs is a straightforward configuration.
- **WebSocket Feed**: The simulated safety events currently update via page navigation and state triggers; real-time push can be added with WebSockets.
