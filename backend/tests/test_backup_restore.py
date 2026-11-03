import os
import tempfile
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import User, Project
from scripts.db_backup_restore import backup_database, restore_database

def test_backup_and_restore_cycle():
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = os.path.join(tmpdir, "test_source.db")
        backup_dir = os.path.join(tmpdir, "backups")
        
        # 1. Create DB with initial schema and data
        engine = create_engine(f"sqlite:///{db_path}")
        Base.metadata.create_all(bind=engine)
        Session = sessionmaker(bind=engine)
        session = Session()
        
        user = User(
            name="Backup Test User",
            email="backup_test@seos.io",
            password="fakehashedpassword",
            role="student"
        )
        session.add(user)
        session.commit()
        
        project = Project(
            title="Integrity Verification Project",
            idea="Testing automated backup and restore drill",
            owner_id=user.id,
            version=42
        )
        session.add(project)
        session.commit()
        
        user_id = user.id
        proj_id = project.id
        session.close()
        engine.dispose()
        
        # 2. Execute Backup
        manifest = backup_database(db_path=db_path, backup_dir=backup_dir)
        assert os.path.exists(manifest["backup_file"])
        assert manifest["checksum_sha256"] is not None
        assert manifest["db_stats"]["tables"]["users"] == 1
        assert manifest["db_stats"]["tables"]["projects"] == 1
        assert manifest["db_stats"]["total_rows"] == 2
        
        # 3. Simulate Database Corruption / Data Loss
        corrupt_engine = create_engine(f"sqlite:///{db_path}")
        CorruptSession = sessionmaker(bind=corrupt_engine)
        corrupt_session = CorruptSession()
        corrupt_session.query(Project).delete()
        corrupt_session.query(User).delete()
        corrupt_session.commit()
        assert corrupt_session.query(User).count() == 0
        assert corrupt_session.query(Project).count() == 0
        corrupt_session.close()
        corrupt_engine.dispose()
        
        # 4. Execute Restore from Manifest
        restore_result = restore_database(
            backup_file=manifest["backup_file"],
            target_db_path=db_path,
            expected_checksum=manifest["checksum_sha256"]
        )
        assert restore_result["status"] == "success"
        
        # 5. Verify Row-level Data Restoration
        verify_engine = create_engine(f"sqlite:///{db_path}")
        VerifySession = sessionmaker(bind=verify_engine)
        verify_session = VerifySession()
        
        restored_user = verify_session.query(User).filter(User.id == user_id).first()
        restored_project = verify_session.query(Project).filter(Project.id == proj_id).first()
        
        assert restored_user is not None
        assert restored_user.email == "backup_test@seos.io"
        assert restored_project is not None
        assert restored_project.title == "Integrity Verification Project"
        assert restored_project.version == 42
        
        verify_session.close()
        verify_engine.dispose()

def test_restore_rejects_corrupted_checksum():
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = os.path.join(tmpdir, "test_source.db")
        backup_dir = os.path.join(tmpdir, "backups")
        
        engine = create_engine(f"sqlite:///{db_path}")
        Base.metadata.create_all(bind=engine)
        engine.dispose()
        
        manifest = backup_database(db_path=db_path, backup_dir=backup_dir)
        
        # Tamper with the backup file
        with open(manifest["backup_file"], "ab") as f:
            f.write(b"\x00TAMPERED")
            
        # Attempt restore - should raise ValueError on checksum mismatch
        with pytest.raises(ValueError, match="Integrity check failed"):
            restore_database(
                backup_file=manifest["backup_file"],
                target_db_path=db_path,
                expected_checksum=manifest["checksum_sha256"]
            )
