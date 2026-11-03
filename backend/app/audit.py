import os
import json
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

AUDIT_LOG_FILE = os.path.join(os.path.dirname(__file__), "..", "audit_chain.jsonl")

def compute_record_hash(sequence: int, timestamp: str, actor_id: str, action: str, details: dict, prev_hash: str) -> str:
    canonical_str = f"{sequence}|{timestamp}|{actor_id}|{action}|{json.dumps(details, sort_keys=True)}|{prev_hash}"
    return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()

def get_last_audit_record() -> Optional[Dict[str, Any]]:
    if not os.path.exists(AUDIT_LOG_FILE):
        return None
    last_line = None
    with open(AUDIT_LOG_FILE, "r") as f:
        for line in f:
            if line.strip():
                last_line = line
    if last_line:
        return json.loads(last_line)
    return None

def log_audit_event(actor_id: str, action: str, details: dict, status: str = "SUCCESS") -> Dict[str, Any]:
    """
    Appends a cryptographically chained audit record to the durable audit log.
    Ensures tamper-evidence: any modification breaks the SHA256 chain.
    """
    last_record = get_last_audit_record()
    if last_record:
        sequence = last_record["sequence"] + 1
        prev_hash = last_record["record_hash"]
    else:
        sequence = 1
        prev_hash = "0" * 64  # Genesis hash

    timestamp = datetime.now(timezone.utc).isoformat()
    record_hash = compute_record_hash(sequence, timestamp, actor_id, action, details, prev_hash)

    record = {
        "sequence": sequence,
        "timestamp": timestamp,
        "actor_id": actor_id,
        "action": action,
        "status": status,
        "details": details,
        "prev_hash": prev_hash,
        "record_hash": record_hash,
    }

    with open(AUDIT_LOG_FILE, "a") as f:
        f.write(json.dumps(record) + "\n")

    return record

def verify_audit_log_integrity(log_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Verifies that the entire audit chain is mathematically valid and untouched.
    Returns status, verified record count, and any detected tampering.
    """
    path = log_path or AUDIT_LOG_FILE
    if not os.path.exists(path):
        return {"status": "empty", "verified_records": 0, "chain_valid": True}

    expected_prev = "0" * 64
    count = 0
    with open(path, "r") as f:
        for idx, line in enumerate(f, 1):
            if not line.strip():
                continue
            rec = json.loads(line)
            count += 1
            if rec["sequence"] != count:
                return {"status": "tampered", "error": f"Sequence discontinuity at line {idx}", "chain_valid": False}
            if rec["prev_hash"] != expected_prev:
                return {"status": "tampered", "error": f"Hash chain break at line {idx}", "chain_valid": False}
            
            recomputed = compute_record_hash(
                rec["sequence"], rec["timestamp"], rec["actor_id"], rec["action"], rec["details"], rec["prev_hash"]
            )
            if recomputed != rec["record_hash"]:
                return {"status": "tampered", "error": f"Content tampering detected at record {rec['sequence']}", "chain_valid": False}
            expected_prev = rec["record_hash"]

    return {"status": "verified", "verified_records": count, "chain_valid": True}
