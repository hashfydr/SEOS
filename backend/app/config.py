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
    METRICS_API_KEY: str = os.getenv("METRICS_API_KEY", "")

    # Environment — detect production via explicit env var, Render platform flag, or PostgreSQL URL
    ENV: str = (
        "production"
        if (
            os.getenv("ENV") == "production"
            or os.getenv("ENVIRONMENT") == "production"
            or os.getenv("RENDER") == "true"
            or "postgres" in os.getenv("DATABASE_URL", "")
        )
        else os.getenv("ENV", os.getenv("ENVIRONMENT", "development"))
    )

    # CORS Settings — Strict origin allowlist, zero wildcard reflection
    # NOTE: BACKEND_CORS_ORIGINS is evaluated at class-definition time using os.getenv directly
    # because pydantic-settings field defaults cannot reference other fields computed above.
    BACKEND_CORS_ORIGINS: list[str] = (
        [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
        if os.getenv("ALLOWED_ORIGINS")
        else (
            ["https://seos-seos4.vercel.app"]
            if (
                os.getenv("ENV") == "production"
                or os.getenv("ENVIRONMENT") == "production"
                or os.getenv("RENDER") == "true"
                or "postgres" in os.getenv("DATABASE_URL", "")
            )
            else [
                "https://seos-seos4.vercel.app",
                "http://localhost:3000",
                "http://localhost:5173",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:5173",
            ]
        )
    )

    class Config:
        case_sensitive = True

settings = Settings()
