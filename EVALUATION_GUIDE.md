# SEOS — Academic Evaluation Guide & Usability Study Protocol
> **Course:** UCS 503 — Software Engineering  
> **Evaluation Reference:** SEOS Final Report (§3.1 Testing Methodology, Table 3.2 Success Metrics, §4.3 Usability Study)

---

## 🎯 1. Evaluation Purpose

This document provides a structured protocol to evaluate the **Software Engineering Operating System (SEOS)** against its core SMART objectives:
1. **Connected Engineering Model**: Does a single product concept remain synchronized across requirements, user stories, domain models, architecture, APIs, and documentation?
2. **Two-Way Change Propagation**: Does modifying upstream artifacts (e.g., visual UML/ER model) correctly flag and propagate updates to downstream contracts (OpenAPI, SRS/SDD)?
3. **OpenAPI 3.1 Validation**: Are generated API specifications syntactically and structurally valid without requiring manual correction?
4. **Grounded Explanations & Learning Analytics**: Are architectural recommendations and AI explanations properly grounded in curated software engineering literature (Sommerville, Pressman, Fowler, Newman, Kleppmann)?

---

## 🧪 2. Study Setup & Participants

* **Target Participants**: At least **5 independent student software engineers / mentors**.
* **Pre-requisites**:
  * Node.js v18+ OR Docker installed.
  * Web browser (Chrome / Firefox / Edge).
* **Launch Instructions**:
  * Option A (Docker): `docker compose up --build` $\rightarrow$ open `http://localhost:3000`
  * Option B (Local Dev): `cd seos-app && npm install && npm run dev` $\rightarrow$ open `http://localhost:5173`

---

## 📋 3. User Evaluation Tasks

Each participant must complete the following end-to-end tasks:

### Task 1: Product Concept Ingestion & Requirements Elicitation
1. Open SEOS $\rightarrow$ Navigate to **Requirements Engineer**.
2. Enter a software concept (e.g. *"Campus Peer Tutoring and Study Group Platform"* or *"On-demand Grocery Delivery"*).
3. Review generated Functional and Non-Functional requirements.
4. Edit at least one requirement and approve at least two requirements.
5. Click **"Approve All"** or proceed to **User Stories**.

### Task 2: Agile User Stories & Traceability
1. In **User Stories**, verify that generated stories map to approved requirements (`US-101` $\rightarrow$ `REQ-101`).
2. Verify that acceptance criteria follow Gherkin-style (`Given / When / Then`) boundary conditions.

### Task 3: Visual Domain Modeling & Stale Flag Propagation
1. Navigate to **System Modeling**.
2. Examine the generated ER / class diagram.
3. Add a new domain entity or edit an existing entity's fields (e.g., add a `discount_code` field to `Order`).
4. Notice the sync toast notification and verify that changes persist after switching views.
5. Navigate to **API Designer** or **Documentation**:
   * Observe the **Amber Warning Banner** flagging upstream changes.
   * Click **"Regenerate API Spec"** or **"Regenerate Docs"** to re-synchronize downstream artifacts.

### Task 4: API Designer Validation Check
1. In **API Designer**, observe the header badge: verify it displays **`Valid OpenAPI 3.1.0 ✓`**.
2. Inspect the **Validation Report** tab to review structural OAS diagnostics.
3. Switch between **Endpoints** and **Schemas** tabs to confirm consistency with the YAML AST.

### Task 5: Architecture Reasoning & RAG Grounded Citations
1. Open **Architecture** view.
2. Review the recommended pattern, components table, and trade-offs.
3. Check the **Grounded Literature References (RAG)** card for citations to engineering literature (Sam Newman, Martin Kleppmann, etc.).
4. Open the **AI Assistant** (right sidebar), ask a question (e.g., *"Why use Kafka instead of RabbitMQ?"*), and toggle the **"Show sources"** citation drawer.

### Task 6: Learning Dashboard Verification
1. Navigate to **Learning Dashboard**.
2. Confirm that progress percentages dynamically match the stages completed during Tasks 1–5.
3. Check the **Concept Graph** to verify which concepts display green checkmarks (`REST API`, `DDD`, `SOLID`, etc.).

---

## 📊 4. Quantitative Scoring Rubric (Likert Scale 1–5)

Participants score each criterion from **1 (Strongly Disagree / Poor)** to **5 (Strongly Agree / Excellent)**:

| # | Criterion | Score (1–5) | Evaluator Notes |
|---|---|---|---|
| **M1** | **Artifact Continuity**: The pipeline naturally transitions from idea to requirements, models, APIs, and docs without disjointed context. | | |
| **M2** | **Change Propagation & Staleness**: Upstream model changes clearly notify and provide intuitive downstream regeneration. | | |
| **M3** | **OpenAPI Conformance**: The generated OpenAPI 3.1 specification is clean, syntactically correct, and importable into tools. | | |
| **M4** | **Grounding & Citations**: Literature citations provide clear, trustworthy justifications for architectural trade-offs. | | |
| **M5** | **Learning Dashboard Clarity**: The progress metrics and concept graph accurately reflect engineering decisions made. | | |
| **M6** | **Canvas Usability**: The interactive visual model editor is responsive and reliable for editing entities and cardinalities. | | |

---

## 💬 5. Qualitative Feedback Form

1. *What was the most valuable feature of having all engineering artifacts in one synchronized system?*
2. *Where did you experience any friction or unexpected behavior during generation or model editing?*
3. *How effective were the literature citations in helping you understand the rationale behind architectural trade-offs?*
4. *Additional suggestions for future extension:*
