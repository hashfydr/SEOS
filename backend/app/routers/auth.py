from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models import User, Classroom, Enrollment
from app.schemas import UserRegister, UserLogin, Token, UserResponse
from app.auth import get_password_hash, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    if len(user_in.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters in length.",
        )

    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )
    
    # Server-enforced role assignment: prevent unauthorized mentor privilege escalation
    classroom = None
    role = "solo_dev"
    if user_in.role == "mentor":
        if not user_in.mentor_passcode or user_in.mentor_passcode != settings.MENTOR_INVITE_SECRET:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Privilege escalation blocked: Mentor registration requires a valid institutional authorization passcode.",
            )
        role = "mentor"
    elif user_in.join_code and user_in.join_code.strip():
        code = user_in.join_code.strip().upper()
        classroom = db.query(Classroom).filter(Classroom.code == code).first()
        if not classroom:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Classroom with code '{code}' does not exist.",
            )
        role = "student"
    elif user_in.role == "student":
        role = "student"
    else:
        role = "solo_dev"

    user = User(
        name=user_in.name,
        email=user_in.email,
        password=get_password_hash(user_in.password),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    classroom_code = None
    classroom_name = None
    if classroom:
        enrollment = Enrollment(classroom_id=classroom.id, student_id=user.id)
        db.add(enrollment)
        db.commit()
        classroom_code = classroom.code
        classroom_name = classroom.name

    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        created_at=user.created_at,
        classroom_code=classroom_code,
        classroom_name=classroom_name,
    )

@router.post("/login", response_model=Token)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = create_access_token(data={"sub": user.id, "role": user.role, "name": user.name})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name,
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    classroom_code = None
    classroom_name = None
    enr = db.query(Enrollment).filter(Enrollment.student_id == current_user.id).first()
    if enr and enr.classroom:
        classroom_code = enr.classroom.code
        classroom_name = enr.classroom.name

    return UserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        created_at=current_user.created_at,
        classroom_code=classroom_code,
        classroom_name=classroom_name,
    )
