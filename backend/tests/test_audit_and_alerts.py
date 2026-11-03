import os
import tempfile
import json
import pytest
from app.audit import log_audit_event, verify_audit_log_integrity, AUDIT_LOG_FILE
from app.monitoring import AlertManager

def test_tamper_evident_audit_log_chain():
    with tempfile.NamedTemporaryFile(mode="w+", delete=False, suffix=".jsonl") as tmp:
        tmp_path = tmp.name

    try:
        # Patch AUDIT_LOG_FILE for testing
        import app.audit
        original_file = app.audit.AUDIT_LOG_FILE
        app.audit.AUDIT_LOG_FILE = tmp_path

        # 1. Log sequential audit events
        e1 = log_audit_event("user-101", "USER_REGISTER", {"email": "alice@thapar.edu"})
        e2 = log_audit_event("user-101", "AUTH_LOGIN", {"ip": "127.0.0.1"})
        e3 = log_audit_event("user-101", "PROJECT_SYNC", {"project_id": "proj-99", "version": 2})

        assert e1["sequence"] == 1
        assert e2["sequence"] == 2
        assert e3["sequence"] == 3
        assert e2["prev_hash"] == e1["record_hash"]
        assert e3["prev_hash"] == e2["record_hash"]

        # 2. Verify complete chain integrity
        res = verify_audit_log_integrity(tmp_path)
        assert res["status"] == "verified"
        assert res["verified_records"] == 3
        assert res["chain_valid"] is True

        # 3. Simulate unauthorized log tampering (modify action in record 2)
        with open(tmp_path, "r") as f:
            lines = f.readlines()
        
        tampered_rec = json.loads(lines[1])
        tampered_rec["details"]["ip"] = "192.168.1.100"  # Attacker alters IP
        lines[1] = json.dumps(tampered_rec) + "\n"

        with open(tmp_path, "w") as f:
            f.writelines(lines)

        # 4. Assert integrity verification detects the tampering
        tamper_res = verify_audit_log_integrity(tmp_path)
        assert tamper_res["status"] == "tampered"
        assert tamper_res["chain_valid"] is False
        assert "Content tampering detected" in tamper_res["error"]

    finally:
        app.audit.AUDIT_LOG_FILE = original_file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

def test_operational_alert_delivery_and_recovery():
    mgr = AlertManager(error_threshold_pct=5.0)

    # 1. Healthy state
    events1 = mgr.evaluate_metrics({
        "error_rate_percentage": 0.5,
        "database_connected": True
    })
    assert len(events1) == 0
    assert len(mgr.active_alerts) == 0

    # 2. Outage: High Error Rate trigger
    events2 = mgr.evaluate_metrics({
        "error_rate_percentage": 12.5,
        "database_connected": True
    })
    assert len(events2) == 1
    assert events2[0]["event"] == "TRIGGERED"
    assert events2[0]["alert"]["name"] == "HIGH_ERROR_RATE"
    assert "HIGH_ERROR_RATE" in mgr.active_alerts

    # 3. Secondary Outage: Database Connection Failure
    events3 = mgr.evaluate_metrics({
        "error_rate_percentage": 14.0,
        "database_connected": False
    })
    assert len(events3) == 1
    assert events3[0]["event"] == "TRIGGERED"
    assert events3[0]["alert"]["name"] == "DB_DISCONNECTED"
    assert len(mgr.active_alerts) == 2

    # 4. Recovery: Database restored, errors cleared
    events4 = mgr.evaluate_metrics({
        "error_rate_percentage": 0.0,
        "database_connected": True
    })
    assert len(events4) == 2
    resolved_names = [e["alert"]["name"] for e in events4 if e["event"] == "RESOLVED"]
    assert "HIGH_ERROR_RATE" in resolved_names
    assert "DB_DISCONNECTED" in resolved_names
    assert len(mgr.active_alerts) == 0
    assert len(mgr.alert_history) == 2
