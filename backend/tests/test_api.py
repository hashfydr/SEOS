import pytest
from app.main import app

def test_health_check(client):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["service"] == "seos-backend"

def test_auth_workflow(client):
    # Register student
    reg_res = client.post("/api/v1/auth/register", json={
        "name": "Alice Student",
        "email": "alice@thapar.edu",
        "password": "password123",
        "role": "student"
    })
    assert reg_res.status_code == 201
    assert reg_res.json()["email"] == "alice@thapar.edu"

    # Login student
    login_res = client.post("/api/v1/auth/login", json={
        "email": "alice@thapar.edu",
        "password": "password123"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    assert token is not None

    # Get /me
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["name"] == "Alice Student"

def test_project_and_artifacts_sync(client):
    # Register and login student
    client.post("/api/v1/auth/register", json={
        "name": "Bob Student",
        "email": "bob@thapar.edu",
        "password": "password123",
        "role": "student"
    })
    login_res = client.post("/api/v1/auth/login", json={
        "email": "bob@thapar.edu",
        "password": "password123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create project
    proj_res = client.post("/api/v1/projects", json={
        "title": "SmartCampus",
        "idea": "An automated campus management platform for TIET."
    }, headers=headers)
    assert proj_res.status_code == 201
    proj_id = proj_res.json()["id"]

    # Sync Requirements
    req_res = client.put(f"/api/v1/projects/{proj_id}/artifacts/requirements", json=[
        {
            "req_code": "REQ-101",
            "req_type": "Functional",
            "priority": "Critical",
            "description": "The system shall authenticate students via TIET SSO credentials.",
            "status": "approved"
        }
    ], headers=headers)
    assert req_res.status_code == 200
    assert len(req_res.json()) == 1

    # Sync User Stories
    story_res = client.put(f"/api/v1/projects/{proj_id}/artifacts/stories", json=[
        {
            "req_id": "REQ-101",
            "role": "Student",
            "action": "log in with campus email",
            "benefit": "I can access course materials securely",
            "criteria": ["OAuth2 login completes in <1s"],
            "status": "approved"
        }
    ], headers=headers)
    assert story_res.status_code == 200
    assert len(story_res.json()) == 1

    # Sync Diagram
    diag_res = client.put(f"/api/v1/projects/{proj_id}/artifacts/diagram", json={
        "diagram_type": "domain_model",
        "nodes_data": [{"id": "node-user", "name": "User", "type": "actor", "x": 100, "y": 100, "fields": []}],
        "edges_data": [],
        "mermaid_code": "classDiagram\nclass User"
    }, headers=headers)
    assert diag_res.status_code == 200
    assert diag_res.json()["nodes_data"][0]["name"] == "User"

    # Sync Architecture
    arch_res = client.put(f"/api/v1/projects/{proj_id}/artifacts/architecture", json={
        "pattern": "Modular Monolith",
        "rationale": "High cohesion and simple transactions.",
        "components": [{"name": "Auth", "tech": "FastAPI", "purpose": "JWT"}],
        "tradeoffs": [{"pro": "Low operational overhead", "con": "Single DB"}],
        "citations": [{"source": "Fowler", "page": "25"}]
    }, headers=headers)
    assert arch_res.status_code == 200
    assert arch_res.json()["pattern"] == "Modular Monolith"

    # Sync OpenAPI Spec
    api_res = client.put(f"/api/v1/projects/{proj_id}/artifacts/api-spec", json={
        "http_method": "REST",
        "openapi_yaml": "openapi: 3.1.0\ninfo:\n  title: SmartCampus API\n  version: 1.0.0",
        "is_valid": True
    }, headers=headers)
    assert api_res.status_code == 200

    # Fetch full project to verify synchronized state
    full_res = client.get(f"/api/v1/projects/{proj_id}", headers=headers)
    assert full_res.status_code == 200
    data = full_res.json()
    assert len(data["requirements"]) == 1
    assert len(data["user_stories"]) == 1
    assert data["diagram"] is not None
    assert data["architecture"]["pattern"] == "Modular Monolith"

def test_knowledge_base_search(client):
    res = client.get("/api/v1/knowledge/search?q=Microservices")
    assert res.status_code == 200
    results = res.json()
    assert len(results) >= 1
    assert any("Newman" in r["source_book"] for r in results)

    topics_res = client.get("/api/v1/knowledge/topics")
    assert topics_res.status_code == 200
    assert "Microservices" in topics_res.json()

def test_mentor_rbac(client):
    # Register Mentor with institutional invite secret
    client.post("/api/v1/auth/register", json={
        "name": "Dr. Sharma",
        "email": "sharma@thapar.edu",
        "password": "mentorpassword",
        "role": "mentor",
        "mentor_passcode": "SEOS-MENTOR-INVITE-2026",
    })
    login_res = client.post("/api/v1/auth/login", json={
        "email": "sharma@thapar.edu",
        "password": "mentorpassword"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Mentor creates a project and lists projects
    client.post("/api/v1/projects", json={"title": "Mentor Syllabus Project"}, headers=headers)
    proj_list = client.get("/api/v1/projects", headers=headers)
    assert proj_list.status_code == 200
    assert len(proj_list.json()) >= 1


def test_solo_dev_registration(client):
    reg_res = client.post("/api/v1/auth/register", json={
        "name": "Solo Hacker",
        "email": "solo@independent.dev",
        "password": "solopassword123",
        "role": "solo_dev"
    })
    assert reg_res.status_code == 201
    assert reg_res.json()["role"] == "solo_dev"
    assert reg_res.json()["classroom_code"] is None

    login_res = client.post("/api/v1/auth/login", json={
        "email": "solo@independent.dev",
        "password": "solopassword123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Solo dev gets empty classrooms list
    classes_res = client.get("/api/v1/classrooms", headers=headers)
    assert classes_res.status_code == 200
    assert classes_res.json() == []


def test_classroom_and_roster_workflow(client):
    # 1. Register Mentor with institutional invite secret
    client.post("/api/v1/auth/register", json={
        "name": "Prof. Sandeep Kaur",
        "email": "sandeep.kaur@thapar.edu",
        "password": "mentorpassword",
        "role": "mentor",
        "mentor_passcode": "SEOS-MENTOR-INVITE-2026",
    })
    login_mentor = client.post("/api/v1/auth/login", json={
        "email": "sandeep.kaur@thapar.edu",
        "password": "mentorpassword"
    })
    mentor_token = login_mentor.json()["access_token"]
    mentor_headers = {"Authorization": f"Bearer {mentor_token}"}

    # 2. Mentor creates classroom with custom join code
    class_res = client.post("/api/v1/classrooms", json={
        "name": "UCS 503 Software Engineering",
        "description": "Group L2 Third Year CSE",
        "custom_code": "SEOS-503L2"
    }, headers=mentor_headers)
    assert class_res.status_code == 201
    classroom_id = class_res.json()["id"]
    assert class_res.json()["code"] == "SEOS-503L2"

    # 3. Student registers with join code
    reg_student = client.post("/api/v1/auth/register", json={
        "name": "Harshit Garg",
        "email": "harshit@thapar.edu",
        "password": "studentpassword",
        "role": "student",
        "join_code": "SEOS-503L2"
    })
    assert reg_student.status_code == 201
    assert reg_student.json()["classroom_code"] == "SEOS-503L2"

    login_student = client.post("/api/v1/auth/login", json={
        "email": "harshit@thapar.edu",
        "password": "studentpassword"
    })
    student_token = login_student.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # 4. Student creates a project
    client.post("/api/v1/projects", json={
        "title": "FoodDash",
        "idea": "On-demand food delivery workspace."
    }, headers=student_headers)

    # 5. Mentor inspects classroom roster
    roster_res = client.get(f"/api/v1/classrooms/{classroom_id}/roster", headers=mentor_headers)
    assert roster_res.status_code == 200
    roster_data = roster_res.json()
    assert roster_data["classroom"]["code"] == "SEOS-503L2"
    assert len(roster_data["students"]) == 1
    assert roster_data["students"][0]["name"] == "Harshit Garg"
    assert len(roster_data["students"][0]["projects"]) == 1
    assert roster_data["students"][0]["projects"][0]["title"] == "FoodDash"

def test_full_project_sync(client):
    # Register user
    client.post("/api/v1/auth/register", json={
        "name": "Sync Tester",
        "email": "sync@test.com",
        "password": "syncpassword",
        "role": "solo_dev"
    })
    login_res = client.post("/api/v1/auth/login", json={"email": "sync@test.com", "password": "syncpassword"})
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # Create project
    proj_res = client.post("/api/v1/projects", json={"title": "Init Project", "idea": "Initial idea"}, headers=headers)
    project_id = proj_res.json()["id"]

    # Perform full atomic sync
    sync_res = client.put(f"/api/v1/projects/{project_id}/sync-full", json={
        "title": "Synced Project Title",
        "idea": "Updated Idea",
        "base_version": 1,
        "requirements": [
            {"req_code": "REQ-101", "req_type": "Functional", "priority": "Critical", "description": "User login with OAuth2", "status": "approved"},
            {"req_code": "REQ-102", "req_type": "Non-Functional", "priority": "High", "description": "Response under 100ms", "status": "draft"}
        ],
        "user_stories": [
            {"req_id": "REQ-101", "role": "User", "action": "login", "benefit": "access workspace", "criteria": ["JWT issued"], "status": "approved"}
        ],
        "nodes_data": [{"id": "user", "name": "User", "fields": [{"name": "id", "type": "UUID"}]}],
        "edges_data": [],
        "architecture_pattern": "Microservices",
        "architecture_rationale": "High horizontal scalability",
        "architecture_components": [{"name": "AuthService", "tech": "FastAPI", "purpose": "JWT auth"}],
        "architecture_tradeoffs": [{"pro": "Scalable", "con": "Distributed complexity"}],
        "architecture_citations": [{"source": "Sam Newman", "citation": "Building Microservices"}],
        "openapi_yaml": "openapi: 3.1.0\ninfo:\n  title: Synced API\npaths: {}\n",
        "documents": [
            {"doc_type": "SRS", "title": "System Requirements Spec", "content": "# SRS Content"}
        ]
    }, headers=headers)

    assert sync_res.status_code == 200
    synced = sync_res.json()
    assert synced["title"] == "Synced Project Title"
    assert len(synced["requirements"]) == 2
    assert len(synced["user_stories"]) == 1
    assert synced["architecture"]["pattern"] == "Microservices"
    assert "openapi: 3.1.0" in synced["api_spec"]["openapi_yaml"]
    assert len(synced["documents"]) == 1

def test_document_upload_and_rag(client):
    # Register mentor
    client.post("/api/v1/auth/register", json={
        "name": "Prof. Sharma",
        "email": "prof.sharma@thapar.edu",
        "password": "mentorpassword123",
        "role": "mentor",
        "mentor_passcode": "SEOS-MENTOR-INVITE-2026",
    })
    login_res = client.post("/api/v1/auth/login", json={"email": "prof.sharma@thapar.edu", "password": "mentorpassword123"})
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # Upload Markdown reference material
    md_content = b"# UCS 503 Course Guidelines\n\nAll REST APIs must adhere strictly to OpenAPI 3.1 specifications with proper schema contracts.\n\nDatabase schemas must be normalized to Third Normal Form (3NF) before approval."
    upload_res = client.post(
        "/api/v1/knowledge/upload",
        files={"file": ("UCS503_Guidelines.md", md_content, "text/markdown")},
        data={"topic": "Course Policy"},
        headers=headers
    )
    assert upload_res.status_code == 201
    upload_data = upload_res.json()
    assert upload_data["file_name"] == "UCS503_Guidelines.md"
    assert upload_data["chunks_count"] >= 1

    # Verify RAG search finds the uploaded material
    search_res = client.get("/api/v1/knowledge/search?q=OpenAPI 3.1 specifications", headers=headers)
    assert search_res.status_code == 200
    results = search_res.json()
    assert any("UCS503_Guidelines.md" in r["source_book"] for r in results)

    # List documents
    docs_res = client.get("/api/v1/knowledge/my-documents", headers=headers)
    assert docs_res.status_code == 200
    docs = docs_res.json()
    assert any(d["file_name"] == "UCS503_Guidelines.md" for d in docs)

# ─── GATE 1 & 2 SECURITY & QUALITY VERIFICATION SUITE ───

def test_mentor_registration_privilege_escalation_blocked(client):
    """Assert unauthorized users cannot self-assign mentor privileges without the institutional key."""
    res = client.post("/api/v1/auth/register", json={
        "name": "Attacker",
        "email": "attacker@evil.com",
        "password": "attackpassword123",
        "role": "mentor"
    })
    assert res.status_code == 403
    assert "Privilege escalation blocked" in res.json()["detail"]

def test_password_policy_enforcement(client):
    """Assert passwords shorter than 8 characters are rejected."""
    res = client.post("/api/v1/auth/register", json={
        "name": "Weak Pass User",
        "email": "weak@thapar.edu",
        "password": "123",
        "role": "solo_dev"
    })
    assert res.status_code == 422 or res.status_code == 400

def test_cross_user_project_idor_blocked(client):
    """Assert Student A cannot read, modify, delete, or sync Student B's project (BOLA/IDOR protection)."""
    # Register Victim (Student A)
    client.post("/api/v1/auth/register", json={
        "name": "Victim User",
        "email": "victim@thapar.edu",
        "password": "victimpassword123",
        "role": "solo_dev"
    })
    victim_login = client.post("/api/v1/auth/login", json={"email": "victim@thapar.edu", "password": "victimpassword123"}).json()
    victim_headers = {"Authorization": f"Bearer {victim_login['access_token']}"}

    # Create Victim's Project
    proj = client.post("/api/v1/projects", json={"title": "Victim's Secret IP", "idea": "Private system"}, headers=victim_headers).json()
    proj_id = proj["id"]

    # Register Attacker (Student B)
    client.post("/api/v1/auth/register", json={
        "name": "Attacker User",
        "email": "attacker2@thapar.edu",
        "password": "attackerpassword123",
        "role": "solo_dev"
    })
    attacker_login = client.post("/api/v1/auth/login", json={"email": "attacker2@thapar.edu", "password": "attackerpassword123"}).json()
    attacker_headers = {"Authorization": f"Bearer {attacker_login['access_token']}"}

    # Attacker attempts to read project
    get_res = client.get(f"/api/v1/projects/{proj_id}", headers=attacker_headers)
    assert get_res.status_code == 403

    # Attacker attempts to update project
    put_res = client.put(f"/api/v1/projects/{proj_id}", json={"title": "Hacked Title"}, headers=attacker_headers)
    assert put_res.status_code == 403

    # Attacker attempts to sync artifacts
    sync_res = client.put(f"/api/v1/projects/{proj_id}/artifacts/requirements", json=[
        {"req_code": "MAL-1", "req_type": "Malicious", "priority": "High", "description": "Injected", "status": "draft"}
    ], headers=attacker_headers)
    assert sync_res.status_code == 403

    # Attacker attempts to sync-full
    full_sync = client.put(f"/api/v1/projects/{proj_id}/sync-full", json={"title": "Injected Title"}, headers=attacker_headers)
    assert full_sync.status_code == 403

    # Attacker attempts to delete project
    del_res = client.delete(f"/api/v1/projects/{proj_id}", headers=attacker_headers)
    assert del_res.status_code == 403

def test_cross_classroom_mentor_isolation(client):
    """Assert Mentor 2 cannot access student projects or rosters of Mentor 1's classroom."""
    # Mentor 1
    client.post("/api/v1/auth/register", json={
        "name": "Prof. One",
        "email": "prof1@thapar.edu",
        "password": "mentorpassword123",
        "role": "mentor",
        "mentor_passcode": "SEOS-MENTOR-INVITE-2026"
    })
    m1_token = client.post("/api/v1/auth/login", json={"email": "prof1@thapar.edu", "password": "mentorpassword123"}).json()["access_token"]
    m1_headers = {"Authorization": f"Bearer {m1_token}"}
    c1 = client.post("/api/v1/classrooms", json={"name": "Cohort 1", "custom_code": "COHORT-01"}, headers=m1_headers).json()

    # Mentor 2
    client.post("/api/v1/auth/register", json={
        "name": "Prof. Two",
        "email": "prof2@thapar.edu",
        "password": "mentorpassword123",
        "role": "mentor",
        "mentor_passcode": "SEOS-MENTOR-INVITE-2026"
    })
    m2_token = client.post("/api/v1/auth/login", json={"email": "prof2@thapar.edu", "password": "mentorpassword123"}).json()["access_token"]
    m2_headers = {"Authorization": f"Bearer {m2_token}"}

    # Mentor 2 attempts to view Mentor 1's roster
    roster_res = client.get(f"/api/v1/classrooms/{c1['id']}/roster", headers=m2_headers)
    assert roster_res.status_code == 403

def test_rag_tenant_isolation(client):
    """Assert private documents uploaded by one user are not exposed to unauthenticated searches or other users."""
    # Register Student Alpha
    client.post("/api/v1/auth/register", json={
        "name": "Student Alpha",
        "email": "alpha@thapar.edu",
        "password": "alphapassword123",
        "role": "solo_dev"
    })
    alpha_token = client.post("/api/v1/auth/login", json={"email": "alpha@thapar.edu", "password": "alphapassword123"}).json()["access_token"]
    alpha_headers = {"Authorization": f"Bearer {alpha_token}"}

    # Alpha uploads confidential personal document
    client.post(
        "/api/v1/knowledge/upload",
        files={"file": ("Alpha_TradeSecrets.md", b"AlphaSecretKeywordX99: Proprietary algorithm details.", "text/markdown")},
        data={"topic": "Proprietary Trade Secrets"},
        headers=alpha_headers
    )

    # 1. Unauthenticated search cannot see Alpha's confidential upload
    unauth_search = client.get("/api/v1/knowledge/search?q=AlphaSecretKeywordX99")
    assert unauth_search.status_code == 200
    assert len(unauth_search.json()) == 0

    # 2. Student Beta search cannot see Alpha's confidential upload
    client.post("/api/v1/auth/register", json={
        "name": "Student Beta",
        "email": "beta@thapar.edu",
        "password": "betapassword123",
        "role": "solo_dev"
    })
    beta_token = client.post("/api/v1/auth/login", json={"email": "beta@thapar.edu", "password": "betapassword123"}).json()["access_token"]
    beta_headers = {"Authorization": f"Bearer {beta_token}"}

    beta_search = client.get("/api/v1/knowledge/search?q=AlphaSecretKeywordX99", headers=beta_headers)
    assert beta_search.status_code == 200
    assert len(beta_search.json()) == 0

    # 3. Student Beta cannot delete Alpha's document
    del_res = client.delete("/api/v1/knowledge/documents/Alpha_TradeSecrets.md", headers=beta_headers)
    assert del_res.status_code == 403

def test_optimistic_concurrency_lock(client):
    """Assert optimistic concurrency control detects stale writes (HTTP 409 Conflict)."""
    client.post("/api/v1/auth/register", json={
        "name": "Concurrency Tester",
        "email": "concurrency@thapar.edu",
        "password": "concurrencypassword123",
        "role": "solo_dev"
    })
    token = client.post("/api/v1/auth/login", json={"email": "concurrency@thapar.edu", "password": "concurrencypassword123"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    proj = client.post("/api/v1/projects", json={"title": "Concurrency Proj"}, headers=headers).json()
    proj_id = proj["id"]
    assert proj["version"] == 1

    # Update 1 - valid sync
    sync1 = client.put(f"/api/v1/projects/{proj_id}/sync-full", json={
        "title": "Version 2 Title",
        "base_version": 1,
    }, headers=headers)
    assert sync1.status_code == 200
    assert sync1.json()["version"] == 2

    # Update 2 with stale base_version=1 -> Conflict!
    conflict_res = client.put(f"/api/v1/projects/{proj_id}/sync-full", json={
        "title": "Stale Overwrite Attempt",
        "base_version": 1,
    }, headers=headers)
    assert conflict_res.status_code == 409
    assert "Optimistic lock conflict" in conflict_res.json()["detail"]

def test_canonical_traceability_graph(client):
    """Assert canonical requirements-to-stories traceability is tracked and queryable."""
    client.post("/api/v1/auth/register", json={
        "name": "Trace User",
        "email": "trace@thapar.edu",
        "password": "tracepassword123",
        "role": "solo_dev"
    })
    token = client.post("/api/v1/auth/login", json={"email": "trace@thapar.edu", "password": "tracepassword123"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    proj = client.post("/api/v1/projects", json={"title": "Traceability Proj"}, headers=headers).json()
    proj_id = proj["id"]

    # Full sync with linked stories
    client.put(f"/api/v1/projects/{proj_id}/sync-full", json={
        "title": "Traceability Proj",
        "base_version": 1,
        "requirements": [
            {"req_code": "REQ-1", "req_type": "Functional", "priority": "High", "description": "Auth", "status": "approved"},
            {"req_code": "REQ-2", "req_type": "Functional", "priority": "Medium", "description": "Search", "status": "approved"}
        ],
        "user_stories": [
            {"req_id": "REQ-1", "role": "User", "action": "Log in", "benefit": "Access workspace", "status": "approved"}
        ]
    }, headers=headers)

    # Check traceability endpoint
    trace_res = client.get(f"/api/v1/projects/{proj_id}/traceability", headers=headers)
    assert trace_res.status_code == 200
    data = trace_res.json()
    assert data["requirements_count"] == 2
    assert data["covered_requirements_count"] == 1
    assert data["coverage_percentage"] == 50.0
    assert len(data["links"]) == 1
    assert data["links"][0]["source_id"] == "REQ-1"

    # Link test case explicitly
    link_res = client.post(f"/api/v1/projects/{proj_id}/traceability/link", json={
        "source_type": "requirement",
        "source_id": "REQ-1",
        "target_type": "test_case",
        "target_id": "TC-AUTH-001",
        "status": "valid"
    }, headers=headers)
    assert link_res.status_code == 200
    assert link_res.json()["target_type"] == "test_case"
    assert link_res.json()["target_id"] == "TC-AUTH-001"

    # Re-check traceability with test case
    trace_res2 = client.get(f"/api/v1/projects/{proj_id}/traceability", headers=headers)
    assert trace_res2.status_code == 200
    assert trace_res2.json()["test_cases_count"] == 1

def test_operational_metrics_and_security_headers(client):
    """Assert operational telemetry endpoint and strict HTTP security headers."""
    res = client.get("/api/v1/metrics")
    assert res.status_code == 200
    
    # Assert Strict Security Headers
    assert res.headers["x-content-type-options"] == "nosniff"
    assert res.headers["x-frame-options"] == "DENY"
    assert res.headers["x-xss-protection"] == "1; mode=block"
    assert "strict-transport-security" in res.headers
    assert "content-security-policy" in res.headers
    csp = res.headers["content-security-policy"]
    assert "default-src 'self'" in csp
    assert "script-src 'self'" in csp
    assert "script-src 'self' 'unsafe-inline'" not in csp  # Verified: unsafe-inline purged from scripts
    assert "permissions-policy" in res.headers

    # Assert Metrics Payload
    metrics = res.json()
    assert "uptime_seconds" in metrics
    assert "requests_total" in metrics
    assert "memory_rss_mb" in metrics
    assert "database_connected" in metrics
    assert metrics["database_connected"] is True


