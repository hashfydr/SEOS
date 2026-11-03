import time
from datetime import datetime, timedelta, timezone
import jwt
import pytest
from app.config import settings

def test_valid_jwt_authenticates(client):
    # Register test user
    client.post("/api/v1/auth/register", json={
        "name": "JWT Test User",
        "email": "jwttest@seos.io",
        "password": "password123",
        "role": "solo_dev"
    })
    login_res = client.post("/api/v1/auth/login", json={
        "email": "jwttest@seos.io",
        "password": "password123"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    
    # Valid token can access protected project endpoint
    res = client.get("/api/v1/projects", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200

def test_reject_algorithm_none_forgery(client):
    """
    CRITICAL CVE-2026-85394 / PYSEC-2026-4298 Defense:
    Ensure unsigned tokens with alg='none' are strictly rejected by PyJWT.
    """
    # Forge a token with algorithm 'none'
    unsecured_payload = {
        "sub": "some-arbitrary-user-id",
        "exp": int(time.time()) + 3600
    }
    # Unsecured JWT with alg 'none' and empty signature
    none_token = jwt.encode(unsecured_payload, key="", algorithm="none")
    
    res = client.get("/api/v1/projects", headers={"Authorization": f"Bearer {none_token}"})
    assert res.status_code == 401
    assert "Could not validate credentials" in res.json()["detail"]

def test_reject_algorithm_confusion_rs256(client):
    """
    Ensure token with unexpected algorithm (e.g. RS256) is rejected
    even if the client specifies it, because server restricts algorithms=['HS256'].
    """
    payload = {
        "sub": "admin-user",
        "exp": int(time.time()) + 3600
    }
    # Craft a token claiming RS256 or another disallowed algorithm using a dummy secret
    # PyJWT raises an exception when decoding if algorithm is not in algorithms=['HS256']
    tampered_headers = {"alg": "HS512", "typ": "JWT"}
    hs512_token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS512", headers=tampered_headers)
    
    res = client.get("/api/v1/projects", headers={"Authorization": f"Bearer {hs512_token}"})
    assert res.status_code == 401

def test_reject_tampered_payload_signature(client):
    """Ensure altering the token payload invalidates the signature."""
    # Obtain legitimate token
    login_res = client.post("/api/v1/auth/login", json={
        "email": "jwttest@seos.io",
        "password": "password123"
    })
    token = login_res.json()["access_token"]
    
    # Tamper with the middle section (payload) of the JWT
    header_b64, payload_b64, sig_b64 = token.split(".")
    tampered_token = f"{header_b64}.eyJzdWIiOiAiaGFja2VyIn0.{sig_b64}"
    
    res = client.get("/api/v1/projects", headers={"Authorization": f"Bearer {tampered_token}"})
    assert res.status_code == 401

def test_reject_expired_jwt(client):
    """Ensure expired tokens are rejected immediately."""
    expired_payload = {
        "sub": "jwttest-user-id",
        "exp": int(time.time()) - 3600  # 1 hour in the past
    }
    expired_token = jwt.encode(expired_payload, settings.SECRET_KEY, algorithm="HS256")
    
    res = client.get("/api/v1/projects", headers={"Authorization": f"Bearer {expired_token}"})
    assert res.status_code == 401

def test_reject_missing_required_claims(client):
    """Ensure tokens missing 'sub' or 'exp' claims are rejected."""
    # Missing 'sub'
    no_sub = jwt.encode({"exp": int(time.time()) + 3600}, settings.SECRET_KEY, algorithm="HS256")
    res1 = client.get("/api/v1/projects", headers={"Authorization": f"Bearer {no_sub}"})
    assert res1.status_code == 401
    
    # Missing 'exp'
    no_exp = jwt.encode({"sub": "some-user"}, settings.SECRET_KEY, algorithm="HS256")
    res2 = client.get("/api/v1/projects", headers={"Authorization": f"Bearer {no_exp}"})
    assert res2.status_code == 401

def test_reject_garbage_token(client):
    """Ensure garbage / malformed authorization header strings return 401."""
    res = client.get("/api/v1/projects", headers={"Authorization": "Bearer not-a-valid-jwt-token"})
    assert res.status_code == 401
