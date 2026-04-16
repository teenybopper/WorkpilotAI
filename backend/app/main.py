"""WorkPilot AI — FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
from app.routers.device_auth import router as device_auth_router
from app.routers.bot_auth import router as bot_auth_router
from app.routers.capture import router as capture_router

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

    # Create database tables
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Database tables ready")

    # Initialize MinIO bucket
    try:
        from app.utils.storage import ensure_bucket
        ensure_bucket()
        logger.info("✅ MinIO bucket ready")
    except Exception as e:
        logger.warning(f"⚠️  MinIO not available: {e}")

    # Initialize Qdrant collection
    try:
        from qdrant_client import QdrantClient
        from qdrant_client.models import VectorParams, Distance
        qdrant = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)
        collections = [c.name for c in qdrant.get_collections().collections]
        if settings.qdrant_collection not in collections:
            qdrant.create_collection(
                collection_name=settings.qdrant_collection,
                vectors_config=VectorParams(size=384, distance=Distance.COSINE),
            )
        logger.info("✅ Qdrant collection ready")
    except Exception as e:
        logger.warning(f"⚠️  Qdrant not available: {e}")

    # Register MCP tool adapters
    try:
        from app.services.mcp.registry import list_registered_types
        registered = list_registered_types()
        logger.info(f"✅ MCP adapters registered: {', '.join(registered)}")
    except Exception as e:
        logger.warning(f"⚠️  MCP adapter registration: {e}")

    logger.info("✅ WorkPilot AI is ready!")
    yield
    logger.info("👋 WorkPilot AI shutting down...")


app = FastAPI(
    title="WorkPilot AI",
    description="Agentic work orchestration platform — DocOps + MeetOps + ActionOps + Shared Intelligence",
    version="0.2.0",
    lifespan=lifespan,
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(documents_router)
app.include_router(meetings_router)
app.include_router(workspace_router)
app.include_router(meetops_sessions_router)
app.include_router(integrations_router)
app.include_router(actions_router)
app.include_router(settings_router)
app.include_router(auth_router)
app.include_router(device_auth_router)
app.include_router(bot_auth_router)
app.include_router(capture_router)


@app.get("/")
async def root():
    return {
        "name": "WorkPilot AI",
        "version": "0.2.0",
        "status": "running",
        "modules": ["DocOps", "MeetOps", "ActionOps", "SharedIntelligence"],
    }


@app.get("/api/health")
async def health():
    return {"status": "healthy"}
