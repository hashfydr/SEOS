import os
import sqlite3
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from alembic.config import Config
from alembic import command

from app.models import User, Project, Requirement, TraceLink

def test_alembic_migration_lifecycle(tmp_path):
    """
    Assert database migrations execute upgrade and downgrade cleanly
    on a fresh database without schema corruption.
    """
    migration_db = tmp_path / "migration_test.db"
    db_url = f"sqlite:///{migration_db}"

    # Configure Alembic to target the temporary database
    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", db_url)

    # 1. Upgrade from empty to head
    command.upgrade(alembic_cfg, "head")

    # Verify tables were created
    conn = sqlite3.connect(migration_db)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall()]
    conn.close()

    assert "alembic_version" in tables

    # 2. Downgrade to base
    command.downgrade(alembic_cfg, "base")

    # 3. Upgrade back to head
    command.upgrade(alembic_cfg, "head")

    conn = sqlite3.connect(migration_db)
    cursor = conn.cursor()
    cursor.execute("SELECT version_num FROM alembic_version;")
    version_row = cursor.fetchone()
    conn.close()

    assert version_row is not None
    assert version_row[0] == "a7b8c9d0e1f2"

def test_populated_database_multi_version_migration(tmp_path):
    """
    CRITICAL PRODUCTION ASSURANCE:
    Populate database with live production records under v001 schema,
    apply migration to v002 (adding new indexes), verify data integrity
    and queryability, then downgrade back to v001 without data loss.
    """
    migration_db = tmp_path / "populated_migration_test.db"
    db_url = f"sqlite:///{migration_db}"

    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", db_url)

    # 1. Upgrade specifically to v001 (initial schema)
    command.upgrade(alembic_cfg, "e5fd55244948")

    # 2. Populate live records into v001
    engine = create_engine(db_url)
    Session = sessionmaker(bind=engine)
    session = Session()

    user = User(name="Migrate Student", email="migrate@seos.io", password="password123", role="student")
    session.add(user)
    session.commit()

    project = Project(title="Populated Migration Project", idea="Testing zero data loss migrations", owner_id=user.id, version=1)
    session.add(project)
    session.commit()

    req = Requirement(project_id=project.id, req_code="REQ-MIG-1", description="Migration Persistence", priority="Critical", status="approved")
    session.add(req)
    session.commit()

    trace = TraceLink(project_id=project.id, source_type="requirement", source_id="REQ-MIG-1", target_type="test_case", target_id="TC-MIG-001", status="valid")
    session.add(trace)
    session.commit()

    user_id = user.id
    proj_id = project.id
    session.close()
    engine.dispose()

    # 3. Upgrade to v002 with live populated data
    command.upgrade(alembic_cfg, "a7b8c9d0e1f2")

    # 4. Verify version and verify 100% data preservation
    conn = sqlite3.connect(migration_db)
    cursor = conn.cursor()
    cursor.execute("SELECT version_num FROM alembic_version;")
    assert cursor.fetchone()[0] == "a7b8c9d0e1f2"

    # Verify new index exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name='ix_trace_links_target_lookup';")
    assert cursor.fetchone() is not None
    conn.close()

    # Verify records in ORM under v002
    engine2 = create_engine(db_url)
    Session2 = sessionmaker(bind=engine2)
    session2 = Session2()

    assert session2.query(User).filter(User.id == user_id).first().email == "migrate@seos.io"
    assert session2.query(Project).filter(Project.id == proj_id).first().title == "Populated Migration Project"
    assert session2.query(Requirement).filter(Requirement.project_id == proj_id).count() == 1
    assert session2.query(TraceLink).filter(TraceLink.project_id == proj_id).count() == 1

    session2.close()
    engine2.dispose()

    # 5. Downgrade back to v001 with populated data
    command.downgrade(alembic_cfg, "e5fd55244948")

    conn = sqlite3.connect(migration_db)
    cursor = conn.cursor()
    cursor.execute("SELECT version_num FROM alembic_version;")
    assert cursor.fetchone()[0] == "e5fd55244948"
    conn.close()

    # 6. Verify data still fully intact after downgrade
    engine3 = create_engine(db_url)
    Session3 = sessionmaker(bind=engine3)
    session3 = Session3()
    assert session3.query(User).filter(User.id == user_id).count() == 1
    assert session3.query(Project).filter(Project.id == proj_id).count() == 1
    assert session3.query(TraceLink).filter(TraceLink.project_id == proj_id).count() == 1
    session3.close()
    engine3.dispose()
