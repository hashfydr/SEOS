# [:: SEOS ::] Software Engineering Operating System
> **An AI-Powered Connected Engineering Workspace keeping requirements, domain models, architecture, APIs, and living documentation synchronized through a single canonical project model.**  
> *Developed for Thapar Institute of Engineering & Technology (TIET) — UCS 503 Coursework.*

---

## [● OVERVIEW]

**SEOS** (Software Engineering Operating System) solves the artifact-drift problem in software engineering. In traditional development, requirements, UML diagrams, architecture documents, and API contracts are created in siloed tools and quickly fall out of sync.

SEOS enforces a **single source of truth** across all engineering phases. When you input a product concept or modify an artifact, the connected pipeline propagates and synchronizes changes across every stage in real time:

```text
[Product Idea] ──> [01/REQ] ──> [06/TEST] ──> [02/UML] ──> [04/ARCH] ──> [03/API] ──> [05/DOCS]
```

---

## [:: CORE MODULES & FEATURES ::]

### `[01 / REQ]` Requirements Engineering
* **IEEE 830 Structure**: Elicits, refines, and formats measurable Functional and Non-Functional constraints.
* **Granular Attributes**: Tracks priority (`[CRITICAL]`, `[HIGH]`, `[MEDIUM]`, `[LOW]`) and approval state (`[DRAFT]`, `[APPROVED]`, `[REJECTED]`).
* **Instant Revision**: Direct editing allows refining requirements without breaking downstream links.

### `[06 / TEST]` Agile User Stories & Acceptance Criteria
* **Automated Story Extraction**: Derives stories in industry-standard format: `As a <role>, I want <action>, so that <benefit>`.
* **Gherkin Acceptance Scenarios**: Structured `Given / When / Then` verification criteria for every story.
* **Traceability Matrix**: Every user story links directly to its parent requirement ID (e.g., `REQ-101`).

### `[02 / UML]` Domain & Database Modeling
* **Interactive ER & Class Canvas**: Visual node-and-edge designer with drag-and-drop entity editing.
* **Schema Rigor**: Automatically infers field types, primary keys (`PK`), foreign keys (`FK`), and relational cardinalities (`1:1`, `1:N`, `N:M`).
* **Bidirectional Sync**: Schema modifications immediately update the API specifications and SRS data dictionaries.

### `[04 / ARCH]` Architectural Patterns & Trade-offs
* **Pattern Recommendation**: Evaluates project scale to recommend patterns (*Clean Architecture*, *Modular Monolith*, *Event-Driven Microservices*).
* **Component Decomposition**: Maps architectural components to specific technologies (API Gateway, Event Bus, Cache, Primary DB).
* **Trade-off Analysis**: Weighs structural advantages against latency, complexity, and operational costs.

### `[03 / API]` API Designer & Reverse Parser
* **OpenAPI 3.1 YAML Contract**: Derives production-ready REST API contracts directly from domain models.
* **Bidirectional Reverse Parser**: Paste any raw OpenAPI YAML to automatically synthesize UML entities and endpoints.
* **Coursework Validation**: Verifies HTTP status codes, schema definitions, and path parameters against academic standards.

### `[05 / DOCS]` Living Documentation & Multi-Format Exporter
* **Complete IEEE 830 SRS**: Auto-generates full specifications with scope, system features, and data requirements.
* **[↓] Export Markdown (`.md`)**: Downloads a comprehensive Markdown file ready for GitHub repositories.
* **[P] Export Document (`.pdf`)**: Formats an executive printable specification for course submission.

---

## [:: ADVANCED PLATFORM CAPABILITIES ::]

### `[:: AUTH ::]` 3-Role Access Control (RBAC)
* **`[SOLO DEV]`**: Register freely without a code. Develop individual projects, save to the database, and upload personal reference materials.
* **`[STUDENT]`**: Register with a course join code (e.g., `UCS503-FALL26`). Automatically enroll in the instructor's cohort and access class literature.
* **`[MENTOR]`**: Create classrooms, issue join codes, inspect live student audit rosters (mastery %, readiness status), and upload syllabus documents.

