import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Text,
    Integer,
    Boolean,
    DateTime,
    ForeignKey,
    JSON
)
from sqlalchemy.orm import relationship
from app.database import Base

def gen_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(String(50), default="solo_dev", nullable=False)  # "solo_dev", "student", or "mentor"
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")
    mentored_classrooms = relationship("Classroom", back_populates="mentor", cascade="all, delete-orphan")
    enrollments = relationship("Enrollment", back_populates="student", cascade="all, delete-orphan")


class Classroom(Base):
    __tablename__ = "classrooms"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    mentor_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(20), unique=True, index=True, nullable=False)  # e.g., "SEOS-503L2"
    description = Column(Text, default="", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    mentor = relationship("User", back_populates="mentored_classrooms")
    enrollments = relationship("Enrollment", back_populates="classroom", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="classroom")


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    classroom_id = Column(String(36), ForeignKey("classrooms.id"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    enrolled_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    classroom = relationship("Classroom", back_populates="enrollments")
    student = relationship("User", back_populates="enrollments")


class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    owner_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    classroom_id = Column(String(36), ForeignKey("classrooms.id"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    idea = Column(Text, default="", nullable=False)
    status = Column(String(50), default="active", nullable=False)  # "active", "completed", "archived"
    version = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    owner = relationship("User", back_populates="projects")
    classroom = relationship("Classroom", back_populates="projects")
    requirements = relationship("Requirement", back_populates="project", cascade="all, delete-orphan")
    user_stories = relationship("UserStory", back_populates="project", cascade="all, delete-orphan")
    diagrams = relationship("Diagram", back_populates="project", cascade="all, delete-orphan")
    architecture = relationship("Architecture", back_populates="project", uselist=False, cascade="all, delete-orphan")
    api_specs = relationship("ApiSpec", back_populates="project", uselist=False, cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="project", cascade="all, delete-orphan")
    trace_links = relationship("TraceLink", back_populates="project", cascade="all, delete-orphan")


class Requirement(Base):
    __tablename__ = "requirements"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    req_code = Column(String(50), nullable=False)  # e.g., REQ-101
    req_type = Column(String(50), default="Functional", nullable=False)  # Functional or Non-Functional
    priority = Column(String(50), default="High", nullable=False)  # Critical, High, Medium, Low
    description = Column(Text, nullable=False)
    status = Column(String(50), default="draft", nullable=False)  # draft, approved, rejected

    project = relationship("Project", back_populates="requirements")


class UserStory(Base):
    __tablename__ = "user_stories"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    req_id = Column(String(50), nullable=True)  # References Requirement.req_code or id
    role = Column(String(100), nullable=False)
    action = Column(Text, nullable=False)
    benefit = Column(Text, nullable=False)
    criteria = Column(JSON, default=list)  # List of acceptance criteria strings
    status = Column(String(50), default="draft", nullable=False)

    project = relationship("Project", back_populates="user_stories")


class Diagram(Base):
    __tablename__ = "diagrams"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    diagram_type = Column(String(50), default="domain_model", nullable=False)
    mermaid_code = Column(Text, default="", nullable=False)
    nodes_data = Column(JSON, default=list)  # UMLNode[] serialization
    edges_data = Column(JSON, default=list)  # UMLEdge[] serialization
    is_locked = Column(Boolean, default=False, nullable=False)

    project = relationship("Project", back_populates="diagrams")


class Architecture(Base):
    __tablename__ = "architecture"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False, unique=True, index=True)
    pattern = Column(String(100), nullable=False)
    rationale = Column(Text, nullable=False)
    components = Column(JSON, default=list)  # [{name, tech, purpose}]
    tradeoffs = Column(JSON, default=list)   # [{pro, con}]
    citations = Column(JSON, default=list)   # Grounded literature citations

    project = relationship("Project", back_populates="architecture")


class ApiSpec(Base):
    __tablename__ = "api_specs"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False, unique=True, index=True)
    http_method = Column(String(50), default="REST", nullable=False)
    openapi_yaml = Column(Text, nullable=False)
    is_valid = Column(Boolean, default=True, nullable=False)

    project = relationship("Project", back_populates="api_specs")


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    doc_type = Column(String(50), nullable=False)  # SRS, SDD, README
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)

    project = relationship("Project", back_populates="documents")


class PromptVersion(Base):
    __tablename__ = "prompt_versions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    module = Column(String(100), nullable=False)  # requirements, stories, model, architecture, api, docs
    template = Column(Text, nullable=False)
    status = Column(String(50), default="active", nullable=False)
    version = Column(Integer, default=1, nullable=False)


class KnowledgeChunk(Base):
    __tablename__ = "knowledge_base"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    topic = Column(String(100), nullable=False, index=True)
    source_book = Column(String(255), nullable=False)
    chapter_or_page = Column(String(100), nullable=False)
    chunk_text = Column(Text, nullable=False)
    keywords = Column(JSON, default=list)
    uploaded_by_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    classroom_id = Column(String(36), ForeignKey("classrooms.id"), nullable=True, index=True)
    file_name = Column(String(255), nullable=True, index=True)


class RagExplanation(Base):
    __tablename__ = "rag_explanations"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    artifact_id = Column(String(36), nullable=False, index=True)
    topic = Column(String(100), nullable=False)
    explanation = Column(Text, nullable=False)
    citations = Column(JSON, default=list)


class TraceLink(Base):
    __tablename__ = "trace_links"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    source_type = Column(String(50), nullable=False)   # e.g., "requirement", "user_story"
    source_id = Column(String(100), nullable=False, index=True) # e.g., "REQ-101", requirement UUID
    target_type = Column(String(50), nullable=False)   # e.g., "user_story", "diagram_node", "api_spec"
    target_id = Column(String(100), nullable=False, index=True) # e.g., "US-101", story UUID
    status = Column(String(50), default="valid", nullable=False) # "valid", "stale", "broken"
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    project = relationship("Project", back_populates="trace_links")
