from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

# ─── Auth Schemas ───

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, description="Minimum 8 characters password")
    role: str = Field(default="solo_dev", pattern="^(solo_dev|student|mentor)$")
    join_code: Optional[str] = Field(default=None, description="Optional classroom code for students")
    mentor_passcode: Optional[str] = Field(default=None, description="Institutional secret required to register as mentor")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    name: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    created_at: datetime
    classroom_code: Optional[str] = None
    classroom_name: Optional[str] = None

    class Config:
        from_attributes = True

# ─── Classroom Schemas ───

class ClassroomCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = ""
    custom_code: Optional[str] = Field(default=None, min_length=4, max_length=20)

class ClassroomJoin(BaseModel):
    code: str = Field(..., min_length=4, max_length=20)

class ClassroomResponse(BaseModel):
    id: str
    mentor_id: str
    name: str
    code: str
    description: str
    created_at: datetime
    student_count: int = 0
    mentor_name: Optional[str] = None

    class Config:
        from_attributes = True

class RosterProjectSummary(BaseModel):
    id: str
    title: str
    status: str
    version: int
    requirements_count: int = 0
    stories_count: int = 0
    has_model: bool = False
    has_architecture: bool = False
    has_api: bool = False
    has_docs: bool = False
    created_at: datetime

class RosterStudent(BaseModel):
    id: str
    name: str
    email: str
    enrolled_at: datetime
    projects: List[RosterProjectSummary] = []

class ClassroomRosterResponse(BaseModel):
    classroom: ClassroomResponse
    students: List[RosterStudent]

# ─── Requirement Schemas ───

class RequirementBase(BaseModel):
    req_code: str
    req_type: str = "Functional"
    priority: str = "High"
    description: str
    status: str = "draft"

class RequirementCreate(RequirementBase):
    pass

class RequirementResponse(RequirementBase):
    id: str
    project_id: str

    class Config:
        from_attributes = True

# ─── User Story Schemas ───

class UserStoryBase(BaseModel):
    req_id: Optional[str] = None
    role: str
    action: str
    benefit: str
    criteria: List[str] = []
    status: str = "draft"

class UserStoryCreate(UserStoryBase):
    pass

class UserStoryResponse(UserStoryBase):
    id: str
    project_id: str

    class Config:
        from_attributes = True

# ─── Diagram Schemas ───

class DiagramSync(BaseModel):
    diagram_type: str = "domain_model"
    nodes_data: List[Any] = []
    edges_data: List[Any] = []
    mermaid_code: str = ""
    is_locked: bool = False

class DiagramResponse(DiagramSync):
    id: str
    project_id: str

    class Config:
        from_attributes = True

# ─── Architecture Schemas ───

class ArchitectureSync(BaseModel):
    pattern: str
    rationale: str
    components: List[Any] = []
    tradeoffs: List[Any] = []
    citations: List[Any] = []

class ArchitectureResponse(ArchitectureSync):
    id: str
    project_id: str

    class Config:
        from_attributes = True

# ─── API Spec Schemas ───

class ApiSpecSync(BaseModel):
    http_method: str = "REST"
    openapi_yaml: str
    is_valid: bool = True

class ApiSpecResponse(ApiSpecSync):
    id: str
    project_id: str

    class Config:
        from_attributes = True

# ─── Document Schemas ───

class DocumentSync(BaseModel):
    doc_type: str
    title: str
    content: str

class DocumentResponse(DocumentSync):
    id: str
    project_id: str

    class Config:
        from_attributes = True

# ─── Project Schemas ───

class ProjectCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    idea: str = ""

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    idea: Optional[str] = None
    status: Optional[str] = None

class ProjectResponse(BaseModel):
    id: str
    owner_id: str
    title: str
    idea: str
    status: str
    version: int
    created_at: datetime
    requirements: List[RequirementResponse] = []
    user_stories: List[UserStoryResponse] = []
    diagram: Optional[DiagramResponse] = None
    architecture: Optional[ArchitectureResponse] = None
    api_spec: Optional[ApiSpecResponse] = None
    documents: List[DocumentResponse] = []

    class Config:
        from_attributes = True

class ProjectFullSync(BaseModel):
    title: str
    idea: Optional[str] = ""
    base_version: Optional[int] = Field(default=None, description="Expected base version for optimistic concurrency control")
    requirements: List[RequirementCreate] = []
    user_stories: List[UserStoryCreate] = []
    nodes_data: List[dict] = []
    edges_data: List[dict] = []
    architecture_pattern: Optional[str] = None
    architecture_rationale: Optional[str] = None
    architecture_components: List[dict] = []
    architecture_tradeoffs: List[dict] = []
    architecture_citations: List[dict] = []
    openapi_yaml: Optional[str] = None
    documents: List[DocumentSync] = []
    trace_links: List["TraceLinkCreate"] = []

class TraceLinkCreate(BaseModel):
    source_type: str = Field(..., description="e.g. 'requirement' or 'user_story'")
    source_id: str = Field(..., description="e.g. 'REQ-101'")
    target_type: str = Field(..., description="e.g. 'user_story', 'test_case', 'architecture', 'api_spec'")
    target_id: str = Field(..., description="e.g. 'TC-101', 'US-101'")
    status: str = Field(default="valid")

class TraceLinkResponse(BaseModel):
    id: str
    project_id: str
    source_type: str
    source_id: str
    target_type: str
    target_id: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class TraceabilityGraphResponse(BaseModel):
    project_id: str
    version: int
    links: List[TraceLinkResponse] = []
    requirements_count: int = 0
    stories_count: int = 0
    test_cases_count: int = 0
    covered_requirements_count: int = 0
    coverage_percentage: float = 0.0

# ─── Knowledge Base Schemas ───

class KnowledgeSearchResponse(BaseModel):
    id: str
    topic: str
    source_book: str
    chapter_or_page: str
    chunk_text: str
    keywords: List[str] = []
    file_name: Optional[str] = None

    class Config:
        from_attributes = True

class DocumentUploadResponse(BaseModel):
    file_name: str
    chunks_count: int
    topic: str
    message: str

class UploadedDocSummary(BaseModel):
    file_name: str
    topic: str
    chunks_count: int
    source_book: str
