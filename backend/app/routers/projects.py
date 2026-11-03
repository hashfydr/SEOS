from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models import (
    User,
    Project,
    Diagram,
    Requirement,
    UserStory,
    Architecture,
    ApiSpec,
    Document,
    Classroom,
    Enrollment,
    TraceLink,
)
from app.schemas import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectFullSync,
    TraceabilityGraphResponse,
    TraceLinkResponse,
    TraceLinkCreate,
)
from app.auth import get_current_user

router = APIRouter(prefix="/projects", tags=["Projects"])

def get_authorized_project(
    project_id: str,
    current_user: User,
    db: Session,
    require_write: bool = False
) -> Project:
    """
    Enforce strict tenant and object-level authorization (BOLA / IDOR protection):
    - Project owners always have full read and write access.
    - Mentors have read/audit access ONLY to projects belonging to students enrolled
      in classrooms mentored by this mentor.
    - Mentors cannot access solo developer projects or students in other cohorts.
    - Students can never access or modify another student's project.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    if project.owner_id == current_user.id:
        return project

    if current_user.role == "mentor":
        # Check if project owner is a student enrolled in a classroom mentored by current_user
        is_enrolled = (
            db.query(Enrollment)
            .join(Classroom, Enrollment.classroom_id == Classroom.id)
            .filter(Classroom.mentor_id == current_user.id, Enrollment.student_id == project.owner_id)
            .first()
            is not None
        )
        if is_enrolled:
            return project

    action = "modify" if require_write else "access"
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"Authorization failure: You do not have permission to {action} this project.",
    )

def format_project(project: Project) -> dict:
    diagram_obj = project.diagrams[0] if project.diagrams else None
    return {
        "id": project.id,
        "owner_id": project.owner_id,
        "title": project.title,
        "idea": project.idea,
        "status": project.status,
        "version": project.version,
        "created_at": project.created_at,
        "requirements": [
            {
                "id": r.id,
                "project_id": r.project_id,
                "req_code": r.req_code,
                "req_type": r.req_type,
                "priority": r.priority,
                "description": r.description,
                "status": r.status,
            }
            for r in project.requirements
        ],
        "user_stories": [
            {
                "id": s.id,
                "project_id": s.project_id,
                "req_id": s.req_id,
                "role": s.role,
                "action": s.action,
                "benefit": s.benefit,
                "criteria": s.criteria or [],
                "status": s.status,
            }
            for s in project.user_stories
        ],
        "diagram": {
            "id": diagram_obj.id,
            "project_id": diagram_obj.project_id,
            "diagram_type": diagram_obj.diagram_type,
            "nodes_data": diagram_obj.nodes_data or [],
            "edges_data": diagram_obj.edges_data or [],
            "mermaid_code": diagram_obj.mermaid_code or "",
            "is_locked": diagram_obj.is_locked,
        } if diagram_obj else None,
        "architecture": {
            "id": project.architecture.id,
            "project_id": project.architecture.project_id,
            "pattern": project.architecture.pattern,
            "rationale": project.architecture.rationale,
            "components": project.architecture.components or [],
            "tradeoffs": project.architecture.tradeoffs or [],
            "citations": project.architecture.citations or [],
        } if project.architecture else None,
        "api_spec": {
            "id": project.api_specs.id,
            "project_id": project.api_specs.project_id,
            "http_method": project.api_specs.http_method,
            "openapi_yaml": project.api_specs.openapi_yaml,
            "is_valid": project.api_specs.is_valid,
        } if project.api_specs else None,
        "documents": [
            {
                "id": d.id,
                "project_id": d.project_id,
                "doc_type": d.doc_type,
                "title": d.title,
                "content": d.content,
            }
            for d in project.documents
        ],
    }

@router.get("", response_model=List[ProjectResponse])
def list_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Strict tenant isolation:
    # Mentors can audit projects belonging to students in their own cohorts;
    # Students & solo devs only access projects they own.
    if current_user.role == "mentor":
        mentored_classrooms = db.query(Classroom.id).filter(Classroom.mentor_id == current_user.id).all()
        class_ids = [c[0] for c in mentored_classrooms]
        
        enrolled_students = db.query(Enrollment.student_id).filter(Enrollment.classroom_id.in_(class_ids)).all()
        student_ids = [s[0] for s in enrolled_students]
        
        projects = db.query(Project).filter(
            or_(
                Project.owner_id == current_user.id,
                Project.owner_id.in_(student_ids) if student_ids else False
            )
        ).order_by(Project.created_at.desc()).all()
    else:
        projects = db.query(Project).filter(Project.owner_id == current_user.id).order_by(Project.created_at.desc()).all()
        
    return [format_project(p) for p in projects]

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # If the user is enrolled in a classroom, associate the project
    enrollment = db.query(Enrollment).filter(Enrollment.student_id == current_user.id).first()
    classroom_id = enrollment.classroom_id if enrollment else None

    project = Project(
        owner_id=current_user.id,
        classroom_id=classroom_id,
        title=project_in.title,
        idea=project_in.idea,
        status="active",
        version=1,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return format_project(project)

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = get_authorized_project(project_id, current_user, db, require_write=False)
    return format_project(project)

@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: str,
    project_in: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = get_authorized_project(project_id, current_user, db, require_write=True)
    
    if project_in.title is not None:
        project.title = project_in.title
    if project_in.idea is not None:
        project.idea = project_in.idea
    if project_in.status is not None:
        project.status = project_in.status
    
    project.version += 1
    db.commit()
    db.refresh(project)
    return format_project(project)

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = get_authorized_project(project_id, current_user, db, require_write=True)
    
    db.delete(project)
    db.commit()
    return None

@router.put("/{project_id}/sync-full", response_model=ProjectResponse)
def sync_full_project(
    project_id: str,
    sync_in: ProjectFullSync,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = get_authorized_project(project_id, current_user, db, require_write=True)

    # Mandatory Optimistic Concurrency Control: protect against lost updates / blind overwrites
    if sync_in.base_version is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Strict Concurrency Enforcement: 'base_version' is mandatory for project synchronization to prevent blind overwrites.",
        )

    # Atomic database-level version match and bump
    result = db.query(Project).filter(
        Project.id == project.id,
        Project.version == sync_in.base_version
    ).update(
        {"version": Project.version + 1, "title": sync_in.title, "idea": sync_in.idea or ""},
        synchronize_session="fetch"
    )

    if result == 0:
        db.rollback()
        latest_version = db.query(Project.version).filter(Project.id == project.id).scalar()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Optimistic lock conflict: Server project is at version {latest_version}, but client payload was based on version {sync_in.base_version}. Refresh before saving.",
        )

    # Requirements
    db.query(Requirement).filter(Requirement.project_id == project.id).delete()
    for r in sync_in.requirements:
        db.add(Requirement(
            project_id=project.id,
            req_code=r.req_code,
            req_type=r.req_type,
            priority=r.priority,
            description=r.description,
            status=r.status
        ))

    # User Stories
    db.query(UserStory).filter(UserStory.project_id == project.id).delete()
    for s in sync_in.user_stories:
        db.add(UserStory(
            project_id=project.id,
            req_id=s.req_id,
            role=s.role,
            action=s.action,
            benefit=s.benefit,
            criteria=s.criteria or [],
            status=s.status
        ))

    # TraceLinks Canonical Synchronization (Requirements, User Stories, Test Cases)
    db.query(TraceLink).filter(TraceLink.project_id == project.id).delete()
    if sync_in.trace_links:
        for tl in sync_in.trace_links:
            db.add(TraceLink(
                project_id=project.id,
                source_type=tl.source_type,
                source_id=tl.source_id,
                target_type=tl.target_type,
                target_id=tl.target_id,
                status=tl.status or "valid",
            ))
    else:
        for s in sync_in.user_stories:
            if s.req_id:
                db.add(TraceLink(
                    project_id=project.id,
                    source_type="requirement",
                    source_id=s.req_id,
                    target_type="user_story",
                    target_id=s.action[:80],
                    status="valid",
                ))

    # Diagram
    diagram = db.query(Diagram).filter(Diagram.project_id == project.id).first()
    if not diagram:
        diagram = Diagram(project_id=project.id, diagram_type="ERD")
        db.add(diagram)
    diagram.nodes_data = sync_in.nodes_data
    diagram.edges_data = sync_in.edges_data

    # Architecture
    arch = db.query(Architecture).filter(Architecture.project_id == project.id).first()
    if sync_in.architecture_pattern:
        if not arch:
            arch = Architecture(project_id=project.id)
            db.add(arch)
        arch.pattern = sync_in.architecture_pattern
        arch.rationale = sync_in.architecture_rationale or ""
        arch.components = sync_in.architecture_components
        arch.tradeoffs = sync_in.architecture_tradeoffs
        arch.citations = sync_in.architecture_citations

    # API Spec
    spec = db.query(ApiSpec).filter(ApiSpec.project_id == project.id).first()
    if sync_in.openapi_yaml is not None:
        if not spec:
            spec = ApiSpec(project_id=project.id)
            db.add(spec)
        spec.openapi_yaml = sync_in.openapi_yaml
        spec.is_valid = True

    # Documents
    db.query(Document).filter(Document.project_id == project.id).delete()
    for d in sync_in.documents:
        db.add(Document(
            project_id=project.id,
            doc_type=d.doc_type,
            title=d.title,
            content=d.content
        ))

    db.commit()
    db.refresh(project)
    return format_project(project)

@router.get("/{project_id}/traceability", response_model=TraceabilityGraphResponse)
def get_project_traceability(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns canonical bi-directional traceability graph and verification metrics:
    - Requirements to User Stories and Test Cases links
    - Verification coverage percentage
    """
    project = get_authorized_project(project_id, current_user, db, require_write=False)
    
    links = db.query(TraceLink).filter(TraceLink.project_id == project.id).all()
    req_codes = set(r.req_code for r in project.requirements)
    linked_reqs = set(l.source_id for l in links if l.source_type == "requirement" and l.source_id in req_codes)
    test_links = [l for l in links if l.target_type == "test_case"]
    
    req_count = len(req_codes)
    covered_count = len(linked_reqs)
    coverage_pct = round((covered_count / req_count * 100.0), 1) if req_count > 0 else 100.0

    return TraceabilityGraphResponse(
        project_id=project.id,
        version=project.version,
        links=links,
        requirements_count=req_count,
        stories_count=len(project.user_stories),
        test_cases_count=len(test_links),
        covered_requirements_count=covered_count,
        coverage_percentage=coverage_pct,
    )

@router.post("/{project_id}/traceability/link", response_model=TraceLinkResponse)
def create_trace_link(
    project_id: str,
    link_in: TraceLinkCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Explicitly adds a bidirectional TraceLink connecting requirements to test cases,
    user stories, or architecture modules.
    """
    project = get_authorized_project(project_id, current_user, db, require_write=True)
    link = TraceLink(
        project_id=project.id,
        source_type=link_in.source_type,
        source_id=link_in.source_id,
        target_type=link_in.target_type,
        target_id=link_in.target_id,
        status=link_in.status,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return link
