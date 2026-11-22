import hmac
import time
import resource
from datetime import datetime
from typing import Optional
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response, Header, HTTPException, status
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.seed import seed_knowledge_base
from app.auth import decode_access_token
from app.routers import auth_router, projects_router, artifacts_router, knowledge_router, classrooms_router

START_TIME = time.time()
METRICS = {
    "total_requests": 0,
    "status_2xx": 0,
    "status_4xx": 0,
    "status_5xx": 0,
}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables and seed knowledge base
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        count = seed_knowledge_base(db)
        print(f"SEOS Knowledge Base initialized with {count} literature chunks.")
    finally:
        db.close()
    yield
    # Shutdown

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Software Engineering Operating System (SEOS) — FastAPI REST Gateway & Artifact Sync Backend",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
)

# CORS Middleware (strict origin control, explicit allowlist, zero wildcard reflection)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Exception Handler to format structured HTTPException details cleanly
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if isinstance(exc.detail, dict) and "detail" in exc.detail:
        return JSONResponse(
            status_code=exc.status_code,
            content=exc.detail,
            headers=exc.headers,
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers,
    )

# Strict HTTP Security Headers & Operational Metrics Middleware
@app.middleware("http")
async def security_and_metrics_middleware(request: Request, call_next):
    METRICS["total_requests"] += 1
    start_req = time.time()
    
    response: Response = await call_next(request)
    duration = time.time() - start_req
    
    status_code = response.status_code
    if 200 <= status_code < 300:
        METRICS["status_2xx"] += 1
    elif 400 <= status_code < 500:
        METRICS["status_4xx"] += 1
    elif status_code >= 500:
        METRICS["status_5xx"] += 1

    # Security Headers Defense-in-Depth (Strict CSP without 'unsafe-inline' on scripts)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

    if settings.ENV == "production":
        connect_src = "connect-src 'self' https://seos-seos4.vercel.app https://seos-backend.onrender.com https:;"
    else:
        connect_src = "connect-src 'self' http://localhost:* ws://localhost:* https:;"

    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "font-src 'self' data:; "
        f"{connect_src} "
        "frame-ancestors 'none'; "
        "object-src 'none'; "
        "base-uri 'self'; "
        "form-action 'self';"
    )
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["X-Response-Time-Ms"] = f"{round(duration * 1000, 2)}"
    return response

# Register Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(projects_router, prefix=settings.API_V1_STR)
app.include_router(artifacts_router, prefix=settings.API_V1_STR)
app.include_router(knowledge_router, prefix=settings.API_V1_STR)
app.include_router(classrooms_router, prefix=settings.API_V1_STR)

@app.get(f"{settings.API_V1_STR}/health", tags=["Health"])
@app.get("/health", tags=["Health"], include_in_schema=False)
def health_check():
    db_ok = True
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
    except Exception:
        db_ok = False

    return {
        "status": "healthy" if db_ok else "unhealthy",
        "service": "seos-backend",
        "version": settings.VERSION,
        "database": "connected" if db_ok else "disconnected",
        "environment": "production" if "postgres" in settings.DATABASE_URL else "development",
    }

@app.get("/docs", include_in_schema=False)
def redirect_docs():
    return RedirectResponse(url=f"{settings.API_V1_STR}/docs", status_code=status.HTTP_307_TEMPORARY_REDIRECT)

@app.get(f"{settings.API_V1_STR}/metrics", tags=["Monitoring"])
@app.get("/metrics", tags=["Monitoring"])
def get_metrics(
    request: Request,
    x_metrics_key: Optional[str] = Header(None, alias="X-Metrics-Key"),
):
    """
    Exposes operational telemetry metrics. Protected endpoint:
    Requires either an internal X-Metrics-Key or an authenticated mentor/admin JWT.
    """
    is_authorized = False

    # 1. Check internal metrics API key (timing-safe comparison)
    if bool(settings.METRICS_API_KEY and x_metrics_key and hmac.compare_digest(x_metrics_key, settings.METRICS_API_KEY)):
        is_authorized = True

    # 2. Check Authorization Bearer JWT for mentor or admin role
    auth_header = request.headers.get("Authorization", "")
    if not is_authorized and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        payload = decode_access_token(token)
        if payload:
            role = payload.get("role")
            if role in ["mentor", "admin"]:
                is_authorized = True
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: Insufficient privileges to access operational metrics.",
                )

    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: Provide a valid mentor/admin JWT or X-Metrics-Key header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    uptime_sec = time.time() - START_TIME
    ru_maxrss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    # On Linux ru_maxrss is in kilobytes
    memory_mb = round(ru_maxrss / 1024.0, 2)
    
    db_ok = True
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
    except Exception:
        db_ok = False

    error_rate = (
        round((METRICS["status_5xx"] / METRICS["total_requests"]) * 100.0, 2)
        if METRICS["total_requests"] > 0
        else 0.0
    )

    return {
        "status": "healthy" if db_ok and METRICS["status_5xx"] == 0 else "degraded",
        "uptime_seconds": round(uptime_sec, 2),
        "requests_total": METRICS["total_requests"],
        "requests_2xx": METRICS["status_2xx"],
        "requests_4xx": METRICS["status_4xx"],
        "requests_5xx": METRICS["status_5xx"],
        "error_rate_percentage": error_rate,
        "memory_rss_mb": memory_mb,
        "database_connected": db_ok,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }

@app.get("/", include_in_schema=False)
def root():
    return {
        "message": "Welcome to SEOS Backend API",
        "docs": f"{settings.API_V1_STR}/docs",
        "health": f"{settings.API_V1_STR}/health",
        "metrics": f"{settings.API_V1_STR}/metrics",
    }
