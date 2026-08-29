# MAYAN-SAFE: Conceptual Architecture Documentation

This document describes the architectural specifications, processing pipelines, and data frameworks for the **MAYAN-SAFE AI-Powered SIF Precursor Intelligence Platform**.

---

## 1. Core Architectural Paradigm

MAYAN-SAFE separates the platform into three independent dimensions:
1. **Processing Lifecycle (MAYAN M1–M6)**: Ingestion, NLP extraction, enrichment, SIF classification, and alerting.
2. **Operational Framework (GATI Engine)**: Governance, semantic adjustments, audits, database ORM, and the reviewer-driven learning loop.
3. **Operational Context (Refinery L1–L6)**: The physical hierarchy of refinery activities (Turnarounds, units, packages, jobs).

```
   [Raw HSE Narrative]
           │
           ▼
┌──────────────────────┐
│  MAYAN Pipeline      │ 
│  (M1 ──► M6 Flow)    │
└──────────┬───────────┘
           │ Context Mapping
           ▼
┌──────────────────────┐      GATI Learning Loop
│  Refinery Context    │ ◄─────────────────────────┐
│  (L1 ──► L6 Tree)    │                           │
└──────────┬───────────┘                           │
           │ Structured Output                     │
           ▼                                       │
┌──────────────────────────────────────────────┐   │
│                 GATI ENGINE                  │   │
│ ┌──────────────┐ ┌──────────────┐ ┌────────┐ │   │
│ │ Data Schema  │ │ Audit Logs   │ │ learning│ │───┘
│ └──────────────┘ └──────────────┘ └────────┘ │
└──────────────────────────────────────────────┘
```

---

## 2. MAYAN processing Pipeline (M1–M6)

When a raw text safety report is ingested, the system moves it sequentially through 6 processing phases:

* **M1 — CAPTURE**:
  Ingests free-text observations, near-miss narratives, photographs, and historical CSV logs via REST APIs.
* **M2 — UNDERSTAND**:
  Processes the text using natural language parser to extract core semantic objects (safeguards, anomalies, hazard descriptions).
* **M3 — CONTEXT**:
  Enriches the incident with physical operational parameters, mapping it to the appropriate site, unit, and location.
* **M4 — CLASSIFY**:
  Scores SIF (Serious Injury or Fatality) potential probability, computes the classifier's confidence score, and links the incident to IOGP Life-Saving Rules.
* **M5 — ASSURE**:
  Performs quality check gates. Low-confidence or high-severity cases are queued in the HSE Review Queue, and the action history logs are recorded.
* **M6 — ACT**:
  Dispatches structured notifications, updates risk dashboards, aggregates recurring patterns, and flags emergency intervention tasks.

---

## 3. GATI Governance & Learning Engine

The **Governance-Aware Tracking & Intelligence (GATI)** engine houses the core logic, integration layers, database models, and the active learning loop.

### GATI Learning Loop Implementation
The learning loop is designed as a Human-in-the-Loop (HITL) calibration flow:
1. **Initial State**: The system ingests a report and applies baseline weights (e.g., matching `"valve"` to routine work with moderate SIF probability).
2. **Review Triage**: High SIF potential or low confidence incidents are sent to the Review Queue.
3. **HSE Reviewer Correction**: An HSE specialist validates or overrides the classification (e.g., marking a valve isolation failure as *High SIF Potential* under the *Energy Isolation* rule).
4. **Learning Signal Dispatched**: GATI creates a `LearningEvent` record. The engine updates the keyword weight matrix (increasing weights for words like `"valve isolation"` to trigger higher SIF probability in subsequent M4 stages).
5. **Calibrated Output**: Future reports containing these words are classified with the updated, site-specific calibrations.

---

## 4. Refinery Operational Hierarchy (L1–L6)

Operational data is structured according to the standard refinery physical hierarchy. This is completely decoupled from processing (M1-M6) and serves as operational metadata:

* **L1 — Macro Milestone**: Major refinery phases (e.g., Turnaround 2026, Routine Operations).
* **L2 — Unit / Area**: Physical refinery units (e.g., CDU, FCCU, Tank Farm).
* **L3 — Discipline / System**: Maintenance discipline (e.g., Mechanical Piping, Electrical Systems).
* **L4 — Work Package**: Assigned maintenance tasks packages (e.g., Separator Actuator Refurbish).
* **L5 — Activity / Task**: Specific operations (e.g., Valve replacement, Scaffolding platform adjustment).
* **L6 — Executable Job**: The individual job item (e.g., Isolate and remove gate valve V-204).

This hierarchy allows the HSE team to perform drilldown risk analysis on specific units and disciplines.
