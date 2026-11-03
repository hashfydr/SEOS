from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Project, Requirement, UserStory, Diagram, Architecture, ApiSpec, Document
from app.schemas import (
    RequirementCreate,
    RequirementResponse,
    UserStoryCreate,
    UserStoryResponse,
    DiagramSync,
    DiagramResponse,
    ArchitectureSync,
    ArchitectureResponse,
    ApiSpecSync,
    ApiSpecResponse,
    DocumentSync,
    DocumentResponse,
)
from app.auth import get_current_user
from app.routers.projects import get_authorized_project

router = APIRouter(prefix="/projects/{project_id}/artifacts", tags=["Artifact Synchronization"])

# ─── Requirements Sync ───

@router.put("/requirements", response_model=List[RequirementResponse])
def sync_requirements(
    project_id: str,
    requirements_in: List[RequirementCreate],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = get_authorized_project(project_id, current_user, db)
    
    # Replace existing requirements with newly synchronized list
    db.query(Requirement).filter(Requirement.project_id == project.id).delete()
    
    new_reqs = []
    for r in requirements_in:
        req = Requirement(
            project_id=project.id,
            req_code=r.req_code,
            req_type=r.req_type,
            priority=r.priority,
            description=r.description,
            status=r.status,
        )
        db.add(req)
        new_reqs.append(req)
    
    project.version += 1
    db.commit()
    for r in new_reqs:
        db.refresh(r)
    return new_reqs

# ─── User Stories Sync ───

@router.put("/stories", response_model=List[UserStoryResponse])
def sync_user_stories(
    project_id: str,
    stories_in: List[UserStoryCreate],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = get_authorized_project(project_id, current_user, db)
    
    db.query(UserStory).filter(UserStory.project_id == project.id).delete()
    
    new_stories = []
    for s in stories_in:
        story = UserStory(
            project_id=project.id,
            req_id=s.req_id,
            role=s.role,
            action=s.action,
            benefit=s.benefit,
            criteria=s.criteria,
            status=s.status,
        )
        db.add(story)
        new_stories.append(story)
    
    project.version += 1
    db.commit()
    for s in new_stories:
        db.refresh(s)
    return new_stories

# ─── Diagram Sync (Nodes & Edges) ───

@router.put("/diagram", response_model=DiagramResponse)
def sync_diagram(
    project_id: str,
    diagram_in: DiagramSync,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = get_authorized_project(project_id, current_user, db)
    
    diagram = db.query(Diagram).filter(Diagram.project_id == project.id).first()
    if not diagram:
        diagram = Diagram(project_id=project.id)
        db.add(diagram)
    
    diagram.diagram_type = diagram_in.diagram_type
    diagram.nodes_data = diagram_in.nodes_data
    diagram.edges_data = diagram_in.edges_data
    diagram.mermaid_code = diagram_in.mermaid_code
    diagram.is_locked = diagram_in.is_locked
    
    project.version += 1
    db.commit()
    db.refresh(diagram)
    return diagram

# ─── Architecture Sync ───

@router.put("/architecture", response_model=ArchitectureResponse)
def sync_architecture(
    project_id: str,
    arch_in: ArchitectureSync,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = get_authorized_project(project_id, current_user, db)
    
    arch = db.query(Architecture).filter(Architecture.project_id == project.id).first()
    if not arch:
        arch = Architecture(project_id=project.id)
        db.add(arch)
    
    arch.pattern = arch_in.pattern
    arch.rationale = arch_in.rationale
    arch.components = arch_in.components
    arch.tradeoffs = arch_in.tradeoffs
    arch.citations = arch_in.citations
    
    project.version += 1
    db.commit()
    db.refresh(arch)
    return arch

# ─── OpenAPI Spec Sync ───

@router.put("/api-spec", response_model=ApiSpecResponse)
def sync_api_spec(
    project_id: str,
    spec_in: ApiSpecSync,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = get_authorized_project(project_id, current_user, db)
    
    spec = db.query(ApiSpec).filter(ApiSpec.project_id == project.id).first()
    if not spec:
        spec = ApiSpec(project_id=project.id)
        db.add(spec)
    
    spec.http_method = spec_in.http_method
    spec.openapi_yaml = spec_in.openapi_yaml
    spec.is_valid = spec_in.is_valid
    
    project.version += 1
    db.commit()
    db.refresh(spec)
    return spec

# ─── Documents Sync ───

@router.put("/docs", response_model=List[DocumentResponse])
def sync_documents(
    project_id: str,
    docs_in: List[DocumentSync],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = get_authorized_project(project_id, current_user, db)
    
    db.query(Document).filter(Document.project_id == project.id).delete()
    
    new_docs = []
    for d in docs_in:
        doc = Document(
            project_id=project.id,
            doc_type=d.doc_type,
            title=d.title,
            content=d.content,
        )
        db.add(doc)
        new_docs.append(doc)
    
    project.version += 1
    db.commit()
    for d in new_docs:
        db.refresh(d)
    return new_docs
