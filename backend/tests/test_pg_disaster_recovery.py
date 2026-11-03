import os
import json
import tempfile
import pytest
from scripts.pg_backup_restore import create_pg_backup, restore_pg_backup

SIGNING_KEY = "seos-production-dr-signing-key-tier1-2026"

def test_pg_backup_and_restore_lifecycle():
    with tempfile.TemporaryDirectory() as tmpdir:
        backup_dir = os.path.join(tmpdir, "pg_backups")
        
        # 1. Create simulated PostgreSQL + pgvector backup
        manifest = create_pg_backup(
            db_url="postgresql://mock:mock@localhost:5432/mock_db",
            output_dir=backup_dir,
            signing_key=SIGNING_KEY,
            simulated_dump=True
        )
        
        assert os.path.exists(manifest["backup_file"])
        assert os.path.exists(manifest["manifest_path"])
        assert manifest["engine"] == "PostgreSQL 16 (pgvector)"
        assert manifest["pgvector_compatible"] is True
        assert manifest["target_rpo_minutes"] == 15
        assert manifest["target_rto_minutes"] == 5
        assert manifest["hmac_signature"] is not None
        
        # 2. Restore and verify authenticity
        result = restore_pg_backup(
            backup_file=manifest["backup_file"],
            manifest_file=manifest["manifest_path"],
            signing_key=SIGNING_KEY,
            simulated_restore=True
        )
        assert result["status"] == "restored_successfully"
        assert result["checksum_verified"] is True
        assert result["signature_verified"] is True
        assert result["pgvector_verified"] is True
        assert result["rto_achieved"] is True

def test_pg_restore_rejects_tampered_archive():
    """Ensure bit-flip or corrupted archive raises Integrity Error."""
    with tempfile.TemporaryDirectory() as tmpdir:
        backup_dir = os.path.join(tmpdir, "pg_backups")
        manifest = create_pg_backup(
            db_url="postgresql://mock",
            output_dir=backup_dir,
            signing_key=SIGNING_KEY,
            simulated_dump=True
        )
        
        # Corrupt archive
        with open(manifest["backup_file"], "ab") as f:
            f.write(b"CORRUPTED_DATA")
            
        with pytest.raises(ValueError, match="Integrity Error"):
            restore_pg_backup(
                backup_file=manifest["backup_file"],
                manifest_file=manifest["manifest_path"],
                signing_key=SIGNING_KEY,
                simulated_restore=True
            )

def test_pg_restore_rejects_forged_manifest():
    """
    CRITICAL SECURITY CHECK:
    If an attacker modifies both the backup file AND the manifest's sha256 checksum,
    the HMAC authenticity signature must detect the forgery and abort restoration.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        backup_dir = os.path.join(tmpdir, "pg_backups")
        manifest = create_pg_backup(
            db_url="postgresql://mock",
            output_dir=backup_dir,
            signing_key=SIGNING_KEY,
            simulated_dump=True
        )
        
        # Attacker replaces backup file and updates sha256 in manifest without knowing SIGNING_KEY
        with open(manifest["backup_file"], "wb") as f:
            f.write(b"MALICIOUS_SQL_INJECTION_DUMP")
            
        import hashlib
        new_sha = hashlib.sha256(b"MALICIOUS_SQL_INJECTION_DUMP").hexdigest()
        
        with open(manifest["manifest_path"], "r") as f:
            manifest_data = json.load(f)
        manifest_data["sha256_checksum"] = new_sha
        with open(manifest["manifest_path"], "w") as f:
            json.dump(manifest_data, f)
            
        with pytest.raises(PermissionError, match="Authenticity Error"):
            restore_pg_backup(
                backup_file=manifest["backup_file"],
                manifest_file=manifest["manifest_path"],
                signing_key=SIGNING_KEY,
                simulated_restore=True
            )
