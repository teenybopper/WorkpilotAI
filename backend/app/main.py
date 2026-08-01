"""WorkPilot AI — FastAPI application entry point (local desktop app)."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import engine, Base
from app.routers.documents import router as documents_router
from app.routers.meetings import router as meetings_router
from app.routers.workspace import router as workspace_router
from app.routers.meetops_sessions import router as meetops_sessions_router
from app.routers.integrations import router as integrations_router
from app.routers.actions import router as actions_router
from app.routers.settings import router as settings_router
from app.routers.auth import router as auth_router
from app.routers.capture import router as capture_router
from app.routers.local_settings import router as local_settings_router
from app.routers.device_auth import router as device_auth_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)-25s | %(levelname)-7s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle events."""
    logger.info("🚀 WorkPilot AI starting up...")

    # Ensure all data directories exist
    settings.ensure_directories()
    logger.info(f"📁 Data directory: {settings.data_dir}")

    # Create database tables (SQLite auto-creates)
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Database tables ready")

    # Ensure local user exists
    try:
        from app.database import SessionLocal
        from app.services.auth import get_or_create_local_user
        db = SessionLocal()
        user = get_or_create_local_user(db)
        db.close()
        logger.info(f"✅ Local user ready: {user.name}")
    except Exception as e:
        logger.warning(f"⚠️  Could not initialize local user: {e}")

    # Load API keys from config file
    try:
        from app.routers.local_settings import load_api_keys_to_settings
        load_api_keys_to_settings()
    except Exception as e:
        logger.warning(f"⚠️  Could not load API keys: {e}")

    # Initialize ChromaDB
    try:
        import chromadb
        chroma_client = chromadb.PersistentClient(path=settings.chroma_dir)
        chroma_client.get_or_create_collection(name=settings.chroma_collection)
        logger.info("✅ ChromaDB collection ready")
    except Exception as e:
        logger.warning(f"⚠️  ChromaDB not available: {e}")

    logger.info("✅ WorkPilot AI is ready!")
    yield
    logger.info("👋 WorkPilot AI shutting down...")


app = FastAPI(
    title="WorkPilot AI",
    description="Local AI meeting companion — Record, Transcribe, Document, Take Notes",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS middleware — locked to known local origins only ─────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "tauri://localhost",
        "https://tauri.localhost",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global exception handlers ────────────────────────────────────────────

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Catch-all: return a clean 500 JSON response instead of raw stack traces."""
    logger.error(f"Unhandled server error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please check the server logs for details."},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Return structured 422 responses for request validation failures."""
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation error", "errors": exc.errors()},
    )


# ── Upload size limiting middleware ──────────────────────────────────────

MAX_UPLOAD_SIZE = 100 * 1024 * 1024  # 100 MB


@app.middleware("http")
async def limit_upload_size(request: Request, call_next):
    """Reject uploads exceeding MAX_UPLOAD_SIZE before the body is fully read."""
    if request.method in ("POST", "PUT", "PATCH"):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_UPLOAD_SIZE:
            return JSONResponse(
                status_code=413,
                content={
                    "detail": f"File too large. Maximum upload size is {MAX_UPLOAD_SIZE // (1024 * 1024)} MB."
                },
            )
    return await call_next(request)

# Register routers
app.include_router(auth_router)
app.include_router(local_settings_router)
app.include_router(documents_router)
app.include_router(meetings_router)
app.include_router(workspace_router)
app.include_router(meetops_sessions_router)
app.include_router(integrations_router)
app.include_router(actions_router)
app.include_router(settings_router)
app.include_router(capture_router)
app.include_router(device_auth_router)


@app.get("/")
async def root():
    return {
        "name": "WorkPilot AI",
        "version": "1.0.0",
        "status": "running",
        "mode": "local",
        "data_dir": settings.data_dir,
    }


@app.get("/api/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

