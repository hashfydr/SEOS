# SEOS FastAPI Backend & PostgreSQL Service

The official REST API Gateway and persistence backend for **SEOS (Software Engineering Operating System)**, documented in UCS 503 Coursework and Chapter 2 of the final engineering report.

---

## Architecture Overview
* **Framework**: FastAPI (Python 3.11)
* **Database**: PostgreSQL 16 with `pgvector` extension for semantic embedding storage
* **ORM**: SQLAlchemy 2.0 with connection pooling
* **Authentication**: OAuth2 Password Flow with JWT (`HS256`) and bcrypt password hashing
* **Role-Based Access Control (RBAC)**:
  * `student`: Can create, update, and manage their own engineering projects and artifacts.
  * `mentor`: Has global read and audit privileges across all student projects for grading and progress review.

---

## Database Schema (Report Figure 1 ER Diagram)
The schema directly implements the normalized entity model defined in `diagrams/er_diagram.tex`:
1. `users`: Authentication, credentials, role (student/mentor), and timestamps.
2. `projects`: Project idea, ownership, version tracking, and synchronization status.
3. `requirements`: Functional and non-functional requirements (REQ-101...) with priority and approval status.
4. `user_stories`: Agile stories adhering to INVEST criteria with acceptance criteria.
5. `diagrams`: UML domain models (nodes, edges, positions, and Mermaid code) with locking flags.
6. `architecture`: Recommended pattern, rationale, component breakdown, and grounded literature citations.
7. `api_specs`: Validated OpenAPI 3.1 YAML specifications.
8. `documents`: IEEE 830 SRS, SDD, and project README Markdown sections.
9. `knowledge_base`: Semantic chunks from 8 classical software engineering books (Newman, Kleppmann, Fowler, Evans, Sommerville, Pressman, Fielding, Martin).

---

## API Endpoints

### 1. Authentication (`/api/v1/auth`)
* `POST /api/v1/auth/register`: Register new student or mentor account.
* `POST /api/v1/auth/login`: Authenticate and receive a JWT Bearer token.
* `GET /api/v1/auth/me`: Inspect active session credentials.

### 2. Project Management (`/api/v1/projects`)
* `GET /api/v1/projects`: List projects (students view own; mentors view all).
* `POST /api/v1/projects`: Create a new project.
* `GET /api/v1/projects/{id}`: Retrieve project with all synchronized artifacts.
* `PUT /api/v1/projects/{id}`: Update project metadata.
* `DELETE /api/v1/projects/{id}`: Delete project.

### 3. Artifact Synchronization (`/api/v1/projects/{id}/artifacts`)
* `PUT /api/v1/projects/{id}/artifacts/requirements`: Sync requirements.
* `PUT /api/v1/projects/{id}/artifacts/stories`: Sync user stories.
* `PUT /api/v1/projects/{id}/artifacts/diagram`: Sync UML nodes & edges.
* `PUT /api/v1/projects/{id}/artifacts/architecture`: Sync architecture recommendations.
* `PUT /api/v1/projects/{id}/artifacts/api-spec`: Sync OpenAPI 3.1 specification.
* `PUT /api/v1/projects/{id}/artifacts/docs`: Sync SRS/SDD/README documentation.

### 4. Knowledge Retrieval (RAG) (`/api/v1/knowledge`)
* `GET /api/v1/knowledge/search?q={query}`: Search literature by topic or keyword.
* `GET /api/v1/knowledge/topics`: List available architectural knowledge domains.

### 5. Health (`/api/v1/health`)
* `GET /api/v1/health`: Service health and database status.

---

## Running with Docker Compose
From the repository root:
```bash
docker compose up --build
```
* **Frontend**: `http://localhost:3000`
* **FastAPI Swagger UI**: `http://localhost:8000/api/v1/docs`
* **PostgreSQL**: `localhost:5432` (db: `seos_db`, user: `seos_user`)
