import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "SEOS Backend API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database Settings
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://seos_user:seos_password@localhost:5432/seos_db"
    )
    
    # JWT & Auth Settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "seos-super-secret-production-jwt-key-ucs503-tiets")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    MENTOR_INVITE_SECRET: str = os.getenv("MENTOR_INVITE_SECRET", "SEOS-MENTOR-INVITE-2026")

    # CORS Settings
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"
    ]

    class Config:
        case_sensitive = True

settings = Settings()
