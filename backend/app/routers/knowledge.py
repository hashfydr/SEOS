import io
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, UploadFile, File, Form, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from jwt.exceptions import PyJWTError
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
import pypdf

from app.config import settings
from app.database import get_db
from app.models import KnowledgeChunk, User, Enrollment, Classroom
from app.schemas import KnowledgeSearchResponse, DocumentUploadResponse, UploadedDocSummary
from app.auth import get_current_user

router = APIRouter(prefix="/knowledge", tags=["SE Knowledge Base (RAG)"])

oauth2_optional = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)

def get_optional_current_user(
    token: Optional[str] = Depends(oauth2_optional),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            return None
        return db.query(User).filter(User.id == user_id).first()
    except Exception:
        return None

def chunk_text_content(text: str, chunk_size: int = 600, overlap: int = 100) -> List[str]:
    """Split clean text into overlapping chunks suitable for semantic RAG."""
    cleaned = "\n".join(line.strip() for line in text.splitlines() if line.strip())
    if not cleaned:
        return []
    
    chunks = []
    start = 0
    text_len = len(cleaned)
    while start < text_len:
        end = min(start + chunk_size, text_len)
        # Try to find a sentence or newline break near end
        if end < text_len:
            break_point = cleaned.rfind("\n", start + chunk_size // 2, end)
            if break_point == -1:
                break_point = cleaned.rfind(". ", start + chunk_size // 2, end)
            if break_point != -1:
                end = break_point + 1
        
        chunk = cleaned[start:end].strip()
        if len(chunk) > 40:
            chunks.append(chunk)
        start += (chunk_size - overlap)
    return chunks

@router.get("/search", response_model=List[KnowledgeSearchResponse])
def search_knowledge(
    q: Optional[str] = Query(default="", description="Search query or architectural keyword"),
    limit: int = Query(default=6, ge=1, le=25),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    # Enforce strict tenant isolation:
    # 1. Global foundational curriculum chunks (uploaded_by_id is None) are public
    # 2. Authenticated users can access their own uploaded chunks
    # 3. Mentors & students can access chunks linked to their enrolled/mentored classrooms
    user_classroom_ids = []
    if current_user:
        if current_user.role == "mentor":
            cl_ids = db.query(Classroom.id).filter(Classroom.mentor_id == current_user.id).all()
            user_classroom_ids = [c[0] for c in cl_ids]
        elif current_user.role == "student":
            en_ids = db.query(Enrollment.classroom_id).filter(Enrollment.student_id == current_user.id).all()
            user_classroom_ids = [e[0] for e in en_ids]

    visibility_conditions = [KnowledgeChunk.uploaded_by_id.is_(None)]
    if current_user:
        visibility_conditions.append(KnowledgeChunk.uploaded_by_id == current_user.id)
        if user_classroom_ids:
            visibility_conditions.append(KnowledgeChunk.classroom_id.in_(user_classroom_ids))

    query = db.query(KnowledgeChunk).filter(or_(*visibility_conditions))
    if q and q.strip():
        term = f"%{q.strip().lower()}%"
        query = query.filter(
            or_(
                KnowledgeChunk.topic.ilike(term),
                KnowledgeChunk.source_book.ilike(term),
                KnowledgeChunk.chunk_text.ilike(term),
            )
        )
    return query.limit(limit).all()

@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    topic: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload course reference or personal material (.pdf, .md, .txt).
    Extracts text, creates overlapping vector chunks, and grounds RAG search.
    """
    filename = file.filename or "uploaded_document.txt"
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    if ext not in ["pdf", "md", "txt", "markdown"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported format. Please upload PDF (.pdf) or Markdown (.md, .txt) files."
        )

    contents = await file.read()
    raw_text = ""

    if ext == "pdf":
        try:
            reader = pypdf.PdfReader(io.BytesIO(contents))
            pages_text = [page.extract_text() or "" for page in reader.pages]
            raw_text = "\n\n".join(pages_text)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to parse PDF document: {str(e)}"
            )
    else:
        raw_text = contents.decode("utf-8", errors="replace")

    chunks = chunk_text_content(raw_text)
    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file contains no readable text content."
        )

    # Determine classroom association if mentor or student
    classroom_id = None
    if current_user.role == "mentor":
        mentor_classroom = db.query(Classroom).filter(Classroom.mentor_id == current_user.id).first()
        if mentor_classroom:
            classroom_id = mentor_classroom.id
    elif current_user.role == "student":
        enrollment = db.query(Enrollment).filter(Enrollment.student_id == current_user.id).first()
        if enrollment:
            classroom_id = enrollment.classroom_id

    # Remove existing chunks for this file by this user if re-uploading
    db.query(KnowledgeChunk).filter(
        KnowledgeChunk.uploaded_by_id == current_user.id,
        KnowledgeChunk.file_name == filename
    ).delete()

    doc_topic = topic.strip() if topic and topic.strip() else filename.replace(f".{ext}", "").replace("_", " ").title()
    source_label = f"Course Reference: {filename}" if current_user.role == "mentor" else f"Personal Reference: {filename}"

    for idx, chunk in enumerate(chunks):
        k_chunk = KnowledgeChunk(
            topic=doc_topic,
            source_book=f"{source_label} ({current_user.name})",
            chapter_or_page=f"Section {idx + 1}",
            chunk_text=chunk,
            keywords=[ext, "uploaded", current_user.role],
            uploaded_by_id=current_user.id,
            classroom_id=classroom_id,
            file_name=filename,
        )
        db.add(k_chunk)

    db.commit()

    return DocumentUploadResponse(
        file_name=filename,
        chunks_count=len(chunks),
        topic=doc_topic,
        message=f"Successfully extracted and indexed {len(chunks)} chunks into SEOS RAG retriever."
    )

@router.get("/my-documents", response_model=List[UploadedDocSummary])
def list_my_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List documents uploaded by the current user or available to their specific cohort."""
    user_classroom_ids = []
    if current_user.role == "mentor":
        cl_ids = db.query(Classroom.id).filter(Classroom.mentor_id == current_user.id).all()
        user_classroom_ids = [c[0] for c in cl_ids]
    elif current_user.role == "student":
        en_ids = db.query(Enrollment.classroom_id).filter(Enrollment.student_id == current_user.id).all()
        user_classroom_ids = [e[0] for e in en_ids]

    allowed_conditions = [KnowledgeChunk.uploaded_by_id == current_user.id]
    if user_classroom_ids:
        allowed_conditions.append(KnowledgeChunk.classroom_id.in_(user_classroom_ids))

    query = db.query(
        KnowledgeChunk.file_name,
        KnowledgeChunk.topic,
        KnowledgeChunk.source_book,
        func.count(KnowledgeChunk.id).label("chunks_count")
    ).filter(
        KnowledgeChunk.file_name.isnot(None),
        or_(*allowed_conditions)
    ).group_by(
        KnowledgeChunk.file_name,
        KnowledgeChunk.topic,
        KnowledgeChunk.source_book
    )

    results = query.all()
    return [
        UploadedDocSummary(
            file_name=r[0],
            topic=r[1],
            source_book=r[2],
            chunks_count=r[3],
        )
        for r in results
    ]

@router.delete("/documents/{file_name}", status_code=status.HTTP_200_OK)
def delete_document(
    file_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete uploaded document chunks with strict ownership authorization."""
    existing_by_user = db.query(KnowledgeChunk).filter(
        KnowledgeChunk.file_name == file_name,
        KnowledgeChunk.uploaded_by_id == current_user.id
    ).first()

    if not existing_by_user:
        # Check if the document belongs to another tenant
        other_exists = db.query(KnowledgeChunk).filter(KnowledgeChunk.file_name == file_name).first()
        if other_exists:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: You do not have ownership of document '{file_name}'."
            )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{file_name}' not found."
        )

    deleted = db.query(KnowledgeChunk).filter(
        KnowledgeChunk.file_name == file_name,
        KnowledgeChunk.uploaded_by_id == current_user.id
    ).delete()
    db.commit()
    return {"message": f"Deleted {deleted} chunks for '{file_name}'."}

@router.get("/topics", response_model=List[str])
def list_topics(db: Session = Depends(get_db)):
    topics = db.query(KnowledgeChunk.topic).distinct().all()
    return [t[0] for t in topics]
