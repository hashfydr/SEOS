import os
import shutil
import hashlib
import json
import sqlite3
from datetime import datetime

def compute_checksum(filepath: str) -> str:
    sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            sha256.update(chunk)
    return sha256.hexdigest()

def get_db_stats(db_path: str) -> dict:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall() if not row[0].startswith("sqlite_")]
    
    stats = {}
    total_rows = 0
    for t in tables:
        cursor.execute(f"SELECT COUNT(*) FROM '{t}';")
        count = cursor.fetchone()[0]
        stats[t] = count
        total_rows += count
    conn.close()
    return {"tables": stats, "total_rows": total_rows}

def backup_database(db_path: str, backup_dir: str) -> dict:
    os.makedirs(backup_dir, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    backup_file = os.path.join(backup_dir, f"seos_backup_{timestamp}.db")
    
    # Use SQLite online backup API to ensure consistent snapshot even during active writes
    src_conn = sqlite3.connect(db_path)
    dst_conn = sqlite3.connect(backup_file)
    src_conn.backup(dst_conn)
    dst_conn.close()
    src_conn.close()

    checksum = compute_checksum(backup_file)
    stats = get_db_stats(backup_file)

    manifest = {
        "timestamp": timestamp,
        "backup_file": backup_file,
        "checksum_sha256": checksum,
        "file_size_bytes": os.path.getsize(backup_file),
        "db_stats": stats,
    }

    manifest_file = os.path.join(backup_dir, f"manifest_{timestamp}.json")
    with open(manifest_file, "w") as f:
        json.dump(manifest, f, indent=2)

    return manifest

def restore_database(backup_file: str, target_db_path: str, expected_checksum: str = None) -> dict:
    if not os.path.exists(backup_file):
        raise FileNotFoundError(f"Backup file '{backup_file}' does not exist.")

    if expected_checksum:
        actual_checksum = compute_checksum(backup_file)
        if actual_checksum != expected_checksum:
            raise ValueError(f"Integrity check failed: Expected {expected_checksum}, found {actual_checksum}")

    # Atomic copy to target
    temp_target = f"{target_db_path}.restoring"
    shutil.copy2(backup_file, temp_target)
    os.replace(temp_target, target_db_path)

    stats = get_db_stats(target_db_path)
    return {
        "status": "success",
        "restored_from": backup_file,
        "restored_to": target_db_path,
        "stats": stats,
    }
