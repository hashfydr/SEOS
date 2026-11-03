from app.routers.auth import router as auth_router
from app.routers.projects import router as projects_router
from app.routers.artifacts import router as artifacts_router
from app.routers.knowledge import router as knowledge_router
from app.routers.classrooms import router as classrooms_router

__all__ = ["auth_router", "projects_router", "artifacts_router", "knowledge_router", "classrooms_router"]
