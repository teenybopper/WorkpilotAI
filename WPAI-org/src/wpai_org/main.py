"""WPAI-org — FastAPI service entry point.

This service manages meeting bot lifecycle across providers:
- Receives session requests from the WorkPilot backend
- Authenticates with meeting providers via adapters
- Joins meetings as a visible bot participant
- Captures and uploads audio chunks back to the backend
"""

import logging
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from wpai_org.config import settings
from wpai_org.auth.bot_auth import verify_bot_token
from wpai_org.session.manager import SessionManager
from wpai_org.adapters import get_adapter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="WorkPilot AI Bot Service",
    version="0.1.0",
    description="Organization meeting bot — joins calls, captures audio, uploads to WorkPilot backend",
)

session_manager = SessionManager()


# ── Request / Response schemas ──────────────────────────────────────────

class BotSessionStartRequest(BaseModel):
    """Request to start a bot session (received from main backend)."""
    session_id: str
    workspace_id: str
    provider: str       # google_meet, microsoft_teams, slack, discord
    meeting_url: str
    title: Optional[str] = None
    bot_token: str      # Bot service token for auth
    provider_credentials: Optional[dict] = None


class BotSessionStopRequest(BaseModel):
    session_id: str
    bot_token: str


class BotSessionStatusResponse(BaseModel):
    session_id: str
    status: str         # joining, listening, leaving, completed, error
    chunks_sent: int = 0
    duration_seconds: float = 0.0
    provider: str
    error: Optional[str] = None


# ── Endpoints ───────────────────────────────────────────────────────────

@app.get("/bot/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "wpai-org-bot",
        "version": "0.1.0",
        "backend_url": settings.backend_url,
    }


@app.post("/bot/session/start", response_model=BotSessionStatusResponse)
async def start_bot_session(request: BotSessionStartRequest):
    """Start a bot session — join the meeting and begin audio capture."""
    # Verify bot token with the main backend
    is_valid = await verify_bot_token(request.bot_token)
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid bot service token")

    # Check provider is supported
    adapter = get_adapter(request.provider)
    if not adapter:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {request.provider}")

    try:
        session = await session_manager.start_session(
            session_id=request.session_id,
            workspace_id=request.workspace_id,
            provider=request.provider,
            meeting_url=request.meeting_url,
            title=request.title,
            bot_token=request.bot_token,
            credentials=request.provider_credentials,
        )
        return session
    except Exception as e:
        logger.error(f"Failed to start bot session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/bot/session/{session_id}/stop", response_model=BotSessionStatusResponse)
async def stop_bot_session(session_id: str, request: BotSessionStopRequest):
    """Stop a bot session — leave the meeting and finalize."""
    is_valid = await verify_bot_token(request.bot_token)
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid bot service token")

    try:
        session = await session_manager.stop_session(session_id)
        return session
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/bot/session/{session_id}/status", response_model=BotSessionStatusResponse)
async def get_bot_session_status(session_id: str):
    """Get the status of a bot session."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session
