import pytest
from app.main import app

def test_sql_injection_in_knowledge_search_blocked(client):
    """Assert SQL injection vectors in search query are safely parameterized without SQL execution."""
    sql_payloads = [
        "' OR '1'='1",
        "'; DROP TABLE knowledge_base; --",
        "' UNION SELECT * FROM users --",
        "admin'--",
    ]
    for payload in sql_payloads:
        res = client.get(f"/api/v1/knowledge/search?q={payload}")
        assert res.status_code == 200
        # Result should be a list (empty or matched), never a database error
        assert isinstance(res.json(), list)

def test_directory_traversal_in_document_deletion_blocked(client):
    """Assert directory traversal payloads cannot reach server files."""
    # Login student
    login_res = client.post("/api/v1/auth/register", json={
        "name": "Sec Tester",
        "email": "sectester@thapar.edu",
        "password": "secpassword123",
        "role": "solo_dev"
    })
    token = client.post("/api/v1/auth/login", json={"email": "sectester@thapar.edu", "password": "secpassword123"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    traversal_payloads = [
        "../../../../etc/passwd",
        "..%2F..%2F..%2Fetc%2Fpasswd",
        "/etc/shadow",
    ]
    for path in traversal_payloads:
        res = client.delete(f"/api/v1/knowledge/documents/{path}", headers=headers)
        # Should be 404 Not Found, never 200 or 500
        assert res.status_code in [404, 400, 422]

def test_xss_in_project_metadata_sanitized(client):
    """Assert XSS script injection in project title/idea is safely stored as literal text."""
    login_res = client.post("/api/v1/auth/login", json={"email": "sectester@thapar.edu", "password": "secpassword123"}).json()
    headers = {"Authorization": f"Bearer {login_res['access_token']}"}

    xss_payload = "<script>alert('pwned')</script>"
    res = client.post("/api/v1/projects", json={
        "title": xss_payload,
        "idea": "<img src=x onerror=alert(1)>"
    }, headers=headers)
    assert res.status_code == 201
    data = res.json()
    # Ensure it's stored and returned as literal text, not executed
    assert data["title"] == xss_payload