### `[# CONTEXT]` Document Upload & Grounded RAG
* **Multi-Format Ingestion**: Upload `.pdf`, `.md`, or `.txt` files directly via the `# CONTEXT` sidebar.
* **Semantic Chunking**: Extracted using `pypdf`, chunked, and indexed into the local vector/search retriever.
* **Dual-Layer Grounding**: Live AI chat citations cite both canonical engineering literature (*Sommerville*, *Kleppmann*, *Martin*, *Evans*) and custom course files.

### `[● PERSISTENCE]` Real-Time Database Auto-Sync
* **No Cache Loss**: Replaces fragile browser storage with a robust backend database (SQLite / PostgreSQL).
* **1.5s Debounced Auto-Save**: Background syncing saves every keystroke and diagram edit.
* **Top-Bar Status**: Subtle indicators (`[● SAVED]` / `[↑ SYNCING]`) confirm backend persistence.

---

## [:: HOW TO RUN SEOS ::]

### "Can I just run `npm run dev`?"

* **Yes, for local UI testing**: Running `npm run dev` inside `seos-app` boots the Vite frontend on `http://localhost:5173`. You can explore the UI, design UML models, and test offline features.
* **Why you should run the FastAPI backend too**: 
  The FastAPI backend on port `8000` provides:
  1. Real database persistence (prevents data loss when cache is cleared).
  2. 3-role authentication & student classroom join codes.
  3. Mentor live audit roster view.
  4. Custom PDF / Markdown file upload and RAG search grounding.
  
  *Vite is pre-configured to automatically proxy `/api/v1` requests directly to `http://127.0.0.1:8000`.*

---

### Option 1: One-Command Startup (Recommended)

Run the included launch script from the project root:

```bash
chmod +x start.sh
./start.sh
```

*This automatically activates the Python virtualenv, starts FastAPI on port 8000, installs npm packages if needed, launches Vite on port 5173, and terminates all processes cleanly on `Ctrl+C`.*

---

### Option 2: Manual Two-Terminal Setup

#### Terminal 1 — FastAPI Backend:
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Backend runs on: `http://127.0.0.1:8000` (Interactive docs: `http://127.0.0.1:8000/docs`)*

#### Terminal 2 — Vite Frontend:
```bash
cd seos-app
npm install
npm run dev
```
*Frontend runs on: `http://localhost:5173`*

---

### Option 3: Docker Compose (Full Stack)

To run Postgres, FastAPI, and the production Nginx frontend together:

```bash
docker compose up -d
```
* Access Web Application: `http://localhost:3000`
* Access Backend API: `http://localhost:8000`

---

## [:: EVALUATION & DEMO ACCOUNTS ::]

### Local Development & Evaluation Accounts

In local development, you can register fresh accounts directly or use the 1-click ephemeral demo buttons in the Auth Modal:

- **`[SOLO DEV]`**: Unenrolled developer workspace. Full project creation, offline sync, and personal literature upload.
- **`[STUDENT]`**: Classroom student workspace. Enrolls into course cohorts (e.g. `UCS503-FALL26`), automatic mentor milestone sync.
- **`[MENTOR]`**: Faculty workspace. Requires institutional passcode (`SEOS-MENTOR-INVITE-2026`). Enables course creation, live cohort roster inspection, and syllabus RAG ingestion.

> [!IMPORTANT]
> **Production Security Guarantee**: SEOS does not ship hardcoded default credentials. Production deployments require environment-configured JWT secrets, enforce strict BOLA/IDOR tenant boundaries, mandate minimum 8-character passwords, and require verified institutional provisioning for faculty roles.

---

## [:: VERIFICATION & TEST SUITE ::]

Run the automated test suites to verify system integrity:

```bash
# 1. Frontend Unit & Store Tests (26 tests)
cd seos-app && npm test

# 2. TypeScript & Production Build Check (0 errors)
cd seos-app && npm run build

# 3. Backend Integration & RBAC Tests (9 tests)
cd backend && .venv/bin/pytest
```

---

## [:: TECHNOLOGY STACK ::]

* **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Zustand.
* **Backend**: FastAPI, Python 3.12+, SQLAlchemy 2.0, Pydantic v2, PyPDF.
* **Database**: SQLite (default local) / PostgreSQL with pgvector (production).
* **Specifications**: IEEE 830 (SRS), OpenAPI 3.1, Gherkin syntax.

---

## [:: LICENSE ::]

Distributed under the MIT License. Developed for TIET UCS 503 Coursework.
