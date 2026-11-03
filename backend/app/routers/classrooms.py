import string
import random
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import User, Classroom, Enrollment, Project, Requirement, UserStory, Diagram, Architecture, ApiSpec, Document
from app.schemas import (
    ClassroomCreate,
    ClassroomJoin,
    ClassroomResponse,
    ClassroomRosterResponse,
    RosterStudent,
    RosterProjectSummary,
)
from app.auth import get_current_user

router = APIRouter(prefix="/classrooms", tags=["Classrooms & Mentor Rosters"])


def generate_classroom_code(db: Session, prefix: str = "SEOS") -> str:
    """Generate a clean, readable 6-8 character classroom code like SEOS-503L2 or SEOS-9X4K."""
    for _ in range(100):
        chars = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
        code = f"{prefix}-{chars}"
        if not db.query(Classroom).filter(Classroom.code == code).first():
            return code
    raise RuntimeError("Failed to generate unique classroom code.")


def format_classroom_response(c: Classroom, db: Session) -> ClassroomResponse:
    student_count = db.query(func.count(Enrollment.id)).filter(Enrollment.classroom_id == c.id).scalar() or 0
    mentor = db.query(User).filter(User.id == c.mentor_id).first()
    return ClassroomResponse(
        id=c.id,
        mentor_id=c.mentor_id,
        name=c.name,
        code=c.code,
        description=c.description or "",
        created_at=c.created_at,
        student_count=student_count,
        mentor_name=mentor.name if mentor else None,
    )


@router.post("", response_model=ClassroomResponse, status_code=status.HTTP_201_CREATED)
def create_classroom(
    class_in: ClassroomCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "mentor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only mentors/faculty can create classrooms and cohorts.",
        )

    code = class_in.custom_code.strip().upper() if class_in.custom_code else generate_classroom_code(db)
    
    # Check if custom code exists
    existing = db.query(Classroom).filter(Classroom.code == code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Classroom code '{code}' is already taken. Please pick another code.",
        )

    classroom = Classroom(
        mentor_id=current_user.id,
        name=class_in.name.strip(),
        code=code,
        description=class_in.description or "",
    )
    db.add(classroom)
    db.commit()
    db.refresh(classroom)

    return format_classroom_response(classroom, db)


@router.get("", response_model=List[ClassroomResponse])
def list_classrooms(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == "mentor":
        classrooms = db.query(Classroom).filter(Classroom.mentor_id == current_user.id).all()
        return [format_classroom_response(c, db) for c in classrooms]
    else:
        # Enrolled classrooms for student
        enrollments = db.query(Enrollment).filter(Enrollment.student_id == current_user.id).all()
        classrooms = [e.classroom for e in enrollments if e.classroom]
        return [format_classroom_response(c, db) for c in classrooms]


@router.post("/join", response_model=ClassroomResponse)
def join_classroom(
    join_in: ClassroomJoin,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    code = join_in.code.strip().upper()
    classroom = db.query(Classroom).filter(Classroom.code == code).first()
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Classroom with code '{code}' was not found. Please verify with your mentor.",
        )

    if classroom.mentor_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are the mentor of this classroom.",
        )

    # Check if already enrolled
    existing = (
        db.query(Enrollment)
        .filter(Enrollment.classroom_id == classroom.id, Enrollment.student_id == current_user.id)
        .first()
    )
    if existing:
        return format_classroom_response(classroom, db)

    enrollment = Enrollment(classroom_id=classroom.id, student_id=current_user.id)
    db.add(enrollment)

    # If user was solo_dev, upgrade to student
    if current_user.role == "solo_dev":
        current_user.role = "student"

    db.commit()
    return format_classroom_response(classroom, db)


@router.get("/{classroom_id}/roster", response_model=ClassroomRosterResponse)
def get_classroom_roster(
    classroom_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found.")

    if current_user.role != "mentor" or classroom.mentor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the course mentor who created this classroom can inspect the student roster.",
        )

    enrollments = db.query(Enrollment).filter(Enrollment.classroom_id == classroom.id).all()
    students_data: List[RosterStudent] = []

    for enr in enrollments:
        student = enr.student
        if not student:
            continue

        # Get student's projects
        projects = db.query(Project).filter(Project.owner_id == student.id).all()
        project_summaries = []
        for p in projects:
            req_count = db.query(func.count(Requirement.id)).filter(Requirement.project_id == p.id).scalar() or 0
            story_count = db.query(func.count(UserStory.id)).filter(UserStory.project_id == p.id).scalar() or 0
            has_diag = db.query(Diagram.id).filter(Diagram.project_id == p.id).first() is not None
            has_arch = db.query(Architecture.id).filter(Architecture.project_id == p.id).first() is not None
            has_api = db.query(ApiSpec.id).filter(ApiSpec.project_id == p.id).first() is not None
            has_docs = db.query(Document.id).filter(Document.project_id == p.id).first() is not None

            project_summaries.append(
                RosterProjectSummary(
                    id=p.id,
                    title=p.title,
                    status=p.status,
                    version=p.version,
                    requirements_count=req_count,
                    stories_count=story_count,
                    has_model=has_diag,
                    has_architecture=has_arch,
                    has_api=has_api,
                    has_docs=has_docs,
                    created_at=p.created_at,
                )
            )

        students_data.append(
            RosterStudent(
                id=student.id,
                name=student.name,
                email=student.email,
                enrolled_at=enr.enrolled_at,
                projects=project_summaries,
            )
        )

    return ClassroomRosterResponse(
        classroom=format_classroom_response(classroom, db),
        students=students_data,
    )
